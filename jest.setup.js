import '@testing-library/jest-dom'

// Mock fetch for Node.js environment using built-in global fetch if available
if (!global.fetch) {
  global.fetch = jest.fn()
}

// Make jest globals available
global.describe = global.describe || describe
global.it = global.it || it  
global.expect = global.expect || expect
global.beforeEach = global.beforeEach || beforeEach
global.afterEach = global.afterEach || afterEach
global.jest = global.jest || jest