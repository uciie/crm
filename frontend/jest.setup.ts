// frontend/jest.setup.ts
import '@testing-library/jest-dom'

// Supprime les warnings act() parasites
const originalError = console.error.bind(console.error)
beforeAll(() => {
  console.error = (msg: string, ...args: any[]) => {
    if (typeof msg === 'string' && msg.includes('not wrapped in act')) return
    originalError(msg, ...args)
  }
})
afterAll(() => { console.error = originalError })

// Mocks globaux requis par certains composants Next.js / UI
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe:    jest.fn(),
  unobserve:  jest.fn(),
  disconnect: jest.fn(),
}))

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe:    jest.fn(),
  unobserve:  jest.fn(),
  disconnect: jest.fn(),
}))