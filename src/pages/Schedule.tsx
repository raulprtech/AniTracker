import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Calendar as CalendarIcon, Loader2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Schedule() {
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
      const q = query(collection(db, 'users', user!.uid, 'animeList'), where('status', '==', 'watching'));
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
        <CalendarIcon size={48} className="text-slate-600" />
        <p className="text-slate-400">Inicia sesión para ver tu agenda.</p>
        <button onClick={login} className="bg-indigo-600 hover:bg-indigo-500 transition-colors px-6 py-2 rounded-2xl font-bold shadow-lg shadow-indigo-600/20">Iniciar Sesión</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  const scheduledAnimes = list.filter(a => 
    a.broadcast?.day && 
    a.broadcast?.day !== 'Unknown' && 
    (a.airing === true || a.animeStatus === 'Currently Airing' || a.airing === undefined)
  );
  
  const daysOfWeek = [
    { en: 'Monday', es: 'Lunes' },
    { en: 'Tuesday', es: 'Martes' },
    { en: 'Wednesday', es: 'Miércoles' },
    { en: 'Thursday', es: 'Jueves' },
    { en: 'Friday', es: 'Viernes' },
    { en: 'Saturday', es: 'Sábado' },
    { en: 'Sunday', es: 'Domingo' }
  ];

  const groupedByDay = scheduledAnimes.reduce((acc, anime) => {
    const dayObj = daysOfWeek.find(d => anime.broadcast.day.includes(d.en));
    const day = dayObj ? dayObj.en : 'Unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(anime);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Agenda Semanal</h1>
        <p className="text-sm text-slate-400">Basado en tu lista "Viendo".</p>
      </div>

      <div className="space-y-8">
        {scheduledAnimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
            <Clock size={32} className="opacity-50" />
            <p className="text-sm">No se encontraron transmisiones programadas.</p>
          </div>
        ) : (
          daysOfWeek.map(day => {
            const dayAnimes = groupedByDay[day.en] || [];
            if (dayAnimes.length === 0) return null;

            return (
              <div key={day.en} className="space-y-4">
                <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  {day.es}
                </h2>
                
                <div className="space-y-3">
                  {dayAnimes.map((anime, i) => (
                    <Link to={`/anime/${anime.mal_id}`} key={`${anime.mal_id}-${i}`} className="block bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-600 transition-colors">
                      <div className="w-16 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={anime.image_url} alt={anime.title} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-sm leading-tight line-clamp-2">{anime.title}</h3>
                        <div className="mt-2 inline-block bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                          {anime.broadcast.time || 'Hora Desconocida'}
                        </div>
                      </div>
                    </Link>
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
