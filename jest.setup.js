import '@testing-library/jest-dom'

// Mock fetch, Request, and Response for Node.js environment
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Headers(),
    })
  )
}

// Add Request and Response polyfills for Node.js environment
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input
      this.method = init.method || 'GET'
      this.headers = new Headers(init.headers)
      this.body = init.body
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Headers(init.headers)
      this.ok = this.status >= 200 && this.status < 300
    }
    
    async json() {
      return JSON.parse(this.body)
    }
    
    async text() {
      return this.body
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = new Map()
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value)
        })
      }
    }
    
    get(key) {
      return this._headers.get(key.toLowerCase())
    }
    
    set(key, value) {
      this._headers.set(key.toLowerCase(), value)
    }
    
    has(key) {
      return this._headers.has(key.toLowerCase())
    }
  }
}

// Make jest globals available
global.describe = global.describe || describe
global.it = global.it || it  
global.expect = global.expect || expect
global.beforeEach = global.beforeEach || beforeEach
global.afterEach = global.afterEach || afterEach
global.jest = global.jest || jest