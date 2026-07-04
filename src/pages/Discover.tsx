import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchCurrentSeason, 
  searchAnime, 
  fetchSeason, 
  fetchTopAnime, 
  fetchGenres, 
  fetchAnimeByGenre,
  Anime 
} from '../lib/jikan';
import { Search as SearchIcon, Star, Tv, Filter, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'now' | 'last' | 'top' | 'genre';

export default function Discover() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('now');
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    
    try {
      // 1. Fetch season
      const animeData = await fetchCurrentSeason();
      if (animeData && animeData.length > 0) {
        setAnimes(animeData);
      }
      
      // 2. Small delay to avoid rate limit (Jikan is sensitive)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Fetch genres
      const genreData = await fetchGenres();
      if (genreData && genreData.length > 0) {
        setGenres(genreData);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPreviousSeason = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    if (month < 3) return { year: year - 1, season: 'fall' };
    if (month < 6) return { year: year, season: 'winter' };
    if (month < 9) return { year: year, season: 'spring' };
    return { year: year, season: 'summer' };
  };

  const handleFilterChange = async (type: FilterType, genreId?: number) => {
    setFilterType(type);
    setLoading(true);
    setQuery('');
    
    try {
      let data: Anime[] = [];
      if (type === 'now') {
        data = await fetchCurrentSeason();
        setSelectedGenre(null);
      } else if (type === 'last') {
        const prev = getPreviousSeason();
        data = await fetchSeason(prev.year, prev.season);
        setSelectedGenre(null);
      } else if (type === 'top') {
        data = await fetchTopAnime();
        setSelectedGenre(null);
      } else if (type === 'genre' && genreId) {
        data = await fetchAnimeByGenre(genreId);
        setSelectedGenre(genreId);
      }
      setAnimes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      handleFilterChange('now');
      return;
    }
    setLoading(true);
    setFilterType('now'); // Reset filters on search
    setSelectedGenre(null);
    try {
      const data = await searchAnime(query);
      setAnimes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Descubrir</h1>
          <p className="text-slate-400 text-xs">Explora las novedades</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2.5 rounded-xl border transition-all ${showSearch ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
          >
            <SearchIcon size={20} />
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSearch} 
            className="relative overflow-hidden"
          >
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
            />
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Main Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <FilterButton 
                active={filterType === 'now'} 
                onClick={() => handleFilterChange('now')}
                label="Esta Temporada"
              />
              <FilterButton 
                active={filterType === 'last'} 
                onClick={() => handleFilterChange('last')}
                label="Temporada Anterior"
              />
              <FilterButton 
                active={filterType === 'top'} 
                onClick={() => handleFilterChange('top')}
                label="Más Populares"
              />
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Categorías Populares
                  </h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {genres.slice(0, 25).map((genre) => (
                    <button
                      key={genre.mal_id}
                      onClick={() => handleFilterChange('genre', genre.mal_id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedGenre === genre.mal_id
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {animes.map((anime, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                key={`${anime.mal_id}-${i}-${filterType}-${selectedGenre}`}
              >
                <Link to={`/anime/${anime.mal_id}`} className="group block space-y-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl hover:border-slate-600 transition-colors">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-800 flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-50 pointer-events-none"></div>
                    <img
                      src={anime.images.jpg.large_image_url}
                      alt={anime.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold shadow-lg shadow-black/50">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-amber-400">{anime.score || 'N/A'}</span>
                    </div>
                    {(anime.airing || anime.status === 'Currently Airing') && (
                      <div className="absolute top-2 left-2 bg-green-500/90 text-white backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-black/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        <span>En Emisión</span>
                      </div>
                    )}
                    {(!anime.airing && anime.status === 'Not yet aired') && (
                      <div className="absolute top-2 left-2 bg-purple-500/90 text-white backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-black/50">
                        <span>Próximamente</span>
                      </div>
                    )}
                    {anime.episodes && (
                      <div className="absolute bottom-2 left-2 bg-indigo-500/20 text-indigo-400 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1 text-[10px] font-bold uppercase">
                        <Tv size={10} />
                        <span>{anime.episodes} eps</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold leading-tight line-clamp-2 px-1 pb-1 group-hover:text-indigo-400 transition-colors">
                    {anime.title}
                  </h3>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
        active
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
