// =====================================================
//  SuperFlix API — Player URL builders only
//  Metadata/images now come from TMDB (tmdb.js)
// =====================================================

const BASE_URL = 'https://superflixapi.quest';

// Player URLs
export function moviePlayerUrl(id) {
  return `https://embed.warezcdn.link/filme/${id}`;
}

export function seriePlayerUrl(id) {
  return `https://embed.warezcdn.link/serie/${id}/1/1`; // fallback
}

export function channelPlayerUrl(id) {
  return `${BASE_URL}/canal/${id}`;
}

// ── Channels still come from SuperFlixAPI (TMDB has no live TV) ──────────────
const proxy = (url) =>
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

async function sfFetch(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(proxy(url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    // fallback direct (might fail on CORS)
    const res2 = await fetch(url, {
      mode   : 'cors',
      headers: { Accept: 'application/json' },
    });
    return res2.json();
  }
}

const FALLBACK_CHANNELS = [
  { id: 'sbt', title: 'SBT News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/SBT_logo.svg/1200px-SBT_logo.svg.png', category: 'TV Aberta', play_url: 'https://www.youtube.com/embed/3qgC4B3T42I?autoplay=1' },
  { id: 'record', title: 'Record News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/RecordTV_logo.svg/1200px-RecordTV_logo.svg.png', category: 'Notícias', play_url: 'https://www.youtube.com/embed/EEZ8sF5rW20?autoplay=1' },
  { id: 'jovem-pan', title: 'Jovem Pan News', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Jovem_Pan_News_2021.png/1200px-Jovem_Pan_News_2021.png', category: 'Notícias', play_url: 'https://www.youtube.com/embed/T6sA9V_VXY0?autoplay=1' },
  { id: 'cnn-brasil', title: 'CNN Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/CNN_Brasil_logo.svg/1200px-CNN_Brasil_logo.svg.png', category: 'Notícias', play_url: 'https://www.youtube.com/embed/jX1O1N0c1fA?autoplay=1' },
  { id: 'espn', title: 'ESPN (Mock)', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_logo.svg/1200px-ESPN_logo.svg.png', category: 'Esportes', play_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1' },
  { id: 'sportv', title: 'SporTV (Mock)', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/SporTV_logo.svg/1200px-SporTV_logo.svg.png', category: 'Esportes', play_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1' }
];

export async function fetchChannels(page = 1) {

  try {
    const data = await sfFetch(`/lista?format=json&type=canal&page=${page}`);
    const arr = Array.isArray(data) ? data : (data.results || data.items || []);
    if (arr.length === 0) throw new Error('Empty channels');
    return arr.map(normaliseChannel);
  } catch (err) {
    console.warn('[fetchChannels] failed:', err, 'using fallback');
    // Prevent duplicate keys when "load more" is clicked
    if (page > 1) return [];
    return FALLBACK_CHANNELS.map(normaliseChannel);
  }
}


// Normalise SuperFlixAPI channel shape
function normaliseChannel(item) {
  return {
    id       : item.id || item.slug || '',
    type     : 'canal',
    title    : item.title || item.name || item.titulo || item.nome || '',
    logo     : item.logo || item.image || item.thumb || item.channel_logo || item.img || '',
    poster   : item.logo || item.image || item.thumb || '',
    category : item.category || item.categoria || '',
    play_url : item.play_url || null,
  };
}

// Build player URL from a normalised TMDB item
export function playerUrlFromItem(item) {
  if (item.play_url) return item.play_url;
  if (item.type === 'canal' || item.type === 'channel') {
    return channelPlayerUrl(item.id);
  }
  if (item.type === 'movie') {
    // Prefer IMDB id (tt prefix) if available, else TMDB numeric id
    return moviePlayerUrl(item.imdb_id || item.tmdb_id || item.id);
  }
  // serie / tv
  return seriePlayerUrl(item.tmdb_id || item.id);
}
