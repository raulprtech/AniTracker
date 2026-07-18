import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Tv, Star } from 'lucide-react';
import SkeletonAnimeCard from '../components/SkeletonAnimeCard';

export default function MyList() {
  const { user, login } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadList();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadList = async () => {
    const path = `users/${user!.uid}/animeList`;
    try {
      const q = query(collection(db, 'users', user!.uid, 'animeList'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => doc.data());
      setList(items);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <p className="text-slate-400">Inicia sesión para seguir tu lista de anime.</p>
        <button onClick={login} className="bg-indigo-600 px-6 py-2 rounded-2xl font-bold shadow-lg shadow-indigo-600/20">Iniciar Sesión</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Mi Lista</h1>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonAnimeCard key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const watching = list.filter(item => item.status === 'watching');
  const planned = list.filter(item => item.status === 'plan_to_watch');

  const renderSection = (title: string, items: any[]) => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay anime aquí todavía.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((anime, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={`${anime.mal_id}-${i}`}
            >
              <Link to={`/anime/${anime.mal_id}`} className="group block space-y-1 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl hover:border-slate-600 transition-colors">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-800">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-50 pointer-events-none"></div>
                  <img
                    src={anime.image_url}
                    alt={anime.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-xs font-bold leading-tight line-clamp-2 px-1 pb-1 group-hover:text-indigo-400 transition-colors">
                  {anime.title}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Mi Lista</h1>
      </div>
      {renderSection("Viendo", watching)}
      {renderSection("Por Ver", planned)}
    </div>
  );
}
