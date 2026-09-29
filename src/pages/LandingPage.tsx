import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Tv,
  Layers,
  LayoutGrid,
  Radio,
  User,
  LogIn,
  UserPlus,
  ListOrdered,
  X,
  Mail,
  Lock,
  Building,
  AlertCircle,
  ChevronDown,
  LogOut,
  Timer,
  Sliders,
  Users,
  Palette,
  Type,
  Code2,
  Copy,
  Check,
} from 'lucide-react';
import { formatDuration } from '../utils/timeUtils';
import { authService } from '../services/authService';
import { AuthUser } from '../types';

interface LandingPageProps {
  currentUser: AuthUser | null;
  onEnterApp: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onEnterApp,
  onLoginSuccess,
  onLogout,
}) => {
  // Modal state for Prompting Login / Sign Up
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  // Clean empty inputs - NO sample accounts
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authOrganization, setAuthOrganization] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  // Google Account chooser modal state for regular Google account selection
  const [showGoogleChooser, setShowGoogleChooser] = useState<boolean>(false);
  const [useCustomGoogleAccount, setUseCustomGoogleAccount] = useState<boolean>(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState<string>('');
  const [googleCustomName, setGoogleCustomName] = useState<string>('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState<boolean>(false);

  // Demo 2: Animated Overrun Recovery Simulation
  const [isCompensated, setIsCompensated] = useState<boolean>(false);

  // Giant Timer Showcase Demo State
  const [giantDemoFont, setGiantDemoFont] = useState<string>('original');
  const [giantDemoColor, setGiantDemoColor] = useState<string>('#FFFFFF');
  const [giantDemoIsTimeUp, setGiantDemoIsTimeUp] = useState<boolean>(false);
  const [giantDemoSeconds, setGiantDemoSeconds] = useState<number>(868); // 14:28
  const [giantDemoRunning, setGiantDemoRunning] = useState<boolean>(true);

  // Live countdown ticker for the Giant Stage Timer demo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (giantDemoRunning && !giantDemoIsTimeUp) {
      timer = setInterval(() => {
        setGiantDemoSeconds((prev) => {
          if (prev <= 1) {
            return 868; // loop back to 14:28 for continuous lively preview
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [giantDemoRunning, giantDemoIsTimeUp]);

  // Smooth scroll helper that works consistently in all iframe/browser environments
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Central handler for entering workspace:
  // If not logged in, prompt login/signup modal immediately
  const handleEnterWorkspace = () => {
    if (currentUser) {
      onEnterApp();
    } else {
      setAuthError('');
      setAuthModalMode('login');
      setShowAuthModal(true);
    }
  };

  // Google Sign-In & Create Account Selection Handler
  const handleGoogleAccountSelect = (email: string, name?: string) => {
    setIsGoogleSigningIn(true);
    setAuthLoading(true);

    setTimeout(() => {
      const emailToUse = email.trim().toLowerCase() || 'adekunleolaomo@gmail.com';
      const nameFromEmail =
        name?.trim() ||
        emailToUse.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const res = authService.loginWithGoogle({
        email: emailToUse,
        name: nameFromEmail,
        organization: authOrganization.trim() || 'Live Production Team',
      });

      setIsGoogleSigningIn(false);
      setAuthLoading(false);
      setShowGoogleChooser(false);
      setShowAuthModal(false);
      onLoginSuccess(res.user);
      onEnterApp();
    }, 450);
  };

  // Form submission handler
  const handleAuthSubmit = (e: React.FormEvent, isModal: boolean) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    setTimeout(() => {
      if (authModalMode === 'login') {
        const res = authService.login(authEmail, authPassword);
        if (res.success && res.user) {
          setAuthLoading(false);
          if (isModal) setShowAuthModal(false);
          onLoginSuccess(res.user);
          onEnterApp();
        } else {
          setAuthLoading(false);
          setAuthError(res.error || 'Invalid email or password');
        }
      } else {
        const res = authService.signup({
          name: authFullName,
          email: authEmail,
          organization: authOrganization,
          password: authPassword,
        });
        if (res.success && res.user) {
          setAuthLoading(false);
          if (isModal) setShowAuthModal(false);
          onLoginSuccess(res.user);
          onEnterApp();
        } else {
          setAuthLoading(false);
          setAuthError(res.error || 'Failed to create account');
        }
      }
    }, 300);
  };

  return (
    <div
      id="landing-root"
      className="h-screen w-full overflow-y-auto overflow-x-hidden bg-black text-white selection:bg-emerald-500 selection:text-black scroll-smooth"
    >
      {/* ============================================================ */}
      {/* 1. TOP NAVIGATION BAR WITH SHORTCUT BUTTONS */}
      {/* ============================================================ */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-xl bg-black/90 border-b border-neutral-800/80 px-4 sm:px-8 py-3 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/logo.png"
            alt="EventFlow Logo"
            className="w-7 h-7 object-contain rounded-md"
          />
          <span className="font-extrabold text-base tracking-tight text-white">EventFlow</span>
          <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            STAGE RUNNER V2.0
          </span>
        </div>

        {/* Retained Shortcut Buttons */}
        <div className="hidden sm:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => scrollToSection('displays')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Giant Timer
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('audiences')}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            Who It's For
          </button>
        </div>

        {/* Top Right Action & Workspace / Auth Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEnterWorkspace}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-lg active:scale-95 cursor-pointer"
                  title="Open live operator workspace"
                >
                  <Radio size={14} className="animate-pulse" />
                  <span>Enter Workspace</span>
                </button>

                <button
                  onClick={() => setShowUserDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                  <ChevronDown size={12} className="text-neutral-500" />
                </button>
              </div>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in">
                  <div className="p-2.5 border-b border-neutral-800 mb-1">
                    <div className="font-semibold text-xs text-white truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{currentUser.email}</div>
                    <div className="text-[10px] font-mono text-emerald-400 mt-0.5 truncate">
                      {currentUser.organization}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onEnterApp();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left cursor-pointer"
                  >
                    <Radio size={14} className="text-emerald-400" />
                    <span>Open Workspace</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer mt-1"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthError('');
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800 text-xs font-medium transition-colors cursor-pointer"
              >
                <LogIn size={13} />
                <span>Log In</span>
              </button>

              <button
                onClick={() => {
                  setAuthError('');
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <UserPlus size={13} className="text-emerald-400" />
                <span>Sign Up</span>
              </button>

              {/* Main Enter Workspace Button: Prompts Login / Signup if not authenticated */}
              <button
                onClick={handleEnterWorkspace}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
                title="Enter Live Workspace (Prompts login/signup)"
              >
                <Radio size={14} className="animate-pulse" />
                <span>Enter Workspace</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ============================================================ */}
      {/* 2. HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative px-4 sm:px-8 pt-10 pb-16 md:pt-16 md:pb-20 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 sm:w-[650px] h-72 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.08] text-white">
          Keep every speaker on schedule. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Never overrun a live event again.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-neutral-400 max-w-2xl leading-relaxed">
          EventFlow replaces messy countdown clocks with smart, broadcast-grade confidence monitors, instant extended-screen projection, and automated delay compensation.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleEnterWorkspace}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-xl shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Radio size={16} className="text-white animate-pulse" />
            <span>Enter Workspace</span>
            <ArrowRight size={15} />
          </button>

          <button
            onClick={() => scrollToSection('account')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-semibold transition-all hover:border-neutral-700 cursor-pointer"
          >
            <UserPlus size={15} className="text-emerald-400" />
            <span>Create Production Account</span>
          </button>
        </div>

        {/* Quick Highlights Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Multi-Screen Extended Display</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Auto Delay Compensator</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>100% Offline-First Reliable</span>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SECTION: THE GIANT STAGE TIMER SHOWCASE */}
      {/* ============================================================ */}
      <section id="displays" className="py-20 px-4 sm:px-8 border-t border-neutral-900 bg-neutral-950/60 scroll-mt-20">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Stage Display · Pure Simplicity
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              The Giant Stage Timer. Zero Clutter.
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              No distracting multi-layout menus or tiny widgets. Just massive, edge-to-edge digits visible from 60+ feet across an auditorium, with instant font and color customization.
            </p>
          </div>

          {/* Interactive Giant Timer Demo Card */}
          <div className="rounded-3xl bg-black border border-neutral-800 shadow-2xl p-6 sm:p-10 flex flex-col items-center justify-between text-center relative overflow-hidden">
            {/* Header / Info bar inside demo */}
            <div className="w-full flex items-center justify-between pb-4 border-b border-neutral-900 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Main Auditorium DSM Display</span>
                <span className="text-neutral-600">·</span>
                <span>Dr. Evelyn Vance</span>
              </div>
              <div className="font-mono text-neutral-500">TOD: 10:45 AM</div>
            </div>

            {/* Giant Live Digits Display */}
            <div className="my-8 sm:my-12 py-4 flex flex-col items-center justify-center min-h-[220px]">
              {giantDemoIsTimeUp ? (
                <div className="flex flex-col items-center animate-pulse">
                  <span
                    className="text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-tight select-none"
                    style={{
                      fontFamily:
                        giantDemoFont === 'impact'
                          ? "'Impact', 'Arial Black', sans-serif"
                          : giantDemoFont === 'mono'
                          ? 'ui-monospace, monospace'
                          : giantDemoFont === 'sans'
                          ? 'ui-sans-serif, sans-serif'
                          : giantDemoFont === 'digital'
                          ? "'Courier New', monospace"
                          : giantDemoFont === 'serif'
                          ? 'Georgia, serif'
                          : "'Trebuchet MS', sans-serif",
                      color: giantDemoColor === '#FFFFFF' ? '#F43F5E' : giantDemoColor,
                      textShadow: `0 0 50px ${giantDemoColor}60`,
                    }}
                  >
                    TIME UP!
                  </span>
                  <span className="font-mono text-xl sm:text-3xl font-bold mt-2 text-rose-400">
                    +01:45
                  </span>
                </div>
              ) : (
                <span
                  className="text-7xl sm:text-9xl md:text-[11rem] lg:text-[13rem] font-black tracking-tight select-none tabular-nums transition-all"
                  style={{
                    fontFamily:
                      giantDemoFont === 'original'
                        ? "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
                        : giantDemoFont === 'impact'
                        ? "'Impact', 'Arial Black', sans-serif"
                        : giantDemoFont === 'mono'
                        ? 'ui-monospace, monospace'
                        : giantDemoFont === 'sans'
                        ? 'ui-sans-serif, sans-serif'
                        : giantDemoFont === 'digital'
                        ? "'Courier New', monospace"
                        : giantDemoFont === 'serif'
                        ? 'Georgia, serif'
                        : "'Trebuchet MS', sans-serif",
                    letterSpacing: giantDemoFont === 'original' ? '-0.04em' : giantDemoFont === 'digital' ? '0.08em' : 'normal',
                    color: giantDemoColor,
                    textShadow: `0 0 45px ${giantDemoColor}40`,
                  }}
                >
                  {formatDuration(giantDemoSeconds, 'MM:SS')}
                </span>
              )}
            </div>

            {/* Interactive Customization Controls for Visitors */}
            <div className="w-full pt-6 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-4 text-xs">
              {/* Font Selector */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Type size={14} className="text-cyan-400" />
                  <span>Font:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: 'impact', label: 'Impact' },
                    { id: 'mono', label: 'Mono' },
                    { id: 'sans', label: 'Sans' },
                    { id: 'digital', label: 'Digital' },
                    { id: 'serif', label: 'Serif' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setGiantDemoFont(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        giantDemoFont === f.id
                          ? 'bg-neutral-800 text-white border border-neutral-600'
                          : 'bg-neutral-900/60 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Palette size={14} className="text-emerald-400" />
                  <span>Color:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'white', hex: '#FFFFFF' },
                    { id: 'amber', hex: '#F59E0B' },
                    { id: 'emerald', hex: '#10B981' },
                    { id: 'cyan', hex: '#06B6D4' },
                    { id: 'rose', hex: '#F43F5E' },
                    { id: 'orange', hex: '#F97316' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setGiantDemoColor(c.hex)}
                      className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                        giantDemoColor === c.hex
                          ? 'border-white scale-110 ring-2 ring-white/30'
                          : 'border-neutral-700 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`Select ${c.id}`}
                    />
                  ))}
                </div>
              </div>

              {/* Simulate Time Up Toggle */}
              <button
                onClick={() => setGiantDemoIsTimeUp((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  giantDemoIsTimeUp
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
              >
                {giantDemoIsTimeUp ? 'Show Running Countdown' : 'Simulate Time Up'}
              </button>
            </div>
          </div>

          {/* 3 Key Stage Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                <Tv size={16} className="text-cyan-400" />
                <span>60+ Feet Stage Visibility</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Full viewport digits allow keynote speakers, pastors, and panelists to read remaining time effortlessly from anywhere on stage.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                <Palette size={16} className="text-emerald-400" />
                <span>Custom Color &amp; Font</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Choose the exact font and contrast color that matches your venue lighting and personal preference with a single click.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800">
              <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400" />
                <span>Unmistakable Time Up State</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When a segment expires, the giant display switches to an impossible-to-miss bold TIME UP banner with overtime seconds counter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. SECTION: SMART DELAY COMPENSATION DEMO (FEATURES) */}
      {/* ============================================================ */}
      <section id="features" className="py-20 px-4 sm:px-8 border-t border-neutral-900 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Smart Time Bank Algorithm
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Speaker ran 4 minutes over? <br />
                <span className="text-emerald-400">EventFlow recovers it.</span>
              </h2>
              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
                When a segment runs long, our intelligent algorithm calculates proportional reductions across remaining segments so your event wraps at the exact planned minute.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>No rushed panic or abrupt speaker cutoffs</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Proportional time borrowing across non-critical segments</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>One-click Emergency Panic Button (+5m buffer / skip segment)</span>
                </div>
              </div>
            </div>

            {/* Interactive Recovery Simulator */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-neutral-800">
                <span className="font-semibold text-neutral-300">Delay Recovery Simulator</span>
                <span className={`font-mono font-bold ${isCompensated ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCompensated ? 'ON SCHEDULE (11:30 AM)' : '+3:00 BEHIND (11:33 AM)'}
                </span>
              </div>

              {/* Segment timeline mock */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between">
                  <span className="text-neutral-400">Opening Prayer</span>
                  <span className="font-mono text-neutral-500">Done (5m)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-center justify-between">
                  <span className="text-rose-200 font-semibold">Praise &amp; Worship (Overran)</span>
                  <span className="font-mono text-rose-400 font-bold">+3m 00s Overtime</span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between">
                  <span className="text-neutral-200">Announcements</span>
                  <span className="font-mono text-neutral-300">
                    {isCompensated ? <strong className="text-emerald-400">5m (-2m saved)</strong> : '7m planned'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between">
                  <span className="text-neutral-200">Main Sermon</span>
                  <span className="font-mono text-neutral-300">
                    {isCompensated ? <strong className="text-emerald-400">34m (-1m saved)</strong> : '35m planned'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsCompensated((prev) => !prev)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    isCompensated
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>{isCompensated ? 'Reset to Uncompensated' : 'Apply Smart Compensation (-3m)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. SECTION: AUDIENCES */}
      {/* ============================================================ */}
      <section id="audiences" className="py-20 px-4 sm:px-8 border-t border-neutral-900 bg-neutral-950/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Built for High-Stakes Productions
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Trusted by stage directors worldwide.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                ⛪
              </div>
              <h3 className="font-bold text-white text-base">Churches &amp; Worship</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Ensure Sunday services end on time for multiple morning gatherings and parking rotations.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                🎤
              </div>
              <h3 className="font-bold text-white text-base">Keynotes &amp; TEDx</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Give VIP speakers confidence with clear color-coded countdown cues and next-segment indicators.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                📡
              </div>
              <h3 className="font-bold text-white text-base">Broadcast &amp; Streams</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Adhere to strict satellite or livestream broadcast windows with hard-stop target times.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-900/50 border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                🏢
              </div>
              <h3 className="font-bold text-white text-base">Corporate Summits</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Keep complex multi-speaker AGMs, panel discussions, and break transitions running like clockwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. INTEGRATED SIGN IN / SIGN UP SECTION (ON-PAGE) */}
      {/* ============================================================ */}
      <section id="account" className="py-20 px-4 sm:px-8 border-t border-neutral-900 bg-neutral-950/80 scroll-mt-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 blur-[160px] rounded-full pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10">
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Production Access
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ready to take control of your stage?
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm">
              Sign in or create an account to start managing live event rundowns and multi-screen stage displays.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authModalMode === 'login' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authModalMode === 'signup' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={() => {
                setAuthError('');
                setShowGoogleChooser(true);
              }}
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] border border-neutral-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>
                {authModalMode === 'signup' ? 'Create account with Google' : 'Continue with Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <span className="relative px-3 bg-neutral-900 text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                or with email
              </span>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleAuthSubmit(e, false)} className="space-y-3.5">
              {authModalMode === 'signup' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. David Miller"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                      Church / Organization
                    </label>
                    <div className="relative">
                      <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="e.g. Grace Fellowship or Tech Summit"
                        value={authOrganization}
                        onChange={(e) => setAuthOrganization(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@organization.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/50 mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <span className="animate-pulse">Signing in...</span>
                ) : (
                  <>
                    <span>{authModalMode === 'login' ? 'Sign In & Enter Workspace' : 'Create Account & Enter'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. FOOTER */}
      {/* ============================================================ */}
      <footer className="border-t border-neutral-900 py-8 px-4 sm:px-8 text-center text-xs text-neutral-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/logo.png" alt="EventFlow" className="w-4 h-4 object-contain rounded" />
          <span className="font-bold text-neutral-300">EventFlow</span>
          <span>· Precision Live Event Stage Runner</span>
        </div>
        <p>© {new Date().getFullYear()} EventFlow. Zero-delay stage timing, multi-screen projection, offline-ready.</p>
      </footer>

      {/* ============================================================ */}
      {/* 8. AUTH PROMPT MODAL (TRIGGERS WHEN "ENTER WORKSPACE" IS CLICKED) */}
      {/* ============================================================ */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-5">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <Radio size={22} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Enter Live Workspace
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Please sign in or create an account to access live stage timers and rundown controls.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authModalMode === 'login' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authModalMode === 'signup' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={() => {
                setAuthError('');
                setShowGoogleChooser(true);
              }}
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] border border-neutral-200"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.41l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>
                {authModalMode === 'signup' ? 'Create account with Google' : 'Continue with Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <span className="relative px-3 bg-neutral-950 text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                or with email
              </span>
            </div>

            {/* Error banner */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => handleAuthSubmit(e, true)} className="space-y-3.5">
              {authModalMode === 'signup' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                      Your Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. David Miller"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                      Church or Organization
                    </label>
                    <div className="relative">
                      <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="e.g. Grace Fellowship"
                        value={authOrganization}
                        onChange={(e) => setAuthOrganization(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@organization.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <span className="animate-pulse">Entering Workspace...</span>
                ) : (
                  <>
                    <span>{authModalMode === 'login' ? 'Sign In & Enter Workspace' : 'Create Account & Enter'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. GOOGLE ACCOUNT SELECTION POPUP MODAL */}
      {/* ============================================================ */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-[420px] bg-white text-neutral-900 rounded-3xl shadow-2xl p-6 sm:p-7 border border-neutral-200 relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.28-2.09 3.66-5.17 3.66-9.14z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.41l4.03-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.59l4.03 3.13c.95-2.83 3.6-4.97 6.72-4.97z" />
                </svg>
                <span className="font-semibold text-sm text-neutral-700">Google</span>
              </div>
              <button
                onClick={() => {
                  setShowGoogleChooser(false);
                  setUseCustomGoogleAccount(false);
                }}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Choose an account</h3>
            <p className="text-xs text-neutral-600 mt-1 mb-5">
              to continue to <strong className="text-neutral-900">EventFlow Stage Runner</strong>
            </p>

            {isGoogleSigningIn ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-medium text-neutral-600">Signing in with Google...</p>
              </div>
            ) : (
              <>
                {/* Account List */}
                <div className="divide-y divide-neutral-200 border-y border-neutral-200 -mx-6 px-6 mb-5">
                  {/* Detected Primary Google Account */}
                  <button
                    type="button"
                    onClick={() => handleGoogleAccountSelect('adekunleolaomo@gmail.com', 'Adekunle Olaomo')}
                    className="w-full py-3.5 flex items-center justify-between hover:bg-neutral-50 px-2 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                        A
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-neutral-900">Adekunle Olaomo</div>
                        <div className="text-[11px] text-neutral-600">adekunleolaomo@gmail.com</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      Signed in
                    </span>
                  </button>

                  {/* Use Another Google Account */}
                  {!useCustomGoogleAccount ? (
                    <button
                      type="button"
                      onClick={() => setUseCustomGoogleAccount(true)}
                      className="w-full py-3.5 flex items-center gap-3 hover:bg-neutral-50 px-2 rounded-xl transition-colors cursor-pointer text-left text-neutral-700"
                    >
                      <div className="w-9 h-9 rounded-full border border-dashed border-neutral-300 flex items-center justify-center text-neutral-500 font-bold">
                        <UserPlus size={16} />
                      </div>
                      <div className="font-medium text-xs text-neutral-800">
                        Use another Google account
                      </div>
                    </button>
                  ) : (
                    <div className="py-3 px-2 space-y-2.5">
                      <div className="text-[11px] font-semibold text-neutral-700">Enter Google Account:</div>
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={googleCustomName}
                        onChange={(e) => setGoogleCustomName(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="email"
                        placeholder="name@gmail.com"
                        value={googleCustomEmail}
                        onChange={(e) => setGoogleCustomEmail(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setUseCustomGoogleAccount(false)}
                          className="px-3 py-1.5 rounded-xl text-neutral-600 hover:text-neutral-800 text-xs font-medium cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!googleCustomEmail.trim() || !googleCustomEmail.includes('@')) return;
                            handleGoogleAccountSelect(googleCustomEmail, googleCustomName);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow cursor-pointer"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500 leading-relaxed mb-6">
                  To continue, Google will share your name, email address, language preference, and profile picture with EventFlow. Before using EventFlow, you can review its privacy policy and terms of service.
                </p>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                  <span className="text-[11px]">English (United States)</span>
                  <div className="flex gap-3 text-[11px]">
                    <span className="hover:underline cursor-pointer">Help</span>
                    <span className="hover:underline cursor-pointer">Privacy</span>
                    <span className="hover:underline cursor-pointer">Terms</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
