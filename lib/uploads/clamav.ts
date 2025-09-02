/**
 * ClamAV Integration for File Scanning
 * Based on INSTRUCTIONS_FOR_COPILOT.md §6
 */

import { Socket } from 'net'
import { z } from 'zod'

// Configuration
const CLAMAV_HOST = process.env.CLAMAV_HOST || 'localhost'
const CLAMAV_PORT = parseInt(process.env.CLAMAV_PORT || '3310', 10)
const SCAN_TIMEOUT = 30000 // 30 seconds

// Types
export interface ScanResult {
  isClean: boolean
  signature?: string
  error?: string
  scanDuration: number
}

export interface QuarantineInfo {
  originalKey: string
  quarantineKey: string
  scanResult: ScanResult
  quarantinedAt: Date
}

const ScanRequestSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
  contentType: z.string(),
  size: z.number().min(1),
})

export type ScanRequest = z.infer<typeof ScanRequestSchema>

/**
 * Scan file via ClamAV daemon
 */
export async function scanFile(fileBuffer: Buffer): Promise<ScanResult> {
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const socket = new Socket()
    let response = ''
    
    // Set timeout
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({
        isClean: false,
        error: 'Scan timeout',
        scanDuration: Date.now() - startTime,
      })
    }, SCAN_TIMEOUT)
    
    socket.on('connect', () => {
      // Send INSTREAM command
      socket.write('zINSTREAM\0')
      
      // Send file size (4 bytes, big-endian)
      const sizeBuffer = Buffer.alloc(4)
      sizeBuffer.writeUInt32BE(fileBuffer.length, 0)
      socket.write(sizeBuffer)
      
      // Send file data
      socket.write(fileBuffer)
      
      // Send termination (0 size)
      const termBuffer = Buffer.alloc(4)
      termBuffer.writeUInt32BE(0, 0)
      socket.write(termBuffer)
    })
    
    socket.on('data', (data) => {
      response += data.toString()
    })
    
    socket.on('close', () => {
      clearTimeout(timeout)
      
      const scanDuration = Date.now() - startTime
      const result = parseClamAVResponse(response, scanDuration)
      resolve(result)
    })
    
    socket.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        isClean: false,
        error: `ClamAV connection error: ${error.message}`,
        scanDuration: Date.now() - startTime,
      })
    })
    
    // Connect to ClamAV daemon
    socket.connect(CLAMAV_PORT, CLAMAV_HOST)
  })
}

/**
 * Scan file from URL
 */
export async function scanFileFromUrl(url: string): Promise<ScanResult> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return {
        isClean: false,
        error: `Failed to download file: ${response.statusText}`,
        scanDuration: 0,
      }
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    return await scanFile(buffer)
  } catch (error) {
    return {
      isClean: false,
      error: `Download error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      scanDuration: 0,
    }
  }
}

/**
 * Parse ClamAV response
 */
function parseClamAVResponse(response: string, scanDuration: number): ScanResult {
  const trimmed = response.trim()
  
  if (trimmed.includes('stream: OK')) {
    return {
      isClean: true,
      scanDuration,
    }
  }
  
  if (trimmed.includes('FOUND')) {
    // Extract virus signature
    const match = trimmed.match(/stream: (.+) FOUND/)
    const signature = match?.[1] || 'Unknown virus'
    
    return {
      isClean: false,
      signature,
      scanDuration,
    }
  }
  
  // Error case
  return {
    isClean: false,
    error: `Unexpected ClamAV response: ${trimmed}`,
    scanDuration,
  }
}

/**
 * Quarantine infected file
 */
export function quarantineFile(
  originalKey: string,
  scanResult: ScanResult
): QuarantineInfo {
  const timestamp = Date.now()
  const quarantineKey = `quarantine/${timestamp}-${originalKey.replace('uploads/', '')}`
  
  return {
    originalKey,
    quarantineKey,
    scanResult,
    quarantinedAt: new Date(),
  }
}

/**
 * Check ClamAV daemon health
 */
export async function checkClamAVHealth(): Promise<{
  available: boolean
  version?: string
  error?: string
}> {
  return new Promise((resolve) => {
    const socket = new Socket()
    let response = ''
    
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve({
        available: false,
        error: 'Health check timeout',
      })
    }, 5000)
    
    socket.on('connect', () => {
      socket.write('VERSION\0')
    })
    
    socket.on('data', (data) => {
      response += data.toString()
    })
    
    socket.on('close', () => {
      clearTimeout(timeout)
      
      if (response.trim()) {
        resolve({
          available: true,
          version: response.trim(),
        })
      } else {
        resolve({
          available: false,
          error: 'Empty response',
        })
      }
    })
    
    socket.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        available: false,
        error: error.message,
      })
    })
    
    socket.connect(CLAMAV_PORT, CLAMAV_HOST)
  })
}

/**
 * Create EICAR test string for testing
 */
export function createEicarTestString(): Buffer {
  // EICAR standard anti-virus test file
  const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
  return Buffer.from(eicar)
}

/**
 * Validate scan request
 */
export function validateScanRequest(request: unknown): ScanRequest {
  return ScanRequestSchema.parse(request)
}