import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Calendar as CalendarIcon, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getLocalAiringInfo, getUserTimeZone, LocalAiringInfo } from '../lib/airingTime';
import { fetchAiringDetailsBatch } from '../lib/jikan';

interface ScheduleEntry {
  anime: any;
  airing: LocalAiringInfo;
}

export default function Schedule() {
  const { user, login, loading: authLoading } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'checking' | 'verified' | 'cached'
  >('idle');

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setLoading(true);
      void loadList();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadList = async () => {
    const path = `users/${user!.uid}/animeList`;
    try {
      const q = query(
        collection(db, 'users', user!.uid, 'animeList'),
        where('status', '==', 'watching')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(item => item.data());
      setList(items);
      void corroborateAiringTimes(items);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  const corroborateAiringTimes = async (items: any[]) => {
    if (!user) return;

    const ids = items
      .map(item => Number(item.mal_id))
      .filter(id => Number.isInteger(id) && id > 0);
    if (ids.length === 0) return;

    setVerificationStatus('checking');

    try {
      const updates = await fetchAiringDetailsBatch(ids);
      const updateEntries = Object.entries(updates);
      if (updateEntries.length === 0) {
        setVerificationStatus('cached');
        return;
      }

      setList(current => current.map(item => {
        const update = updates[item.mal_id];
        return update ? { ...item, ...update } : item;
      }));

      const batch = writeBatch(db);
      const verifiedAt = new Date().toISOString();

      for (const [id, update] of updateEntries) {
        const docRef = doc(db, 'users', user.uid, 'animeList', id);
        batch.update(docRef, {
          nextAiringEpisode: update.nextAiringEpisode,
          airingSourceUrl: update.airingSourceUrl,
          'anime.nextAiringEpisode': update.nextAiringEpisode,
          'anime.airingSourceUrl': update.airingSourceUrl,
          airingVerifiedAt: verifiedAt
        });
      }

      await batch.commit();
      setVerificationStatus('verified');
    } catch (error) {
      console.warn('Could not refresh airing schedule; using Firestore cache', error);
      setVerificationStatus('cached');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Agenda Semanal</h1>
          <p className="text-sm text-slate-400">Basado en tu lista "Viendo".</p>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-24 bg-slate-800 rounded animate-pulse"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-16 h-20 bg-slate-800 rounded-lg animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-800 rounded animate-pulse w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <CalendarIcon size={48} className="text-slate-600" />
        <p className="text-slate-400">Inicia sesión para ver tu agenda.</p>
        <button onClick={login} className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-6 py-2 rounded-2xl font-bold shadow-lg shadow-indigo-600/20">
          Iniciar Sesión
        </button>
      </div>
    );
  }

  const scheduledEntries: ScheduleEntry[] = list
    .filter(anime =>
      anime.airing === true ||
      anime.animeStatus === 'Currently Airing' ||
      anime.airing === undefined
    )
    .map(anime => {
      const airing = getLocalAiringInfo(anime);
      return airing ? { anime, airing } : null;
    })
    .filter((entry): entry is ScheduleEntry => entry !== null);

  const daysOfWeek = [
    { en: 'Monday', es: 'Lunes' },
    { en: 'Tuesday', es: 'Martes' },
    { en: 'Wednesday', es: 'Miércoles' },
    { en: 'Thursday', es: 'Jueves' },
    { en: 'Friday', es: 'Viernes' },
    { en: 'Saturday', es: 'Sábado' },
    { en: 'Sunday', es: 'Domingo' }
  ];

  const groupedByDay = scheduledEntries.reduce((groups, entry) => {
    if (!groups[entry.airing.weekdayKey]) {
      groups[entry.airing.weekdayKey] = [];
    }
    groups[entry.airing.weekdayKey].push(entry);
    groups[entry.airing.weekdayKey].sort(
      (a, b) => a.airing.date.getTime() - b.airing.date.getTime()
    );
    return groups;
  }, {} as Record<string, ScheduleEntry[]>);

  const userTimeZone = getUserTimeZone();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Agenda Semanal</h1>
        <p className="text-sm text-slate-400">Basado en tu lista "Viendo".</p>
        <p className="text-xs text-indigo-400">
          Horarios de emisión original convertidos a {userTimeZone}.
        </p>
        {verificationStatus === 'checking' && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Corroborando próximas emisiones con AniList...
          </p>
        )}
        {verificationStatus === 'verified' && (
          <p className="text-[11px] text-green-400">
            Próximas emisiones originales actualizadas.
          </p>
        )}
        {verificationStatus === 'cached' && (
          <p className="text-[11px] text-amber-400">
            Se muestran los horarios guardados; la actualización no estuvo disponible.
          </p>
        )}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
          <p className="text-[11px] leading-relaxed text-slate-400">
            La emisión original puede no coincidir con el día de disponibilidad regional en Crunchyroll.
          </p>
          <a
            href="https://www.crunchyroll.com/simulcastcalendar?filter=premium"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
          >
            Consultar calendario regional de Crunchyroll
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="space-y-8">
        {scheduledEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
            <Clock size={32} className="opacity-50" />
            <p className="text-sm">No se encontraron transmisiones programadas.</p>
          </div>
        ) : (
          daysOfWeek.map(day => {
            const dayEntries = groupedByDay[day.en] || [];
            if (dayEntries.length === 0) return null;

            return (
              <div key={day.en} className="space-y-4">
                <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  {day.es}
                </h2>

                <div className="space-y-3">
                  {dayEntries.map(({ anime, airing }) => (
                    <div
                      key={anime.mal_id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-colors"
                    >
                      <Link to={`/anime/${anime.mal_id}`} className="p-4 flex items-center gap-4">
                        <div className="w-16 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={anime.image_url}
                            alt={anime.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight line-clamp-2">{anime.title}</h3>
                          <div className="mt-2 inline-block bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded-md font-bold">
                            {airing.dateLabel} · {airing.timeLabel}
                          </div>
                          {airing.episode && (
                            <p className="mt-1 text-[10px] text-slate-500">Episodio {airing.episode}</p>
                          )}
                        </div>
                      </Link>

                      <div className="border-t border-slate-800 px-4 py-2.5 flex items-start justify-between gap-3">
                        <div className="text-[10px] text-slate-500 min-w-0">
                          <p>Emisión original: {airing.sourceLabel}</p>
                          {airing.originalSchedule && (
                            <p className="truncate" title={airing.originalSchedule}>
                              Horario original: {airing.originalSchedule}
                            </p>
                          )}
                        </div>
                        <a
                          href={airing.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0"
                        >
                          Ver origen
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
