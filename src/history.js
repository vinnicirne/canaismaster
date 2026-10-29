// =====================================================
//  Master Canais — Watch History / Continuar Assistindo
//  Saves progress and watch history to localStorage
// =====================================================

const STORAGE_KEY = 'mastercanais_watch_history';
const MAX_HISTORY_ITEMS = 40;

/**
 * Retrieve watch history from localStorage, sorted by latest watched.
 */
export function getWatchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }
  } catch (err) {
    console.warn('[history] Failed to read watch history:', err);
  }
  return [];
}

/**
 * Save an item to watch history.
 * @param {Object} item - The media item (movie, series, or live channel)
 * @param {Object} extra - Extra metadata: { season, episode, episodeTitle, currentTime, duration }
 */
export function saveWatchHistory(item, extra = {}) {
  if (!item) return;

  try {
    const currentList = getWatchHistory();
    const itemId = String(item.stream_id || item.series_id || item.id || '');
    if (!itemId) return;

    const isChannel = (item.type || '').toLowerCase().includes('canal') || (item.type || '').toLowerCase().includes('channel');
    const isSeries = item.type === 'serie' || item.type === 'tv' || Boolean(item.series_id);

    // Compute unique history entry ID
    const season = extra.season ?? item.season ?? (isSeries ? 1 : null);
    const episode = extra.episode ?? extra.number ?? item.episode ?? (isSeries ? 1 : null);
    const historyId = isSeries
      ? `${itemId}_s${season}_e${episode}`
      : `${itemId}`;

    const currentTime = Number(extra.currentTime) || 0;
    const duration = Number(extra.duration) || 0;
    const percentage = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    const entry = {
      id: historyId,
      raw_id: itemId,
      stream_id: item.stream_id || (isChannel ? itemId : null),
      series_id: item.series_id || (isSeries ? itemId : null),
      tmdb_id: item.tmdb_id || itemId,
      type: isChannel ? 'canal' : isSeries ? 'serie' : 'movie',
      title: item.title || item.name || 'Sem título',
      poster: item.poster || item.logo || item.cover || item.backdrop || '',
      backdrop: item.backdrop || item.cover || item.poster || '',
      category: item.category || '',
      category_id: item.category_id || '',
      play_url: item.play_url || '',
      season,
      episode,
      episodeTitle: extra.episodeTitle || item.episodeTitle || (isSeries ? `T${season}:E${episode}` : null),
      currentTime,
      duration,
      percentage,
      lastWatched: Date.now(),
      // Keep full original item data to guarantee smooth resumption
      originalItem: {
        ...item,
        season,
        episode,
        type: isChannel ? 'canal' : isSeries ? 'serie' : 'movie',
      },
    };

    // Remove duplicates of same series/movie/channel
    const filtered = currentList.filter(it => it.id !== historyId);
    filtered.unshift(entry);

    // Truncate to maximum items
    const trimmed = filtered.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mastercanais:history-updated', { detail: trimmed }));
    }
    return entry;
  } catch (err) {
    console.warn('[history] Failed to save watch history:', err);
  }
}

/**
 * Remove an item from watch history.
 */
export function removeFromWatchHistory(historyId) {
  try {
    const list = getWatchHistory();
    const filtered = list.filter(it => it.id !== historyId && it.raw_id !== historyId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mastercanais:history-updated', { detail: filtered }));
    }
  } catch (err) {
    console.warn('[history] Failed to remove item from history:', err);
  }
}

/**
 * Clear the entire watch history.
 */
export function clearWatchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mastercanais:history-updated', { detail: [] }));
    }
  } catch (err) {
    console.warn('[history] Failed to clear history:', err);
  }
}
