import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastProvider } from './components/Toast';
import { ModeProvider, useMode } from './context/ModeContext';
import { GrowthRevealTransition } from './components/plantmode/GrowthRevealTransition';
import { loadSavedTheme, saveTheme } from './lib/storage';
import { Landing } from './pages/Landing';
import { Analyze } from './pages/Analyze';
import { Compare } from './pages/Compare';
import { DataSources } from './pages/DataSources';
import { About } from './pages/About';

const AppShell: React.FC = () => {
  const location = useLocation();
  const { mode } = useMode();
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    mode === 'plant' ? 'light' : loadSavedTheme()
  );
  const prevModeRef = useRef(mode);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      setTheme(mode === 'plant' ? 'light' : 'dark');
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-deep)] text-[var(--text-primary)]">
      <GrowthRevealTransition />
      {!isHome && (
        <>
          <Header theme={theme} onToggleTheme={toggleTheme} overlay={false} />
          <div aria-hidden="true" className="h-16 shrink-0" />
        </>
      )}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Landing theme={theme} onToggleTheme={toggleTheme} />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/data" element={<DataSources />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isHome && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ModeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </ModeProvider>
    </BrowserRouter>
  );
}
