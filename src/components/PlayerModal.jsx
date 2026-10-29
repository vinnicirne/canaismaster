// PlayerModal — Direct MP4 streaming for Movies & HLS for Channels via NEWS TTR, with clean MultiEmbed/VidSrc fallback
import { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import SeriesPlayer from './SeriesPlayer';
import { playerUrlFromItem, findMovieStream, moviePlayerUrl, IPTV_CONFIG } from '../api';
import './PlayerModal.css';

function LiveOrMoviePlayer({ item, onClose }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [isTheater, setIsTheater] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingStream, setLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Movie servers: 0 = NEWS TTR Direto (MP4), 1 = MultiEmbed, 2 = VidSrc
  const [activeServer, setActiveServer] = useState(0);
  const [directMovieStream, setDirectMovieStream] = useState(null);
  const [searchingMovie, setSearchingMovie] = useState(false);

  const isChannel = (item.type || '').toLowerCase().includes('canal') || (item.type || '').toLowerCase().includes('channel');
  const isMovie = !isChannel && (item.type === 'movie' || (!item.type && !item.seasons));
  const defaultPlayerUrl = playerUrlFromItem(item);
  const tmdbId = item.imdb_id || item.tmdb_id || item.id;

  // Search NEWS TTR for movie on mount
  useEffect(() => {
    if (!isMovie) return;

    let mounted = true;
    setSearchingMovie(true);
    setLoadingStream(true);

    findMovieStream(item.title, item.original)
      .then(stream => {
        if (!mounted) return;
        if (stream && stream.play_url) {
          setDirectMovieStream(stream);
          setActiveServer(0);
        } else {
          // If not found in NEWS TTR VOD, switch to MultiEmbed clean player
          setActiveServer(1);
        }
      })
      .catch(() => {
        if (mounted) setActiveServer(1);
      })
      .finally(() => {
        if (mounted) setSearchingMovie(false);
      });

    return () => { mounted = false; };
  }, [isMovie, item.title, item.original]);

  // Close on Escape (when not in fullscreen)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Handle HLS playback for live channels
  useEffect(() => {
    if (!isChannel || !defaultPlayerUrl) return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(defaultPlayerUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoadingStream(false);
        setStreamError(false);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(e => console.warn('Autoplay prevented:', e));
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setStreamError(true);
              setLoadingStream(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = defaultPlayerUrl;
      const onMeta = () => {
        setLoadingStream(false);
        setStreamError(false);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      };
      const onErr = () => {
        setStreamError(true);
        setLoadingStream(false);
      };
      video.addEventListener('loadedmetadata', onMeta);
      video.addEventListener('error', onErr);

      return () => {
        video.removeEventListener('loadedmetadata', onMeta);
        video.removeEventListener('error', onErr);
      };
    } else {
      video.src = defaultPlayerUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isChannel, defaultPlayerUrl, retryKey]);

  const handleRetry = useCallback(() => {
    setStreamError(false);
    setLoadingStream(true);
    setRetryKey(k => k + 1);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const modalClass = [
    'pmodal-content',
    isTheater ? 'pmodal-content--theater' : '',
    isFullscreen ? 'pmodal-content--fullscreen' : '',
  ].filter(Boolean).join(' ');

  // Determine current active movie stream URL
  const movieDirectUrl = directMovieStream?.play_url || '';
  const movieFallbackUrl = activeServer === 2 ? moviePlayerUrl(tmdbId, 1) : moviePlayerUrl(tmdbId, 0);

  return (
    <div className="pmodal-overlay" onClick={handleOverlayClick} id="player-modal-overlay">
      <div className={modalClass} ref={containerRef} id="player-modal">

        {/* Server Selector Bar for Movies */}
        {isMovie && (
          <div className="pmodal-server-bar">
            <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
              Servidor:
            </span>
            {directMovieStream && (
              <button
                className={`pmodal-server-btn${activeServer === 0 ? ' active' : ''}`}
                onClick={() => { setActiveServer(0); setLoadingStream(false); }}
              >
                <span>🟢</span> NEWS TTR Direto (Sem Anúncios)
              </button>
            )}
            <button
              className={`pmodal-server-btn${activeServer === 1 ? ' active' : ''}`}
              onClick={() => { setActiveServer(1); setLoadingStream(false); }}
            >
              <span>🔵</span> MultiEmbed
            </button>
            <button
              className={`pmodal-server-btn${activeServer === 2 ? ' active' : ''}`}
              onClick={() => { setActiveServer(2); setLoadingStream(false); }}
            >
              <span>🟣</span> VidSrc
            </button>
          </div>
        )}

        {/* Player wrapper */}
        <div className="pmodal-player-wrap">
          {isChannel ? (
            /* Live IPTV Channel (Hls.js) */
            <>
              <div className="pmodal-channel-info-bar">
                {item.logo ? (
                  <img src={item.logo} alt="" className="pmodal-channel-logo" />
                ) : null}
                <span className="pmodal-channel-name">{item.title}</span>
                <span className="pmodal-live-badge">
                  <span className="pmodal-live-dot" />
                  AO VIVO
                </span>
              </div>

              <video
                ref={videoRef}
                id="channel-live-video"
                className="pmodal-video"
                controls
                autoPlay
                playsInline
                title={item.title}
                onWaiting={() => setLoadingStream(true)}
                onPlaying={() => {
                  setLoadingStream(false);
                  setStreamError(false);
                }}
              />

              {loadingStream && !streamError && (
                <div className="pmodal-loading-overlay">
                  <div className="pmodal-spinner" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Sintonizando {item.title}...
                  </span>
                </div>
              )}

              {streamError && (
                <div className="pmodal-error-box">
                  <div style={{ fontSize: '2rem' }}>📡</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    Sinal do canal indisponível no momento
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', maxWidth: 360 }}>
                    Não foi possível carregar a transmissão ao vivo deste canal.
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button className="pmodal-retry-btn" onClick={handleRetry}>
                      Tentar Novamente
                    </button>
                    {IPTV_CONFIG.webplayer && (
                      <a
                        href={IPTV_CONFIG.webplayer}
                        target="_blank"
                        rel="noreferrer"
                        className="pmodal-retry-btn"
                        style={{ background: 'rgba(255,255,255,0.15)', textDecoration: 'none' }}
                      >
                        Abrir Webplayer
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : isMovie && activeServer === 0 && movieDirectUrl ? (
            /* Direct MP4 movie stream from NEWS TTR (Zero Cloudflare!) */
            <>
              <video
                ref={videoRef}
                id="movie-direct-video"
                className="pmodal-video"
                src={movieDirectUrl}
                controls
                autoPlay
                playsInline
                title={item.title}
                onWaiting={() => setLoadingStream(true)}
                onPlaying={() => {
                  setLoadingStream(false);
                  setStreamError(false);
                }}
                onError={() => {
                  console.warn('[DirectMovie] Stream error, switching to fallback server');
                  setActiveServer(1);
                }}
              />

              {searchingMovie && (
                <div className="pmodal-loading-overlay">
                  <div className="pmodal-spinner" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Localizando transmissão HD na sua lista NEWS TTR...
                  </span>
                </div>
              )}
            </>
          ) : (
            /* Clean fallback embed (MultiEmbed / VidSrc - No Cloudflare) */
            <>
              {searchingMovie && (
                <div className="pmodal-loading-overlay">
                  <div className="pmodal-spinner" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Carregando reprodutor...
                  </span>
                </div>
              )}
              <iframe
                ref={iframeRef}
                id="content-player-iframe"
                className="pmodal-iframe"
                src={movieFallbackUrl}
                allowFullScreen
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                title={item.title}
                referrerPolicy="no-referrer"
              />
            </>
          )}

          {/* Top Right Action Bar */}
          <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 999,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <button
              onClick={() => setIsTheater(t => !t)}
              title={isTheater ? 'Modo Normal' : 'Modo Teatro'}
              style={{
                background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <line x1="2" y1="15" x2="22" y2="15" />
              </svg>
            </button>

            <button
              onClick={handleFullscreenToggle}
              title={isFullscreen ? 'Sair da Tela Cheia (F)' : 'Tela Cheia (F)'}
              style={{
                background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>

            <button
              onClick={onClose}
              title="Fechar (Esc)"
              style={{
                background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Description */}
        {!isTheater && !isFullscreen && item.overview && (
          <div className="pmodal-meta">
            <div className="pmodal-meta-title">{item.title}</div>
            {item.year && <div className="pmodal-meta-year">{item.year}</div>}
            <p className="pmodal-meta-desc">{item.overview}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerModal({ item, onClose }) {
  if (!item) return null;

  if (item.type === 'serie' || item.type === 'tv') {
    return <SeriesPlayer item={item} onClose={onClose} />;
  }

  return <LiveOrMoviePlayer item={item} onClose={onClose} />;
}
