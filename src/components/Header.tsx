import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Menu, Shield, Upload, Home, Film, Tv, Settings, Info, Mail, Sun, Moon, LayoutGrid, Send } from "lucide-react";
// Firebase transition in progress

import { useTheme } from "@/lib/theme";
import { fetchSearchMovies, type Movie } from "@/lib/movies";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import dramaLogo from "@/assets/dramalinktg-logo.svg";

const LOGO_KEY = "anivoflix:logo";
const DEFAULT_LOGO = dramaLogo;

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unlocked = localStorage.getItem("admin_unlocked") === "true";
    const lastLogin = localStorage.getItem("admin_last_login");
    const now = Date.now();
    if (unlocked && lastLogin && now - parseInt(lastLogin) < 30 * 24 * 60 * 60 * 1000) {
      setIsAdmin(true);
    }
  }, []);

  const { theme, toggle: toggleTheme } = useTheme();
  const [q, setQ] = useState("");
  const [liveResults, setLiveResults] = useState<Movie[]>([]);
  const [liveSearching, setLiveSearching] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setLiveResults([]);
      setLiveSearching(false);
      return;
    }

    let cancelled = false;
    setLiveSearching(true);
    const timer = window.setTimeout(async () => {
      const results = await fetchSearchMovies(term);
      if (!cancelled) {
        setLiveResults(results);
        setLiveSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setLiveResults([]);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOGO_KEY);
      if (saved) setLogo(saved);
    } catch {}
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate({ to: "/search", search: { q: q.trim() } });
      setLiveResults([]);
      setSearchOpen(false);
    }
  };

  const signOut = async () => {
    // Auth transition
    navigate({ to: "/" });
  };


  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      try { localStorage.setItem(LOGO_KEY, dataUrl); } catch {}
    };
    reader.readAsDataURL(f);
  };

  const clearLogo = () => {
    setLogo(null);
    try { localStorage.removeItem(LOGO_KEY); } catch {}
  };

  const TELEGRAM_URL = "https://t.me/addlist/U6W7xf_GYgMyMThl";

  const navItems: Array<{ to: "/" | "/movies" | "/series" | "/anime" | "/tv-shows" | "/mini-drama" | "/serial" | "/library"; label: string; icon: typeof Home; exact?: boolean }> = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/movies", label: "Movies", icon: Film },
    { to: "/series", label: "Series", icon: Tv },
    { to: "/anime", label: "Anime", icon: Tv },
    { to: "/serial", label: "Serial", icon: Tv },
    { to: "/tv-shows", label: "TV Shows", icon: Tv },
    { to: "/mini-drama", label: "Mini Drama", icon: Tv },
    { to: "/library", label: "Library", icon: LayoutGrid },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-none bg-[#0d0e12]/85 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 h-16 sm:h-20 md:h-24 lg:h-28 flex items-center gap-1.5 sm:gap-3">
        {/* Menu (sidebar) — mobile only; desktop shows inline nav */}
        <Sheet open={sideOpen} onOpenChange={setSideOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="md:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-[#0a0a0a] border-white/10 text-white w-72 p-0">
            <SheetHeader className="p-4 border-b border-white/10">
              <SheetTitle className="text-white flex items-center gap-2">
                <span className="text-xl font-display font-black text-gradient-neon">DramaLinkTG</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="p-3 flex flex-col gap-1">
              {navItems.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={() => setSideOpen(false)}
                  activeOptions={it.exact ? { exact: true } : undefined}
                  activeProps={{ className: "group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500/25 to-pink-400/25 text-pink-300 border border-pink-400/40 text-sm font-bold uppercase tracking-wider" }}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 border border-transparent transition-all text-sm font-bold uppercase tracking-wider"
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/adminpanell" onClick={() => setSideOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-pink-300 bg-pink-500/10 border border-pink-500/20 text-sm font-bold uppercase tracking-wider">
                  <Shield className="h-4 w-4" /> Admin Panel
                </Link>
              )}
              <div className="my-2 h-px bg-white/10" />
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSideOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#54c3f1] bg-[#37AEE2]/10 border border-[#37AEE2]/20 text-sm font-bold uppercase tracking-wider"
              >
                <Send className="h-4 w-4" /> Join Telegram
              </a>
              <a href="#about" onClick={() => setSideOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white text-sm">
                <Info className="h-4 w-4" /> About
              </a>
              <a href="#contact" onClick={() => setSideOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white text-sm">
                <Mail className="h-4 w-4" /> Contact
              </a>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo Text replacement */}
        <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0 group" aria-label="DramaLinkTG home">
          <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-gradient-neon tracking-tighter drop-shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_25px_rgba(147,51,234,0.6)]">
            DramaLinkTG
          </span>
        </Link>

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onPickLogo} />

        {/* Desktop inline nav (md+) */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              activeOptions={it.exact ? { exact: true } : undefined}
              activeProps={{ className: "px-3 py-2 rounded-full text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_6px_20px_-6px_rgba(236,72,153,0.7)] inline-flex items-center gap-2" }}
              className="px-3 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white/75 hover:text-white hover:bg-white/10 inline-flex items-center gap-2 transition-colors"
            >
              <it.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{it.label}</span>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Search — live results while typing */}
        <div ref={searchRef} className="relative">
          <form
            onSubmit={submitSearch}
            className={`items-center bg-white/5 border border-white/10 rounded-full h-9 focus-within:border-pink-400 transition ${searchOpen ? "flex px-3 w-44 sm:w-56" : "hidden"} md:flex md:px-3 md:w-56 lg:w-64`}
          >
            <Search className="h-4 w-4 text-white/50 shrink-0" />
            <input
              autoFocus={searchOpen}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              aria-label="Search posts"
              className="bg-transparent outline-none px-2 text-sm w-full placeholder:text-white/40 text-white min-w-0"
            />
          </form>

          {(q.trim() || liveSearching) && (searchOpen || true) && (
            <div className="absolute right-0 top-11 w-[min(92vw,390px)] max-h-[70vh] overflow-y-auto rounded-2xl border border-cyan-400/30 bg-[#07101d]/98 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl z-[100]">
              {liveSearching ? (
                <div className="px-4 py-5 text-sm text-white/60">Searching…</div>
              ) : liveResults.length === 0 ? (
                <div className="px-4 py-5 text-sm text-white/60">No posts found.</div>
              ) : (
                <div className="p-1.5">
                  {liveResults.map((movie) => (
                    <Link
                      key={movie.id}
                      to="/$id"
                      params={{ id: movie.id }}
                      onClick={() => {
                        setLiveResults([]);
                        setSearchOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                    >
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[9px] text-white/30">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{movie.title}</p>
                        <p className="mt-0.5 text-xs text-white/55">
                          {movie.year || "—"} • {movie.type || "Movie"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xl text-white/70">›</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 shrink-0"
        >
          <Search className="h-5 w-5" />
        </button>

      </div>
    </header>
  );
}


function LogoDisplay({ logo, size }: { logo: string | null; size: number }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt="Logo"
        style={{ height: size, width: size }}
        className="object-contain rounded-md bg-white/5 border border-white/10 p-0.5"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-md bg-gradient-to-tr from-purple-600 to-pink-500 shadow-[0_0_20px_rgba(34,211,238,0.45)]"
    />
  );
}
