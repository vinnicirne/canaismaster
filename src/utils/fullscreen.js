// =====================================================
//  Master Canais — Fullscreen Utilities
//  Cross-device and Smart TV (LG webOS / Tizen / Android TV)
// =====================================================

/**
 * Safely requests fullscreen on the given element or document.documentElement.
 * Must be called in response to user gestures (click, tap, keypress).
 */
export function requestFullscreenSafe(element) {
  try {
    const el = element || document.documentElement;

    if (el.requestFullscreen) {
      return el.requestFullscreen().catch(() => {});
    }
    if (el.webkitRequestFullscreen) {
      return el.webkitRequestFullscreen();
    }
    if (el.webkitRequestFullScreen) {
      return el.webkitRequestFullScreen();
    }
    if (el.mozRequestFullScreen) {
      return el.mozRequestFullScreen();
    }
    if (el.msRequestFullscreen) {
      return el.msRequestFullscreen();
    }
    // Mobile / webOS Video element fallback
    if (el.webkitEnterFullscreen) {
      return el.webkitEnterFullscreen();
    }
  } catch (err) {
    console.warn('[fullscreen] requestFullscreen failed:', err);
  }
}

/**
 * Safely exits fullscreen if currently active.
 */
export function exitFullscreenSafe() {
  try {
    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    ) {
      if (document.exitFullscreen) {
        return document.exitFullscreen().catch(() => {});
      }
      if (document.webkitExitFullscreen) {
        return document.webkitExitFullscreen();
      }
      if (document.mozCancelFullScreen) {
        return document.mozCancelFullScreen();
      }
      if (document.msExitFullscreen) {
        return document.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('[fullscreen] exitFullscreen failed:', err);
  }
}

/**
 * Check if the browser or TV is currently in fullscreen mode.
 */
export function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.webkitCurrentFullScreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}
