import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAnimeDetails, fetchAnimeReviews, Anime } from '../lib/jikan';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ArrowLeft, Star, Calendar as CalendarIcon, Clock, Tv, Plus, Check, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
import { getLocalAiringInfo } from '../lib/airingTime';

function createAnimeSnapshot(anime: Anime): Anime {
  const imageUrl = anime.images?.jpg?.image_url || '';
  const largeImageUrl = anime.images?.jpg?.large_image_url || imageUrl;

  return {
    mal_id: anime.mal_id,
    title: anime.title || 'Sin titulo',
    images: {
      jpg: {
        image_url: imageUrl,
        large_image_url: largeImageUrl
      }
    },
    synopsis: anime.synopsis || '',
    score: anime.score || 0,
    episodes: anime.episodes || 0,
    status: anime.status || '',
    airing: Boolean(anime.airing),
    aired: {
      from: anime.aired?.from || '',
      to: anime.aired?.to || '',
      string: anime.aired?.string || ''
    },
    broadcast: {
      day: anime.broadcast?.day || '',
      time: anime.broadcast?.time || '',
      timezone: anime.broadcast?.timezone || '',
      string: anime.broadcast?.string || ''
    },
    streaming: (anime.streaming || []).map(platform => ({
      name: platform.name || '',
      url: platform.url || ''
    })),
    nextAiringEpisode: anime.nextAiringEpisode || null,
    airingSourceUrl: anime.airingSourceUrl || ''
  };
}

function getAnimeFromListItem(data: any, animeId: number): Anime {
  const stored = data.anime || {};
  const imageUrl =
    stored.images?.jpg?.image_url ||
    stored.images?.jpg?.large_image_url ||
    data.image_url ||
    '';
  const largeImageUrl =
    stored.images?.jpg?.large_image_url ||
    stored.images?.jpg?.image_url ||
    data.image_url ||
    '';

  return createAnimeSnapshot({
    mal_id: stored.mal_id || data.mal_id || animeId,
    title: stored.title || data.title || 'Anime guardado',
    images: {
      jpg: {
        image_url: imageUrl,
        large_image_url: largeImageUrl
      }
    },
    synopsis: stored.synopsis || data.synopsis || '',
    score: stored.score || data.score || 0,
    episodes: stored.episodes || data.episodes || 0,
    status: stored.status || data.animeStatus || '',
    airing: stored.airing ?? data.airing ?? false,
    aired: stored.aired || data.aired || { from: '', to: '', string: '' },
    broadcast: stored.broadcast || data.broadcast || { day: '', time: '', timezone: '', string: '' },
    streaming: stored.streaming || data.streaming || [],
    nextAiringEpisode: stored.nextAiringEpisode || data.nextAiringEpisode || null,
    airingSourceUrl: stored.airingSourceUrl || data.airingSourceUrl
  });
}

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      void loadDetails(Number(id));
    }
  }, [id, user]);

  const loadDetails = async (animeId: number) => {
    setLoading(true);
    setError(null);
    setSavedStatus(null);
    setReviews([]);

    try {
      if (user) {
        const path = `users/${user.uid}/animeList/${animeId}`;
        try {
          const docRef = doc(db, 'users', user.uid, 'animeList', String(animeId));
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const savedItem = docSnap.data();
            setSavedStatus(savedItem.status || null);
            setAnime(getAnimeFromListItem(savedItem, animeId));
            return;
          }
        } catch (firestoreError) {
          console.error(firestoreError);
          try {
            handleFirestoreError(firestoreError, OperationType.GET, path);
          } catch {
            // The user-facing error below is intentionally concise.
          }
          throw new Error('No se pudo cargar el anime guardado desde Firestore.');
        }
      }

      const data = await fetchAnimeDetails(animeId);
      setAnime(data);
      const reviewsData = await fetchAnimeReviews(animeId);
      setReviews(reviewsData.slice(0, 3));
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Error al cargar detalles";
      if (msg.includes("504") || msg.includes("500") || msg.includes("Failed to fetch")) {
        msg = "El servidor de Anime (Jikan) no responde. Intenta de nuevo más tarde.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const saveAnime = async (status: string) => {
    if (!user) {
      login();
      return;
    }
    if (!anime) return;
    
    setIsSaving(status);
    const path = `users/${user.uid}/animeList/${anime.mal_id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'animeList', String(anime.mal_id));
      const animeSnapshot = createAnimeSnapshot(anime);
      await setDoc(docRef, {
        mal_id: animeSnapshot.mal_id,
        title: animeSnapshot.title,
        image_url: animeSnapshot.images.jpg.large_image_url,
        episodes: animeSnapshot.episodes,
        status,
        airing: animeSnapshot.airing,
        animeStatus: animeSnapshot.status,
        broadcast: animeSnapshot.broadcast,
        score: animeSnapshot.score,
        synopsis: animeSnapshot.synopsis,
        aired: animeSnapshot.aired,
        streaming: animeSnapshot.streaming,
        nextAiringEpisode: animeSnapshot.nextAiringEpisode,
        airingSourceUrl: animeSnapshot.airingSourceUrl || '',
        anime: animeSnapshot,
        addedAt: new Date().toISOString()
      }, { merge: true });
      setSavedStatus(status);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(null);
    }
  };

  const removeAnime = async () => {
    if (!user || !anime) return;
    setIsSaving('removing');
    const path = `users/${user.uid}/animeList/${anime.mal_id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'animeList', String(anime.mal_id));
      await deleteDoc(docRef);
      setSavedStatus(null);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsSaving(null);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <p className="text-red-400 font-medium">{error}</p>
        <button 
          onClick={() => loadDetails(Number(id))}
          className="px-6 py-2.5 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (loading || !anime) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const localAiring = getLocalAiringInfo(anime);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white">
        <ArrowLeft size={20} />
        <span className="text-sm font-bold uppercase tracking-wider">Volver</span>
      </button>

      <div className="flex gap-4">
        <div className="w-1/3 shrink-0">
          <img
            src={anime.images.jpg.large_image_url}
            alt={anime.title}
            className="w-full rounded-2xl border border-slate-800 shadow-lg shadow-black/50"
          />
        </div>
        <div className="space-y-3 pt-2">
          <h1 className="text-2xl font-bold leading-tight">{anime.title}</h1>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs font-bold bg-slate-900 px-2 py-1 rounded-md border border-slate-800 text-slate-300">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-amber-400">{anime.score || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-indigo-500/20 px-2 py-1 rounded-md text-indigo-400 uppercase">
              <Tv size={12} />
              <span>{(anime.airing || anime.status === 'Currently Airing') ? 'En Emisión' : (anime.status === 'Not yet aired' ? 'Próximamente' : (anime.episodes ? `${anime.episodes} eps` : 'Finalizado'))}</span>
            </div>
          </div>
          {localAiring && (
            <div className="flex items-start gap-1.5 text-xs text-slate-400 font-medium">
              <Clock size={12} className="text-indigo-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>{localAiring.dateLabel}, {localAiring.timeLabel}</p>
              </div>
            </div>
          )}
          {anime.aired?.string && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <CalendarIcon size={12} className="text-indigo-400" />
              <span>{anime.aired.string}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {savedStatus === 'watching' ? (
          <button onClick={removeAnime} disabled={isSaving === 'removing'} className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 font-bold py-3 rounded-2xl flex justify-center items-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50">
            {isSaving === 'removing' ? <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div> : <><Check size={18} /> Viendo</>}
          </button>
        ) : (
          <button onClick={() => saveAnime('watching')} disabled={isSaving === 'watching'} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl flex justify-center items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {isSaving === 'watching' ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Plus size={18} /> Ver</>}
          </button>
        )}

        {savedStatus === 'plan_to_watch' ? (
          <button onClick={removeAnime} disabled={isSaving === 'removing'} className="flex-1 bg-slate-800/50 text-slate-400 border border-slate-700 font-bold py-3 rounded-2xl flex justify-center items-center gap-2 disabled:opacity-50">
            {isSaving === 'removing' ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <><Check size={18} /> Planeado</>}
          </button>
        ) : (
          <button onClick={() => saveAnime('plan_to_watch')} disabled={isSaving === 'plan_to_watch'} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl flex justify-center items-center gap-2 transition-colors border border-slate-700 disabled:opacity-50">
            {isSaving === 'plan_to_watch' ? <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div> : <><Bookmark size={18} /> Ver luego</>}
          </button>
        )}
      </div>

      <div className="space-y-2 bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
        <h3 className="font-bold text-lg text-indigo-400">Sinopsis</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          {anime.synopsis || 'Sinopsis no disponible.'}
        </p>
      </div>

      {anime.streaming && anime.streaming.length > 0 && (
        <div className="space-y-3 bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
          <h3 className="font-bold text-lg text-indigo-400">Dónde ver</h3>
          <div className="flex flex-wrap gap-2">
            {anime.streaming.map((platform, idx) => (
              <a
                key={idx}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors border border-slate-700 flex items-center gap-1.5"
              >
                {platform.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-lg px-2">Reseñas Destacadas</h3>
          <div className="space-y-3">
            {reviews.map((rev: any, i: number) => (
              <div key={`${rev.mal_id}-${i}`} className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden">
                    <img src={rev.user.images.jpg.image_url} alt={rev.user.username} className="object-cover w-full h-full" />
                  </div>
                  <span className="text-xs font-bold">{rev.user.username}</span>
                  <div className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star size={12} className="fill-amber-400" />
                    {rev.score}
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic line-clamp-4 leading-relaxed">
                  "{rev.review}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
