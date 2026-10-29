import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSeriesDetail, fetchSeasonEpisodes } from '../tmdb';
import { findSeriesEpisodeStream, seriePlayerUrl, fetchSeriesDetailsAndEpisodes } from '../api';
import './SeriesPlayer.css';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <polygon points="5 3 19 12 5 21" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="#f59e0b" width="11" height="11">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Episode Card ──────────────────────────────────────────────────────────────
function EpisodeCard({ ep, isActive, onClick }) {
  return (
    <div
      className={`sp-ep-card${isActive ? ' sp-ep-card--active' : ''}`}
      onClick={() => onClick(ep)}
      id={`ep-${ep.season}-${ep.number}`}
    >
      <div className="sp-ep-still">
        {ep.still ? (
          <img src={ep.still} alt={ep.name} loading="lazy" />
        ) : (
          <div className="sp-ep-still-placeholder">
            <IconPlay />
          </div>
        )}
        {isActive && (
          <div className="sp-ep-playing-badge">
            <span className="sp-ep-dot" />
            REPRODUZINDO
          </div>
        )}
        <span className="sp-ep-num-pill">EP {ep.number}</span>
      </div>

      <div className="sp-ep-info">
        <div className="sp-ep-header">
          <span className="sp-ep-title">{ep.name}</span>
        </div>
        <div className="sp-ep-meta">
          {ep.runtime && (
            <span className="sp-ep-runtime">
              <IconClock /> {ep.runtime} min
            </span>
          )}
          {ep.rating && (
            <span className="sp-ep-rating">
              <IconStar /> {ep.rating}
            </span>
          )}
        </div>
        {ep.overview && (
          <p className="sp-ep-overview">{ep.overview}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Series Player ────────────────────────────────────────────────────────
export default function SeriesPlayer({ item, onClose }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(null); // { season, number }
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Server state: 0 = NEWS TTR Direto (MP4), 1 = MultiEmbed, 2 = VidSrc
  const [activeServer, setActiveServer] = useState(0);
  const [directEpStream, setDirectEpStream] = useState(null);
  const [searchingEp, setSearchingEp] = useState(false);

  const tmdbId = item.tmdb_id || item.series_id || item.id;
  const title = detail?.title || item.title || '';

  // ── Load series detail (seasons & episodes) ───────────────────────────────
  useEffect(() => {
    setActiveEp({ season: 1, number: 1 });

    if (item.series_id) {
      // Direct series from NEWS TTR
      setLoadingEpisodes(true);
      fetchSeriesDetailsAndEpisodes(item.series_id)
        .then(d => {
          if (!d) return;
          setDetail({
            title: d.title || item.title,
            year: item.year,
            rating: d.rating || item.rating,
            overview: d.overview,
            seasons: d.seasons,
          });
          setSeasons(d.seasons || []);
          const firstSeason = d.seasons?.[0]?.number || 1;
          setActiveSeason(firstSeason);
          const eps = d.episodesBySeason?.[String(firstSeason)] || [];
          setEpisodes(eps);
          if (eps[0]) {
            setDirectEpStream({ play_url: eps[0].play_url });
            setActiveServer(0);
          }
        })
        .catch(err => console.warn('[SeriesPlayer] direct load error:', err))
        .finally(() => setLoadingEpisodes(false));
    } else {
      // Legacy TMDB fallback
      fetchSeriesDetail(tmdbId)
        .then(d => {
          setDetail(d);
          setSeasons(d.seasons || []);
          const firstSeason = d.seasons?.[0]?.number || 1;
          setActiveSeason(firstSeason);
        })
        .catch(() => {});
    }
  }, [item.series_id, item.title, item.year, item.rating, tmdbId]);

  // ── Load episodes when season changes (for TMDB series) ───────────────────
  useEffect(() => {
    if (item.series_id) return; // Handled directly above
    if (!tmdbId) return;
    setLoadingEpisodes(true);
    fetchSeasonEpisodes(tmdbId, activeSeason)
      .then(eps => {
        setEpisodes(eps);
        setLoadingEpisodes(false);
      })
      .catch(() => setLoadingEpisodes(false));
  }, [item.series_id, tmdbId, activeSeason]);

  // ── Resolve episode stream for TMDB series ────────────────────────────────
  const resolveEpisodeStream = useCallback((seasonNum, epNum) => {
    if (item.series_id) return;
    setSearchingEp(true);
    findSeriesEpisodeStream(title, item.original, seasonNum, epNum)
      .then(stream => {
        if (stream && stream.play_url) {
          setDirectEpStream(stream);
          setActiveServer(0);
        } else {
          setDirectEpStream(null);
          setActiveServer(1);
        }
      })
      .catch(() => {
        setDirectEpStream(null);
        setActiveServer(1);
      })
      .finally(() => {
        setSearchingEp(false);
      });
  }, [item.series_id, title, item.original]);

  useEffect(() => {
    if (!item.series_id && activeEp) {
      resolveEpisodeStream(activeEp.season, activeEp.number);
    }
  }, [item.series_id, activeEp, resolveEpisodeStream]);

  // ── Fullscreen listener ──────────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fn);
    return () => document.removeEventListener('fullscreenchange', fn);
  }, []);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // ── Episode click ────────────────────────────────────────────────────────
  const handleEpisodeClick = useCallback((ep) => {
    setActiveEp({ season: ep.season, number: ep.number });
    if (ep.play_url) {
      setDirectEpStream({ play_url: ep.play_url });
      setActiveServer(0);
    }
  }, []);

  // ── Season change ────────────────────────────────────────────────────────
  const handleSeasonChange = useCallback((seasonNum) => {
    setActiveSeason(seasonNum);
    setActiveEp({ season: seasonNum, number: 1 });
    if (item.series_id) {
      fetchSeriesDetailsAndEpisodes(item.series_id).then(d => {
        const eps = d?.episodesBySeason?.[String(seasonNum)] || [];
        setEpisodes(eps);
        if (eps[0]) {
          setDirectEpStream({ play_url: eps[0].play_url });
          setActiveServer(0);
        }
      });
    }
  }, [item.series_id]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const activeEpData = episodes.find(e => e.number === activeEp?.number && e.season === activeEp?.season);
  const fallbackEmbedUrl = activeServer === 2
    ? seriePlayerUrl(tmdbId, activeEp?.season || 1, activeEp?.number || 1, 1)
    : seriePlayerUrl(tmdbId, activeEp?.season || 1, activeEp?.number || 1, 0);

  const modalClass = [
    'sp-modal',
    isTheater ? 'sp-modal--theater' : '',
    isFullscreen ? 'sp-modal--fullscreen' : '',
    !panelOpen ? 'sp-modal--no-panel' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="sp-overlay" onClick={handleOverlayClick} id="series-player-overlay">
      <div className={modalClass} ref={containerRef} id="series-player-modal">

        {/* ── LEFT / MAIN: Player ── */}
        <div className="sp-player-section">
          {/* Server switcher bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: '#111119', borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Servidor:
            </span>
            {directEpStream && (
              <button
                className={`pmodal-server-btn${activeServer === 0 ? ' active' : ''}`}
                onClick={() => setActiveServer(0)}
              >
                <span>🟢</span> NEWS TTR Direto (Sem Anúncios)
              </button>
            )}
            <button
              className={`pmodal-server-btn${activeServer === 1 ? ' active' : ''}`}
              onClick={() => setActiveServer(1)}
            >
              <span>🔵</span> MultiEmbed
            </button>
            <button
              className={`pmodal-server-btn${activeServer === 2 ? ' active' : ''}`}
              onClick={() => setActiveServer(2)}
            >
              <span>🟣</span> VidSrc
            </button>
          </div>

          <div className="sp-player-wrap">
            {activeServer === 0 && directEpStream ? (
              <video
                ref={videoRef}
                key={directEpStream.play_url}
                className="sp-video"
                src={directEpStream.play_url}
                controls
                autoPlay
                playsInline
                title={title}
                onError={() => setActiveServer(1)}
              />
            ) : (
              <iframe
                ref={iframeRef}
                className="sp-iframe"
                src={fallbackEmbedUrl}
                allowFullScreen
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                title={title}
                referrerPolicy="no-referrer"
                id="series-iframe"
              />
            )}

            {searchingEp && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#fff',
                zIndex: 10, pointerEvents: 'none',
              }}>
                <div className="pmodal-spinner" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Localizando episódio na sua lista NEWS TTR...
                </span>
              </div>
            )}
          </div>

          {/* Episode info strip */}
          {activeEpData && (
            <div className="sp-now-playing">
              <span className="sp-now-playing-label">ASSISTINDO</span>
              <span className="sp-now-playing-ep">
                T{activeEp.season}E{String(activeEp.number).padStart(2, '0')} — {activeEpData.name}
              </span>
              <button
                className="sp-panel-toggle"
                onClick={() => setPanelOpen(o => !o)}
                title={panelOpen ? 'Ocultar episódios' : 'Mostrar episódios'}
              >
                {panelOpen ? 'Ocultar Lista' : 'Ver Episódios'}
              </button>
            </div>
          )}

          {/* Series Meta strip */}
          <div className="sp-bottom-bar">
            <div className="sp-series-meta">
              <span className="sp-series-title">{title}</span>
              {detail?.year && <span className="sp-series-year">{detail.year}</span>}
              {detail?.rating && <span className="sp-series-rating">⭐ {detail.rating}</span>}
              {detail?.seasons && (
                <span className="sp-series-seasons-badge">
                  {detail.seasons.length} {detail.seasons.length === 1 ? 'Temporada' : 'Temporadas'}
                </span>
              )}
            </div>

            <div className="sp-player-actions">
              <button
                className="sp-action-btn"
                onClick={() => setIsTheater(t => !t)}
                title={isTheater ? 'Modo Normal' : 'Modo Expandido'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <line x1="2" y1="15" x2="22" y2="15" />
                </svg>
              </button>
              <button
                className="sp-action-btn"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen?.().catch(() => {});
                  } else {
                    document.exitFullscreen?.().catch(() => {});
                  }
                }}
                title="Tela Cheia"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              <button className="sp-action-btn sp-close-btn" onClick={onClose} title="Fechar (Esc)">
                <IconClose />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Season & Episode Panel ── */}
        {panelOpen && (
          <aside className="sp-panel" id="series-episodes-panel">
            <div className="sp-panel-header">
              <div className="sp-season-select-wrap">
                <select
                  id="season-selector"
                  className="sp-season-select"
                  value={activeSeason}
                  onChange={e => handleSeasonChange(Number(e.target.value))}
                >
                  {seasons.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.name || `Temporada ${s.number}`} ({s.episode_count} eps)
                    </option>
                  ))}
                </select>
                <div className="sp-select-arrow"><IconChevronDown /></div>
              </div>
            </div>

            <div className="sp-ep-list" id="episodes-list">
              {loadingEpisodes ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="sp-ep-skeleton" />
                ))
              ) : episodes.length === 0 ? (
                <div className="sp-ep-empty">
                  <span>Nenhum episódio encontrado para esta temporada.</span>
                </div>
              ) : (
                episodes.map(ep => (
                  <EpisodeCard
                    key={`${ep.season}-${ep.number}`}
                    ep={ep}
                    isActive={activeEp?.season === ep.season && activeEp?.number === ep.number}
                    onClick={handleEpisodeClick}
                  />
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
