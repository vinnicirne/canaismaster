import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import ChannelsPage from './pages/ChannelsPage';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-logo">MASTERCANAIS</div>
      <p className="footer-text">
        Conteúdo fornecido por{' '}
        <a href="https://superflixapi.quest" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
          SuperFlixAPI
        </a>
        {' '} · © {new Date().getFullYear()}
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
    </>
  );
}
