// =====================================================
//  Master Canais — TV Remote Spatial Navigation (D-Pad)
//  Works on LG webOS Magic Remote, Samsung Tizen & Android TV
// =====================================================

let isInitialized = false;

export function applyTvFocus(el) {
  if (!el || typeof document === 'undefined') return;

  document.querySelectorAll('.tv-focused').forEach(node => {
    if (node !== el) node.classList.remove('tv-focused');
  });

  el.classList.add('tv-focused');

  try {
    if (document.activeElement !== el && typeof el.focus === 'function') {
      el.focus();
    }
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  } catch {}
}

export function getFocusableElements() {
  if (typeof document === 'undefined') return [];

  // If player modal is open, restrict navigation strictly inside the modal
  const activeModal = document.querySelector('#player-modal, #series-player-modal, .pmodal-content, .sp-modal');
  const root = activeModal || document;

  const selectors = [
    '.media-card',
    '.channel-card',
    '.wh-card',
    '#hero-play-btn',
    '.btn-primary',
    '.pmodal-server-btn',
    '.pmodal-retry-btn',
    '.sp-ep-card',
    '.sp-season-select',
    '.sp-panel-toggle',
    '.filter-btn',
    '.navbar-nav a',
    '.search-icon-btn',
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex="0"]',
  ].join(', ');

  const elements = Array.from(root.querySelectorAll(selectors));

  return elements.filter(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function ensureTvFocus() {
  if (typeof document === 'undefined') return;

  const currentFocused = document.querySelector('.tv-focused');
  if (currentFocused && document.body.contains(currentFocused) && currentFocused !== document.body) {
    return;
  }

  const focusables = getFocusableElements();
  if (!focusables.length) return;

  // Hero play button preferred first
  const hero = document.getElementById('hero-play-btn');
  if (hero && focusables.includes(hero)) {
    applyTvFocus(hero);
    return;
  }

  // Otherwise, first visible card
  applyTvFocus(focusables[0]);
}

export function initTvNavigation() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  function findNextElement(currentEl, direction) {
    const focusables = getFocusableElements();
    if (!focusables.length) return null;

    if (!currentEl || currentEl === document.body || !focusables.includes(currentEl)) {
      const hero = document.getElementById('hero-play-btn');
      if (hero && focusables.includes(hero)) return hero;
      return focusables[0];
    }

    const cur = currentEl.getBoundingClientRect();
    const curCenter = {
      x: cur.left + cur.width / 2,
      y: cur.top + cur.height / 2,
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const cand of focusables) {
      if (cand === currentEl) continue;

      const rect = cand.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      const dx = center.x - curCenter.x;
      const dy = center.y - curCenter.y;

      let valid = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      if (direction === 'right') {
        if (center.x > curCenter.x + 8) {
          valid = true;
          primaryDist = dx;
          secondaryDist = Math.abs(dy);
        }
      } else if (direction === 'left') {
        if (center.x < curCenter.x - 8) {
          valid = true;
          primaryDist = Math.abs(dx);
          secondaryDist = Math.abs(dy);
        }
      } else if (direction === 'down') {
        if (center.y > curCenter.y + 12) {
          valid = true;
          primaryDist = dy;
          secondaryDist = Math.abs(dx);
        }
      } else if (direction === 'up') {
        if (center.y < curCenter.y - 12) {
          valid = true;
          primaryDist = Math.abs(dy);
          secondaryDist = Math.abs(dx);
        }
      }

      if (valid) {
        // Weighted distance: prioritize items directly in line
        const totalDist = primaryDist + secondaryDist * 2.5;
        if (totalDist < minDistance) {
          minDistance = totalDist;
          bestCandidate = cand;
        }
      }
    }

    return bestCandidate;
  }

  // Sync focus class on all focus events
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target !== document.body) {
      document.querySelectorAll('.tv-focused').forEach(node => {
        if (node !== e.target) node.classList.remove('tv-focused');
      });
      e.target.classList.add('tv-focused');
    }
  }, true);

  document.addEventListener('focusout', (e) => {
    if (e.target) {
      e.target.classList.remove('tv-focused');
    }
  }, true);

  // Key listener for TV Remote
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    const keyCode = e.keyCode;

    // ── LG webOS Back key is 461, Escape is 27 ─────────────────────────────
    if (key === 'Escape' || keyCode === 461 || keyCode === 27) {
      // 1. Close player if open
      const closePlayerBtn = document.querySelector('#player-modal button[title*="Fechar"], #series-player-modal button[title*="Fechar"], .sp-close-btn');
      if (closePlayerBtn) {
        e.preventDefault();
        e.stopPropagation();
        closePlayerBtn.click();
        setTimeout(ensureTvFocus, 150);
        return;
      }

      // 2. Close search if open
      const searchContainer = document.querySelector('.search-container.active');
      if (searchContainer) {
        const toggleBtn = document.querySelector('.search-icon-btn');
        if (toggleBtn) {
          e.preventDefault();
          toggleBtn.click();
          setTimeout(ensureTvFocus, 150);
          return;
        }
      }

      // 3. Navigate back in history if not on home
      if (window.location.pathname !== '/') {
        e.preventDefault();
        window.history.back();
        setTimeout(ensureTvFocus, 200);
        return;
      }

      return;
    }

    // ── Directional Navigation (Arrows / D-Pad) ────────────────────────────
    let dir = null;
    if (key === 'ArrowRight' || keyCode === 39) dir = 'right';
    else if (key === 'ArrowLeft' || keyCode === 37) dir = 'left';
    else if (key === 'ArrowDown' || keyCode === 40) dir = 'down';
    else if (key === 'ArrowUp' || keyCode === 38) dir = 'up';

    if (dir) {
      const activeEl = document.querySelector('.tv-focused') || document.activeElement;
      const next = findNextElement(activeEl, dir);
      if (next) {
        e.preventDefault();
        applyTvFocus(next);
      } else {
        ensureTvFocus();
      }
      return;
    }

    // ── OK / Enter button on remote (keyCode 13) ───────────────────────────
    if (key === 'Enter' || keyCode === 13) {
      const cur = document.querySelector('.tv-focused') || document.activeElement;
      if (cur && cur !== document.body) {
        if (cur.tagName !== 'BUTTON' && cur.tagName !== 'INPUT' && cur.tagName !== 'SELECT') {
          e.preventDefault();
          cur.click();
        }
      } else {
        ensureTvFocus();
      }
    }
  });

  // Auto-focus loop to catch items as soon as network data renders
  let checks = 0;
  const loopTimer = setInterval(() => {
    checks++;
    if (document.querySelector('.tv-focused') || checks > 20) {
      clearInterval(loopTimer);
      return;
    }
    ensureTvFocus();
  }, 300);

  window.addEventListener('popstate', () => setTimeout(ensureTvFocus, 300));
}
