// =====================================================
//  Master Canais — TV Remote Spatial Navigation (D-Pad)
//  Works on LG webOS Magic Remote, Samsung Tizen & Android TV
// =====================================================

let isInitialized = false;

export function initTvNavigation() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  function getFocusableElements() {
    // If player modal is open, restrict navigation inside the modal
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
      // Must be visible
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function findNextElement(currentEl, direction) {
    const focusables = getFocusableElements();
    if (!focusables.length) return null;

    if (!currentEl || currentEl === document.body || !focusables.includes(currentEl)) {
      // Default to Hero button or first available card
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

  // Auto-focus first interactive element on initial load or navigation
  function ensureInitialFocus() {
    if (!document.activeElement || document.activeElement === document.body) {
      const hero = document.getElementById('hero-play-btn');
      if (hero) {
        hero.focus();
        return;
      }
      const first = getFocusableElements()[0];
      if (first) first.focus();
    }
  }

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
        return;
      }

      // 2. Close search if open
      const searchContainer = document.querySelector('.search-container.active');
      if (searchContainer) {
        const toggleBtn = document.querySelector('.search-icon-btn');
        if (toggleBtn) {
          e.preventDefault();
          toggleBtn.click();
          return;
        }
      }

      // 3. Navigate back in history if not on home
      if (window.location.pathname !== '/') {
        e.preventDefault();
        window.history.back();
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
      const next = findNextElement(document.activeElement, dir);
      if (next) {
        e.preventDefault();
        next.focus();
        // Ensure element is visible in horizontal/vertical scroll
        try {
          next.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        } catch {}
      }
      return;
    }

    // ── OK / Enter button on remote (keyCode 13) ───────────────────────────
    if (key === 'Enter' || keyCode === 13) {
      const cur = document.activeElement;
      if (cur && cur !== document.body) {
        // If not standard form element, trigger click
        if (cur.tagName !== 'BUTTON' && cur.tagName !== 'INPUT' && cur.tagName !== 'SELECT') {
          e.preventDefault();
          cur.click();
        }
      } else {
        ensureInitialFocus();
      }
    }
  });

  // Re-check initial focus when DOM changes or route switches
  setTimeout(ensureInitialFocus, 500);
  window.addEventListener('popstate', () => setTimeout(ensureInitialFocus, 300));
}
