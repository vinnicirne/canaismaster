import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMovies,
  fetchSeriesList,
  fetchChannels,
} from '../api';
import ScrollRow from '../components/ScrollRow';
import WatchHistoryRow from '../components/WatchHistoryRow';
import PlayerModal from '../components/PlayerModal';
import { getWatchHistory, removeFromWatchHistory, clearWatchHistory } from '../history';
import { requestFullscreenSafe } from '../utils/fullscreen';
import { ensureTvFocus } from '../utils/tvNavigation';

// ── Icons ────────────────────────────────────────────────────────────────────
const PlayIcon  = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 3 19 12 5 21"/></svg>;
const StarIcon  = () => <svg viewBox="0 0 24 24" fill="#f59e0b" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({ items, onPlay }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((idx) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 350);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    timerRef.current = setInterval(() => {
      goTo((current + 1) % items.length);
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, [current, items.length, goTo]);

  if (!items.length) {
    return (
      <div className="hero" style={{ background: 'linear-gradient(135deg, #0a0a0f, #1a0a1e)' }}>
        <div className="hero-bg-overlay" />
        <div className="hero-content">
          <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 16, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 400, height: 60, marginBottom: 12, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 320, height: 20, marginBottom: 8, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: 280, height: 20, marginBottom: 24, borderRadius: 4 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ width: 150, height: 48, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 130, height: 48, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  const item = items[current] || items[0];

  return (
    <section className="hero" id="hero-banner">
      <div
        className={`hero-bg${transitioning ? ' hero-bg--fade' : ''}`}
        style={{
          backgroundImage: `url(${item.backdrop || item.poster})`,
          backgroundPosition: 'center top',
        }}
      />
      <div className="hero-gradient-overlay" />
      <div className="hero-content">
        <div className="hero-badges">
          <span className="hero-badge hero-badge--trending">
            🔥 DESTAQUE NEWS TTR
          </span>
          <span className="hero-badge hero-badge--type">
            FILME
          </span>
          {item.year && <span className="hero-meta-item">{item.year}</span>}
          {item.rating && (
            <span className="hero-meta-item hero-rating">
              <StarIcon /> {item.rating}
            </span>
          )}
        </div>

        <h1 className="hero-title">{item.title}</h1>
        {item.overview && (
          <p className="hero-overview">{item.overview}</p>
        )}

        <div className="hero-actions">
          <button
            id="hero-play-btn"
            className="btn-primary"
            onClick={() => onPlay(item)}
            aria-label={`Assistir ${item.title}`}
          >
            <PlayIcon /> Assistir Agora
          </button>
        </div>
      </div>

      <div className="hero-dots" role="tablist">
        {items.slice(0, 7).map((it, idx) => (
          <button
            key={it.id || idx}
            role="tab"
            aria-selected={idx === current}
            className={`hero-dot${idx === current ? ' active' : ''}`}
            onClick={() => goTo(idx)}
            aria-label={`Ir para banner ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [cinemaMovies,   setCinemaMovies]   = useState([]);
  const [netflixSeries,  setNetflixSeries]  = useState([]);
  const [globoSeries,    setGloboSeries]    = useState([]);
  const [channels,       setChannels]       = useState([]);
  const [watchHistory,   setWatchHistory]   = useState([]);

  const [loadingMovies,   setLoadingMovies]   = useState(true);
  const [loadingSeries,   setLoadingSeries]   = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);

  // Sync Watch History from localStorage & events
  useEffect(() => {
    setWatchHistory(getWatchHistory());

    const handleHistoryUpdate = (e) => {
      setWatchHistory(e.detail || getWatchHistory());
    };
    window.addEventListener('mastercanais:history-updated', handleHistoryUpdate);
    return () => window.removeEventListener('mastercanais:history-updated', handleHistoryUpdate);
  }, []);

  useEffect(() => {
    // 1. Real Lançamentos from NEWS TTR
    fetchMovies({ page: 1, categoryId: '1294', pageSize: 20 })
      .then(res => {
        const list = res.results || [];
        setFeaturedMovies(list);
        setLoadingMovies(false);
        setTimeout(ensureTvFocus, 250);
      })
      .catch(() => {
        setLoadingMovies(false);
      });

    // 2. Real Cinema movies from NEWS TTR
    fetchMovies({ page: 1, categoryId: '1293', pageSize: 20 })
      .then(res => setCinemaMovies(res.results || []))
      .catch(() => {});

    // 3. Real Netflix Series from NEWS TTR
    fetchSeriesList({ page: 1, categoryId: '1295', pageSize: 20 })
      .then(res => {
        setNetflixSeries(res.results || []);
        setLoadingSeries(false);
      })
      .catch(() => setLoadingSeries(false));

    // 4. Real Globoplay & Nacionais Series from NEWS TTR
    fetchSeriesList({ page: 1, categoryId: '1307', pageSize: 20 })
      .then(res => setGloboSeries(res.results || []))
      .catch(() => {});

    // 5. Live Channels from NEWS TTR
    fetchChannels(1)
      .then(data => {
        setChannels(data.slice(0, 32));
        setLoadingChannels(false);
        setTimeout(ensureTvFocus, 300);
      })
      .catch(() => setLoadingChannels(false));
  }, []);

  const handlePlay = useCallback((item) => {
    requestFullscreenSafe();
    setSelectedItem(item);
  }, []);

  const handleRemoveHistory = useCallback((id) => {
    removeFromWatchHistory(id);
    setWatchHistory(getWatchHistory());
  }, []);

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Deseja realmente limpar todo o histórico de assistidos?')) {
      clearWatchHistory();
      setWatchHistory([]);
    }
  }, []);

  return (
    <div className="page-content" id="home-page">
      <HeroBanner items={featuredMovies} onPlay={handlePlay} />

      {/* ⏳ Continuar Assistindo (Histórico) */}
      <WatchHistoryRow
        items={watchHistory}
        onPlay={handlePlay}
        onRemove={handleRemoveHistory}
        onClear={handleClearHistory}
      />

      {/* 🔴 Canais Ao Vivo da Grade */}
      <ScrollRow
        title="🔴 Canais ao Vivo"
        items={channels}
        loading={loadingChannels}
        onCard={handlePlay}
        type="channel"
        linkTo="/canais"
      />

      <ScrollRow title="🔥 Lançamentos Recentes"       items={featuredMovies} loading={loadingMovies}   onCard={handlePlay} linkTo="/filmes" />
      <ScrollRow title="🎬 Filmes em Destaque & Cinema" items={cinemaMovies}   loading={loadingMovies}   onCard={handlePlay} linkTo="/filmes" />
      <ScrollRow title="📺 Séries Netflix"             items={netflixSeries}  loading={loadingSeries}   onCard={handlePlay} linkTo="/series" />
      <ScrollRow title="⭐ Séries Globoplay & Nacionais" items={globoSeries}   loading={loadingSeries}   onCard={handlePlay} linkTo="/series" />

      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

