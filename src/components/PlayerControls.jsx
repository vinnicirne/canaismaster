import { useState, useEffect, useRef, useCallback } from 'react';
import './PlayerControls.css';

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>
);

const IconExitFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
  </svg>
);

const IconTheater = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="2" y="3" width="20" height="18" rx="2"/>
    <line x1="2" y1="15" x2="22" y2="15"/>
  </svg>
);

export default function PlayerControls({ iframeRef, containerRef, title, isChannel, onClose, onTheaterChange }) {
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const hideTimerRef = useRef(null);

  // Auto-hide our top bar so it doesn't distract
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, [containerRef]);

  const handleTheaterToggle = useCallback(() => {
    setIsTheater(t => {
      const next = !t;
      if (onTheaterChange) onTheaterChange(next);
      return next;
    });
  }, [onTheaterChange]);

  const handleReload = useCallback(() => {
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = 'about:blank';
      setTimeout(() => { if (iframeRef.current) iframeRef.current.src = src; }, 50);
    }
  }, [iframeRef]);

  return (
    <div
      className={`pc-overlay-minimal${showControls ? ' pc-overlay-minimal--visible' : ''}`}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowControls(false), 800);
      }}
    >
      <div className="pc-topbar-minimal">
        <div className="pc-topbar-minimal-title">
          {title}
          {isChannel && (
            <span className="pc-live-badge">
              <span className="pc-live-dot" />
              AO VIVO
            </span>
          )}
        </div>
        <div className="pc-topbar-minimal-actions">
          <button className="pc-icon-btn-minimal" onClick={handleTheaterToggle} title={isTheater ? "Modo Normal" : "Modo Teatro"}>
            <IconTheater />
          </button>
          <button className="pc-icon-btn-minimal" onClick={handleFullscreen} title={isFullscreen ? "Sair da Tela Cheia (F)" : "Tela Cheia (F)"}>
            {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
          </button>
          <div className="pc-divider" />
          <button className="pc-icon-btn-minimal" onClick={handleReload} title="Recarregar Servidor">
            <IconRefresh />
          </button>
          <button className="pc-icon-btn-minimal pc-close-minimal" onClick={onClose} title="Fechar (Esc)">
            <IconClose />
          </button>
        </div>
      </div>
    </div>
  );
}
