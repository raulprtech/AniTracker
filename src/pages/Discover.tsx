import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchCurrentSeason, 
  searchAnime, 
  fetchSeason, 
  fetchPopularAnime,
  fetchGenres, 
  fetchAnimeByGenre,
  Anime,
  PaginatedResult
} from '../lib/jikan';
import { Search as SearchIcon, Star, Tv, Filter, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SkeletonAnimeCard from '../components/SkeletonAnimeCard';

type FilterType = 'now' | 'last' | 'popular' | 'genre' | 'search';

const SEASON_NAMES: Record<string, string> = {
  winter: 'Invierno',
  spring: 'Primavera',
  summer: 'Verano',
  fall: 'Otoño'
};

export default function Discover() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('now');
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestGenerationRef = useRef(0);

  // Lazily fetch genres in the background after mounting so it doesn't block the initial anime list load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchGenres()
        .then(genreData => {
          if (genreData && genreData.length > 0) {
            setGenres(genreData);
          }
        })
        .catch(err => console.error("Error fetching genres in background:", err));
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const requestGeneration = ++requestGenerationRef.current;
    setLoading(true);
    setError(null);
    setPage(1);
    setSubmittedQuery('');
    
    try {
      // ONLY fetch current season initially to load instantly and avoid Jikan concurrent rate limits
      const res = await fetchCurrentSeason(1);

      if (requestGeneration !== requestGenerationRef.current) return;
      if (res && res.data) {
        const uniqueData = res.data.filter((a, i, self) => self.findIndex(t => t.mal_id === a.mal_id) === i);
        setAnimes(uniqueData);
        setHasNextPage(res.pagination.has_next_page);
      }
    } catch (err: any) {
      if (requestGeneration !== requestGenerationRef.current) return;
      console.error("Error loading initial data:", err);
      let msg = err.message || "Error al cargar los datos";
      if (msg.includes("504") || msg.includes("500") || msg.includes("Failed to fetch")) {
        msg = "El servidor de Anime (Jikan) está tardando demasiado en responder o está en mantenimiento. Intenta de nuevo más tarde.";
      }
      setError(msg);
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const getCurrentSeasonAndYear = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    let season: 'winter' | 'spring' | 'summer' | 'fall';
    if (month < 3) season = 'winter';
    else if (month < 6) season = 'spring';
    else if (month < 9) season = 'summer';
    else season = 'fall';
    return { year, season };
  };

  const getPreviousSeasonBefore = (year: number, season: 'winter' | 'spring' | 'summer' | 'fall') => {
    if (season === 'winter') return { year: year - 1, season: 'fall' as const };
    if (season === 'spring') return { year, season: 'winter' as const };
    if (season === 'summer') return { year, season: 'spring' as const };
    return { year, season: 'summer' as const };
  };

  const getPreviousSeason = () => {
    const current = getCurrentSeasonAndYear();
    return getPreviousSeasonBefore(current.year, current.season);
  };

  const fetchWithCurrentState = useCallback(async (pageNum: number) => {
    let res: PaginatedResult<Anime>;
    if (filterType === 'search' && submittedQuery) {
      res = await searchAnime(submittedQuery, pageNum);
    } else if (filterType === 'now') {
      res = await fetchCurrentSeason(pageNum);
    } else if (filterType === 'last') {
      const prev = getPreviousSeason();
      res = await fetchSeason(prev.year, prev.season, pageNum);
    } else if (filterType === 'popular') {
      res = await fetchPopularAnime(pageNum);
    } else if (filterType === 'genre' && selectedGenre) {
      res = await fetchAnimeByGenre(selectedGenre, pageNum);
    } else {
      res = await fetchCurrentSeason(pageNum);
    }
    return res;
  }, [filterType, selectedGenre, submittedQuery]);

  const handleFilterChange = async (type: Exclude<FilterType, 'search'>, genreId?: number) => {
    const requestGeneration = ++requestGenerationRef.current;
    setFilterType(type);
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setQuery('');
    setSubmittedQuery('');
    setPage(1);

    try {
      if (type === 'now' || type === 'last' || type === 'popular') {
        setSelectedGenre(null);
      } else if (type === 'genre' && genreId) {
        setSelectedGenre(genreId);
      }

      let res: PaginatedResult<Anime>;
      if (type === 'now') {
        res = await fetchCurrentSeason(1);
      } else if (type === 'last') {
        const prev = getPreviousSeason();
        res = await fetchSeason(prev.year, prev.season, 1);
      } else if (type === 'popular') {
        res = await fetchPopularAnime(1);
      } else if (type === 'genre' && genreId) {
        res = await fetchAnimeByGenre(genreId, 1);
      } else {
        res = await fetchCurrentSeason(1);
      }

      if (requestGeneration !== requestGenerationRef.current) return;
      const uniqueData = res.data.filter((a, i, self) => self.findIndex(t => t.mal_id === a.mal_id) === i);
      setAnimes(uniqueData);
      setHasNextPage(res.pagination.has_next_page);
    } catch (err: any) {
      if (requestGeneration !== requestGenerationRef.current) return;
      console.error(err);
      let msg = err.message || "Error al cargar los datos";
      if (msg.includes("504") || msg.includes("500") || msg.includes("Failed to fetch")) {
        msg = "El servidor de Anime (Jikan) no responde. Intenta de nuevo más tarde.";
      }
      setError(msg);
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    const nextPage = page + 1;
    const requestGeneration = requestGenerationRef.current;

    try {
      const res = await fetchWithCurrentState(nextPage);
      if (requestGeneration !== requestGenerationRef.current) return;
      setAnimes(prev => {
        const uniqueNew = res.data.filter((a, i, self) =>
          self.findIndex(t => t.mal_id === a.mal_id) === i
        );
        const newAnimes = uniqueNew.filter(a => !prev.some(p => p.mal_id === a.mal_id));
        return [...prev, ...newAnimes];
      });

      setHasNextPage(res.pagination.has_next_page);
      setPage(nextPage);
    } catch (error: any) {
      if (requestGeneration !== requestGenerationRef.current) return;
      console.error("Error loading more:", error);
      let msg = "Error al cargar más datos";
      if (error?.message?.includes("504") || error?.message?.includes("500") || error?.message?.includes("Failed to fetch")) {
        msg = "El servidor no responde. Intenta de nuevo.";
      } else if (error?.message?.includes("429")) {
        msg = "Límite de peticiones alcanzado. Intenta de nuevo en unos segundos.";
      }
      setLoadMoreError(msg);
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoadingMore(false);
      }
    }
  }, [page, loadingMore, hasNextPage, fetchWithCurrentState]);

  useEffect(() => {
    if (loading) return;

    const observerInstance = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !loadingMore) {
        loadMore();
      }
    }, {
      rootMargin: '250px', // start loading before the user hits the absolute bottom for a smooth flow
    });

    if (sentinelRef.current) {
      observerInstance.observe(sentinelRef.current);
    }

    return () => {
      observerInstance.disconnect();
    };
  }, [loading, hasNextPage, loadingMore, loadMore]);

  const executeSearch = async (searchTerm: string) => {
    const requestGeneration = ++requestGenerationRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setFilterType('search');
    setSubmittedQuery(searchTerm);
    setSelectedGenre(null);
    setPage(1);

    try {
      const res = await searchAnime(searchTerm, 1);
      if (requestGeneration !== requestGenerationRef.current) return;
      const uniqueData = res.data.filter((a, i, self) => self.findIndex(t => t.mal_id === a.mal_id) === i);
      setAnimes(uniqueData);
      setHasNextPage(res.pagination.has_next_page);
    } catch (err: any) {
      if (requestGeneration !== requestGenerationRef.current) return;
      console.error(err);
      let msg = err.message || "Error al buscar";
      if (msg.includes("504") || msg.includes("500") || msg.includes("Failed to fetch")) {
        msg = "El servidor de Anime (Jikan) no responde. Intenta de nuevo más tarde.";
      }
      setError(msg);
    } finally {
      if (requestGeneration === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) {
      void handleFilterChange('now');
      return;
    }
    void executeSearch(searchTerm);
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
                active={filterType === 'popular'}
                onClick={() => handleFilterChange('popular')}
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

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <p className="text-red-400 font-medium">{error}</p>
          <button 
            onClick={() => {
              if (filterType === 'search') {
                if (submittedQuery) void executeSearch(submittedQuery);
                else void handleFilterChange('now');
              } else {
                void handleFilterChange(filterType, selectedGenre || undefined);
              }
            }}
            className="px-6 py-2.5 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonAnimeCard key={`skeleton-${i}`} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {animes.map((anime, i) => {
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: i < 10 ? i * 0.02 : 0 }}
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
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold shadow-lg shadow-black/50">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-amber-400">{anime.score || 'N/A'}</span>
                        </div>
                        {(anime.airing === true || anime.status === 'Currently Airing') && (
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
                        {(!anime.airing && anime.status === 'Finished Airing') && (
                          <div className="absolute top-2 left-2 bg-blue-500/90 text-white backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-black/50">
                            <span>Finalizado</span>
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
                );
              })}
            </AnimatePresence>
          </div>
          
          {hasNextPage && (
            <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 space-y-4">
              {loadingMore && <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />}
              {loadMoreError && !loadingMore && (
                <div className="text-center space-y-2">
                  <p className="text-red-400 text-sm">{loadMoreError}</p>
                  <button 
                    onClick={loadMore}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          )}
          {!hasNextPage && animes.length > 0 && (
            <div className="text-center text-slate-500 text-sm py-8">
              Has llegado al final.
            </div>
          )}
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
