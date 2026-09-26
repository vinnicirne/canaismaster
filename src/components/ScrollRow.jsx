import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDragScroll } from '../hooks/useDragScroll';
import { MediaCard, ChannelCard, SkeletonCard } from './Cards';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/**
 * A horizontal scroll section with drag-to-scroll, arrow nav buttons,
 * section title with accent bar, and optional "Ver Tudo" link.
 */
export default function ScrollRow({ title, items = [], loading = false, onCard, type = 'media', linkTo }) {
  const rowRef = useRef(null);
  useDragScroll(rowRef);

  const scrollBy = (dir) => {
    if (!rowRef.current) return;
    const amount = rowRef.current.offsetWidth * 0.75;
    rowRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="scroll-section" id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Arrow nav buttons */}
          <button
            className="scroll-nav-btn"
            onClick={() => scrollBy('left')}
            aria-label="Rolar esquerda"
            id={`scroll-left-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            className="scroll-nav-btn"
            onClick={() => scrollBy('right')}
            aria-label="Rolar direita"
            id={`scroll-right-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            <ArrowIcon />
          </button>
          {linkTo && (
            <Link to={linkTo} className="section-link">
              Ver Tudo <ArrowIcon />
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={rowRef}
        className="scroll-row drag-scroll"
        id={`row-${title.replace(/\s+/g, '-').toLowerCase()}`}
        style={{ cursor: 'grab' }}
      >
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} type={type} />)
          : items.map(item =>
              type === 'channel'
                ? <ChannelCard key={item.id}                  item={item} onClick={onCard} />
                : <MediaCard   key={item.tmdb_id || item.id}  item={item} onClick={onCard} />
            )
        }
      </div>
    </div>
  );
}
