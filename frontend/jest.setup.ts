// frontend/jest.setup.ts
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local for Jest runs (no external dependency)
try {
  const envPath = resolve(__dirname, '.env.local')
  const content = readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/)
    if (!m) return
    const key = m[1].trim()
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  })
} catch (e) {
  // ignore if .env.local doesn't exist
}

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