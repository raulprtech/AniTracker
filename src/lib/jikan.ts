import { FALLBACK_ANIME_DATA, FALLBACK_CURRENT_SEASON_ANIME, FALLBACK_GENRES } from './fallbackData';

export const API_URL = 'https://api.jikan.moe/v4';

export interface Anime {
  mal_id: number;
  title: string;
  images: { jpg: { image_url: string; large_image_url: string } };
  synopsis: string;
  score: number;
  episodes: number;
  status: string;
  airing: boolean;
  aired: { from: string; to: string; string: string };
  broadcast: { day: string; time: string; timezone: string; string: string };
  streaming?: { name: string; url: string }[];
}

export interface Pagination {
  last_visible_page: number;
  has_next_page: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

// Simple memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Map of active promises for deduplication
const activePromises = new Map<string, Promise<any>>();

// Global queue to prevent concurrent Jikan API requests (max 3 per second)
const queue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || queue.length === 0) return;
  isProcessingQueue = true;
  
  while (queue.length > 0) {
    const task = queue.shift();
    if (task) {
      await task();
      // Jikan is rate-limit sensitive. Wait 350ms between requests.
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  
  isProcessingQueue = false;
}

// Helper to handle rate limits and timeouts (Jikan returns 429 or times out)
async function fetchWithRetry(url: string, retries = 4, delay = 1000): Promise<any> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let activePromise = activePromises.get(url);
  if (activePromise) {
    return activePromise;
  }

  activePromise = new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        const attemptFetch = async (currentRetries: number, currentDelay: number): Promise<any> => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout to prevent hanging

          try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if ((res.status === 429 || res.status >= 500) && currentRetries > 0) {
              console.warn(`Rate limit or server error (${res.status}), retrying in ${currentDelay}ms...`);
              await new Promise(r => setTimeout(r, currentDelay));
              return attemptFetch(currentRetries - 1, currentDelay * 1.5);
            }
            if (!res.ok) {
              throw new Error(`API Error: ${res.status}`);
            }
            const data = await res.json();
            if (data && (data.status === 429 || data.status >= 400)) {
              if (currentRetries > 0) {
                 console.warn(`Jikan Internal Error (${data.status}), retrying in ${currentDelay}ms...`);
                 await new Promise(r => setTimeout(r, currentDelay));
                 return attemptFetch(currentRetries - 1, currentDelay * 1.5);
              }
              throw new Error(`API Error: ${data.status}`);
            }
            cache.set(url, { data, timestamp: Date.now() });
            return data;
          } catch (error: any) {
            clearTimeout(timeoutId);
            if (currentRetries > 0) {
              await new Promise(r => setTimeout(r, currentDelay));
              return attemptFetch(currentRetries - 1, currentDelay * 1.5);
            }
            throw error;
          }
        };

        const data = await attemptFetch(retries, delay);
        resolve(data);
      } catch (error) {
        if (cached) {
          console.warn(`Using stale cache for ${url} after failures`);
          resolve(cached.data);
        } else {
          reject(error);
        }
      } finally {
        activePromises.delete(url);
      }
    });
    processQueue();
  });

  activePromises.set(url, activePromise);
  return activePromise;
}

function getFallbackSeasonalAnimePage(page: number): PaginatedResult<Anime> {
  const items = FALLBACK_CURRENT_SEASON_ANIME;
  const limit = 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const data = items.slice(startIndex, endIndex);
  const hasNext = endIndex < items.length;
  
  return {
    data: data as unknown as Anime[],
    pagination: {
      last_visible_page: Math.ceil(items.length / limit),
      has_next_page: hasNext
    }
  };
}

function getFallbackSeasonalAnimeForSeason(year: number, season: string, page: number): PaginatedResult<Anime> {
  const seasonsOrder = ['winter', 'spring', 'summer', 'fall'];
  const currentYear = 2026;
  const currentSeason = 'summer';
  
  const currentScore = currentYear * 4 + seasonsOrder.indexOf(currentSeason);
  const requestedScore = year * 4 + seasonsOrder.indexOf(season);
  
  const diff = Math.max(0, currentScore - requestedScore);
  const ALL_FALLBACK_ANIME = [...FALLBACK_CURRENT_SEASON_ANIME, ...FALLBACK_ANIME_DATA];
  
  const itemsPerSeason = 25;
  const startIndex = (25 + (diff - 1) * itemsPerSeason) % ALL_FALLBACK_ANIME.length;
  
  const data: Anime[] = [];
  for (let i = 0; i < itemsPerSeason; i++) {
    const idx = (startIndex + i) % ALL_FALLBACK_ANIME.length;
    data.push(ALL_FALLBACK_ANIME[idx] as unknown as Anime);
  }
  
  return {
    data,
    pagination: {
      last_visible_page: 1,
      has_next_page: false
    }
  };
}

export async function fetchCurrentSeason(page: number = 1): Promise<PaginatedResult<Anime>> {
  try {
    const data = await fetchWithRetry(`${API_URL}/seasons/now?limit=25&page=${page}`);
    const list: Anime[] = data.data || [];
    return { 
      data: list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i),
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false }
    };
  } catch (error) {
    console.warn(`Using fallback current season anime data for fetchCurrentSeason page ${page}`);
    return getFallbackSeasonalAnimePage(page);
  }
}

export async function fetchSeason(year: number, season: string, page: number = 1): Promise<PaginatedResult<Anime>> {
  try {
    const data = await fetchWithRetry(`${API_URL}/seasons/${year}/${season}?limit=25&page=${page}`);
    const list: Anime[] = data.data || [];
    return { 
      data: list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i),
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false }
    };
  } catch (error) {
    console.warn(`Using fallback season data for fetchSeason ${year} ${season} page ${page}`);
    return getFallbackSeasonalAnimeForSeason(year, season, page);
  }
}

export async function fetchPopularAnime(page: number = 1): Promise<PaginatedResult<Anime>> {
  try {
    const data = await fetchWithRetry(`${API_URL}/anime?order_by=popularity&sort=asc&limit=25&page=${page}`);
    const list: Anime[] = data.data || [];
    return { 
      data: list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i),
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false }
    };
  } catch (error) {
    console.warn(`Using fallback anime data for fetchPopularAnime page ${page}`);
    const limit = 25;
    const startIndex = (page - 1) * limit;
    const data = FALLBACK_ANIME_DATA.slice(startIndex, startIndex + limit) as unknown as Anime[];
    return {
      data,
      pagination: {
        last_visible_page: Math.ceil(FALLBACK_ANIME_DATA.length / limit),
        has_next_page: startIndex + limit < FALLBACK_ANIME_DATA.length
      }
    };
  }
}

export async function fetchGenres(): Promise<any[]> {
  try {
    const data = await fetchWithRetry(`${API_URL}/genres/anime`);
    return data.data || FALLBACK_GENRES;
  } catch (error) {
    return FALLBACK_GENRES;
  }
}

export async function fetchAnimeByGenre(genreId: number, page: number = 1): Promise<PaginatedResult<Anime>> {
  try {
    const data = await fetchWithRetry(`${API_URL}/anime?genres=${genreId}&order_by=score&sort=desc&limit=25&page=${page}`);
    const list: Anime[] = data.data || [];
    return { 
      data: list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i),
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false }
    };
  } catch (error) {
    console.warn(`Using fallback genre anime for genre ${genreId}, page ${page}`);
    const ALL_ANIME = [...FALLBACK_CURRENT_SEASON_ANIME, ...FALLBACK_ANIME_DATA];
    const filtered = ALL_ANIME.filter((_, i) => i % 5 === genreId % 5);
    const limit = 6;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit) as unknown as Anime[];
    return {
      data,
      pagination: {
        last_visible_page: Math.ceil(filtered.length / limit),
        has_next_page: startIndex + limit < filtered.length
      }
    };
  }
}

export async function searchAnime(query: string, page: number = 1): Promise<PaginatedResult<Anime>> {
  try {
    const data = await fetchWithRetry(`${API_URL}/anime?q=${encodeURIComponent(query)}&limit=20&page=${page}`);
    const list: Anime[] = data.data || [];
    return { 
      data: list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i),
      pagination: data.pagination || { last_visible_page: 1, has_next_page: false }
    };
  } catch (error) {
    console.warn(`Using fallback search results for searchAnime page ${page}`);
    const queryLower = query.toLowerCase();
    const ALL_ANIME = [...FALLBACK_CURRENT_SEASON_ANIME, ...FALLBACK_ANIME_DATA];
    const filtered = ALL_ANIME.filter(a => 
      a.title.toLowerCase().includes(queryLower) || 
      a.synopsis.toLowerCase().includes(queryLower)
    );
    const limit = 12;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit) as unknown as Anime[];
    return { 
      data, 
      pagination: { 
        last_visible_page: Math.ceil(filtered.length / limit), 
        has_next_page: startIndex + limit < filtered.length 
      } 
    };
  }
}

export async function fetchAnimeDetails(id: number): Promise<Anime> {
  try {
    const data = await fetchWithRetry(`${API_URL}/anime/${id}/full`);
    return data.data;
  } catch (error) {
    const ALL_ANIME = [...FALLBACK_CURRENT_SEASON_ANIME, ...FALLBACK_ANIME_DATA];
    const fallback = ALL_ANIME.find(a => a.mal_id === id);
    if (fallback) return fallback as unknown as Anime;
    throw error;
  }
}

export async function fetchAnimeReviews(id: number): Promise<any[]> {
  try {
    const data = await fetchWithRetry(`${API_URL}/anime/${id}/reviews`);
    return data.data || [];
  } catch (error) {
    console.warn("Failed to fetch reviews, returning empty list", error);
    return [];
  }
}
