import { useState, useEffect } from 'react';
import { fetchChannels } from '../api';
import { ChannelCard, SkeletonCard } from '../components/Cards';
import PlayerModal from '../components/PlayerModal';

export default function ChannelsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchChannels(1).then(d => {
      setItems(d);
      setLoading(false);
      setHasMore(d.length >= 10);
    });
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const data = await fetchChannels(next);
    setItems(prev => [...prev, ...data]);
    setPage(next);
    setHasMore(data.length >= 10);
    setLoadingMore(false);
  };

  const displayed = search.trim()
    ? items.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="page-content" id="channels-page">
      <div className="page-hero" style={{ paddingBottom: 'var(--space-xl)' }}>
        <h1 className="page-hero-title">📡 Canais ao Vivo</h1>
        <p className="page-hero-subtitle">Televisão em tempo real — clique e assista</p>
      </div>

      {/* Channel search */}
      <div style={{
        padding: '0 var(--space-xl) var(--space-lg)',
        maxWidth: 1600,
        margin: '0 auto',
      }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <svg
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            id="channels-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar canais..."
            style={{
              width: '100%',
              padding: '10px 16px 10px 44px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-base)',
              outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-purple)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        padding: '0 var(--space-xl) var(--space-lg)',
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-full)',
          padding: '6px 16px', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 1.2s infinite' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {displayed.length} canais ao vivo
          </span>
        </div>
      </div>

      {loading ? (
        <div className="channel-grid">
          {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} type="channel" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📡</div>
          <div className="empty-state-text">
            {search ? `Nenhum canal com "${search}"` : 'Nenhum canal disponível'}
          </div>
        </div>
      ) : (
        <div className="channel-grid" id="channels-grid">
          {displayed.map(item => (
            <ChannelCard key={item.id || item.title} item={item} onClick={setSelectedItem} />
          ))}
          {loadingMore && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`more-${i}`} type="channel" />)}
        </div>
      )}

      {!loading && hasMore && !search && (
        <div className="load-more-container">
          <button
            id="load-more-channels-btn"
            className="btn-load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Carregando...' : 'Carregar Mais Canais'}
          </button>
        </div>
      )}

      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
