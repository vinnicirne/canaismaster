import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchChannels, fetchLiveCategories } from '../api';
import { ChannelCard, SkeletonCard } from '../components/Cards';
import PlayerModal from '../components/PlayerModal';

const QUICK_CATEGORIES = [
  { id: 'all',  name: 'Todos os Canais', icon: '📡' },
  { id: '2',    name: 'Abertos',          icon: '📺' },
  { id: '10',   name: 'Esportes',         icon: '⚽' },
  { id: '20',   name: 'Premiere',         icon: '🏆' },
  { id: '13',   name: 'Filmes & Séries',  icon: '🍿' },
  { id: '14',   name: 'HBO',              icon: '🎬' },
  { id: '24',   name: 'Telecine',         icon: '🎥' },
  { id: '18',   name: 'Notícias',         icon: '📰' },
  { id: '16',   name: 'Infantil',         icon: '🧒' },
  { id: '8',    name: 'Documentários',    icon: '🌍' },
  { id: '1163', name: '24/7 Filmes',      icon: '⭐' },
  { id: '1164', name: '24/7 Desenhos',    icon: '🎨' },
];

export default function ChannelsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allCategories, setAllCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');

  // Load category list on mount
  useEffect(() => {
    fetchLiveCategories().then(cats => {
      if (cats && cats.length > 0) {
        setAllCategories(cats);
      }
    });
  }, []);

  // Load channels when category or page 1 triggers
  const loadChannelList = useCallback(async (catId, pg = 1) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const activeCat = catId === 'all' ? null : catId;
      const data = await fetchChannels({
        page: pg,
        categoryId: activeCat,
        pageSize: 36,
      });

      if (pg === 1) {
        setItems(data);
      } else {
        setItems(prev => [...prev, ...data]);
      }
      setHasMore(data.length >= 36);
      setPage(pg);
    } catch (err) {
      console.warn('[ChannelsPage] load error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadChannelList(selectedCategory, 1);
  }, [selectedCategory, loadChannelList]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    loadChannelList(selectedCategory, page + 1);
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setPage(1);
    setSearch('');
  };

  const displayed = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i => (i.title || '').toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="page-content" id="channels-page">
      <div className="page-hero" style={{ paddingBottom: 'var(--space-md)' }}>
        <h1 className="page-hero-title">📡 Canais ao Vivo</h1>
        <p className="page-hero-subtitle">NEWS TTR IPTV — Grade completa em alta definição</p>
      </div>

      {/* Filter and Search Container */}
      <div style={{
        padding: '0 var(--space-xl) var(--space-md)',
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', minWidth: 280, maxWidth: 400, flex: 1 }}>
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
            placeholder="Buscar canal (ex: Globo, ESPN, HBO)..."
            style={{
              width: '100%',
              padding: '10px 40px 10px 42px',
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
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* All Categories Dropdown */}
        {allCategories.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Todas as Categorias:</span>
            <select
              value={selectedCategory}
              onChange={e => handleCategorySelect(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all">🌐 Todas as Categorias ({allCategories.length})</option>
              {allCategories.map(c => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Category Tabs */}
      <div className="filter-bar" style={{ paddingBottom: 'var(--space-md)' }}>
        {QUICK_CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`cat-btn-${cat.id}`}
              className={`filter-btn${isActive ? ' active' : ''}`}
              onClick={() => handleCategorySelect(cat.id)}
            >
              <span style={{ marginRight: 6 }}>{cat.icon}</span>
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div style={{
        padding: '0 var(--space-xl) var(--space-lg)',
        maxWidth: 1600,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-full)',
          padding: '6px 16px', border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 1.2s infinite' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {loading ? 'Carregando canais...' : `${displayed.length} canais transmitindo`}
          </span>
        </div>
      </div>

      {/* Channel Grid */}
      {loading ? (
        <div className="channel-grid">
          {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} type="channel" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📡</div>
          <div className="empty-state-text">
            {search ? `Nenhum canal encontrado para "${search}"` : 'Nenhum canal disponível nesta categoria'}
          </div>
        </div>
      ) : (
        <div className="channel-grid" id="channels-grid">
          {displayed.map(item => (
            <ChannelCard key={item.id || item.stream_id || item.title} item={item} onClick={setSelectedItem} />
          ))}
          {loadingMore && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`more-${i}`} type="channel" />)}
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && !search && (
        <div className="load-more-container" style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
          <button
            id="load-more-channels-btn"
            className="btn-load-more"
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '12px 32px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-white)',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'var(--font-family)',
              transition: 'all 200ms',
            }}
          >
            {loadingMore ? 'Carregando mais canais...' : 'Carregar Mais Canais'}
          </button>
        </div>
      )}

      {/* Player Modal */}
      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
