// PlayerModal — with custom controls overlay
import { useRef, useState, useEffect } from 'react';
import PlayerControls from './PlayerControls';
import SeriesPlayer from './SeriesPlayer';
import { playerUrlFromItem } from '../api';
import './PlayerModal.css';

export default function PlayerModal({ item, onClose }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isTheater, setIsTheater] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!item) return null;

  if (item.type === 'serie' || item.type === 'tv') {
    return <SeriesPlayer item={item} onClose={onClose} />;
  }

  const playerUrl  = playerUrlFromItem(item);
  const isChannel = (item.type || '').toLowerCase().includes('canal') || (item.type || '').toLowerCase().includes('channel');

  // Close on Escape (when not in fullscreen)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modalClass = [
    'pmodal-content',
    isTheater ? 'pmodal-content--theater' : '',
    isFullscreen ? 'pmodal-content--fullscreen' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="pmodal-overlay" onClick={handleOverlayClick} id="player-modal-overlay">
      <div className={modalClass} ref={containerRef} id="player-modal">
        {/* Player + controls stacked */}
        <div className="pmodal-player-wrap">
          <iframe
            ref={iframeRef}
            id="content-player-iframe"
            className="pmodal-iframe"
            src={playerUrl}
            allowFullScreen
            webkitallowfullscreen="true"
            mozallowfullscreen="true"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            title={item.title}
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 999,
              background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', width: 44, height: 44, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Description (only in non-theater, non-fullscreen) */}
        {!isTheater && !isFullscreen && item.overview && (
          <div className="pmodal-meta">
            <div className="pmodal-meta-title">{item.title}</div>
            {item.year && <div className="pmodal-meta-year">{item.year}</div>}
            <p className="pmodal-meta-desc">{item.overview}</p>
          </div>
        )}
      </div>
    </div>
  );
}
