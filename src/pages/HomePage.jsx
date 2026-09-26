import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchTrending,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchPopularSeries,
  fetchAiringTodaySeries,
} from '../tmdb';
import { fetchChannels } from '../api';
import { SkeletonCard } from '../components/Cards';
import ScrollRow from '../components/ScrollRow';
import PlayerModal from '../components/PlayerModal';

// ── Icons ────────────────────────────────────────────────────────────────────
const PlayIcon  = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 3 19 12 5 21"/></svg>;
const InfoIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>;
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

  const item = items[current];

  return (
    <section className="hero" id="hero-banner">
      <div
        className={`hero-bg${transitioning ? ' hero-bg--fade' : ''}`}
        style={{ backgroundImage: `url(${item.backdrop})` }}
      />
      <div className="hero-bg-overlay" />

      <div className="hero-content">
        <div className="hero-badge">
          {item.type === 'movie' ? '🎬 Filme' : '📺 Série'}
          {item.year && <span style={{ opacity: 0.8 }}> · {item.year}</span>}
        </div>

        <h1 className="hero-title">{item.title}</h1>

        {/* Rating */}
        {item.rating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <StarIcon />
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.95rem' }}>{item.rating}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ 10</span>
            {item.genres?.length > 0 && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                · {item.genres.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        )}

        <p className="hero-desc">{item.overview}</p>

        <div className="hero-actions">
          <button
            id={`hero-play-${item.tmdb_id}`}
            className="btn-primary"
            onClick={() => onPlay(item)}
          >
            <PlayIcon /> Assistir Agora
          </button>
          <Link to={item.type === 'movie' ? '/filmes' : '/series'} className="btn-secondary">
            <InfoIcon /> Ver Mais
          </Link>
        </div>
      </div>

      {/* Indicators */}
      <div className="hero-indicators">
        {items.map((_, i) => (
          <div
            key={i}
            className={`hero-dot${i === current ? ' active' : ''}`}
            onClick={() => { clearInterval(timerRef.current); goTo(i); }}
          />
        ))}
      </div>

      {/* Side thumbnail strip */}
      <div className="hero-thumbs">
        {items.map((it, i) => (
          <div
            key={it.tmdb_id}
            className={`hero-thumb${i === current ? ' hero-thumb--active' : ''}`}
            onClick={() => { clearInterval(timerRef.current); goTo(i); }}
          >
            <img src={it.poster} alt={it.title} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Scroll Section ────────────────────────────────────────────────────────────
function ScrollSection({ title, items, loading, onCard, type = 'media', linkTo }) {
  return (
    <div className="section-container">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="section-link">
            Ver Tudo <ArrowIcon />
          </Link>
        )}
      </div>
      <div className="scroll-row" id={`row-${title.replace(/\s/g, '-').toLowerCase()}`}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} type={type} />)
          : items.map(item =>
            type === 'channel'
              ? <ChannelCard key={item.id} item={item} onClick={onCard} />
              : <MediaCard   key={item.tmdb_id || item.id} item={item} onClick={onCard} />
          )
        }
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [trending,      setTrending]      = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topMovies,     setTopMovies]     = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [airingSeries,  setAiringSeries]  = useState([]);
  const [channels,      setChannels]      = useState([]);

  const [loadingHero,    setLoadingHero]    = useState(true);
  const [loadingMovies,  setLoadingMovies]  = useState(true);
  const [loadingSeries,  setLoadingSeries]  = useState(true);
  const [loadingChannels,setLoadingChannels]= useState(true);

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    // Hero — trending all
    fetchTrending('all', 'week')
      .then(data => {
        const withBackdrop = data.filter(i => i.backdrop && i.overview).slice(0, 8);
        setTrending(withBackdrop);
        setLoadingHero(false);
      })
      .catch(() => setLoadingHero(false));

    // Movies
    Promise.all([fetchPopularMovies(1), fetchTopRatedMovies(1)])
      .then(([popular, top]) => {
        setPopularMovies(popular.results.slice(0, 20));
        setTopMovies(top.results.slice(0, 20));
        setLoadingMovies(false);
      })
      .catch(() => setLoadingMovies(false));

    // Series
    Promise.all([fetchPopularSeries(1), fetchAiringTodaySeries(1)])
      .then(([popular, airing]) => {
        setPopularSeries(popular.results.slice(0, 20));
        setAiringSeries(airing.results.slice(0, 20));
        setLoadingSeries(false);
      })
      .catch(() => setLoadingSeries(false));

    // Channels (SuperFlixAPI)
    fetchChannels(1)
      .then(data => { setChannels(data.slice(0, 24)); setLoadingChannels(false); })
      .catch(() => setLoadingChannels(false));
  }, []);

  const handlePlay = useCallback((item) => setSelectedItem(item), []);

  return (
    <div className="page-content" id="home-page">
      <HeroBanner items={trending} onPlay={handlePlay} />

      <ScrollRow title="🔥 Em Alta — Filmes & Séries" items={trending.slice(0, 20)} loading={loadingHero}    onCard={handlePlay} />
      <ScrollRow title="🎬 Filmes Populares"          items={popularMovies}           loading={loadingMovies}  onCard={handlePlay} linkTo="/filmes" />
      <ScrollRow title="⭐ Melhores Avaliados"         items={topMovies}               loading={loadingMovies}  onCard={handlePlay} linkTo="/filmes" />
      <ScrollRow title="📺 Séries Populares"          items={popularSeries}           loading={loadingSeries}  onCard={handlePlay} linkTo="/series" />
      <ScrollRow title="📡 Estreando Hoje"            items={airingSeries}            loading={loadingSeries}  onCard={handlePlay} linkTo="/series" />
      <ScrollRow title="📡 Canais ao Vivo"            items={channels}                loading={loadingChannels} onCard={handlePlay} type="channel" linkTo="/canais" />

      {selectedItem && (
        <PlayerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
