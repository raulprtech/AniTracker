import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Calendar, Search, List as ListIcon, LogIn, LogOut, Clock } from 'lucide-react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import Discover from './pages/Discover';
import MyList from './pages/MyList';
import Schedule from './pages/Schedule';
import AnimeDetail from './pages/AnimeDetail';
import ScrollToTop from './components/ScrollToTop';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, login, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <header className="sticky top-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-lg text-white">A</span>
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              AniTracker
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <button onClick={logout} className="text-slate-400 hover:text-white" title="Cerrar Sesión">
                <LogOut size={20} />
              </button>
            ) : (
              <button onClick={login} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
                <LogIn size={20} />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          <NavItem to="/" icon={<Search size={24} />} label="Descubrir" />
          <NavItem to="/list" icon={<ListIcon size={24} />} label="Mi Lista" />
          <NavItem to="/schedule" icon={<Calendar size={24} />} label="Agenda" />
        </div>
      </nav>
      <ScrollToTop />
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-indigo-400 focus:outline-none focus:text-indigo-400">
      {icon}
      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{label}</span>
    </Link>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/list" element={<MyList />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
