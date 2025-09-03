/**
 * Advanced Focus Management Component
 * 
 * Implements WCAG 2.2 AA compliant focus management with visible focus indicators
 * and keyboard navigation support for PR16 accessibility enhancements
 */

'use client'

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useState,
  ReactNode,
  RefObject,
} from 'react'

interface FocusContextType {
  setFocusTarget: (element: HTMLElement | null) => void
  getFocusableElements: (container?: HTMLElement) => HTMLElement[]
  trapFocus: (container: HTMLElement) => () => void
  restoreFocus: () => void
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
}

const FocusContext = createContext<FocusContextType | null>(null)

export function useFocus() {
  const context = useContext(FocusContext)
  if (!context) {
    throw new Error('useFocus must be used within a FocusProvider')
  }
  return context
}

interface FocusProviderProps {
  children: ReactNode
}

export function FocusProvider({ children }: FocusProviderProps) {
  const [previouslyFocusedElement, setPreviouslyFocusedElement] = useState<HTMLElement | null>(null)
  const announcerRef = useRef<HTMLDivElement>(null)

  const setFocusTarget = (element: HTMLElement | null) => {
    if (element) {
      // Store previously focused element for restoration
      setPreviouslyFocusedElement(document.activeElement as HTMLElement)
      
      // Focus the target element
      element.focus()
    }
  }

  const getFocusableElements = (container: HTMLElement = document.body): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]:not([tabindex="-1"])',
      'audio[controls]:not([tabindex="-1"])',
      'video[controls]:not([tabindex="-1"])',
      'details > summary:not([tabindex="-1"])',
      'iframe:not([tabindex="-1"])',
    ]

    const elements = container.querySelectorAll(focusableSelectors.join(','))
    
    return Array.from(elements).filter((element) => {
      const el = element as HTMLElement
      
      // Check if element is visible and not hidden
      const computedStyle = window.getComputedStyle(el)
      const isVisible = (
        computedStyle.display !== 'none' &&
        computedStyle.visibility !== 'hidden' &&
        computedStyle.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      )
      
      // Check if element is not in a closed details element
      const closedDetails = el.closest('details:not([open])')
      if (closedDetails && !closedDetails.contains(el.closest('summary'))) {
        return false
      }
      
      return isVisible
    }) as HTMLElement[]
  }

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = getFocusableElements(container)
    
    if (focusableElements.length === 0) {
      return () => {} // No cleanup needed
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element initially
    firstElement.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const activeElement = document.activeElement as HTMLElement
      
      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab (forward)
        if (activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Handle Escape key to close modal/dialog
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const closeButton = container.querySelector('[data-close-button]') as HTMLElement
        if (closeButton) {
          closeButton.click()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }

  const restoreFocus = () => {
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus()
      setPreviouslyFocusedElement(null)
    }
  }

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority)
      announcerRef.current.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = ''
        }
      }, 1000)
    }
  }

  const contextValue: FocusContextType = {
    setFocusTarget,
    getFocusableElements,
    trapFocus,
    restoreFocus,
    announceToScreenReader,
  }

  return (
    <FocusContext.Provider value={contextValue}>
      {children}
      {/* Screen reader announcements */}
      <div
        ref={announcerRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        aria-label="Screen reader announcements"
      />
    </FocusContext.Provider>
  )
}

/**
 * Hook for managing focus within a specific container (like modals)
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean = true) {
  const { trapFocus } = useFocus()

  useEffect(() => {
    if (active && containerRef.current) {
      const cleanup = trapFocus(containerRef.current)
      return cleanup
    }
  }, [active, containerRef, trapFocus])
}

/**
 * Hook for restoring focus when component unmounts
 */
export function useFocusRestore() {
  const { restoreFocus } = useFocus()

  useEffect(() => {
    return () => {
      restoreFocus()
    }
  }, [restoreFocus])
}

/**
 * VisuallyHidden component for screen reader only content
 */
interface VisuallyHiddenProps {
  children: ReactNode
  asChild?: boolean
  focusable?: boolean
}

export function VisuallyHidden({ children, asChild = false, focusable = false }: VisuallyHiddenProps) {
  const className = focusable ? 'sr-only-focusable' : 'sr-only'
  
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      className: `${(children as React.ReactElement).props.className || ''} ${className}`.trim()
    })
  }

  return <span className={className}>{children}</span>
}

/**
 * Skip Link component for keyboard navigation
 */
interface SkipLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault()
    const target = document.querySelector(href) as HTMLElement
    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }
      target.focus()
      
      // Remove tabindex after focus for clean DOM
      setTimeout(() => {
        if (target.getAttribute('tabindex') === '-1') {
          target.removeAttribute('tabindex')
        }
      }, 100)
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`
        absolute top-0 left-0 z-50 
        bg-blue-600 text-white px-4 py-2 
        transform -translate-y-full 
        focus:translate-y-0 
        transition-transform duration-200
        rounded-br-md font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {children}
    </a>
  )
}

/**
 * Enhanced Focus Indicator component
 */
interface FocusIndicatorProps {
  children: ReactNode
  className?: string
  visible?: boolean
}

export function FocusIndicator({ children, className = '', visible = true }: FocusIndicatorProps) {
  if (!visible) return <>{children}</>

  return (
    <div className={`focus-indicator-container ${className}`}>
      {children}
    </div>
  )
}

/**
 * Roving Tab Index Hook for keyboard navigation in lists/grids
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: RefObject<T>[],
  orientation: 'horizontal' | 'vertical' | 'both' = 'horizontal'
) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Set initial tabindex values
    items.forEach((ref, index) => {
      if (ref.current) {
        ref.current.setAttribute('tabindex', index === currentIndex ? '0' : '-1')
      }
    })
  }, [items, currentIndex])

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    let nextIndex = index

    switch (event.key) {
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          nextIndex = index > 0 ? index - 1 : items.length - 1
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          nextIndex = index < items.length - 1 ? index + 1 : 0
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          nextIndex = index > 0 ? index - 1 : items.length - 1
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          nextIndex = index < items.length - 1 ? index + 1 : 0
        }
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = items.length - 1
        break
    }

    if (nextIndex !== index) {
      setCurrentIndex(nextIndex)
      if (items[nextIndex]?.current) {
        items[nextIndex].current!.focus()
      }
    }
  }

  return { handleKeyDown, currentIndex, setCurrentIndex }
}

/**
 * Announcement Hook for screen reader notifications
 */
export function useAnnouncement() {
  const { announceToScreenReader } = useFocus()

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority)
  }

  return { announce }
}