// =====================================================
//  Master Canais — API Service & IPTV Integration
//  IPTV Provider: NEWS TTR (Xtream Codes API)
//  Direct Streams: NEWS TTR (MP4 / HLS)
//  Real Covers & Real Catalog for Live TV, Movies & Series
// =====================================================

export const IPTV_CONFIG = {
  name: 'NEWS TTR',
  servers: [
    'https://newsttr2.cloud',
    'https://newsttr2030.shop',
    'https://newsttr4.cloud',
    'https://newsttr5.cloud',
  ],
  defaultServer: 'https://newsttr2.cloud',
  username: '343121432',
  password: '635255733',
  webplayer: 'http://ttrweb.top/login.php',
  m3uUrl: 'http://newsttr2029.news/get.php?username=343121432&password=635255733&type=m3u_plus&output=mpegts',
  hlsUrl: 'http://newsttr2029.news/get.php?username=343121432&password=635255733&type=m3u_plus&output=hls',
  shortM3u: 'http://e.newsttr2029.news/p/343121432/635255733/m3u',
  shortHls: 'http://e.newsttr2029.news/p/343121432/635255733/hls',
  dnsStb: '54.39.74.145',
};


// ── Alternative Clean Embed URLs (No Cloudflare Captcha) ─────────────────────
export function moviePlayerUrl(id, server = 0) {
  if (server === 1) {
    return `https://vidsrc.me/embed/movie?tmdb=${id}`;
  }
  return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
}

export function seriePlayerUrl(id, season = 1, episode = 1, server = 0) {
  if (server === 1) {
    return `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
  }
  return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season || 1}&e=${episode || 1}`;
}

// ── IPTV Live Stream Player URLs ──────────────────────────────────────────────
export function channelStreamUrl(streamId, format = 'm3u8') {
  if (!streamId) return '';
  return `${IPTV_CONFIG.defaultServer}/live/${IPTV_CONFIG.username}/${IPTV_CONFIG.password}/${streamId}.${format}`;
}

export function channelPlayerUrl(id) {
  return channelStreamUrl(id, 'm3u8');
}

// ── Resilient IPTV Fetcher with Proxy & Fallbacks ─────────────────────────────
const CORS_PROXY = (url) =>
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

async function xtreamFetch(action, extraParams = {}) {
  const query = new URLSearchParams({
    username: IPTV_CONFIG.username,
    password: IPTV_CONFIG.password,
    action,
    ...extraParams,
  }).toString();

  // 1. If in Vite dev environment, use the dev server proxy to avoid CORS
  const devUrl = `/iptv-api/player_api.php?${query}`;
  // 2. Direct server URL (works natively in webOS TV / Electron / Smart TVs)
  const directUrl = `${IPTV_CONFIG.defaultServer}/player_api.php?${query}`;
  // 3. Backup server
  const backupUrl = `${IPTV_CONFIG.servers[2]}/player_api.php?${query}`;

  const candidates = [];
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    candidates.push(devUrl);
  }
  candidates.push(directUrl);
  candidates.push(backupUrl);
  candidates.push(CORS_PROXY(directUrl));

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) || (data && typeof data === 'object')) {
        return data;
      }
    } catch {
      // Try next candidate
    }
  }

  throw new Error(`Failed to fetch action ${action} from IPTV server`);
}

// ── Clean title helper for title matching ────────────────────────────────────
export function cleanTitle(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[.*?\]|\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Normalise Real VOD Movie ──────────────────────────────────────────────────
export function normaliseVodMovie(item) {
  const streamId = item.stream_id || item.id;
  const ext = item.container_extension || 'mp4';
  const cleanName = (item.name || item.title || '').replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const poster = item.stream_icon || '';
  return {
    id: String(streamId),
    stream_id: streamId,
    tmdb_id: streamId,
    type: 'movie',
    title: cleanName || item.name || item.title || '',
    raw_title: item.name || item.title || '',
    poster: poster,
    backdrop: poster,
    rating: item.rating ? Number(item.rating).toFixed(1) : (item.rating_5based ? (Number(item.rating_5based) * 2).toFixed(1) : ''),
    year: item.year || (item.name?.match(/\((\d{4})\)/)?.[1] || ''),
    category_id: String(item.category_id || ''),
    category: item.category_name || '',
    container_extension: ext,
    play_url: `${IPTV_CONFIG.defaultServer}/movie/${IPTV_CONFIG.username}/${IPTV_CONFIG.password}/${streamId}.${ext}`,
  };
}

// ── Normalise Real Series Item ────────────────────────────────────────────────
export function normaliseSeriesItem(item) {
  const seriesId = item.series_id || item.id;
  const cleanName = (item.name || item.title || '').replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const backdrop = Array.isArray(item.backdrop_path) ? item.backdrop_path[0] : (item.backdrop_path || item.cover || '');
  return {
    id: String(seriesId),
    series_id: seriesId,
    tmdb_id: seriesId,
    type: 'serie',
    title: cleanName || item.name || item.title || '',
    raw_title: item.name || item.title || '',
    poster: item.cover || '',
    backdrop: backdrop || item.cover || '',
    overview: item.plot || '',
    rating: item.rating ? Number(item.rating).toFixed(1) : (item.rating_5based ? (Number(item.rating_5based) * 2).toFixed(1) : ''),
    year: (item.release_date || item.releaseDate || '').slice(0, 4) || (item.name?.match(/\((\d{4})\)/)?.[1] || ''),
    category_id: String(item.category_id || ''),
    category: item.category_name || '',
    genre: item.genre || '',
  };
}

// ── VOD Movies Categories & Streams (NEWS TTR) ────────────────────────────────
let memoryVodCategories = null;
const memoryVodStreamsByCategory = {};

export async function fetchVodCategories() {
  if (memoryVodCategories) return memoryVodCategories;
  try {
    const data = await xtreamFetch('get_vod_categories');
    if (Array.isArray(data) && data.length > 0) {
      memoryVodCategories = data;
      return data;
    }
  } catch (err) {
    console.warn('[fetchVodCategories] failed:', err);
  }
  return [
    { category_id: '1294', category_name: 'Lançamentos' },
    { category_id: '1293', category_name: 'Cinema' },
    { category_id: '1291', category_name: '4K' },
    { category_id: '1271', category_name: 'Ação' },
    { category_id: '1274', category_name: 'Comédia' },
    { category_id: '1276', category_name: 'Drama' },
    { category_id: '1289', category_name: 'Terror' },
    { category_id: '1281', category_name: 'Infantis' },
  ];
}

export async function fetchMovies({ page = 1, categoryId = '1294', search = '', pageSize = 24 } = {}) {
  try {
    const cat = categoryId || '1294';
    let streams = memoryVodStreamsByCategory[cat];

    if (!streams) {
      const extra = cat !== 'all' ? { category_id: cat } : {};
      const data = await xtreamFetch('get_vod_streams', extra);
      if (Array.isArray(data)) {
        streams = data;
        memoryVodStreamsByCategory[cat] = data;
      } else {
        streams = [];
      }
    }

    let filtered = streams;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(m => (m.name || m.title || '').toLowerCase().includes(q));
    }

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    return {
      results: paginated.map(normaliseVodMovie),
      total_pages: Math.ceil(filtered.length / pageSize) || 1,
      total_results: filtered.length,
    };
  } catch (err) {
    console.warn('[fetchMovies] failed:', err);
    return { results: [], total_pages: 1, total_results: 0 };
  }
}

// ── Series Categories & Streams (NEWS TTR) ────────────────────────────────────
let memorySeriesCategories = null;
const memorySeriesByCategory = {};
const seriesDetailsCache = {};

export async function fetchSeriesCategories() {
  if (memorySeriesCategories) return memorySeriesCategories;
  try {
    const data = await xtreamFetch('get_series_categories');
    if (Array.isArray(data) && data.length > 0) {
      memorySeriesCategories = data;
      return data;
    }
  } catch (err) {
    console.warn('[fetchSeriesCategories] failed:', err);
  }
  return [
    { category_id: '1295', category_name: 'Netflix' },
    { category_id: '1307', category_name: 'Globoplay' },
    { category_id: '1304', category_name: 'Disney Plus' },
    { category_id: '1297', category_name: 'Amazon Prime' },
    { category_id: '1298', category_name: 'Apple TV Plus' },
    { category_id: '1309', category_name: 'Max' },
    { category_id: '1312', category_name: 'Paramount' },
    { category_id: '1310', category_name: 'Novelas' },
  ];
}

export async function fetchSeriesList({ page = 1, categoryId = '1295', search = '', pageSize = 24 } = {}) {
  try {
    const cat = categoryId || '1295';
    let list = memorySeriesByCategory[cat];

    if (!list) {
      const extra = cat !== 'all' ? { category_id: cat } : {};
      const data = await xtreamFetch('get_series', extra);
      if (Array.isArray(data)) {
        list = data;
        memorySeriesByCategory[cat] = data;
      } else {
        list = [];
      }
    }

    let filtered = list;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(s => (s.name || s.title || '').toLowerCase().includes(q));
    }

    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);
    return {
      results: paginated.map(normaliseSeriesItem),
      total_pages: Math.ceil(filtered.length / pageSize) || 1,
      total_results: filtered.length,
    };
  } catch (err) {
    console.warn('[fetchSeriesList] failed:', err);
    return { results: [], total_pages: 1, total_results: 0 };
  }
}

// ── Fetch Full Series Info & Episodes (NEWS TTR) ──────────────────────────────
export async function fetchSeriesDetailsAndEpisodes(seriesId) {
  if (seriesDetailsCache[seriesId]) return seriesDetailsCache[seriesId];

  try {
    const data = await xtreamFetch('get_series_info', { series_id: seriesId });
    if (!data) throw new Error('No series info');

    const epObj = data.episodes || {};
    const seasons = Object.keys(epObj).map(numStr => {
      const sNum = Number(numStr);
      const eps = epObj[numStr] || [];
      return {
        number: sNum,
        name: `Temporada ${sNum}`,
        episode_count: eps.length,
      };
    }).sort((a, b) => a.number - b.number);

    // Format episodes map
    const episodesBySeason = {};
    Object.keys(epObj).forEach(sKey => {
      episodesBySeason[sKey] = (epObj[sKey] || []).map(ep => {
        const ext = ep.container_extension || 'mp4';
        return {
          id: ep.id,
          number: Number(ep.episode_num),
          season: Number(ep.season || sKey),
          name: ep.title || `Episódio ${ep.episode_num}`,
          overview: ep.info?.plot || ep.info?.description || '',
          still: ep.info?.movie_image || ep.info?.cover_big || '',
          runtime: ep.info?.duration_secs ? Math.round(ep.info.duration_secs / 60) : (ep.info?.episode_run_time || null),
          rating: ep.info?.rating ? Number(ep.info.rating).toFixed(1) : '',
          container_extension: ext,
          play_url: `${IPTV_CONFIG.defaultServer}/series/${IPTV_CONFIG.username}/${IPTV_CONFIG.password}/${ep.id}.${ext}`,
        };
      });
    });

    const info = data.info || {};
    const result = {
      series_id: seriesId,
      title: info.name || '',
      overview: info.plot || '',
      cover: info.cover || '',
      backdrop: Array.isArray(info.backdrop_path) ? info.backdrop_path[0] : (info.backdrop_path || info.cover || ''),
      rating: info.rating ? Number(info.rating).toFixed(1) : '',
      seasons,
      episodesBySeason,
    };

    seriesDetailsCache[seriesId] = result;
    return result;
  } catch (err) {
    console.warn('[fetchSeriesDetailsAndEpisodes] failed:', err);
    return null;
  }
}

// ── Search Direct Movie in NEWS TTR ───────────────────────────────────────────
let memoryAllVodCache = null;

export async function findMovieStream(title, originalTitle = '') {
  try {
    if (!memoryAllVodCache) {
      const data = await xtreamFetch('get_vod_streams');
      if (Array.isArray(data)) memoryAllVodCache = data;
    }
    const all = memoryAllVodCache || [];
    if (!all.length) return null;

    const tClean = cleanTitle(title);
    const otClean = cleanTitle(originalTitle);

    let found = all.find(m => {
      const mClean = cleanTitle(m.name || m.title);
      return mClean === tClean || (tClean && mClean.startsWith(tClean + ' '));
    });

    if (!found && otClean) {
      found = all.find(m => {
        const mClean = cleanTitle(m.name || m.title);
        return mClean === otClean || mClean.startsWith(otClean + ' ');
      });
    }

    if (!found && tClean.length >= 3) {
      found = all.find(m => {
        const mClean = cleanTitle(m.name || m.title);
        return mClean.includes(tClean);
      });
    }

    if (found) {
      const ext = found.container_extension || 'mp4';
      return {
        stream_id: found.stream_id,
        name: found.name,
        play_url: `${IPTV_CONFIG.defaultServer}/movie/${IPTV_CONFIG.username}/${IPTV_CONFIG.password}/${found.stream_id}.${ext}`,
        container_extension: ext,
      };
    }
  } catch (err) {
    console.warn('[findMovieStream] error:', err);
  }
  return null;
}

// ── Search Direct Series Episode in NEWS TTR ─────────────────────────────────
let memoryAllSeriesCache = null;

export async function findSeriesEpisodeStream(title, originalTitle = '', seasonNum = 1, episodeNum = 1) {
  try {
    if (!memoryAllSeriesCache) {
      const data = await xtreamFetch('get_series');
      if (Array.isArray(data)) memoryAllSeriesCache = data;
    }
    const all = memoryAllSeriesCache || [];
    if (!all.length) return null;

    const tClean = cleanTitle(title);
    const otClean = cleanTitle(originalTitle);

    let foundSeries = all.find(s => {
      const sClean = cleanTitle(s.name || s.title);
      return sClean === tClean || (tClean && sClean.startsWith(tClean + ' '));
    });

    if (!foundSeries && otClean) {
      foundSeries = all.find(s => {
        const sClean = cleanTitle(s.name || s.title);
        return sClean === otClean || sClean.startsWith(otClean + ' ');
      });
    }

    if (!foundSeries && tClean.length >= 3) {
      foundSeries = all.find(s => {
        const sClean = cleanTitle(s.name || s.title);
        return sClean.includes(tClean);
      });
    }

    if (!foundSeries) return null;

    const details = await fetchSeriesDetailsAndEpisodes(foundSeries.series_id);
    if (details && details.episodesBySeason) {
      const sKey = String(seasonNum);
      const eps = details.episodesBySeason[sKey] || [];
      const ep = eps.find(e => e.number === Number(episodeNum));
      if (ep) {
        return {
          series_id: foundSeries.series_id,
          episode_id: ep.id,
          name: ep.name,
          play_url: ep.play_url,
          container_extension: ep.container_extension,
        };
      }
    }
  } catch (err) {
    console.warn('[findSeriesEpisodeStream] error:', err);
  }
  return null;
}

// ── Live Channels (NEWS TTR) ──────────────────────────────────────────────────
const FALLBACK_CHANNELS = [
  { id: '1108894', stream_id: 1108894, name: 'Globo Bahia HD', stream_icon: 'http://logos.appscms.xyz/logos/2025/globo.png', category_id: '719', category_name: 'GLOBO' },
  { id: '116575',  stream_id: 116575,  name: 'SBT 4K', stream_icon: 'http://logos.appscms.xyz/logos/2025/sbt.png', category_id: '69', category_name: '4K / ABERTOS' },
  { id: '6007',    stream_id: 6007,    name: 'Record News FHD', stream_icon: 'http://logos.appscms.xyz/logos/2025/recordnews.png', category_id: '18', category_name: 'NOTÍCIAS' },
  { id: '116560',  stream_id: 116560,  name: 'Band 4K', stream_icon: 'http://logos.appscms.xyz/logos/2025/band.png', category_id: '69', category_name: '4K / ABERTOS' },
  { id: '1112138', stream_id: 1112138, name: 'ESPN 2 FHD²', stream_icon: 'http://logos.appscms.xyz/logos/2025/espn2.png', category_id: '12', category_name: 'ESPN' },
  { id: '1112153', stream_id: 1112153, name: 'SporTV 2 FHD²', stream_icon: 'http://logos.appscms.xyz/logos/2025/sportv2.png', category_id: '22', category_name: 'SPORTV' },
  { id: '1112113', stream_id: 1112113, name: 'Premiere 1 Clubes FHD²', stream_icon: 'http://logos.appscms.xyz/logos/2025/premiere.png', category_id: '20', category_name: 'PREMIERE' },
  { id: '116578',  stream_id: 116578,  name: 'Telecine Action 4K', stream_icon: 'http://logos.appscms.xyz/logos/2025/telecineaction.png', category_id: '69', category_name: 'TELECINE' },
  { id: '5941',    stream_id: 5941,    name: 'HBO 2 FHD', stream_icon: 'http://logos.appscms.xyz/logos/2025/hbo2.png', category_id: '14', category_name: 'HBO' },
  { id: '116563',  stream_id: 116563,  name: 'CNN Brasil 4K', stream_icon: 'http://logos.appscms.xyz/logos/2025/cnnbrasil.png', category_id: '69', category_name: 'NOTÍCIAS' },
  { id: '5442',    stream_id: 5442,    name: 'Cultura FHD', stream_icon: 'http://logos.appscms.xyz/logos/2025/cultura.png', category_id: '2', category_name: 'ABERTOS' },
  { id: '5475',    stream_id: 5475,    name: 'RedeTV! FHD', stream_icon: 'http://logos.appscms.xyz/logos/2025/redetv.png', category_id: '2', category_name: 'ABERTOS' },
];

let memoryStreamsCache = null;
let memoryCategoriesCache = null;
let categoriesMap = {};

export function normaliseChannel(item) {
  const streamId = item.stream_id || item.id;
  const catName = item.category_name || categoriesMap[item.category_id] || item.category || 'Geral';
  return {
    id: String(streamId),
    stream_id: streamId,
    num: item.num || null,
    type: 'canal',
    title: item.name || item.title || '',
    logo: item.stream_icon || item.logo || item.image || item.thumb || '',
    poster: item.stream_icon || item.logo || '',
    category: catName,
    category_id: String(item.category_id || ''),
    play_url: item.play_url || channelStreamUrl(streamId),
  };
}

export async function fetchLiveCategories() {
  if (memoryCategoriesCache) return memoryCategoriesCache;

  try {
    const cached = localStorage.getItem('iptv_categories');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCategoriesCache = parsed;
        parsed.forEach(c => { categoriesMap[c.category_id] = c.category_name; });
      }
    }
  } catch {}

  try {
    const data = await xtreamFetch('get_live_categories');
    if (Array.isArray(data) && data.length > 0) {
      const formatted = data
        .filter(c => c && c.category_id && c.category_name)
        .map(c => ({
          category_id: String(c.category_id),
          category_name: c.category_name.trim(),
        }));
      formatted.forEach(c => { categoriesMap[c.category_id] = c.category_name; });
      memoryCategoriesCache = formatted;
      try {
        localStorage.setItem('iptv_categories', JSON.stringify(formatted));
      } catch {}
      return formatted;
    }
  } catch (err) {
    console.warn('[fetchLiveCategories] Error fetching categories:', err);
  }

  return memoryCategoriesCache || [];
}

export async function fetchChannels(arg1 = 1, arg2 = null, arg3 = '') {
  let page = 1;
  let categoryId = null;
  let search = '';
  let pageSize = 24;

  if (typeof arg1 === 'object' && arg1 !== null) {
    page = arg1.page || 1;
    categoryId = arg1.categoryId || null;
    search = arg1.search || '';
    if (arg1.pageSize) pageSize = arg1.pageSize;
  } else {
    page = Number(arg1) || 1;
    categoryId = arg2;
    search = arg3 || '';
  }

  if (!memoryCategoriesCache) {
    fetchLiveCategories().catch(() => {});
  }

  try {
    let streams = [];

    if (!memoryStreamsCache) {
      try {
        const stored = localStorage.getItem('iptv_streams_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryStreamsCache = parsed;
          }
        }
      } catch {}
    }

    if (!memoryStreamsCache) {
      const extra = categoryId ? { category_id: categoryId } : {};
      const data = await xtreamFetch('get_live_streams', extra);
      if (Array.isArray(data) && data.length > 0) {
        if (!categoryId) {
          memoryStreamsCache = data;
          try {
            localStorage.setItem('iptv_streams_cache', JSON.stringify(data.slice(0, 800)));
          } catch {}
        }
        streams = data;
      }
    } else {
      streams = memoryStreamsCache;
    }

    if (categoryId) {
      streams = streams.filter(s => String(s.category_id) === String(categoryId));
    } else {
      // Hide Adult category by default
      streams = streams.filter(s => String(s.category_id) !== '56');
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      streams = streams.filter(s => (s.name || s.title || '').toLowerCase().includes(q));
    }

    const startIndex = (page - 1) * pageSize;
    const paginated = streams.slice(startIndex, startIndex + pageSize);

    return paginated.map(normaliseChannel);
  } catch (err) {
    console.warn('[fetchChannels] failed:', err, 'using fallback channels');
    if (page > 1) return [];
    return FALLBACK_CHANNELS.map(normaliseChannel);
  }
}

// ── Fetch Account Info ────────────────────────────────────────────────────────
export async function fetchAccountInfo() {
  try {
    const data = await xtreamFetch('');
    return data;
  } catch (err) {
    console.warn('[fetchAccountInfo] failed:', err);
    return null;
  }
}

// ── Build player URL from any item ────────────────────────────────────────────
export function playerUrlFromItem(item) {
  if (!item) return '';
  if (item.play_url) return item.play_url;
  if (item.type === 'canal' || item.type === 'channel') {
    return channelPlayerUrl(item.stream_id || item.id);
  }
  if (item.type === 'movie' || (!item.type && !item.seasons)) {
    if (item.stream_id) {
      const ext = item.container_extension || 'mp4';
      return `${IPTV_CONFIG.defaultServer}/movie/${IPTV_CONFIG.username}/${IPTV_CONFIG.password}/${item.stream_id}.${ext}`;
    }
    return moviePlayerUrl(item.imdb_id || item.tmdb_id || item.id);
  }
  return seriePlayerUrl(item.tmdb_id || item.id, 1, 1);
}

// ── Unified Search (Channels, Movies, Series from NEWS TTR) ───────────────────
export async function searchUnifiedCatalog(query) {
  if (!query || !query.trim()) return { channels: [], movies: [], series: [], all: [] };
  const cleanQ = cleanTitle(query);
  if (!cleanQ) return { channels: [], movies: [], series: [], all: [] };

  // 1. Search Channels
  let matchedChannels = [];
  try {
    if (!memoryStreamsCache) {
      const data = await xtreamFetch('get_live_streams');
      if (Array.isArray(data) && data.length > 0) {
        memoryStreamsCache = data;
      }
    }
    const streams = memoryStreamsCache || FALLBACK_CHANNELS;
    matchedChannels = streams
      .filter(c => cleanTitle(c.name || c.title).includes(cleanQ))
      .slice(0, 12)
      .map(normaliseChannel);
  } catch (err) {
    console.warn('[searchUnifiedCatalog:channels]', err);
  }

  // 2. Search Movies (VOD)
  let matchedMovies = [];
  try {
    if (!memoryAllVodCache) {
      const cached = Object.values(memoryVodStreamsByCategory).flat();
      if (cached.length > 0) {
        memoryAllVodCache = cached;
      } else {
        const data = await xtreamFetch('get_vod_streams');
        if (Array.isArray(data) && data.length > 0) {
          memoryAllVodCache = data;
        }
      }
    }
    const vods = memoryAllVodCache || [];
    matchedMovies = vods
      .filter(m => cleanTitle(m.name || m.title).includes(cleanQ))
      .slice(0, 12)
      .map(normaliseVodMovie);
  } catch (err) {
    console.warn('[searchUnifiedCatalog:movies]', err);
  }

  // 3. Search Series
  let matchedSeries = [];
  try {
    if (!memoryAllSeriesCache) {
      const cached = Object.values(memorySeriesByCategory).flat();
      if (cached.length > 0) {
        memoryAllSeriesCache = cached;
      } else {
        const data = await xtreamFetch('get_series');
        if (Array.isArray(data) && data.length > 0) {
          memoryAllSeriesCache = data;
        }
      }
    }
    const seriesList = memoryAllSeriesCache || [];
    matchedSeries = seriesList
      .filter(s => cleanTitle(s.name || s.title).includes(cleanQ))
      .slice(0, 12)
      .map(normaliseSeriesItem);
  } catch (err) {
    console.warn('[searchUnifiedCatalog:series]', err);
  }

  const all = [...matchedChannels, ...matchedMovies, ...matchedSeries];
  return {
    channels: matchedChannels,
    movies: matchedMovies,
    series: matchedSeries,
    all,
  };
}

