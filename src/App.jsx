import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import ChannelsPage from './pages/ChannelsPage';
import PlayerModal from './components/PlayerModal';
import { requestFullscreenSafe } from './utils/fullscreen';
import { initTvNavigation } from './utils/tvNavigation';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-logo">MASTERCANAIS</div>
      <p className="footer-text">
        Canais ao Vivo por{' '}
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
          NEWS TTR
        </span>
        {' '}· Filmes & Séries por{' '}
        <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
          TMDB
        </span>
        {' '}· © {new Date().getFullYear()}
      </p>
    </footer>
  );
}

function NotFound() {
  return (
    <div className="page-content">
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div style={{ fontSize: '5rem' }}>🎬</div>
        <div className="empty-state-text" style={{ fontSize: '1.5rem' }}>Página não encontrada</div>
        <a href="/" className="btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 6, background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontFamily: 'var(--font-family)' }}>
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [globalPlayerItem, setGlobalPlayerItem] = useState(null);

  // Initialize TV Remote Spatial Navigation (D-Pad & Enter & Back)
  useEffect(() => {
    initTvNavigation();
  }, []);

  useEffect(() => {
    const handleGlobalPlay = (e) => {
      if (e.detail) {
        requestFullscreenSafe();
        setGlobalPlayerItem(e.detail);
      }
    };
    window.addEventListener('mastercanais:play', handleGlobalPlay);
    return () => window.removeEventListener('mastercanais:play', handleGlobalPlay);
  }, []);


  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/filmes" element={<MoviesPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/canais" element={<ChannelsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      {globalPlayerItem && (
        <PlayerModal
          item={globalPlayerItem}
          onClose={() => setGlobalPlayerItem(null)}
        />
      )}
    </>
  );
}

