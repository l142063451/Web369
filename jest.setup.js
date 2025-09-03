import '@testing-library/jest-dom'

// Mock fetch for Node.js environment - use global fetch polyfill instead of node-fetch
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

// Make jest globals available
global.describe = global.describe || describe
global.it = global.it || it  
global.expect = global.expect || expect
global.beforeEach = global.beforeEach || beforeEach
global.afterEach = global.afterEach || afterEach
global.jest = global.jest || jest