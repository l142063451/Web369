import '@testing-library/jest-dom'

// Mock fetch for Node.js environment
const { default: fetch } = require('node-fetch')
global.fetch = fetch

// Make jest globals available
global.describe = global.describe || describe
global.it = global.it || it  
global.expect = global.expect || expect
global.beforeEach = global.beforeEach || beforeEach
global.afterEach = global.afterEach || afterEach
global.jest = global.jest || jest