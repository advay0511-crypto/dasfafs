import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X, Play } from 'lucide-react';
import { useMode } from '../context/ModeContext';
import { PlantModeToggle } from './plantmode/PlantModeToggle';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  overlay?: boolean;
}

export const AnchorLogo: React.FC<{ className?: string; plantMode?: boolean }> = ({
  className = 'w-7 h-7',
  plantMode = false,
}) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <circle
      cx="16"
      cy="16"
      r="13"
      stroke="var(--teal)"
      strokeWidth="1.5"
      strokeDasharray="4 2.5"
    />
    <path
      d="M16 7.5v16.5M11.5 12.5h9M10.2 19c0 3.3 2.6 5.2 5.8 5.2s5.8-1.9 5.8-5.2"
      stroke="var(--accent)"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="7.5" r="2" fill="var(--accent)" />
    {/* Small curling sprout in Plant Mode */}
    {plantMode && (
      <g>
        <path
          d="M18 11c2.5-1.5 3.6-4.2 3.2-6.5"
          stroke="#2E9E4F"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M21.2 4.5c2.8-.6 5 1 4.4 3.4-2.1.8-4-.5-4.4-3.4z"
          fill="#2E9E4F"
        />
        <path
          d="M19.8 6.4c-2.2-1.2-3.5-3.4-1.8-4.7 1.8.2 2.4 2.3 1.8 4.7z"
          fill="#6B8E23"
        />
      </g>
    )}
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, overlay = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPlantMode } = useMode();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/analyze', label: 'Analyze' },
    { to: '/compare', label: 'Compare' },
    { to: '/data', label: 'Data Sources' },
    { to: '/about', label: 'About' },
  ];

  const handleDemo = () => {
    setMobileOpen(false);
    navigate(isPlantMode ? '/analyze?demo=1&activity=farming' : '/analyze?demo=1');
  };

  return (
    <header
      className={`no-print fixed top-0 left-0 right-0 w-full z-40 transition-colors backdrop-blur-md ${
        overlay
          ? 'bg-[var(--bg-deep)]/82 border-b border-[var(--border)]/80'
          : 'bg-[var(--bg-deep)]/95 border-b border-[var(--border)]'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark + original Anchor SVG */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-lg font-display font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0"
        >
          <AnchorLogo className="w-7 h-7 shrink-0" plantMode={isPlantMode} />
          <span>Anchor</span>
        </Link>

        {/* Zone 2: Concise single-line nav links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 lg:gap-7">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'text-[var(--text-primary)] border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Plant Mode Switch + Theme toggle + Primary Demo CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <PlantModeToggle variant="header" />

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-xl text-sm font-medium bg-[var(--accent)] text-white hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>Demo</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-3 rounded-xl text-sm font-medium ${
                  active
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleDemo}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl text-sm font-medium bg-[var(--accent)] text-white cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>{isPlantMode ? 'Try Field Check Demo' : 'Try Demo Analysis'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
