// ─── Tab Guard — BroadcastChannel-based multi-tab detection ───────────────────
//
// Prevents concurrent writes to IndexedDB and the JSON file when the app is
// open in more than one tab simultaneously.
//
// Protocol:
//   HELLO  → new tab announces itself to any existing tabs
//   TAKEN  → existing (primary) tab claims the write lock in response to HELLO
//   BYE    → primary tab notifies secondaries when it is closing

const CHANNEL_NAME = 'nexus-tab'

type TabMessage = { type: 'HELLO' } | { type: 'TAKEN' } | { type: 'BYE' }

/**
 * Initialise the tab guard for the current tab.
 *
 * @param onSecondary  Called when this tab becomes secondary (another tab was first).
 * @param onPrimary    Called when this tab becomes primary again (primary tab closed).
 * @returns            Cleanup function — call on component unmount.
 */
export function initTabGuard(onSecondary: () => void, onPrimary: () => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}

  const channel = new BroadcastChannel(CHANNEL_NAME)

  channel.onmessage = (event: MessageEvent<TabMessage>) => {
    switch (event.data.type) {
      case 'HELLO':
        // Another tab just opened — we were here first, respond to claim the lock.
        channel.postMessage({ type: 'TAKEN' } satisfies TabMessage)
        break
      case 'TAKEN':
        // A primary tab responded to our HELLO — we are a duplicate.
        onSecondary()
        break
      case 'BYE':
        // Primary tab closed — this tab can resume as primary.
        onPrimary()
        break
    }
  }

  // Announce this tab's presence to any already-open tabs.
  channel.postMessage({ type: 'HELLO' } satisfies TabMessage)

  function handleBeforeUnload() {
    channel.postMessage({ type: 'BYE' } satisfies TabMessage)
    channel.close()
  }

  window.addEventListener('beforeunload', handleBeforeUnload)

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    channel.close()
  }
}
