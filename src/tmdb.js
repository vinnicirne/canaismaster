// =====================================================
//  TMDB API Service
//  Base: https://api.themoviedb.org/3
//  Language: pt-BR
// =====================================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p';

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlN2FlNDgxMzlhZWI4MDc3ODg1YjU4MjU0ZDg1NGY0OSIsIm5iZiI6MTc5MDM4Nzg1Ni45MjMsInN1YiI6IjZhYjcyNjkwMjRhNTAzOGY4NDFhOTczMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pwlrizDQnfJTO97wSobwgCJeNZ2qm6kVCL9juQGP3HY';

const HEADERS = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Image helpers ─────────────────────────────────────────────────────────────
export const tmdbPoster   = (path, size = 'w342')  => path ? `${TMDB_IMG}/${size}${path}` : '';
export const tmdbBackdrop = (path, size = 'w1280') => path ? `${TMDB_IMG}/${size}${path}` : '';
export const tmdbLogo     = (path, size = 'w154')  => path ? `${TMDB_IMG}/${size}${path}` : '';

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('language', 'pt-BR');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

// ── Normalise TMDB item → common shape ───────────────────────────────────────
export function normaliseTmdb(item, mediaType) {
  const type = mediaType || item.media_type || (item.title ? 'movie' : 'tv');
  const isMovie = type === 'movie';
  return {
    tmdb_id   : item.id,
    id        : item.id,
    imdb_id   : item.imdb_id || null,
    type      : isMovie ? 'movie' : 'serie',
    title     : item.title || item.name || '',
    original  : item.original_title || item.original_name || '',
    overview  : item.overview || '',
    poster    : tmdbPoster(item.poster_path),
    backdrop  : tmdbBackdrop(item.backdrop_path),
    year      : (item.release_date || item.first_air_date || '').slice(0, 4),
    rating    : item.vote_average ? item.vote_average.toFixed(1) : '',
    votes     : item.vote_count || 0,
    popularity: item.popularity || 0,
    genres    : (item.genres || []).map(g => g.name),
    genre_ids : item.genre_ids || [],
    runtime   : item.runtime || item.episode_run_time?.[0] || null,
    seasons   : item.number_of_seasons || null,
    episodes  : item.number_of_episodes || null,
    tagline   : item.tagline || '',
    status    : item.status || '',
    adult     : item.adult || false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRENDING
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchTrending(type = 'all', window = 'week') {
  // type: 'all' | 'movie' | 'tv'
  const data = await tmdbFetch(`/trending/${type}/${window}`);
  return (data.results || []).map(i => normaliseTmdb(i));
}

// ─────────────────────────────────────────────────────────────────────────────
//  MOVIES
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPopularMovies(page = 1) {
  const data = await tmdbFetch('/movie/popular', { page });
  return {
    results    : (data.results || []).map(i => normaliseTmdb(i, 'movie')),
    totalPages : data.total_pages || 1,
    page       : data.page || 1,
  };
}

export async function fetchTopRatedMovies(page = 1) {
  const data = await tmdbFetch('/movie/top_rated', { page });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'movie')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchNowPlayingMovies(page = 1) {
  const data = await tmdbFetch('/movie/now_playing', { page });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'movie')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchMovieDetails(tmdbId) {
  const data = await tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: 'credits,videos,similar',
  });
  return normaliseTmdb(data, 'movie');
}

export async function fetchMoviesByGenre(genreId, page = 1) {
  const data = await tmdbFetch('/discover/movie', {
    with_genres      : genreId,
    sort_by          : 'popularity.desc',
    page,
    'vote_count.gte' : 50,
  });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'movie')),
    totalPages: data.total_pages || 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERIES / TV
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchPopularSeries(page = 1) {
  const data = await tmdbFetch('/tv/popular', { page });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'tv')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchTopRatedSeries(page = 1) {
  const data = await tmdbFetch('/tv/top_rated', { page });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'tv')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchAiringTodaySeries(page = 1) {
  const data = await tmdbFetch('/tv/airing_today', { page });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'tv')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchSeriesByGenre(genreId, page = 1) {
  const data = await tmdbFetch('/discover/tv', {
    with_genres      : genreId,
    sort_by          : 'popularity.desc',
    page,
    'vote_count.gte' : 20,
  });
  return {
    results   : (data.results || []).map(i => normaliseTmdb(i, 'tv')),
    totalPages: data.total_pages || 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────────────────────────────────────
export async function searchTmdb(query, page = 1) {
  if (!query || query.trim().length < 2) return { results: [], totalPages: 1 };
  const data = await tmdbFetch('/search/multi', { query: query.trim(), page });
  const filtered = (data.results || []).filter(i =>
    (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path
  );
  return {
    results   : filtered.map(i => normaliseTmdb(i)),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchSeriesSearch(query, page = 1) {
  if (!query || query.trim().length < 2) return { results: [], totalPages: 1 };
  const data = await tmdbFetch('/search/tv', { query: query.trim(), page });
  const filtered = (data.results || []).filter(i => i.poster_path);
  return {
    results   : filtered.map(i => normaliseTmdb(i, 'tv')),
    totalPages: data.total_pages || 1,
  };
}

export async function fetchMovieSearch(query, page = 1) {
  if (!query || query.trim().length < 2) return { results: [], totalPages: 1 };
  const data = await tmdbFetch('/search/movie', { query: query.trim(), page });
  const filtered = (data.results || []).filter(i => i.poster_path);
  return {
    results   : filtered.map(i => normaliseTmdb(i, 'movie')),
    totalPages: data.total_pages || 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  GENRES
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMovieGenres() {
  const data = await tmdbFetch('/genre/movie/list');
  return data.genres || [];
}

export async function fetchTvGenres() {
  const data = await tmdbFetch('/genre/tv/list');
  return data.genres || [];
}

// Common genres with IDs (pt-BR names) — pre-seeded to avoid extra requests
export const MOVIE_GENRES = [
  { id: 28,    name: 'Ação' },
  { id: 12,    name: 'Aventura' },
  { id: 16,    name: 'Animação' },
  { id: 35,    name: 'Comédia' },
  { id: 80,    name: 'Crime' },
  { id: 99,    name: 'Documentário' },
  { id: 18,    name: 'Drama' },
  { id: 10751, name: 'Família' },
  { id: 14,    name: 'Fantasia' },
  { id: 27,    name: 'Terror' },
  { id: 9648,  name: 'Mistério' },
  { id: 10749, name: 'Romance' },
  { id: 878,   name: 'Ficção Científica' },
  { id: 53,    name: 'Thriller' },
  { id: 10752, name: 'Guerra' },
];

export const TV_GENRES = [
  { id: 10759, name: 'Ação & Aventura' },
  { id: 16,    name: 'Animação' },
  { id: 35,    name: 'Comédia' },
  { id: 99,    name: 'Documentário' },
  { id: 18,    name: 'Drama' },
  { id: 10751, name: 'Família' },
  { id: 10765, name: 'Ficção Científica' },
  { id: 9648,  name: 'Mistério' },
  { id: 10763, name: 'Notícias' },
  { id: 10766, name: 'Novela' },
  { id: 10764, name: 'Reality' },
  { id: 10767, name: 'Talk Show' },
  { id: 37,    name: 'Faroeste' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SERIES DETAIL — seasons list + episodes per season
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns full series detail including seasons array.
 * seasons[] = [{ id, name, season_number, episode_count, poster_path, air_date, overview }]
 */
export async function fetchSeriesDetail(tmdbId) {
  const data = await tmdbFetch(`/tv/${tmdbId}`);
  return {
    ...normaliseTmdb(data, 'tv'),
    seasons: (data.seasons || [])
      .filter(s => s.season_number > 0)   // exclude specials (S0)
      .map(s => ({
        id            : s.id,
        number        : s.season_number,
        name          : s.name || `Temporada ${s.season_number}`,
        episodeCount  : s.episode_count,
        poster        : tmdbPoster(s.poster_path, 'w185'),
        airDate       : s.air_date || '',
        overview      : s.overview || '',
      })),
  };
}

/**
 * Returns all episodes for a specific season.
 * episodes[] = [{ id, number, name, overview, still, airDate, runtime, rating }]
 */
export async function fetchSeasonEpisodes(tmdbId, seasonNumber) {
  const data = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`);
  return (data.episodes || []).map(ep => ({
    id       : ep.id,
    number   : ep.episode_number,
    season   : ep.season_number,
    name     : ep.name || `Episódio ${ep.episode_number}`,
    overview : ep.overview || '',
    still    : ep.still_path ? `${TMDB_IMG}/w300${ep.still_path}` : '',
    airDate  : ep.air_date || '',
    runtime  : ep.runtime || null,
    rating   : ep.vote_average ? ep.vote_average.toFixed(1) : '',
  }));
}

