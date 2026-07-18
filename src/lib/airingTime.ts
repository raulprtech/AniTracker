import { fromZonedTime, toZonedTime } from 'date-fns-tz';

interface AiringAnime {
  mal_id?: number;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  } | null;
  airingSourceUrl?: string;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
}

export interface LocalAiringInfo {
  date: Date;
  weekdayKey: string;
  dateLabel: string;
  timeLabel: string;
  timeZone: string;
  episode?: number;
  sourceLabel: 'AniList' | 'MyAnimeList/Jikan';
  verificationUrl: string;
  originalSchedule?: string;
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

function getLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'es-MX';
}

export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function getNextBroadcastDate(
  broadcast: AiringAnime['broadcast'],
  now: Date
): Date | null {
  if (!broadcast?.day || !broadcast.time) return null;

  const sourceDay = broadcast.day.toLowerCase().replace(/s$/, '');
  const targetDay = DAY_INDEX[sourceDay];
  const [hours, minutes] = broadcast.time.split(':').map(Number);

  if (targetDay === undefined || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const sourceTimeZone = broadcast.timezone || 'Asia/Tokyo';

  try {
    const sourceNow = toZonedTime(now, sourceTimeZone);
    const daysUntilTarget = (targetDay - sourceNow.getDay() + 7) % 7;
    const sourceWallTime = new Date(sourceNow);
    sourceWallTime.setDate(sourceNow.getDate() + daysUntilTarget);
    sourceWallTime.setHours(hours, minutes, 0, 0);

    let airingDate = fromZonedTime(sourceWallTime, sourceTimeZone);
    if (airingDate.getTime() <= now.getTime()) {
      sourceWallTime.setDate(sourceWallTime.getDate() + 7);
      airingDate = fromZonedTime(sourceWallTime, sourceTimeZone);
    }

    return airingDate;
  } catch {
    return null;
  }
}

export function getLocalAiringInfo(
  anime: AiringAnime,
  now = new Date()
): LocalAiringInfo | null {
  const timeZone = getUserTimeZone();
  const exactAiringAt = anime.nextAiringEpisode?.airingAt;
  const exactDate = exactAiringAt ? new Date(exactAiringAt * 1000) : null;
  const hasFutureExactDate = exactDate && exactDate.getTime() > now.getTime();

  const date = hasFutureExactDate
    ? exactDate
    : getNextBroadcastDate(anime.broadcast, now);

  if (!date) return null;

  const locale = getLocale();
  const weekdayKey = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone
  }).format(date);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short'
  }).format(date);

  const usesAniList = Boolean(hasFutureExactDate);
  const fallbackUrl = anime.mal_id
    ? `https://myanimelist.net/anime/${anime.mal_id}`
    : 'https://myanimelist.net/anime.php';

  return {
    date,
    weekdayKey,
    dateLabel,
    timeLabel,
    timeZone,
    episode: usesAniList ? anime.nextAiringEpisode?.episode : undefined,
    sourceLabel: usesAniList ? 'AniList' : 'MyAnimeList/Jikan',
    verificationUrl: usesAniList && anime.airingSourceUrl
      ? anime.airingSourceUrl
      : fallbackUrl,
    originalSchedule: anime.broadcast?.string || undefined
  };
}
