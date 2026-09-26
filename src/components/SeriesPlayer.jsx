import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSeriesDetail, fetchSeasonEpisodes } from '../tmdb';
import PlayerControls from './PlayerControls';
import { playerUrlFromItem } from '../api';
import './SeriesPlayer.css';

function buildEpisodeUrl(tmdbId, season, episode) {
  // A documentação do WarezCDN não especifica parâmetros de temporada/episódio na URL.
  // O player deles tem o próprio seletor embutido.
  return `https://embed.warezcdn.sbs/serie/${tmdbId}`;
}

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
      {/* Still image */}
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
            <span className="sp-ep-playing-dot" />
          </div>
        )}
        <div className="sp-ep-number-badge">
          {ep.season}×{String(ep.number).padStart(2, '0')}
        </div>
      </div>

      {/* Info */}
      <div className="sp-ep-info">
        <div className="sp-ep-name">{ep.name}</div>
        <div className="sp-ep-meta">
          {ep.runtime && (
            <span className="sp-ep-meta-item">
              <IconClock /> {ep.runtime}min
            </span>
          )}
          {ep.rating && (
            <span className="sp-ep-meta-item">
              <IconStar /> {ep.rating}
            </span>
          )}
          {ep.airDate && (
            <span className="sp-ep-meta-item">{ep.airDate.slice(0, 4)}</span>
          )}
        </div>
        {ep.overview && (
          <p className="sp-ep-overview">{ep.overview}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeriesPlayer({ item, onClose }) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const [detail, setDetail] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(null); // { season, number }
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [playerUrl, setPlayerUrl] = useState('');
  const [isTheater, setIsTheater] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const tmdbId = item.tmdb_id || item.id;

  // ── Load series detail (seasons) ─────────────────────────────────────────
  useEffect(() => {
    setLoadingDetail(true);
    setPlayerUrl(buildEpisodeUrl(tmdbId, 1, 1));
    setActiveEp({ season: 1, number: 1 });

    fetchSeriesDetail(tmdbId)
      .then(d => {
        setDetail(d);
        setSeasons(d.seasons || []);
        const firstSeason = d.seasons?.[0]?.number || 1;
        setActiveSeason(firstSeason);
        setLoadingDetail(false);
      })
      .catch(() => setLoadingDetail(false));
  }, [tmdbId]);

  // ── Load episodes when season changes ────────────────────────────────────
  useEffect(() => {
    if (!tmdbId) return;
    setLoadingEpisodes(true);
    fetchSeasonEpisodes(tmdbId, activeSeason)
      .then(eps => {
        setEpisodes(eps);
        setLoadingEpisodes(false);
      })
      .catch(() => setLoadingEpisodes(false));
  }, [tmdbId, activeSeason]);

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
    const url = buildEpisodeUrl(tmdbId, ep.season, ep.number);
    setPlayerUrl(url);
    setActiveEp({ season: ep.season, number: ep.number });
    // Reload iframe
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  }, [tmdbId]);

  // ── Season change ────────────────────────────────────────────────────────
  const handleSeasonChange = useCallback((seasonNum) => {
    setActiveSeason(seasonNum);
    // Auto-play E1 of the new season
    const url = buildEpisodeUrl(tmdbId, seasonNum, 1);
    setPlayerUrl(url);
    setActiveEp({ season: seasonNum, number: 1 });
    if (iframeRef.current) iframeRef.current.src = url;
  }, [tmdbId]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const title = detail?.title || item.title || '';
  const activeEpData = episodes.find(e => e.number === activeEp?.number && e.season === activeEp?.season);

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
          <div className="sp-player-wrap">
            <iframe
              ref={iframeRef}
              className="sp-iframe"
              src={playerUrl}
              allowFullScreen
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              title={title}
              referrerPolicy="no-referrer"
              id="series-iframe"
            />
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
                onClick={() => setPanelOpen(p => !p)}
                title={panelOpen ? 'Ocultar episódios' : 'Mostrar episódios'}
                id="sp-panel-toggle-btn"
              >
                <span style={{ transform: panelOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block', transition: '0.2s' }}>
                  <IconChevronDown />
                </span>
                {panelOpen ? 'Ocultar' : 'Episódios'}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT / BOTTOM: Episode Panel ── */}
        {panelOpen && (
          <div className="sp-panel" id="sp-episode-panel">
            {/* Panel header */}
            <div className="sp-panel-header">
              <div className="sp-panel-title">{title}</div>
              <button className="sp-close-btn" onClick={onClose} id="sp-close-btn" aria-label="Fechar">
                <IconClose />
              </button>
            </div>

            {/* Season tabs */}
            <div className="sp-seasons" id="sp-season-tabs">
              {loadingDetail ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: 90, height: 32, borderRadius: 20, flexShrink: 0 }} />
                ))
              ) : (
                seasons.map(s => (
                  <button
                    key={s.number}
                    id={`season-tab-${s.number}`}
                    className={`sp-season-tab${activeSeason === s.number ? ' sp-season-tab--active' : ''}`}
                    onClick={() => handleSeasonChange(s.number)}
                  >
                    {s.name.replace('Temporada', 'T')}
                    <span className="sp-season-count">{s.episodeCount} eps</span>
                  </button>
                ))
              )}
            </div>

            {/* Season info */}
            {!loadingDetail && seasons.find(s => s.number === activeSeason)?.overview && (
              <div className="sp-season-overview">
                {seasons.find(s => s.number === activeSeason).overview}
              </div>
            )}

            {/* Episodes list */}
            <div className="sp-episodes" id="sp-episodes-list">
              {loadingEpisodes ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10, margin: '0 0 8px' }} />
                ))
              ) : episodes.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum episódio encontrado
                </div>
              ) : (
                episodes.map(ep => (
                  <EpisodeCard
                    key={ep.id}
                    ep={ep}
                    isActive={activeEp?.season === ep.season && activeEp?.number === ep.number}
                    onClick={handleEpisodeClick}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
