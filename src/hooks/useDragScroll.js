import { useEffect, useRef } from 'react';

/**
 * Adds mouse drag-to-scroll behaviour to a horizontally scrollable element.
 * Pass the ref of the scroll container.
 */
export function useDragScroll(ref) {
  const state = useRef({ down: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e) => {
      // Ignore clicks on interactive children
      if (e.target.closest('button, a, input')) return;
      state.current = { down: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
      if (!state.current.down) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const delta = (x - state.current.startX) * 1.4; // multiplier for speed
      el.scrollLeft = state.current.scrollLeft - delta;
    };

    const onMouseUp = () => {
      state.current.down = false;
      el.style.cursor = '';
      el.style.userSelect = '';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [ref]);
}
