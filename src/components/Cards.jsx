import { useState } from 'react';

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

export function MediaCard({ item, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="media-card" onClick={() => onClick(item)} id={`card-${item.id}`} tabIndex="0">
      {!imgError && item.poster ? (
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: '100%',
          aspectRatio: '2/3',
          background: 'linear-gradient(135deg, #1e1e2a 0%, #16161f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '0.7rem',
          textAlign: 'center',
          padding: '8px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <rect x="2" y="2" width="20" height="20" rx="3"/>
            <path d="M8 12l3 3 5-5"/>
          </svg>
          <span style={{ opacity: 0.5 }}>{item.title?.slice(0, 20)}</span>
        </div>
      )}
      <div className="media-card-overlay">
        <button className="play-btn-sm" aria-label={`Assistir ${item.title}`}>
          <PlayIcon />
        </button>
      </div>
      <div className="media-card-info">
        <div className="media-card-title">{item.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {item.year && <div className="media-card-meta">{item.year}</div>}
          {item.rating && (
            <div className="media-card-rating">⭐ {item.rating}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChannelCard({ item, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="channel-card" onClick={() => onClick(item)} id={`channel-${item.id}`} tabIndex="0">
      <div className="channel-live-badge">
        <div className="channel-live-dot" />
        AO VIVO
      </div>
      {!imgError && (item.logo || item.poster) ? (
        <img
          className="channel-logo"
          src={item.logo || item.poster}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, #7c3aed, #e50914)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: 900, color: 'white',
        }}>
          {item.title?.charAt(0)?.toUpperCase() || 'C'}
        </div>
      )}
      <div className="channel-name">{item.title}</div>
    </div>
  );
}

export function SkeletonCard({ type = 'media' }) {
  if (type === 'channel') {
    return <div className="skeleton skeleton-channel" />;
  }
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-card-img" style={{ aspectRatio: '2/3' }} />
    </div>
  );
}
