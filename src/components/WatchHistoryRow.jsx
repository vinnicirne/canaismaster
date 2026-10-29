import { useRef } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import { requestFullscreenSafe } from '../utils/fullscreen';
import './WatchHistoryRow.css';

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function WatchHistoryRow({ items = [], onPlay, onRemove, onClear }) {
  const rowRef = useRef(null);
  useDragScroll(rowRef);

  if (!items || items.length === 0) return null;

  const scrollBy = (dir) => {
    if (!rowRef.current) return;
    const amount = rowRef.current.offsetWidth * 0.75;
    rowRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  const handleCardClick = (item) => {
    requestFullscreenSafe();
    onPlay(item.originalItem || item);
  };

  return (
    <section className="scroll-section" id="watch-history-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="section-title">⏳ Continuar Assistindo</h2>
          <span className="wh-count-pill">{items.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onClear && items.length > 0 && (
            <button
              className="wh-clear-btn"
              onClick={onClear}
              title="Limpar histórico de reprodução"
            >
              <TrashIcon /> Limpar
            </button>
          )}

          <button
            className="scroll-nav-btn"
            onClick={() => scrollBy('left')}
            aria-label="Rolar esquerda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            className="scroll-nav-btn"
            onClick={() => scrollBy('right')}
            aria-label="Rolar direita"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="scroll-row drag-scroll"
        id="watch-history-row"
        style={{ cursor: 'grab' }}
      >
        {items.map(item => {
          const isChannel = item.type === 'canal';
          const isSeries = item.type === 'serie';

          return (
            <div
              key={item.id}
              className="wh-card"
              onClick={() => handleCardClick(item)}
              tabIndex="0"
              id={`wh-card-${item.id}`}
            >
              {/* Poster Image / Backdrop */}
              <div className="wh-card-media">
                <img
                  src={item.poster || item.backdrop}
                  alt={item.title}
                  loading="lazy"
                  onError={e => {
                    e.target.style.display = 'none';
                  }}
                />

                {/* Badge: Canal AO VIVO or Series Season/Episode */}
                {isChannel && (
                  <div className="wh-live-badge">
                    <span className="wh-live-dot" /> AO VIVO
                  </div>
                )}
                {isSeries && item.season && (
                  <div className="wh-ep-badge">
                    T{item.season}:E{item.episode || 1}
                  </div>
                )}

                {/* Remove from history button */}
                <button
                  className="wh-remove-btn"
                  title="Remover do histórico"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  ✕
                </button>

                {/* Hover Play button */}
                <div className="wh-play-overlay">
                  <div className="wh-play-btn">
                    <PlayIcon />
                  </div>
                </div>

                {/* Progress bar at the bottom */}
                {!isChannel && item.percentage > 0 && (
                  <div className="wh-progress-wrap">
                    <div
                      className="wh-progress-bar"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Title & info */}
              <div className="wh-card-info">
                <div className="wh-card-title">{item.title}</div>
                <div className="wh-card-sub">
                  {isChannel ? (
                    <span style={{ color: '#10b981' }}>Canal Ao Vivo</span>
                  ) : isSeries ? (
                    <span style={{ color: '#a78bfa' }}>
                      {item.episodeTitle || `Episódio ${item.episode || 1}`}
                    </span>
                  ) : item.percentage > 0 ? (
                    <span>{item.percentage}% assistido</span>
                  ) : (
                    <span>Assistido recentemente</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
