import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { searchTmdb } from '../tmdb';

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await searchTmdb(query);
        setResults(results.slice(0, 8));
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
  }, [query]);

  const handleResultClick = (item) => {
    // Open player inline — pass item via state
    const type = item.type === 'serie' || item.type === 'tv' ? 'series' : 'filmes';
    navigate(`/${type}`, { state: { playItem: item } });
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  };

  const typeLabel = (type) => {
    if (!type) return 'Filme';
    if (type === 'movie') return '🎬 Filme';
    if (type === 'serie' || type === 'tv') return '📺 Série';
    if (type.includes('canal') || type.includes('channel')) return '📡 Canal';
    return '🎬 Filme';
  };

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <NavLink to="/" className="navbar-logo">MASTERCANAIS</NavLink>

      <ul className="navbar-nav">
        <li><NavLink to="/" end>Início</NavLink></li>
        <li><NavLink to="/filmes">Filmes</NavLink></li>
        <li><NavLink to="/series">Séries</NavLink></li>
        <li><NavLink to="/canais">Canais</NavLink></li>
      </ul>

      <div className="navbar-right">
        <div className={`search-container${searchOpen ? ' active' : ''}`}>
          {searchOpen && (
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Buscar filmes, séries, canais..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
            />
          )}
          <button
            id="search-toggle-btn"
            className="search-icon-btn"
            onClick={() => {
              if (searchOpen) { setSearchOpen(false); setQuery(''); setResults([]); }
              else setSearchOpen(true);
            }}
            aria-label="Buscar"
          >
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>

          {searchOpen && (results.length > 0 || searching) && (
            <div className="search-results-dropdown">
              {searching && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Buscando...
                </div>
              )}
              {!searching && results.map(item => (
                <div
                  key={item.id}
                  className="search-result-item"
                  onClick={() => handleResultClick(item)}
                >
                  <img
                    className="search-result-img"
                    src={item.poster || item.logo}
                    alt={item.title}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="search-result-info">
                    <div className="search-result-type">{typeLabel(item.type)}</div>
                    <div className="search-result-title">{item.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      {item.year && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.year}</span>}
                      {item.rating && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>⭐ {item.rating}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!searching && results.length === 0 && query.length >= 2 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
