import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSeriesList, fetchSeriesCategories } from '../api';
import { MediaCard, SkeletonCard } from '../components/Cards';
import PlayerModal from '../components/PlayerModal';

const QUICK_CATEGORIES = [
  { id: '1295', label: '🔴 Netflix' },
  { id: '1307', label: '🟡 Globoplay' },
  { id: '1304', label: '🏰 Disney+' },
  { id: '1297', label: '📦 Prime Video' },
  { id: '1298', label: '🍏 Apple TV+' },
  { id: '1309', label: '💜 Max' },
  { id: '1312', label: '⛰️ Paramount' },
  { id: '1310', label: '📖 Novelas' },
  { id: '1319', label: '🌸 Doramas' },
];

export default function SeriesPage() {
  const [items,            setItems]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [page,             setPage]             = useState(1);
  const [totalPages,       setTotalPages]       = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('1295');
  const [allCategories,    setAllCategories]    = useState([]);
  const [selectedItem,     setSelectedItem]     = useState(null);
  const [search,           setSearch]           = useState('');

  const searchDebounce = useRef(null);

  useEffect(() => {
    fetchSeriesCategories().then(cats => {
      if (cats && cats.length) setAllCategories(cats);
    });
  }, []);

  const loadItems = useCallback(async (catId, sq, pg = 1) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetchSeriesList({
        page: pg,
        categoryId: catId,
        search: sq,
        pageSize: 30,
      });

      const { results, total_pages } = res;
      setItems(prev => pg === 1 ? results : [...prev, ...results]);
      setTotalPages(total_pages);
      setPage(pg);
    } catch (err) {
      console.error('[SeriesPage]', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      loadItems(selectedCategory, search, 1);
    }, 300);
    return () => clearTimeout(searchDebounce.current);
  }, [selectedCategory, search, loadItems]);

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSearch('');
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    loadItems(selectedCategory, search, page + 1);
  };

  return (
    <div className="page-content" id="series-page">
      <div className="page-hero">
        <h1 className="page-hero-title">📺 Séries</h1>
        <p className="page-hero-subtitle">Catálogo oficial NEWS TTR — Temporadas e episódios completos</p>
      </div>

      {/* Search & Category select */}
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
            id="series-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar série no catálogo..."
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
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Plataforma:</span>
            <select
              value={selectedCategory}
              onChange={e => handleCategoryChange(e.target.value)}
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
              {allCategories.map(c => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick category buttons */}
      <div className="filter-bar" style={{ marginBottom: 'var(--space-md)' }}>
        {QUICK_CATEGORIES.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`filter-btn${selectedCategory === t.id && !search ? ' active' : ''}`}
            onClick={() => handleCategoryChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 24 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-text">Nenhuma série encontrada</div>
        </div>
      ) : (
        <div className="media-grid" id="series-grid">
          {items.map(item => (
            <MediaCard key={item.series_id || item.id} item={item} onClick={setSelectedItem} />
          ))}
          {loadingMore && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
        </div>
      )}

      {!loading && page < totalPages && (
        <div className="load-more-container">
          <button
            id="load-more-series-btn"
            className="btn-load-more"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Carregando mais...' : 'Carregar Mais Séries'}
          </button>
        </div>
      )}

      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
