import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchPopularSeries,
  fetchTopRatedSeries,
  fetchAiringTodaySeries,
  fetchSeriesByGenre,
  fetchSeriesSearch,
  TV_GENRES,
} from '../tmdb';
import { MediaCard, SkeletonCard } from '../components/Cards';
import PlayerModal from '../components/PlayerModal';

const TABS = [
  { id: 'popular',      label: '🔥 Populares',       fetch: fetchPopularSeries },
  { id: 'top_rated',    label: '⭐ Mais Avaliadas',   fetch: fetchTopRatedSeries },
  { id: 'airing_today', label: '📡 Estreando Hoje',   fetch: fetchAiringTodaySeries },
];

export default function SeriesPage() {
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [activeTab,    setActiveTab]    = useState('popular');
  const [activeGenre,  setActiveGenre]  = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search,       setSearch]       = useState('');
  
  const searchDebounce = useRef(null);

  const loadItems = useCallback(async (tab, genre, sq, pg = 1) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      let res;
      if (sq && sq.trim().length > 1) {
        res = await fetchSeriesSearch(sq, pg);
      } else if (genre) {
        res = await fetchSeriesByGenre(genre, pg);
      } else {
        const fetchFn = TABS.find(t => t.id === tab)?.fetch || fetchPopularSeries;
        res = await fetchFn(pg);
      }
      setItems(prev => pg === 1 ? res.results : [...prev, ...res.results]);
      setTotalPages(res.totalPages);
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
      loadItems(activeTab, activeGenre, search, 1);
    }, 400);
  }, [activeTab, activeGenre, search, loadItems]);

  const handleTabChange = (tab) => { setActiveTab(tab); setActiveGenre(null); setSearch(''); };
  const handleGenre     = (id)  => { setActiveGenre(g => g === id ? null : id); setActiveTab('popular'); setSearch(''); };
  const loadMore        = ()    => loadItems(activeTab, activeGenre, search, page + 1);

  return (
    <div className="page-content" id="series-page">
      <div className="page-hero" style={{ paddingBottom: 'var(--space-md)' }}>
        <h1 className="page-hero-title">📺 Séries</h1>
        <p className="page-hero-subtitle">Séries, Animes e Doramas para maratonar</p>
      </div>

      <div style={{ padding: '0 var(--space-xl) var(--space-lg)', maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto' }}>
          <svg
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar séries pelo nome..."
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-family)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 200ms',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent-red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-series-${t.id}`}
            className={`filter-btn${activeTab === t.id && !activeGenre ? ' active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="filter-bar" style={{ paddingTop: 0 }}>
        {TV_GENRES.map(g => (
          <button
            key={g.id}
            id={`genre-tv-${g.id}`}
            className={`filter-btn${activeGenre === g.id ? ' active' : ''}`}
            style={{ fontSize: '0.72rem' }}
            onClick={() => handleGenre(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="media-grid">
          {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-text">Nenhuma série encontrada</div>
        </div>
      ) : (
        <div className="media-grid" id="series-grid">
          {items.map(item => (
            <MediaCard key={item.tmdb_id} item={item} onClick={setSelectedItem} />
          ))}
          {loadingMore && Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
        </div>
      )}

      {!loading && page < totalPages && (
        <div className="load-more-container">
          <button id="load-more-series-btn" className="btn-load-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar Mais'}
          </button>
        </div>
      )}

      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
