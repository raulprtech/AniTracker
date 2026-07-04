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
}

export async function fetchCurrentSeason(): Promise<Anime[]> {
  const res = await fetch(`${API_URL}/seasons/now?sfw=true&limit=25`);
  const data = await res.json();
  const list: Anime[] = data.data || [];
  return list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i);
}

export async function fetchSeason(year: number, season: string): Promise<Anime[]> {
  const res = await fetch(`${API_URL}/seasons/${year}/${season}?sfw=true&limit=25`);
  const data = await res.json();
  const list: Anime[] = data.data || [];
  return list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i);
}

export async function fetchTopAnime(): Promise<Anime[]> {
  const res = await fetch(`${API_URL}/top/anime?sfw=true&limit=25`);
  const data = await res.json();
  const list: Anime[] = data.data || [];
  return list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i);
}

export async function fetchGenres(): Promise<any[]> {
  const res = await fetch(`${API_URL}/genres/anime`);
  const data = await res.json();
  return data.data || [];
}

export async function fetchAnimeByGenre(genreId: number): Promise<Anime[]> {
  const res = await fetch(`${API_URL}/anime?genres=${genreId}&order_by=score&sort=desc&sfw=true&limit=25`);
  const data = await res.json();
  const list: Anime[] = data.data || [];
  return list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i);
}

export async function searchAnime(query: string): Promise<Anime[]> {
  const res = await fetch(`${API_URL}/anime?q=${encodeURIComponent(query)}&sfw=true&limit=20`);
  const data = await res.json();
  const list: Anime[] = data.data || [];
  return list.filter((v, i, a) => a.findIndex(t => t.mal_id === v.mal_id) === i);
}

export async function fetchAnimeDetails(id: number): Promise<Anime> {
  const res = await fetch(`${API_URL}/anime/${id}`);
  const data = await res.json();
  return data.data;
}

export async function fetchAnimeReviews(id: number): Promise<any[]> {
  const res = await fetch(`${API_URL}/anime/${id}/reviews`);
  const data = await res.json();
  return data.data || [];
}
