import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initTabGuard } from '@/lib/tabGuard'

// ─── BroadcastChannel mock ────────────────────────────────────────────────────

type TabMessage = { type: 'HELLO' | 'TAKEN' | 'BYE' }

interface MockChannel {
  postMessage: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  onmessage: ((event: MessageEvent<TabMessage>) => void) | null
  // Helper to simulate an inbound message from another tab
  receive: (msg: TabMessage) => void
}

let mockChannel: MockChannel

beforeEach(() => {
  mockChannel = {
    postMessage: vi.fn(),
    close: vi.fn(),
    onmessage: null,
    receive(msg) {
      this.onmessage?.({ data: msg } as MessageEvent<TabMessage>)
    },
  }

  vi.stubGlobal(
    'BroadcastChannel',
    vi.fn(() => mockChannel)
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('initTabGuard', () => {
  it('posts HELLO on init to announce the new tab', () => {
    const cleanup = initTabGuard(vi.fn(), vi.fn())

    expect(mockChannel.postMessage).toHaveBeenCalledWith({ type: 'HELLO' })

    cleanup()
  })

  it('calls onSecondary when TAKEN is received', () => {
    const onSecondary = vi.fn()
    const cleanup = initTabGuard(onSecondary, vi.fn())

    mockChannel.receive({ type: 'TAKEN' })

    expect(onSecondary).toHaveBeenCalledOnce()

    cleanup()
  })

  it('does not call onSecondary when HELLO or BYE are received', () => {
    const onSecondary = vi.fn()
    const cleanup = initTabGuard(onSecondary, vi.fn())

    mockChannel.receive({ type: 'HELLO' })
    mockChannel.receive({ type: 'BYE' })

    expect(onSecondary).not.toHaveBeenCalled()

    cleanup()
  })

  it('responds with TAKEN when HELLO is received from another tab', () => {
    const cleanup = initTabGuard(vi.fn(), vi.fn())

    // Reset to check only the response, not the initial HELLO
    mockChannel.postMessage.mockClear()
    mockChannel.receive({ type: 'HELLO' })

    expect(mockChannel.postMessage).toHaveBeenCalledWith({ type: 'TAKEN' })

    cleanup()
  })

  it('calls onPrimary when BYE is received', () => {
    const onPrimary = vi.fn()
    const cleanup = initTabGuard(vi.fn(), onPrimary)

    mockChannel.receive({ type: 'BYE' })

    expect(onPrimary).toHaveBeenCalledOnce()

    cleanup()
  })

  it('posts BYE and closes channel on beforeunload', () => {
    initTabGuard(vi.fn(), vi.fn())

    window.dispatchEvent(new Event('beforeunload'))

    expect(mockChannel.postMessage).toHaveBeenCalledWith({ type: 'BYE' })
    expect(mockChannel.close).toHaveBeenCalled()
  })

  it('closes the channel when the cleanup function is called', () => {
    const cleanup = initTabGuard(vi.fn(), vi.fn())

    cleanup()

    expect(mockChannel.close).toHaveBeenCalled()
  })

  it('returns a no-op cleanup when BroadcastChannel is unavailable', () => {
    vi.stubGlobal('BroadcastChannel', undefined)

    expect(() => {
      const cleanup = initTabGuard(vi.fn(), vi.fn())
      cleanup()
    }).not.toThrow()
  })
})
