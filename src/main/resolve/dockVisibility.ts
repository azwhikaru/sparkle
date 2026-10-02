interface Dock {
  hide: () => void
  show: () => Promise<void>
  isVisible: () => boolean
}

// Electron/macOS can ignore repeated hide calls less than a second apart.
const DOCK_HIDE_INTERVAL_MS = 1100

export function createDockVisibilityController(
  dock: Dock | undefined,
  onError: (error: unknown) => void
) {
  let enabled = true
  let windowVisible = false
  let pendingShow: Promise<void> | undefined
  let lastHideAt = -Infinity
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  const sync = (): void => {
    if (!dock) return
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = undefined
    }

    if (enabled && windowVisible) {
      if (pendingShow || dock.isVisible()) return
      const request = dock.show()
      pendingShow = request
      void request.then(
        () => {
          if (pendingShow === request) pendingShow = undefined
          // The window may have closed while the asynchronous show was pending.
          sync()
        },
        (error: unknown) => {
          if (pendingShow === request) pendingShow = undefined
          onError(error)
        }
      )
      return
    }

    // A pending show may never resolve if macOS switches activation policy while
    // the window closes. It must not prevent hiding or a later show request.
    const wasShowing = pendingShow !== undefined
    pendingShow = undefined
    if (!dock.isVisible()) {
      if (wasShowing) {
        hideTimer = setTimeout(sync, DOCK_HIDE_INTERVAL_MS)
        hideTimer.unref()
      }
      return
    }
    const delay = lastHideAt + DOCK_HIDE_INTERVAL_MS - Date.now()
    if (delay > 0) {
      hideTimer = setTimeout(sync, delay)
      hideTimer.unref()
      return
    }
    lastHideAt = Date.now()
    dock.hide()
    // Native visibility can change after hide (for example on window destruction).
    hideTimer = setTimeout(sync, DOCK_HIDE_INTERVAL_MS)
    hideTimer.unref()
  }

  return {
    setEnabled(value: boolean): void {
      enabled = value
      sync()
    },
    setWindowVisible(value: boolean): void {
      windowVisible = value
      sync()
    }
  }
}
