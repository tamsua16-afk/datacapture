import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock env variables for tests
process.env.DEMO_MODE = 'true'
process.env.MOCK_AI = 'true'
process.env.SESSION_SECRET = 'demo-secret-change-in-production-must-be-32-chars-minimum'
