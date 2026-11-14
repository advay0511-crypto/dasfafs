import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  GitCompareArrows,
  Home,
  Info,
  Loader2,
  MapPin,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sprout,
  Sun,
  Wind,
  X,
} from 'lucide-react';
import farmBgTwilight from '../assets/images/farm_irrigation_twilight_1793374566818.jpg';
import farmBgAerial from '../assets/images/farm_aerial_cinematic_1793374539769.jpg';
import farmBgValley from '../assets/images/hero_farmland_1790691713410.jpg';
import farmBgAerialMarjan from '../assets/images/farm_aerial_marjan_1790789310167.jpg';
import { EonetFetchResult, FarmProfile, PowerClimateResult } from '../types';
import { getActiveFarmId, setActiveFarmId } from '../lib/farmStorage';
import { getDefaultTargetDate } from '../lib/format';
import {
  buildRealFarmFields,
  computeRealFarmHealth,
  ensureSyncedFarmProfiles,
  evaluateRealFarmAlerts,
  HomeFarmAlert,
  HomeFieldView,
} from '../lib/homeFarmEvaluator';
import { fetchLiveFarmWeather, LiveWeatherReading } from '../services/weather';
import { fetchNasaPowerClimatology } from '../services/nasaPower';
import { fetchEonetEvents } from '../services/eonet';
import {
  ConditionsLeafIcon,
  DecorativeTrackLeaf,
  DropletGlossIcon,
  FarmerAvatarSvg,
  FieldShiftLogoLeaf,
  PartlyCloudy3DIcon,
} from '../components/home/FieldShiftIcons';
import { MistyCloudTransition } from '../components/home/MistyCloudTransition';
import { CornerEarth3D } from '../components/home/CornerEarth3D';
import { ThemeMorphOverlay } from '../components/home/ThemeMorphOverlay';

interface LandingProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const RANDOM_FARM_CARD_IMAGES = [
  farmBgTwilight,
  farmBgAerial,
  farmBgValley,
  farmBgAerialMarjan,
];

function formatMinutesAgo(ts: number | null): string {
  if (!ts) return 'Syncing live data...';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin <= 0) return 'Updated just now';
  if (diffMin === 1) return 'Updated 1 min ago';
  return `Updated ${diffMin} min ago`;
}

export const Landing: React.FC<LandingProps> = ({ theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const isLight = theme === 'light';

  // Real synced farm profiles shared with /analyze Smart Farm Workspace
  const [farms] = useState<FarmProfile[]>(() => ensureSyncedFarmProfiles());
  const [selectedFarmId, setSelectedFarmId] = useState<string>(() => {
    const savedActive = getActiveFarmId();
    const list = ensureSyncedFarmProfiles();
    if (savedActive && list.some((f) => f.id === savedActive)) return savedActive;
    return list[0]?.id ?? '';
  });

  const currentFarm = useMemo(
    () => farms.find((f) => f.id === selectedFarmId) ?? farms[0],
    [farms, selectedFarmId]
  );

  // UI Popovers & Modals
  const [farmMenuOpen, setFarmMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<HomeFarmAlert | null>(null);
  const [activeField, setActiveField] = useState<HomeFieldView | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Live API Telemetry State (Open-Meteo + NASA POWER + NASA EONET v3)
  const [liveWeather, setLiveWeather] = useState<LiveWeatherReading | null>(null);
  const [powerData, setPowerData] = useState<PowerClimateResult | null>(null);
  const [eonetData, setEonetData] = useState<EonetFetchResult | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [refreshSpinning, setRefreshSpinning] = useState(false);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [windUnit, setWindUnit] = useState<'km/h' | 'mph'>('km/h');
  const [ringAnimated, setRingAnimated] = useState(false);

  // Smooth theme-change morphism overlay state
  const [themeMorph, setThemeMorph] = useState<{
    active: boolean;
    toLight: boolean;
    origin: { x: number; y: number };
    nonce: number;
  }>({
    active: false,
    toLight: false,
    origin: { x: 0, y: 0 },
    nonce: 0,
  });
  const morphTimerRef = useRef<number | null>(null);

  // Random farm image for Farm Conditions left-to-right gradient blend
  const [conditionsCardImage, setConditionsCardImage] = useState<string>(() => {
    const idx = Math.floor(Math.random() * RANDOM_FARM_CARD_IMAGES.length);
    return RANDOM_FARM_CARD_IMAGES[idx];
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (morphTimerRef.current) window.clearTimeout(morphTimerRef.current);
    };
  }, []);

  const triggerThemeMorph = useCallback(
    (e?: React.MouseEvent<HTMLElement>) => {
      const rect = e?.currentTarget?.getBoundingClientRect();
      const origin = rect
        ? { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }
        : {
            x: typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.85) : 960,
            y: 44,
          };

      const nextIsLight = !isLight;
      setThemeMorph((prev) => ({
        active: true,
        toLight: nextIsLight,
        origin,
        nonce: prev.nonce + 1,
      }));
      if (morphTimerRef.current) window.clearTimeout(morphTimerRef.current);
      morphTimerRef.current = window.setTimeout(() => {
        setThemeMorph((prev) => ({ ...prev, active: false }));
      }, 860);

      onToggleTheme();
    },
    [isLight, onToggleTheme]
  );

  // Fetch live meteorological & NASA satellite data for the active farm's coordinates
  const loadFarmTelemetry = useCallback(async (farm: FarmProfile) => {
    const lat = farm.location.lat ?? 42.0308;
    const lon = farm.location.lon ?? -93.6319;
    setTelemetryLoading(true);
    setTelemetryError(null);

    const targetDate = getDefaultTargetDate();
    const [weatherRes, powerRes, eonetRes] = await Promise.allSettled([
      fetchLiveFarmWeather(lat, lon),
      fetchNasaPowerClimatology(lat, lon, targetDate, undefined, 'farming'),
      fetchEonetEvents(lat, lon, 300),
    ]);

    if (weatherRes.status === 'fulfilled') {
      setLiveWeather(weatherRes.value);
    } else {
      setLiveWeather(null);
    }

    if (powerRes.status === 'fulfilled') {
      setPowerData(powerRes.value);
    } else {
      setPowerData(null);
    }

    if (eonetRes.status === 'fulfilled') {
      setEonetData(eonetRes.value);
    } else {
      setEonetData(null);
    }

    if (
      weatherRes.status === 'rejected' &&
      powerRes.status === 'rejected' &&
      eonetRes.status === 'rejected'
    ) {
      setTelemetryError('Unable to reach live weather & NASA APIs right now.');
    }

    setLastSyncedAt(Date.now());
    setTelemetryLoading(false);
  }, []);

  useEffect(() => {
    if (!currentFarm) return;
    setActiveFarmId(currentFarm.id);
    loadFarmTelemetry(currentFarm);
  }, [currentFarm, loadFarmTelemetry]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRingAnimated(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFarmMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Derive real fields, real conditional alerts, and calculated overall farm health
  const realFields = useMemo(() => buildRealFarmFields(currentFarm), [currentFarm]);

  const realAlerts = useMemo(
    () => evaluateRealFarmAlerts(currentFarm, realFields, liveWeather, powerData, eonetData),
    [currentFarm, realFields, liveWeather, powerData, eonetData]
  );

  const healthBreakdown = useMemo(
    () =>
      computeRealFarmHealth(
        currentFarm,
        realFields,
        liveWeather,
        powerData,
        eonetData,
        realAlerts
      ),
    [currentFarm, realFields, liveWeather, powerData, eonetData, realAlerts]
  );

  const handleRefreshConditions = async () => {
    setRefreshSpinning(true);
    const others = RANDOM_FARM_CARD_IMAGES.filter((img) => img !== conditionsCardImage);
    if (others.length > 0) {
      setConditionsCardImage(others[Math.floor(Math.random() * others.length)]);
    }
    await loadFarmTelemetry(currentFarm);
    setRefreshSpinning(false);
  };

  const handleOpenWorkspace = (path = '/analyze?mode=farm') => {
    setActiveFarmId(currentFarm.id);
    navigate(path);
  };

  const displayTemp = liveWeather
    ? tempUnit === 'C'
      ? `${liveWeather.tempC}°C`
      : `${Math.round((liveWeather.tempC * 9) / 5 + 32)}°F`
    : '--';

  const displayWind = liveWeather
    ? windUnit === 'km/h'
      ? `${liveWeather.windKmh} km/h`
      : `${Math.round(liveWeather.windKmh * 0.621371)} mph`
    : '--';

  const displayHumidity = liveWeather ? `${liveWeather.humidityPct}%` : '--';
  const displayCondition =
    telemetryLoading && !liveWeather
      ? 'Fetching live weather...'
      : liveWeather?.conditionLabel ?? 'Weather unavailable';

  const farmLocationText =
    currentFarm.location.locationLabel ||
    currentFarm.location.regionOrAddress ||
    (currentFarm.location.lat !== null && currentFarm.location.lon !== null
      ? `${currentFarm.location.lat.toFixed(2)}°, ${currentFarm.location.lon.toFixed(2)}°`
      : 'Coordinates not set');

  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = ringAnimated
    ? circumference * (1 - healthBreakdown.overallPct / 100)
    : circumference;

  return (
    <div
      className={`relative min-h-screen w-full overflow-x-clip transition-colors duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] selection:bg-[#20E9C4]/30 ${
        isLight
          ? 'bg-[#C4E2FB] text-[#08223D] selection:text-[#04281B]'
          : 'bg-[#000817] text-[#EAF4FF] selection:text-white'
      }`}
      style={{ fontFamily: '"Inter", "Manrope", sans-serif' }}
    >
      <ThemeMorphOverlay
        active={themeMorph.active}
        toLight={themeMorph.toLight}
        origin={themeMorph.origin}
        nonce={themeMorph.nonce}
      />

      {/* ===================================================================== */}
      {/* PAGE 1 FIXED TOP BACKDROP (Dual-layer cross-dissolve for zero flicker)*/}
      {/* Dark: image_c6dd6660 | Light: image_4e0ee03f                          */}
      {/* ===================================================================== */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/assets/aistudio/image_c6dd6660.png"
          alt=""
          className={`absolute inset-0 w-full h-full object-cover object-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isLight ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
          }`}
        />
        <img
          src="/assets/aistudio/image_4e0ee03f.png"
          alt=""
          className={`absolute inset-0 w-full h-full object-cover object-center brightness-[0.80] contrast-[1.03] saturate-[0.94] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isLight ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
          }`}
        />
        <div
          className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            background: isLight
              ? 'linear-gradient(95deg, rgba(214, 235, 252, 0.34) 0%, rgba(16, 52, 92, 0.14) 55%, rgba(12, 42, 78, 0.18) 100%)'
              : 'linear-gradient(90deg, rgba(0, 8, 23, 0.56) 0%, rgba(0, 12, 32, 0.24) 45%, rgba(0, 8, 23, 0.08) 100%)',
          }}
        />
      </div>

      {/* ===================================================================== */}
      {/* FIXED TOP NAVIGATION BAR (Always stays pinned across scroll)          */}
      {/* ===================================================================== */}
      <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-[1400px] w-full mx-auto px-5 sm:px-8 lg:px-12 pt-5 sm:pt-6">
          <header className="relative z-30 pointer-events-auto flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 shrink-0 focus:outline-none group"
              aria-label="FIELD SHIFT Home"
            >
              <FieldShiftLogoLeaf className="w-[41px] h-[39px] shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span
                className={`flex flex-col text-[17px] font-extrabold leading-[16px] tracking-[1.2px] uppercase ${
                  isLight ? 'text-[#06223E]' : 'text-[#F2F8FF]'
                }`}
              >
                <span>FIELD</span>
                <span>SHIFT</span>
              </span>
            </Link>

            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex items-center justify-between h-[50px] px-2 rounded-[28px] w-[530px] xl:w-[610px] shrink-0"
              style={
                isLight
                  ? {
                      background: 'rgba(255, 255, 255, 0.72)',
                      border: '1px solid rgba(255, 255, 255, 0.90)',
                      backdropFilter: 'blur(18px) saturate(145%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(145%)',
                      boxShadow:
                        '0 10px 28px rgba(13, 62, 118, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
                    }
                  : {
                      background: 'rgba(0, 42, 82, 0.47)',
                      border: '1px solid rgba(45, 160, 255, 0.22)',
                      backdropFilter: 'blur(18px) saturate(145%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(145%)',
                      boxShadow:
                        '0 10px 30px rgba(0, 10, 28, 0.40), 0 0 18px rgba(22, 139, 255, 0.14), inset 0 1px 1px rgba(170, 225, 255, 0.10)',
                    }
              }
            >
              <Link
                to="/"
                className={`relative inline-flex items-center justify-center gap-2 h-[40px] px-4 rounded-[25px] text-[13px] font-medium whitespace-nowrap shrink-0 transition-all ${
                  isLight ? 'text-[#043624]' : 'text-white'
                }`}
                style={{
                  background: isLight
                    ? 'linear-gradient(110deg, rgba(16, 224, 148, 0.28), rgba(14, 185, 152, 0.18))'
                    : 'linear-gradient(110deg, rgba(0, 238, 153, 0.24), rgba(0, 131, 121, 0.20))',
                  border: isLight
                    ? '1px solid rgba(10, 178, 118, 0.34)'
                    : '1px solid rgba(38, 239, 166, 0.26)',
                }}
              >
                <Home
                  className={`w-[17px] h-[17px] ${isLight ? 'text-[#05734E]' : 'text-[#E9FFF7]'}`}
                  strokeWidth={2.1}
                />
                <span>Home</span>
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full ${
                    isLight ? 'bg-[#08B97B]' : 'bg-[#24F5A8]'
                  }`}
                  style={{
                    boxShadow: isLight
                      ? '0 0 8px rgba(8, 185, 123, 0.65)'
                      : '0 0 8px rgba(0, 255, 164, 0.85), 0 0 16px rgba(0, 255, 164, 0.45)',
                  }}
                />
              </Link>

              <Link
                to="/analyze"
                className={`inline-flex items-center gap-2 px-3.5 h-[40px] rounded-[22px] text-[13px] transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'text-[#0E2D4F] hover:text-[#04182D] hover:bg-[#0D4C8A]/10 font-medium'
                    : 'text-[#D4E1F0] hover:text-white hover:bg-white/[0.06] font-normal'
                }`}
              >
                <Sprout
                  className={`w-[17px] h-[17px] ${isLight ? 'text-[#144372]' : 'text-[#DCE9F7]'}`}
                  strokeWidth={1.9}
                />
                <span>Analyze</span>
              </Link>

              <Link
                to="/compare"
                className={`inline-flex items-center gap-2 px-3.5 h-[40px] rounded-[22px] text-[13px] transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'text-[#0E2D4F] hover:text-[#04182D] hover:bg-[#0D4C8A]/10 font-medium'
                    : 'text-[#D4E1F0] hover:text-white hover:bg-white/[0.06] font-normal'
                }`}
              >
                <GitCompareArrows
                  className={`w-[17px] h-[17px] ${isLight ? 'text-[#144372]' : 'text-[#DCE9F7]'}`}
                  strokeWidth={1.9}
                />
                <span>Compare</span>
              </Link>

              <Link
                to="/data"
                className={`inline-flex items-center gap-2 px-3.5 h-[40px] rounded-[22px] text-[13px] transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'text-[#0E2D4F] hover:text-[#04182D] hover:bg-[#0D4C8A]/10 font-medium'
                    : 'text-[#D4E1F0] hover:text-white hover:bg-white/[0.06] font-normal'
                }`}
              >
                <BarChart3
                  className={`w-[17px] h-[17px] ${isLight ? 'text-[#144372]' : 'text-[#DCE9F7]'}`}
                  strokeWidth={1.9}
                />
                <span>Data Sources</span>
              </Link>

              <Link
                to="/about"
                className={`inline-flex items-center gap-2 px-3.5 h-[40px] rounded-[22px] text-[13px] transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'text-[#0E2D4F] hover:text-[#04182D] hover:bg-[#0D4C8A]/10 font-medium'
                    : 'text-[#D4E1F0] hover:text-white hover:bg-white/[0.06] font-normal'
                }`}
              >
                <Info
                  className={`w-[17px] h-[17px] ${isLight ? 'text-[#144372]' : 'text-[#DCE9F7]'}`}
                  strokeWidth={1.9}
                />
                <span>About</span>
              </Link>
            </nav>

            {/* Right Controls: Theme Switch, Settings, Notifications, Farmer Avatar, Mobile Menu */}
            <div className="relative flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={triggerThemeMorph}
                aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-500 cursor-pointer overflow-hidden ${
                  isLight
                    ? 'bg-white/75 hover:bg-white/95 text-[#082B4F] border border-white/90 shadow-sm'
                    : 'text-[#EEF5FF] hover:bg-white/15 border border-white/20 bg-[#002A52]/45'
                }`}
              >
                <Sun
                  className={`w-[18px] h-[18px] text-[#FFE082] absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isLight ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                  strokeWidth={2}
                />
                <Moon
                  className={`w-[18px] h-[18px] text-[#082B4F] absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                  }`}
                  strokeWidth={2}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen((v) => !v);
                  setNotifOpen(false);
                  setProfileMenuOpen(false);
                }}
                aria-label="Open display preferences"
                title="Display Preferences"
                className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white/75 hover:bg-white/95 text-[#082B4F] border border-white/90 shadow-sm'
                    : 'text-[#EEF5FF] hover:bg-white/15 border border-white/20 bg-[#002A52]/45'
                }`}
              >
                <Settings className="w-[17px] h-[17px]" strokeWidth={1.9} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setSettingsOpen(false);
                  setProfileMenuOpen(false);
                }}
                aria-label="View farm notifications"
                className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white/65 hover:bg-white/85 text-[#082B4F] border border-white/85 shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Bell
                  className={`w-[22px] h-[22px] ${isLight ? 'text-[#082B4F]' : 'text-[#EEF5FF]'}`}
                  strokeWidth={1.9}
                />
                {realAlerts.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 w-[9px] h-[9px] rounded-full bg-[#24F5A8] border border-[#03442E]"
                    style={{
                      boxShadow: '0 0 8px rgba(0, 255, 164, 0.85)',
                    }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setNotifOpen(false);
                  setSettingsOpen(false);
                }}
                aria-label="Open farm profile menu"
                className="w-[45px] h-[45px] rounded-full overflow-hidden shrink-0 cursor-pointer transition-transform hover:scale-105"
                style={{
                  border: isLight
                    ? '2px solid rgba(255, 255, 255, 0.92)'
                    : '2px solid rgba(77, 180, 255, 0.45)',
                  boxShadow: isLight
                    ? '0 4px 14px rgba(10, 56, 110, 0.22)'
                    : '0 4px 14px rgba(0, 0, 0, 0.45), 0 0 12px rgba(22, 139, 255, 0.25)',
                }}
              >
                <FarmerAvatarSvg />
              </button>

              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileNavOpen}
                className={`lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full ${
                  isLight ? 'text-[#082B4F]' : 'text-[#EAF4FF]'
                }`}
                style={{
                  background: isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(0, 42, 82, 0.55)',
                  border: isLight
                    ? '1px solid rgba(255, 255, 255, 0.9)'
                    : '1px solid rgba(45, 160, 255, 0.25)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Notifications Popover */}
              {notifOpen && (
                <div className="fs-glass-card absolute right-0 top-[56px] z-40 w-[310px] rounded-[24px] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-semibold ${
                        isLight ? 'text-[#08223E]' : 'text-[#F1F7FF]'
                      }`}
                    >
                      Active Field Alerts ({realAlerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className={`cursor-pointer ${
                        isLight ? 'text-[#395B7F] hover:text-[#08223E]' : 'text-[#9AB4CE] hover:text-white'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {realAlerts.length === 0 ? (
                    <div
                      className={`p-3 rounded-xl text-[12.5px] ${
                        isLight
                          ? 'bg-white/60 border border-[#B5D7F4] text-[#173A5E]'
                          : 'bg-white/[0.04] border border-white/10 text-[#C8DAEC]'
                      }`}
                    >
                      No active alerts for {currentFarm.location.farmName || 'this farm'}. All monitored conditions are nominal.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {realAlerts.map((al) => (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => {
                            setActiveAlert(al);
                            setNotifOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-white/60 hover:bg-white/85 border border-[#B5D7F4]'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-semibold ${
                                al.severity === 'critical'
                                  ? isLight
                                    ? 'text-[#C91D2A]'
                                    : 'text-[#FF555F]'
                                  : isLight
                                    ? 'text-[#B56200]'
                                    : 'text-[#FFA52E]'
                              }`}
                            >
                              Alert · {al.source}
                            </span>
                          </div>
                          <div
                            className={`text-[12.5px] mt-0.5 ${
                              isLight ? 'text-[#0B2A4A]' : 'text-[#E6F0FB]'
                            }`}
                          >
                            {al.message}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Settings Popover */}
              {settingsOpen && (
                <div className="fs-glass-card absolute right-0 top-[56px] z-40 w-[285px] rounded-[24px] p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-semibold ${
                        isLight ? 'text-[#08223E]' : 'text-[#F1F7FF]'
                      }`}
                    >
                      Display Preferences
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className={`cursor-pointer ${
                        isLight ? 'text-[#395B7F] hover:text-[#08223E]' : 'text-[#9AB4CE] hover:text-white'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Theme Selector */}
                  <div
                    className={`flex items-center justify-between text-[12.5px] ${
                      isLight ? 'text-[#183C60]' : 'text-[#D4E2F1]'
                    }`}
                  >
                    <span>Atmosphere</span>
                    <div
                      className={`inline-flex rounded-lg p-0.5 border ${
                        isLight
                          ? 'bg-white/70 border-[#B7D7F2]'
                          : 'bg-[#00152B] border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!isLight) triggerThemeMorph(e);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all duration-300 ${
                          isLight
                            ? 'bg-[#11C98D] text-white'
                            : 'text-[#B5C7DC] hover:text-white'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isLight) triggerThemeMorph(e);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all duration-300 ${
                          !isLight
                            ? 'bg-[#19EAB2] text-[#04281D]'
                            : 'text-[#31557B] hover:text-[#08223E]'
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between text-[12.5px] ${
                      isLight ? 'text-[#183C60]' : 'text-[#D4E2F1]'
                    }`}
                  >
                    <span>Temperature</span>
                    <div
                      className={`inline-flex rounded-lg p-0.5 border ${
                        isLight
                          ? 'bg-white/70 border-[#B7D7F2]'
                          : 'bg-[#00152B] border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setTempUnit('C')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          tempUnit === 'C'
                            ? isLight
                              ? 'bg-[#11C98D] text-white'
                              : 'bg-[#19EAB2] text-[#04281D]'
                            : isLight
                              ? 'text-[#31557B]'
                              : 'text-[#B5C7DC]'
                        }`}
                      >
                        °C
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempUnit('F')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          tempUnit === 'F'
                            ? isLight
                              ? 'bg-[#11C98D] text-white'
                              : 'bg-[#19EAB2] text-[#04281D]'
                            : isLight
                              ? 'text-[#31557B]'
                              : 'text-[#B5C7DC]'
                        }`}
                      >
                        °F
                      </button>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between text-[12.5px] ${
                      isLight ? 'text-[#183C60]' : 'text-[#D4E2F1]'
                    }`}
                  >
                    <span>Wind Speed</span>
                    <div
                      className={`inline-flex rounded-lg p-0.5 border ${
                        isLight
                          ? 'bg-white/70 border-[#B7D7F2]'
                          : 'bg-[#00152B] border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setWindUnit('km/h')}
                        className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          windUnit === 'km/h'
                            ? isLight
                              ? 'bg-[#11C98D] text-white'
                              : 'bg-[#19EAB2] text-[#04281D]'
                            : isLight
                              ? 'text-[#31557B]'
                              : 'text-[#B5C7DC]'
                        }`}
                      >
                        km/h
                      </button>
                      <button
                        type="button"
                        onClick={() => setWindUnit('mph')}
                        className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer ${
                          windUnit === 'mph'
                            ? isLight
                              ? 'bg-[#11C98D] text-white'
                              : 'bg-[#19EAB2] text-[#04281D]'
                            : isLight
                              ? 'text-[#31557B]'
                              : 'text-[#B5C7DC]'
                        }`}
                      >
                        mph
                      </button>
                    </div>
                  </div>

                  <div
                    className={`pt-2 border-t flex items-center justify-between text-xs ${
                      isLight ? 'border-[#C5E0F6]' : 'border-white/10'
                    }`}
                  >
                    <Link
                      to="/data"
                      className={`hover:underline ${isLight ? 'text-[#048C61] font-medium' : 'text-[#45F4A5]'}`}
                      onClick={() => setSettingsOpen(false)}
                    >
                      NASA Data Sources
                    </Link>
                    <Link
                      to="/about"
                      className={isLight ? 'text-[#2D557C] hover:text-[#08223E]' : 'text-[#B5C7DC] hover:text-white'}
                      onClick={() => setSettingsOpen(false)}
                    >
                      About & AI
                    </Link>
                  </div>
                </div>
              )}

              {/* Profile Popover */}
              {profileMenuOpen && (
                <div className="fs-glass-card absolute right-0 top-[56px] z-40 w-[250px] rounded-[24px] p-4 space-y-2.5">
                  <div
                    className={`text-[13px] font-semibold ${
                      isLight ? 'text-[#08223E]' : 'text-[#F1F7FF]'
                    }`}
                  >
                    {currentFarm.location.farmName || 'Active Farm'}
                  </div>
                  <div className={`text-[12px] ${isLight ? 'text-[#2C5278]' : 'text-[#B5C7DC]'}`}>
                    {farmLocationText} · {healthBreakdown.overallPct}% Health
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('/analyze?mode=farm')}
                    className="w-full mt-1 py-2 px-3 rounded-xl text-xs font-semibold text-[#05281A] bg-[#20EDA0] hover:brightness-105 transition cursor-pointer"
                  >
                    Open Smart Farm Workspace
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Mobile Glass Navigation Drawer */}
          {mobileNavOpen && (
            <nav
              aria-label="Mobile navigation"
              className="lg:hidden relative z-30 pointer-events-auto mt-3 fs-glass-card rounded-[24px] p-3 grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              <Link
                to="/"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-medium ${
                  isLight ? 'bg-[#0CB97E]/20 text-[#053524]' : 'bg-[#00EE99]/20 text-white'
                }`}
              >
                <Home className={`w-4 h-4 ${isLight ? 'text-[#078C5E]' : 'text-[#23EBA0]'}`} />
                <span>Home</span>
              </Link>
              <Link
                to="/analyze"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs ${
                  isLight ? 'text-[#0E2E52] hover:bg-white/60' : 'text-[#D4E1F0] hover:bg-white/10'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>Analyze</span>
              </Link>
              <Link
                to="/compare"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs ${
                  isLight ? 'text-[#0E2E52] hover:bg-white/60' : 'text-[#D4E1F0] hover:bg-white/10'
                }`}
              >
                <GitCompareArrows className="w-4 h-4" />
                <span>Compare</span>
              </Link>
              <Link
                to="/data"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs ${
                  isLight ? 'text-[#0E2E52] hover:bg-white/60' : 'text-[#D4E1F0] hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Data Sources</span>
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs ${
                  isLight ? 'text-[#0E2E52] hover:bg-white/60' : 'text-[#D4E1F0] hover:bg-white/10'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>About</span>
              </Link>
            </nav>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PAGE 1 HERO CONTENT (Scrolls over the fixed top backdrop)             */}
      {/* ===================================================================== */}
      <div className="relative z-10 min-h-[88vh] flex flex-col overflow-hidden">
        {/* Interactive Spinnable 3D Earth peeking from bottom-right corner */}
        <CornerEarth3D isLight={isLight} />

        <div className="relative z-20 pointer-events-none max-w-[1400px] w-full mx-auto px-5 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-24 sm:pb-32 flex-1 flex flex-col">

          {/* HERO SECTION (Desktop left-aligned, spacious) */}
          <section className="relative z-20 pointer-events-auto my-auto pt-12 sm:pt-16 pb-8 max-w-[580px]">
            <h1 className="text-[40px] sm:text-[50px] lg:text-[56px] font-bold leading-[1.08] tracking-[-0.036em]">
              <span
                className={`block ${
                  isLight
                    ? 'text-[#06223F] drop-shadow-[0_2px_14px_rgba(255,255,255,0.68)]'
                    : 'text-[#E9F2FF]'
                }`}
              >
                Smarter decisions.
              </span>
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage: isLight
                    ? 'linear-gradient(100deg, #027A54 0%, #059C6C 52%, #07B37E 100%)'
                    : 'linear-gradient(100deg, #51F6AA 0%, #12DBA0 52%, #00D99A 100%)',
                  filter: isLight
                    ? 'drop-shadow(0 2px 12px rgba(255, 255, 255, 0.55))'
                    : undefined,
                }}
              >
                Healthier fields.
              </span>
            </h1>

            <p
              className={`mt-5 text-[16px] sm:text-[18px] font-normal leading-[1.5] max-w-[440px] ${
                isLight
                  ? 'text-[#0D2F52] font-medium drop-shadow-[0_1px_10px_rgba(255,255,255,0.72)]'
                  : 'text-[#E1EBF7]'
              }`}
            >
              Track your farm’s performance, monitor conditions, and stay ahead.
            </p>

            <button
              type="button"
              onClick={() => handleOpenWorkspace('/analyze?mode=farm')}
              className="mt-7 inline-flex items-center justify-between gap-3.5 min-w-[232px] h-[52px] px-5 rounded-[28px] text-[#04281B] font-semibold text-[14px] transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 cursor-pointer"
              style={{
                background: 'linear-gradient(105deg, #5AFFB4 0%, #20EDA0 60%, #51E6AE 100%)',
                boxShadow: isLight
                  ? '0 8px 24px rgba(5, 166, 112, 0.34), 0 4px 12px rgba(8, 42, 78, 0.14)'
                  : '0 0 14px rgba(0, 255, 157, 0.42), 0 0 32px rgba(0, 255, 157, 0.25), 0 6px 18px rgba(0, 0, 0, 0.25)',
              }}
            >
              <span className="inline-flex items-center gap-2.5">
                <ConditionsLeafIcon className="w-[24px] h-[23px]" dark />
                <span>Plan crop rotations</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#04281B]" strokeWidth={2.2} />
            </button>
          </section>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MISTY HYPER-REALISTIC ANIMATED CLOUDY OVERLAY BETWEEN THE 2 SECTIONS  */}
      {/* ===================================================================== */}
      <MistyCloudTransition isLight={isLight} />

      {/* ===================================================================== */}
      {/* PAGE 2 BELOW: Scrolls up to replace Page 1, then stays sticky while   */}
      {/* the cards scroll smoothly over it!                                    */}
      {/* Dark: image_f90e4497 | Light: image_73994810                          */}
      {/* ===================================================================== */}
      <div className="relative z-10 overflow-x-clip">
        {/* Sticky background layer inside Page 2 container (dual-layer cross-dissolve) */}
        <div
          aria-hidden="true"
          className="sticky top-0 h-screen w-full -mb-[100vh] pointer-events-none z-0 overflow-hidden"
        >
          <img
            src="/assets/aistudio/image_f90e4497.png"
            alt=""
            className={`absolute inset-0 w-full h-full object-cover object-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isLight ? 'opacity-0 scale-[1.03]' : 'opacity-100 scale-100'
            }`}
          />
          <img
            src="/assets/aistudio/image_73994810.png"
            alt=""
            className={`absolute inset-0 w-full h-full object-cover object-center brightness-[0.80] contrast-[1.03] saturate-[0.94] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isLight ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
            }`}
          />
          {/* Soft upper edge feather so Page 2 meets the drifting mist cleanly */}
          <div
            className="absolute inset-x-0 top-0 h-32 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              background: isLight
                ? 'linear-gradient(180deg, rgba(196, 224, 246, 0.52) 0%, rgba(196, 224, 246, 0.18) 55%, rgba(196, 224, 246, 0) 100%)'
                : 'linear-gradient(180deg, rgba(2, 16, 40, 0.72) 0%, rgba(2, 16, 40, 0.28) 55%, rgba(2, 16, 40, 0) 100%)',
            }}
          />
          {/* Subtle readability scrim */}
          <div
            className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              background: isLight
                ? 'linear-gradient(180deg, rgba(14, 46, 82, 0.14) 0%, rgba(12, 42, 74, 0.16) 70%, rgba(8, 30, 56, 0.26) 100%)'
                : 'linear-gradient(180deg, rgba(0, 11, 29, 0.14) 0%, rgba(0, 11, 29, 0.26) 65%, rgba(0, 5, 17, 0.50) 100%)',
            }}
          />
        </div>

        {/* Scrolling Cards Layer over the sticky Page 2 farm landscape */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-20 pb-20 sm:pb-24">
          {/* FARM SELECTION DROPDOWN */}
          <div ref={dropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setFarmMenuOpen((v) => !v)}
              aria-expanded={farmMenuOpen}
              aria-haspopup="listbox"
              className={`fs-glass-card fs-glass-card-interactive inline-flex items-center justify-between gap-3 w-[280px] h-[52px] px-4 rounded-[27px] text-[15px] font-medium cursor-pointer ${
                isLight ? 'text-[#082542]' : 'text-[#F4F8FF]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 truncate">
                <ConditionsLeafIcon
                  className="w-[26px] h-[24px] shrink-0 drop-shadow-[0_0_6px_rgba(22,239,162,0.45)]"
                />
                <span className="truncate">{currentFarm.location.farmName || 'Unnamed Farm'}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  isLight ? 'text-[#284E73]' : 'text-[#C6DAEE]'
                } ${farmMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {farmMenuOpen && (
              <div
                role="listbox"
                className="fs-glass-card absolute left-0 top-[58px] z-30 w-[300px] rounded-[24px] p-1.5 space-y-1"
              >
                {farms.map((farm) => {
                  const isSelected = farm.id === currentFarm.id;
                  const label = farm.location.farmName || 'Unnamed Farm';
                  return (
                    <button
                      key={farm.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedFarmId(farm.id);
                        setFarmMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left text-[13.5px] transition-colors cursor-pointer ${
                        isSelected
                          ? isLight
                            ? 'bg-[#0EB87F]/20 text-[#053524] font-semibold'
                            : 'bg-[#19EAB2]/18 text-white font-medium'
                          : isLight
                            ? 'text-[#0E2E52] hover:bg-white/60'
                            : 'text-[#D4E2F1] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <span
                        className={`text-[11px] ml-2 shrink-0 ${
                          isLight ? 'text-[#39628A]' : 'text-[#8FAECB]'
                        }`}
                      >
                        {farm.crops.currentCrops[0] || 'Farm'}
                      </span>
                    </button>
                  );
                })}
                <div
                  className={`pt-1 mt-1 border-t ${
                    isLight ? 'border-[#BFDDF5]' : 'border-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFarmMenuOpen(false);
                      handleOpenWorkspace('/analyze?mode=farm');
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-2xl text-[12.5px] font-medium cursor-pointer ${
                      isLight
                        ? 'text-[#048C61] hover:bg-white/60'
                        : 'text-[#5AFFB4] hover:bg-white/[0.06]'
                    }`}
                  >
                    + Manage or add farm in Workspace →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* MAIN FARM CONDITIONS CARD                                         */}
          {/* ================================================================= */}
          <section
            aria-label="Farm Conditions"
            className="fs-glass-card mt-3.5 rounded-[37px] w-full"
          >
            {/* Left-to-right gradually disappearing farm photo layer inside glass */}
            <div className="fs-glass-card-bg">
              <div
                className="absolute inset-y-0 left-0 w-full lg:w-[82%]"
                style={{
                  maskImage:
                    'linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.86) 36%, rgba(0,0,0,0.42) 64%, rgba(0,0,0,0) 94%)',
                  WebkitMaskImage:
                    'linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.86) 36%, rgba(0,0,0,0.42) 64%, rgba(0,0,0,0) 94%)',
                }}
              >
                <img
                  src={conditionsCardImage}
                  alt=""
                  className={`w-full h-full object-cover object-left ${
                    isLight ? 'opacity-78 brightness-[0.90]' : 'opacity-85'
                  }`}
                />
              </div>
              <div
                className="absolute inset-0"
                style={{
                  background: isLight
                    ? 'linear-gradient(90deg, rgba(226, 242, 255, 0.10) 0%, rgba(226, 242, 255, 0.14) 38%, rgba(226, 242, 255, 0.36) 72%, rgba(232, 245, 255, 0.48) 100%)'
                    : 'linear-gradient(90deg, rgba(2, 24, 52, 0.12) 0%, rgba(2, 26, 56, 0.10) 38%, rgba(2, 25, 52, 0.40) 72%, rgba(3, 29, 57, 0.54) 100%)',
                }}
              />
            </div>

            {/* Panel Header */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-[18px]"
              style={{
                borderBottom: isLight
                  ? '1px solid rgba(110, 178, 228, 0.34)'
                  : '1px solid rgba(119, 195, 235, 0.18)',
              }}
            >
              <div className="flex items-center gap-3.5">
                <ConditionsLeafIcon className="w-[38px] h-[36px] shrink-0" />
                <h2
                  className={`text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em] ${
                    isLight ? 'text-[#082441]' : 'text-[#F1F6FF]'
                  }`}
                >
                  Farm Conditions
                </h2>
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4">
                <span
                  className={`inline-flex items-center gap-2 h-[28px] px-3 rounded-full text-[13px] font-medium ${
                    isLight ? 'text-[#047C54]' : 'text-[#2AF3A8]'
                  }`}
                  style={{
                    background: isLight ? 'rgba(10, 194, 134, 0.18)' : 'rgba(0, 175, 120, 0.20)',
                    border: isLight
                      ? '1px solid rgba(8, 172, 118, 0.35)'
                      : '1px solid rgba(0, 235, 160, 0.26)',
                  }}
                >
                  {telemetryLoading ? (
                    <Loader2
                      className={`w-3.5 h-3.5 animate-spin ${
                        isLight ? 'text-[#048C61]' : 'text-[#1DF3A3]'
                      }`}
                    />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full fs-live-dot ${
                        isLight ? 'bg-[#049D6B]' : 'bg-[#1DF3A3]'
                      }`}
                    />
                  )}
                  <span>Live</span>
                </span>

                <span
                  className={`text-[13.5px] sm:text-[14px] ${
                    isLight ? 'text-[#1E4469]' : 'text-[#D6E3F1]'
                  }`}
                >
                  {telemetryError ? 'Offline fallback' : formatMinutesAgo(lastSyncedAt)}
                </span>

                <button
                  type="button"
                  onClick={handleRefreshConditions}
                  aria-label="Refresh farm conditions"
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer ${
                    isLight
                      ? 'text-[#123A61] hover:text-[#061D35] hover:bg-white/60'
                      : 'text-[#DCEAF8] hover:text-white hover:bg-white/10'
                  }`}
                >
                  <RefreshCw
                    className={`w-[22px] h-[22px] transition-transform duration-500 ${
                      refreshSpinning || telemetryLoading ? 'animate-spin' : ''
                    }`}
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_370px] xl:grid-cols-[1fr_410px]">
              {/* LEFT: Resized & Centered Health Circle Bar + Conditional Real Alerts */}
              <div className="px-5 sm:px-8 pt-6 pb-7 flex flex-col justify-between">
                <div className="flex flex-col items-center justify-center py-2">
                  <button
                    type="button"
                    onClick={() => setBreakdownOpen(true)}
                    title="View overall farm health calculation breakdown"
                    className="group flex flex-col items-center cursor-pointer focus:outline-none"
                  >
                    <div
                      className="relative w-[210px] h-[210px] sm:w-[224px] sm:h-[224px] flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.02]"
                      style={{
                        filter: isLight
                          ? 'drop-shadow(0 6px 18px rgba(7, 158, 108, 0.25))'
                          : 'drop-shadow(0 0 12px rgba(0, 255, 164, 0.34)) drop-shadow(0 0 28px rgba(0, 230, 165, 0.16))',
                      }}
                    >
                      <svg viewBox="0 0 260 260" className="w-full h-full">
                        <defs>
                          <linearGradient id="fsRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={isLight ? '#059669' : '#07A981'} />
                            <stop offset="32%" stopColor={isLight ? '#10B981' : '#16E4B7'} />
                            <stop offset="72%" stopColor={isLight ? '#22E3A0' : '#42FFBA'} />
                            <stop offset="100%" stopColor={isLight ? '#0BC592' : '#19EBC2'} />
                          </linearGradient>
                        </defs>
                        <circle
                          cx="130"
                          cy="130"
                          r="98"
                          fill={isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(0, 24, 48, 0.42)'}
                        />
                        <circle
                          cx="130"
                          cy="130"
                          r={radius}
                          fill="none"
                          stroke={isLight ? 'rgba(6, 148, 106, 0.18)' : 'rgba(0, 130, 117, 0.22)'}
                          strokeWidth="18"
                        />
                        <circle
                          cx="130"
                          cy="130"
                          r={radius}
                          fill="none"
                          stroke="url(#fsRingGrad)"
                          strokeWidth="18"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={progressOffset}
                          transform="rotate(128 130 130)"
                          style={{
                            transition: 'stroke-dashoffset 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        />
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                        <ConditionsLeafIcon className="w-[36px] h-[34px] mb-1" />
                        <div
                          className={`text-[48px] sm:text-[52px] font-bold leading-none tracking-[-2px] tabular-nums ${
                            isLight ? 'text-[#072340]' : 'text-[#F5FAFF]'
                          }`}
                        >
                          {healthBreakdown.overallPct}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Activity
                        className={`w-[22px] h-[22px] ${
                          isLight ? 'text-[#048C61]' : 'text-[#10EBA2]'
                        }`}
                        strokeWidth={2.4}
                      />
                      <span
                        className={`text-[21px] sm:text-[22px] font-semibold tracking-[-0.01em] ${
                          isLight ? 'text-[#048C61]' : 'text-[#10EBA2]'
                        }`}
                      >
                        {healthBreakdown.statusLabel}
                      </span>
                    </div>

                    <span
                      className={`mt-1 text-[11.5px] transition-colors ${
                        isLight
                          ? 'text-[#214B73] group-hover:text-[#048C61]'
                          : 'text-[#9BC2E3] group-hover:text-[#5AFFB4]'
                      }`}
                    >
                      Calculated from NASA climate, soil, weather & rotation · View breakdown
                    </span>
                  </button>
                </div>

                {/* REAL CONDITIONAL ALERTS (shows reassuring All Fine badge if none exist) */}
                <div className="mt-5 space-y-2.5">
                  {realAlerts.length === 0 ? (
                    <div
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 sm:px-5 min-h-[56px] py-2.5 rounded-[21px] transition-all duration-500"
                      style={{
                        background: isLight
                          ? 'linear-gradient(100deg, rgba(212, 249, 233, 0.72), rgba(226, 245, 255, 0.74))'
                          : 'linear-gradient(100deg, rgba(8, 66, 62, 0.46), rgba(4, 34, 62, 0.54))',
                        border: isLight
                          ? '1px solid rgba(16, 185, 129, 0.36)'
                          : '1px solid rgba(33, 223, 177, 0.34)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                          style={{
                            background: isLight
                              ? 'rgba(16, 185, 129, 0.16)'
                              : 'rgba(25, 234, 178, 0.14)',
                            boxShadow: isLight
                              ? '0 0 10px rgba(16, 185, 129, 0.18)'
                              : '0 0 12px rgba(25, 234, 178, 0.26)',
                          }}
                        >
                          <ShieldCheck
                            className={`w-[19px] h-[19px] ${
                              isLight ? 'text-[#048C61]' : 'text-[#19EAB2]'
                            }`}
                            strokeWidth={2.2}
                          />
                        </span>
                        <span
                          className={`text-[15.5px] font-bold shrink-0 ${
                            isLight ? 'text-[#048C61]' : 'text-[#19EAB2]'
                          }`}
                        >
                          All Fine
                        </span>
                        <span
                          className={`text-[14px] truncate ${
                            isLight ? 'text-[#093B2C] font-medium' : 'text-[#E6F4FF]'
                          }`}
                        >
                          All monitored field, soil, and weather conditions are healthy.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBreakdownOpen(true)}
                        className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap shrink-0 hover:underline cursor-pointer ml-auto ${
                          isLight ? 'text-[#048C61]' : 'text-[#2AF3A8]'
                        }`}
                      >
                        <span>View breakdown</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    realAlerts.slice(0, 3).map((alert) => {
                      const isCritical = alert.severity === 'critical';
                      return (
                        <div
                          key={alert.id}
                          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 sm:px-5 min-h-[56px] py-2.5 rounded-[21px]"
                          style={{
                            background: isLight
                              ? isCritical
                                ? 'linear-gradient(100deg, rgba(255, 228, 232, 0.90), rgba(255, 242, 245, 0.92))'
                                : 'linear-gradient(100deg, rgba(255, 241, 219, 0.92), rgba(255, 248, 236, 0.92))'
                              : isCritical
                                ? 'linear-gradient(100deg, rgba(96, 35, 58, 0.86), rgba(33, 32, 55, 0.88))'
                                : 'linear-gradient(100deg, rgba(96, 60, 31, 0.84), rgba(44, 43, 49, 0.88))',
                            border: isLight
                              ? isCritical
                                ? '1px solid rgba(220, 38, 38, 0.28)'
                                : '1px solid rgba(217, 119, 6, 0.28)'
                              : isCritical
                                ? '1px solid rgba(255, 92, 105, 0.27)'
                                : '1px solid rgba(255, 165, 58, 0.23)',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                              style={{
                                background: isCritical
                                  ? 'rgba(255, 85, 95, 0.14)'
                                  : 'rgba(255, 165, 46, 0.14)',
                                boxShadow: isCritical
                                  ? '0 0 12px rgba(255, 85, 95, 0.20)'
                                  : '0 0 12px rgba(255, 165, 46, 0.20)',
                              }}
                            >
                              <AlertTriangle
                                className="w-[19px] h-[19px]"
                                style={{
                                  color: isLight
                                    ? isCritical
                                      ? '#C81E2B'
                                      : '#B85D00'
                                    : isCritical
                                      ? '#FF555F'
                                      : '#FFA52E',
                                }}
                                strokeWidth={2.2}
                              />
                            </span>
                            <span
                              className="text-[15.5px] font-bold shrink-0"
                              style={{
                                color: isLight
                                  ? isCritical
                                    ? '#C81E2B'
                                    : '#B85D00'
                                  : isCritical
                                    ? '#FF555F'
                                    : '#FFA52E',
                              }}
                            >
                              Alert
                            </span>
                            <span
                              className={`text-[14px] truncate ${
                                isLight ? 'text-[#18334E] font-medium' : 'text-[#E6F1FC]'
                              }`}
                            >
                              {alert.message}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveAlert(alert)}
                            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap shrink-0 hover:underline cursor-pointer ml-auto"
                            style={{
                              color: isLight
                                ? isCritical
                                  ? '#B91C1C'
                                  : '#A15000'
                                : isCritical
                                  ? '#FF5B66'
                                  : '#FFA52E',
                            }}
                          >
                            <span>View details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: REAL FIELDS DERIVED FROM FARM PROFILE */}
              <aside
                aria-label="All Fields"
                className={`px-5 pb-7 pt-2 lg:px-6 lg:pt-6 lg:pb-7 lg:border-l ${
                  isLight
                    ? 'lg:border-[rgba(90,165,220,0.28)]'
                    : 'lg:border-[rgba(148,203,237,0.20)]'
                }`}
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3
                    className={`text-[22px] sm:text-[23px] font-semibold ${
                      isLight ? 'text-[#082441]' : 'text-[#F1F7FF]'
                    }`}
                  >
                    All Fields
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('/analyze?mode=farm')}
                    className={`text-[12px] font-medium hover:underline cursor-pointer ${
                      isLight ? 'text-[#048C61]' : 'text-[#5AFFB4]'
                    }`}
                  >
                    Edit fields
                  </button>
                </div>

                {realFields.length === 0 ? (
                  <div className="fs-glass-card rounded-[21px] p-5 text-center space-y-3">
                    <p className={`text-sm ${isLight ? 'text-[#21456B]' : 'text-[#D4E2F1]'}`}>
                      No crops assigned to this farm yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenWorkspace('/analyze?mode=farm')}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-[#04281B] bg-[#20EDA0] cursor-pointer"
                    >
                      Configure Crops in Workspace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realFields.map((field) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => setActiveField(field)}
                        className="fs-glass-card fs-glass-card-interactive w-full text-left flex items-center gap-4 p-2.5 min-h-[120px] rounded-[21px] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer group"
                      >
                        <img
                          src={field.image}
                          alt={`${field.name} ${field.cropName}`}
                          className="w-[108px] sm:w-[116px] h-[100px] rounded-[15px] object-cover shrink-0 relative z-[2]"
                        />

                        <div className="flex-1 min-w-0 py-1">
                          <div
                            className={`text-[16px] font-semibold leading-snug ${
                              isLight ? 'text-[#082441]' : 'text-[#F4F8FF]'
                            }`}
                          >
                            {field.name}
                          </div>
                          <div
                            className={`text-[15px] leading-snug mt-0.5 truncate ${
                              isLight ? 'text-[#1F446B]' : 'text-[#E4EDF8]'
                            }`}
                          >
                            {field.cropName}
                          </div>

                          <div className="mt-2.5">
                            {field.isCurrent ? (
                              <span
                                className={`inline-flex items-center justify-center h-[27px] px-3.5 rounded-full text-[12px] font-semibold ${
                                  isLight
                                    ? 'bg-[#0DC487] text-white'
                                    : 'bg-[#19EAB2] text-[#04281B]'
                                }`}
                              >
                                {field.rotationLabel}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 text-[14px] ${
                                  isLight ? 'text-[#173C62]' : 'text-[#DCEAF8]'
                                }`}
                              >
                                <RefreshCw
                                  className={`w-[18px] h-[18px] ${
                                    isLight ? 'text-[#059465]' : 'text-[#1EEFA3]'
                                  }`}
                                  strokeWidth={2.2}
                                />
                                <span className="tabular-nums">{field.rotationLabel}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight
                          className={`w-[18px] h-[18px] group-hover:translate-x-0.5 transition-all shrink-0 mr-1 ${
                            isLight
                              ? 'text-[#315B85] group-hover:text-[#082441]'
                              : 'text-[#CFE0F2] group-hover:text-white'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </section>

          {/* ================================================================= */}
          {/* LIVE WEATHER PANEL (Open-Meteo API for active farm's lat/lon)     */}
          {/* ================================================================= */}
          <section
            aria-label="Weather"
            className="fs-glass-card mt-7 rounded-[37px] min-h-[123px] px-6 sm:px-10 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
          >
            {/* Group 1: Weather */}
            <div className="flex items-center gap-5 min-w-0 md:flex-[1.35]">
              <PartlyCloudy3DIcon className="w-[78px] h-[74px] shrink-0" />
              <div>
                <div
                  className={`text-[18px] font-semibold leading-snug ${
                    isLight ? 'text-[#082441]' : 'text-white'
                  }`}
                >
                  Weather
                </div>
                <div className="flex items-baseline gap-2.5 mt-0.5 flex-wrap">
                  <span
                    className={`text-[29px] font-bold leading-none tabular-nums ${
                      isLight ? 'text-[#082441]' : 'text-[#F5F9FF]'
                    }`}
                  >
                    {displayTemp}
                  </span>
                  <span className={`text-[14px] ${isLight ? 'text-[#21456B]' : 'text-[#DCE8F5]'}`}>
                    - &nbsp;{displayCondition}
                  </span>
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className={`hidden md:block w-px h-[57px] shrink-0 ${
                isLight ? 'bg-[rgba(96,162,216,0.38)]' : 'bg-[rgba(162,203,231,0.28)]'
              }`}
            />

            {/* Group 2: Humidity */}
            <div className="flex items-center gap-3.5 md:px-4">
              <DropletGlossIcon className="w-[29px] h-[31px] shrink-0" />
              <div>
                <div
                  className={`text-[16px] font-semibold leading-tight tabular-nums ${
                    isLight ? 'text-[#082441]' : 'text-[#F5F9FF]'
                  }`}
                >
                  {displayHumidity}
                </div>
                <div
                  className={`text-[14px] leading-tight mt-0.5 ${
                    isLight ? 'text-[#2A4F75]' : 'text-[#C8DAEC]'
                  }`}
                >
                  Humidity
                </div>
              </div>
            </div>

            {/* Group 3: Wind */}
            <div className="flex items-center gap-3.5 md:px-4">
              <Wind
                className={`w-[30px] h-[30px] shrink-0 ${
                  isLight ? 'text-[#0F5591]' : 'text-[#E6F1FC]'
                }`}
                strokeWidth={1.8}
              />
              <div>
                <div
                  className={`text-[15.5px] font-semibold leading-tight tabular-nums ${
                    isLight ? 'text-[#082441]' : 'text-[#F5F9FF]'
                  }`}
                >
                  {displayWind}
                </div>
                <div
                  className={`text-[14px] leading-tight mt-0.5 ${
                    isLight ? 'text-[#2A4F75]' : 'text-[#C8DAEC]'
                  }`}
                >
                  Wind
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className={`hidden md:block w-px h-[57px] shrink-0 ${
                isLight ? 'bg-[rgba(96,162,216,0.38)]' : 'bg-[rgba(162,203,231,0.28)]'
              }`}
            />

            {/* Group 4: Location */}
            <div className="flex items-center gap-2.5 md:pr-2 min-w-0 max-w-full md:max-w-[260px]">
              <MapPin
                className={`w-[24px] h-[24px] shrink-0 ${
                  isLight ? 'text-[#0F5591]' : 'text-[#C9D9EC]'
                }`}
                strokeWidth={1.9}
              />
              <span
                className={`text-[14.5px] font-medium truncate ${
                  isLight ? 'text-[#12375E]' : 'text-[#E3EDF9]'
                }`}
              >
                {farmLocationText}
              </span>
            </div>
          </section>

          {/* ================================================================= */}
          {/* BOTTOM FARM HEALTH STATUS BANNER                                  */}
          {/* ================================================================= */}
          <section
            aria-label="Farm health summary"
            className="fs-glass-card mt-10 sm:mt-14 rounded-[37px] min-h-[92px] px-5 sm:px-8 py-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 sm:gap-5 shrink-0">
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #5AFFB4 0%, #16E89F 100%)',
                  boxShadow: isLight
                    ? '0 4px 16px rgba(10, 182, 122, 0.35)'
                    : '0 0 14px rgba(0, 255, 164, 0.45), 0 0 28px rgba(0, 255, 164, 0.20)',
                }}
              >
                <ConditionsLeafIcon className="w-[28px] h-[26px]" dark />
              </div>
              <div>
                <div
                  className={`text-[17px] font-semibold leading-snug ${
                    isLight ? 'text-[#082441]' : 'text-[#F2F8FF]'
                  }`}
                >
                  {healthBreakdown.trackHeadline}
                </div>
                <div
                  className={`text-[14px] leading-snug ${
                    isLight ? 'text-[#21486F]' : 'text-[#DCE9F4]'
                  }`}
                >
                  {healthBreakdown.trackSubtext}
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="hidden sm:flex items-center flex-1 mx-4 lg:mx-10"
            >
              <div
                className="h-[2px] flex-1 rounded-full"
                style={{
                  background: isLight
                    ? 'linear-gradient(90deg, rgba(6, 178, 118, 0) 0%, rgba(6, 178, 118, 0.50) 55%, #06B276 100%)'
                    : 'linear-gradient(90deg, rgba(0, 240, 155, 0) 0%, rgba(0, 240, 155, 0.45) 55%, #12F4A5 100%)',
                  boxShadow: isLight
                    ? '0 0 6px rgba(6, 178, 118, 0.45)'
                    : '0 0 7px rgba(0, 255, 162, 0.75), 0 0 15px rgba(0, 255, 162, 0.35)',
                }}
              />
              <ArrowRight
                className={`w-4 h-4 -ml-1.5 shrink-0 ${
                  isLight ? 'text-[#06B276]' : 'text-[#12F4A5]'
                }`}
                style={{
                  filter: isLight
                    ? 'drop-shadow(0 0 4px rgba(6, 178, 118, 0.45))'
                    : 'drop-shadow(0 0 6px rgba(0, 255, 162, 0.85))',
                }}
              />
            </div>

            <DecorativeTrackLeaf className="w-[60px] h-[54px] sm:w-[65px] sm:h-[58px] shrink-0" />
          </section>
        </div>
      </div>

      {/* HEALTH CALCULATION BREAKDOWN MODAL */}
      {breakdownOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            isLight ? 'bg-[#092340]/45' : 'bg-[#000817]/75'
          }`}
          onClick={() => setBreakdownOpen(false)}
        >
          <div
            className="fs-glass-card w-full max-w-lg rounded-[30px] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4
                  className={`text-lg font-semibold ${
                    isLight ? 'text-[#082441]' : 'text-[#F1F7FF]'
                  }`}
                >
                  Farm Health Calculation ({healthBreakdown.overallPct}%)
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-[#284F76]' : 'text-[#B5C7DC]'}`}>
                  Deterministic score for {currentFarm.location.farmName || 'Active Farm'} · {farmLocationText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBreakdownOpen(false)}
                className={`cursor-pointer ${
                  isLight ? 'text-[#3B628A] hover:text-[#082441]' : 'text-[#9AB4CE] hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {healthBreakdown.components.map((c) => (
                <div
                  key={c.label}
                  className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    isLight
                      ? 'bg-white/65 border-[#BEDDF5]'
                      : 'bg-white/[0.04] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${isLight ? 'text-[#082441]' : 'text-[#EAF4FF]'}`}
                    >
                      {c.label}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        isLight ? 'text-[#058E61]' : 'text-[#23EBA0]'
                      }`}
                    >
                      {c.score}/100
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded-full overflow-hidden ${
                      isLight ? 'bg-[#C8E4FA]' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0FD891] to-[#5AFFB4]"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                  <p className={`text-xs ${isLight ? 'text-[#274C72]' : 'text-[#B5C7DC]'}`}>
                    {c.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBreakdownOpen(false)}
                className={`px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${
                  isLight
                    ? 'text-[#1D4268] hover:bg-white/70'
                    : 'text-[#D4E2F1] hover:bg-white/10'
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setBreakdownOpen(false);
                  handleOpenWorkspace('/analyze?mode=farm');
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#04281B] bg-[#20EDA0] hover:brightness-110 cursor-pointer"
              >
                Open Full Farm Report →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT DETAIL MODAL */}
      {activeAlert && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            isLight ? 'bg-[#092340]/45' : 'bg-[#000817]/75'
          }`}
          onClick={() => setActiveAlert(null)}
        >
          <div
            className="fs-glass-card w-full max-w-md rounded-[28px] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  className="w-5 h-5"
                  style={{
                    color: isLight
                      ? activeAlert.severity === 'critical'
                        ? '#C81E2B'
                        : '#B85D00'
                      : activeAlert.severity === 'critical'
                        ? '#FF555F'
                        : '#FFA52E',
                  }}
                />
                <span
                  className="text-sm font-bold"
                  style={{
                    color: isLight
                      ? activeAlert.severity === 'critical'
                        ? '#C81E2B'
                        : '#B85D00'
                      : activeAlert.severity === 'critical'
                        ? '#FF555F'
                        : '#FFA52E',
                  }}
                >
                  {activeAlert.source} Alert
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className={`cursor-pointer ${
                  isLight ? 'text-[#3B628A] hover:text-[#082441]' : 'text-[#9AB4CE] hover:text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h4
              className={`text-lg font-semibold ${isLight ? 'text-[#082441]' : 'text-[#F1F7FF]'}`}
            >
              {activeAlert.message}
            </h4>
            <p
              className={`text-sm leading-relaxed ${
                isLight ? 'text-[#1F446A]' : 'text-[#D4E2F1]'
              }`}
            >
              {activeAlert.recommendation}
            </p>
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-mono ${
                isLight
                  ? 'bg-white/70 border-[#BEDDF5] text-[#05734E]'
                  : 'bg-white/[0.05] border-white/10 text-[#8CFFD2]'
              }`}
            >
              {activeAlert.metric}
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveAlert(null)}
                className={`px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${
                  isLight
                    ? 'text-[#1D4268] hover:bg-white/70'
                    : 'text-[#D4E2F1] hover:bg-white/10'
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveAlert(null);
                  handleOpenWorkspace('/analyze?mode=farm');
                }}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[#04281B] bg-[#20EDA0] hover:brightness-110 cursor-pointer"
              >
                Run Full Farm Analysis →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIELD DETAIL MODAL */}
      {activeField && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            isLight ? 'bg-[#092340]/45' : 'bg-[#000817]/75'
          }`}
          onClick={() => setActiveField(null)}
        >
          <div
            className="fs-glass-card w-full max-w-md rounded-[28px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-44">
              <img
                src={activeField.image}
                alt={`${activeField.name} ${activeField.cropName}`}
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${
                  isLight ? 'from-[#E8F6FF]' : 'from-[#001631]'
                }`}
              />
              <button
                type="button"
                onClick={() => setActiveField(null)}
                aria-label="Close field details"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className={`text-xl font-semibold ${
                      isLight ? 'text-[#082441]' : 'text-[#F4F8FF]'
                    }`}
                  >
                    {activeField.name}
                  </h4>
                  <p
                    className={`text-sm font-medium ${
                      isLight ? 'text-[#058E61]' : 'text-[#5AFFB4]'
                    }`}
                  >
                    {activeField.cropName}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    isLight
                      ? 'bg-[#0DC487]/18 text-[#05734E] border-[#0DC487]/35'
                      : 'bg-[#19EAB2]/20 text-[#23EBA0] border-[#19EAB2]/35'
                  }`}
                >
                  {activeField.rotationLabel}
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  isLight ? 'text-[#1F446A]' : 'text-[#D4E2F1]'
                }`}
              >
                {activeField.notes}
              </p>
              <div
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs ${
                  isLight
                    ? 'bg-white/70 border-[#BEDDF5]'
                    : 'bg-white/[0.05] border-white/10'
                }`}
              >
                <span className={isLight ? 'text-[#284F76]' : 'text-[#B5C7DC]'}>
                  Nitrogen Profile
                </span>
                <span
                  className={`font-mono font-semibold capitalize ${
                    isLight ? 'text-[#0B66B8]' : 'text-[#3CCBFF]'
                  }`}
                >
                  {activeField.nitrogenRole}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveField(null)}
                  className={`px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${
                    isLight
                      ? 'text-[#1D4268] hover:bg-white/70'
                      : 'text-[#D4E2F1] hover:bg-white/10'
                  }`}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveField(null);
                    handleOpenWorkspace('/analyze?mode=farm');
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#04281B] bg-[#20EDA0] hover:brightness-110 cursor-pointer"
                >
                  Plan Rotation for {activeField.name} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
