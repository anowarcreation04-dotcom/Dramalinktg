import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, LayoutDashboard, Film, Tv, Users, Tag, ChevronRight, Settings, PlusCircle, Server, List, Menu, X, PlayCircle, Megaphone, Search, RotateCcw, CheckCircle2, Eye, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  addDoc, 
  serverTimestamp, 
  writeBatch 
} from "firebase/firestore";

import { fetchMovies, GENRES, LANGUAGES, type Movie, type ContentType, movieCache, moviesListCache } from "@/lib/movies";
import { NoticeManager } from "@/components/NoticeManager";
import { fetchAds, saveAd, type AdSetting } from "@/lib/ads";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/adminpanell")({
  component: AdminContent,
});

type Tab = "dashboard" | "movies" | "series" | "anime" | "tv-shows" | "mini-drama" | "serial" | "stars" | "categories" | "settings" | "ads" | "notices";

// Public site domain used to build shareable links for posts.
const SITE_URL = "https://anivoflix.com";

// Admin share/copy links MUST point to the public search page,
// never directly to the post ID.
// Example: https://anivoflix.com/search?q=My+Bias%2C+My+Boss
function buildShareLink(m: Movie) {
  const url = new URL("/search", SITE_URL);
  url.searchParams.set("q", (m.title || "").trim());
  return url.toString();
}

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const qc = useQueryClient();
  const [socialLinks, setSocialLinks] = useState({
    facebook: "https://facebook.com/groups/DramaWorldBD",
    telegram: "https://t.me/addlist/U6W7xf_GYgMyMThl",
    whatsapp: "https://wa.me/8801000000000",
  });
  const [socialLinksLoading, setSocialLinksLoading] = useState(true);
  const [footerContent, setFooterContent] = useState({
    about: "About DramaLinkTG",
    contact: "Contact us through our official social channels.",
    privacy: "Your privacy matters to us.",
    terms: "By using DramaLinkTG, you agree to our terms of service.",
  });
  const [footerContentLoading, setFooterContentLoading] = useState(true);

  useEffect(() => {
    const loadSocialLinks = async () => {
      try {
        const snap = await getDoc(doc(db, "site_settings", "social_links"));
        if (snap.exists()) {
          const data = snap.data();
          setSocialLinks((current) => ({
            facebook: data.facebook || current.facebook,
            telegram: data.telegram || current.telegram,
            whatsapp: data.whatsapp || current.whatsapp,
          }));
        }
      } catch (error) {
        console.error("Failed to load social links", error);
      } finally {
        setSocialLinksLoading(false);
      }
    };
    loadSocialLinks();
  }, []);
  
  useEffect(() => {
    const loadFooterContent = async () => {
      try {
        const snap = await getDoc(doc(db, "site_settings", "footer_content"));
        if (snap.exists()) {
          const data = snap.data();
          setFooterContent((current) => ({
            about: typeof data.about === "string" ? data.about : current.about,
            contact: typeof data.contact === "string" ? data.contact : current.contact,
            privacy: typeof data.privacy === "string" ? data.privacy : current.privacy,
            terms: typeof data.terms === "string" ? data.terms : current.terms,
          }));
        }
      } catch (error) {
        console.error("Failed to load footer content", error);
      } finally {
        setFooterContentLoading(false);
      }
    };
    loadFooterContent();
  }, []);

  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [movieDialog, setMovieDialog] = useState<{ open: boolean; draft: any }>({ 
    open: false, 
    draft: { 
      title: "", 
      description: "", 
      poster_url: "", 
      backdrop_url: "",
      banner_url: "",
      video_url: "", 
      download_url: "",
      genre: "Action", 
      type: "Movie", 
      is_featured: false,
      is_trending: false,
      quality: "HD",
      rating: 0,
      languages: [],
      year: new Date().getFullYear(),
      is_upcoming: false,
      seasons: [],
      episodes: [],
      deletedEpisodeIds: [],
      subcollectionsLoaded: false,
    }
  });

  useEffect(() => {
    // Bump the session key whenever admin credentials are changed so an
    // older browser session cannot remain unlocked with the previous login.
    const ADMIN_SESSION_VERSION = "2";
    if (localStorage.getItem("admin_session_version") !== ADMIN_SESSION_VERSION) {
      localStorage.removeItem("admin_unlocked");
      localStorage.removeItem("admin_last_login");
      localStorage.setItem("admin_session_version", ADMIN_SESSION_VERSION);
    }

    const unlocked = localStorage.getItem("admin_unlocked") === "true";
    const lastLogin = localStorage.getItem("admin_last_login");
    const now = Date.now();
    
    // Auto-login if session is less than 30 days old
    if (unlocked && lastLogin && now - parseInt(lastLogin) < 30 * 24 * 60 * 60 * 1000) {
      setIsUnlocked(true);
    } else {
      localStorage.removeItem("admin_unlocked");
      localStorage.removeItem("admin_last_login");
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // SECURITY: Simple string comparison for admin panel access.
    // In a production app, use Firebase Auth with custom claims.
    const isValid = credentials.username === "Anowar" && credentials.password === "Anowar3.0@";
    if (isValid) {
      setIsUnlocked(true);
      localStorage.setItem("admin_unlocked", "true");
      localStorage.setItem("admin_last_login", Date.now().toString());
      localStorage.setItem("admin_session_version", "2");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const { data: movies = [], isLoading: isLoadingMovies } = useQuery({ 
    queryKey: ["admin_movies"], 
    queryFn: () => fetchMovies({ onlyPublished: false, limitCount: 1000 }),
    staleTime: 0, // Always get fresh data in admin panel
  });

  if (!isUnlocked) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505]">
      <form onSubmit={handleLogin} className="space-y-6 w-full max-w-sm p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-none">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Admin Access</h1>
          <p className="text-sm text-white/50">Enter credentials to manage DramaLinkTG</p>
        </div>
        <div className="space-y-4">
          <Input 
            placeholder="Username" 
            className="bg-white/5 border-white/10 h-12"
            value={credentials.username} 
            onChange={(e) => setCredentials(s => ({ ...s, username: e.target.value }))} 
          />
          <Input 
            placeholder="Password" 
            type="password" 
            className="bg-white/5 border-white/10 h-12"
            value={credentials.password} 
            onChange={(e) => setCredentials(s => ({ ...s, password: e.target.value }))} 
          />
        </div>
        <Button className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold transition-all duration-300">
          Unlock Console
        </Button>
      </form>
    </div>
  );

  const stats = {
    total: movies.length,
    movies: movies.filter((m: Movie) => m.type === "Movie").length,
    series: movies.filter((m: Movie) => m.type === "Series").length,
    anime: movies.filter((m: Movie) => m.type === "Anime").length,
    tvShows: movies.filter((m: Movie) => m.type === "TV Show").length,
    miniDrama: movies.filter((m: Movie) => m.type === "Mini Drama").length,
    serial: movies.filter((m: Movie) => m.type === "Serial").length,
    totalViews: movies.reduce((sum: number, m: Movie) => sum + (m.view_count || 0), 0),
  };

  // Top 5 most-viewed posts, for the dashboard "most watched" list.
  const topViewed = [...movies]
    .sort((a: Movie, b: Movie) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  // Episode labels are normally 1, 2, 3... but can be custom ranges like 3-4.
  // The next episode uses the highest number represented by the last range.
  const getEpisodeEndNumber = (value: unknown, fallback: number) => {
    const text = String(value ?? "").trim();
    const nums = text.match(/\d+/g);
    if (!nums || nums.length === 0) return fallback;
    return Number(nums[nums.length - 1]) || fallback;
  };

  const saveMovie = async () => {
    const d = movieDialog.draft;
    const movieData = { ...d };
    // The Languages field is edited as free text (so typing a comma doesn't
    // fight the input); normalize it to a string array here, at save time.
    movieData.languages = (
      Array.isArray(movieData.languages)
        ? movieData.languages
        : String(movieData.languages || "").split(",")
    ).map((l: string) => l.trim()).filter(Boolean);
    const servers = [...(movieData.movie_servers || [])];
    const episodes = [...(movieData.episodes || [])];
    const seasonsData = Array.isArray(movieData.seasons) ? [...movieData.seasons] : [];
    const subcollectionsLoaded = movieData.subcollectionsLoaded === true;

    delete movieData.movie_servers;
    delete movieData.episodes;
    delete movieData.deletedEpisodeIds;
    delete movieData.seasons;
    delete movieData.subcollectionsLoaded;
    delete (movieData as any).id;

    const sanitizedData = Object.fromEntries(Object.entries(movieData).filter(([_, value]) => value !== undefined));

    try {
      const savingToastId = toast.loading("Saving to Firestore...");
      let movieId = d.id;

      if (movieId) {
        await updateDoc(doc(db, "movies", movieId), {
          ...sanitizedData,
          status: "published",
          updated_at: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(collection(db, "movies"), {
          ...sanitizedData,
          status: "published",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        movieId = docRef.id;
      }

      // Keep existing server buttons/links. Only add, update or delete what the admin changes.
      if (d.id && subcollectionsLoaded) {
        const serversRef = collection(db, `movies/${movieId}/servers`);
        const batch = writeBatch(db);
        // Existing server buttons are preserved. The form can update them or append new ones.
        for (const server of servers) {
          if (server.id) {
            batch.set(doc(serversRef, server.id), { name: server.name, url: server.url }, { merge: true });
          } else if (server.name || server.url) {
            batch.set(doc(serversRef), { name: server.name || "Server", url: server.url || "" });
          }
        }
        await batch.commit();
      } else if (!d.id && servers.length) {
        const serversRef = collection(db, `movies/${movieId}/servers`);
        const batch = writeBatch(db);
        for (const server of servers) {
          if (server.name || server.url) batch.set(doc(serversRef), { name: server.name || "Server", url: server.url || "" });
        }
        await batch.commit();
      }

      // Season/Episode management. Series-like types always use it. A "Movie"
      // can optionally use it too: a new Movie only gets seasons when the admin
      // added some; an existing Movie is re-synced so removed seasons are deleted.
      const episodeTypes = ["Series", "Mini Drama", "Anime", "Serial", "TV Show"];
      const isMovieType = movieData.type === "Movie";
      const syncSeasons =
        episodeTypes.includes(movieData.type) ||
        (isMovieType && (seasonsData.length > 0 || Boolean(d.id)));
      if (syncSeasons && (subcollectionsLoaded || !d.id)) {
        const seasonsRef = collection(db, `movies/${movieId}/seasons`);
        const draftSeasons = seasonsData.length > 0
          ? seasonsData
          : isMovieType
          ? []
          : [{
              id: undefined,
              season_number: 1,
              title: "Season 1",
              episodes,
            }];

        const existingSeasonsSnap = await getDocs(seasonsRef);
        const existingSeasonIds = new Set(existingSeasonsSnap.docs.map((s) => s.id));
        const draftSeasonIds = new Set(draftSeasons.map((s: any) => s.id).filter(Boolean));

        // Remove seasons deleted from Admin Panel, including all nested episodes.
        for (const oldSeason of existingSeasonsSnap.docs) {
          if (!draftSeasonIds.has(oldSeason.id)) {
            const oldEps = await getDocs(collection(db, `movies/${movieId}/seasons/${oldSeason.id}/episodes`));
            const refs = [...oldEps.docs.map((e) => e.ref), oldSeason.ref];
            for (let i = 0; i < refs.length; i += 450) {
              const batch = writeBatch(db);
              refs.slice(i, i + 450).forEach((ref) => batch.delete(ref));
              await batch.commit();
            }
          }
        }

        for (let seasonIndex = 0; seasonIndex < draftSeasons.length; seasonIndex++) {
          const season = draftSeasons[seasonIndex];
          let seasonId = season.id;

          if (seasonId && existingSeasonIds.has(seasonId)) {
            await setDoc(doc(seasonsRef, seasonId), {
              season_number: Number(season.season_number) || seasonIndex + 1,
              title: season.title || `Season ${seasonIndex + 1}`,
            }, { merge: true });
          } else {
            const seasonDoc = await addDoc(seasonsRef, {
              season_number: Number(season.season_number) || seasonIndex + 1,
              title: season.title || `Season ${seasonIndex + 1}`,
            });
            seasonId = seasonDoc.id;
          }

          const epsRef = collection(db, `movies/${movieId}/seasons/${seasonId}/episodes`);
          const existingEps = await getDocs(epsRef);
          const existingIds = new Set(existingEps.docs.map((episodeDoc) => episodeDoc.id));
          const seasonEpisodes = Array.isArray(season.episodes)
            ? season.episodes
            : (seasonIndex === 0 ? episodes : []);
          const formEpisodeIds = new Set(seasonEpisodes.map((episode: any) => episode.id).filter(Boolean));

          const ops: { type: "delete" | "set"; ref: any; data?: any; merge?: boolean }[] = [];

          // Delete any old episode removed in the Admin UI.
          for (const episodeDoc of existingEps.docs) {
            if (!formEpisodeIds.has(episodeDoc.id)) {
              ops.push({ type: "delete", ref: episodeDoc.ref });
            }
          }

          for (const [index, episode] of seasonEpisodes.entries()) {
            const payload = {
              episode_number: String(episode.episode_number ?? "").trim() || String(index + 1),
              title: episode.title || `Episode ${index + 1}`,
              url: episode.url || "",
              download_url: episode.download_url || null,
              telegram_url: episode.telegram_url || episode.telegram_player_url || episode.telegram_download_url || "",
            };
            if (episode.id && existingIds.has(episode.id)) {
              ops.push({ type: "set", ref: doc(epsRef, episode.id), data: payload, merge: true });
            } else if (payload.url || payload.download_url || payload.telegram_url) {
              ops.push({ type: "set", ref: doc(epsRef), data: payload });
            }
          }

          for (let i = 0; i < ops.length; i += 450) {
            const batch = writeBatch(db);
            ops.slice(i, i + 450).forEach((op) => {
              if (op.type === "delete") batch.delete(op.ref);
              else batch.set(op.ref, op.data, op.merge ? { merge: true } : undefined);
            });
            await batch.commit();
          }
        }
      }

      toast.success("Content published live!", { id: savingToastId });
      movieCache.delete(movieId);
      moviesListCache.clear();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin_movies"] }),
        qc.invalidateQueries({ queryKey: ["movies"] }),
        qc.invalidateQueries({ queryKey: ["movie", movieId] }),
      ]);

      setMovieDialog({ open: false, draft: {
        title: "", description: "", poster_url: "", backdrop_url: "", banner_url: "",
        video_url: "", download_url: "", telegram_url: "", genre: "Action", type: movieData.type,
        is_featured: false, is_trending: false, quality: "HD", rating: 0, languages: [],
        year: new Date().getFullYear(), is_upcoming: false, season: "S01", seasons: [], episodes: [],
        subcollectionsLoaded: false, deletedEpisodeIds: [],
      } });
      setActiveSeasonId(null);
    } catch (error: any) {
      console.error("Critical Firebase Save Error:", error);
      toast.error(`Firebase Error: ${error.code || error.message}`);
    } finally {
      qc.invalidateQueries({ queryKey: ["admin_movies"] });
      qc.invalidateQueries({ queryKey: ["movies"] });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Premium Top Header */}
      <header className="h-14 border-b border-white/5 bg-black/60 backdrop-blur-none flex items-center px-4 sticky top-0 z-50 justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-white/5 border border-white/10 backdrop-blur-none rounded-xl hover:bg-white/10 hover:border-white/20 h-9 w-9 transition-all active:scale-95"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={18} className="text-white/70" /> : <Menu size={18} className="text-white/70" />}
          </Button>
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center font-black text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-500">A</div>
            <div className="hidden sm:block">
              <h2 className="font-bold text-sm tracking-tight leading-none">DramaLinkTG</h2>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.2em] mt-0.5">Control Center</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden xs:flex bg-white/5 border-white/10 text-[9px] h-6 font-bold uppercase tracking-widest text-white/50 px-2.5 rounded-full">
            Admin Panel
          </Badge>
          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5 p-0.5">
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed lg:sticky top-14 h-[calc(100vh-3.5rem)] border-r border-white/5 bg-black/40 backdrop-blur-none flex flex-col p-3 gap-4 z-40 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isSidebarOpen ? "w-40 translate-x-0" : "w-0 -translate-x-full lg:w-0"
      )}>
        {isSidebarOpen && (
          <>
            <div className="flex items-center px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center font-black text-xl shadow-lg shadow-purple-500/20">A</div>
                <div>
                  <h2 className="font-bold tracking-tight text-sm">DramaLinkTG</h2>
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.15em] font-black">Management</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavItem active={activeTab === "dashboard"} icon={<LayoutDashboard size={14} />} label="Dashboard" onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "movies"} icon={<Film size={14} />} label="Movies" onClick={() => { setActiveTab("movies"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "series"} icon={<Tv size={14} />} label="Series" onClick={() => { setActiveTab("series"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "anime"} icon={<Tv size={14} />} label="Anime" onClick={() => { setActiveTab("anime"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "serial"} icon={<Tv size={14} />} label="Serial" onClick={() => { setActiveTab("serial"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "tv-shows"} icon={<Tv size={14} />} label="TV Shows" onClick={() => { setActiveTab("tv-shows"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "mini-drama"} icon={<PlayCircle size={14} />} label="Mini Drama" onClick={() => { setActiveTab("mini-drama"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "categories"} icon={<Tag size={14} />} label="Categories" onClick={() => { setActiveTab("categories"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "settings"} icon={<Settings size={14} />} label="Site Settings" onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "notices"} icon={<Megaphone size={14} />} label="Notices" onClick={() => { setActiveTab("notices"); setIsSidebarOpen(false); }} />
              <NavItem active={activeTab === "ads"} icon={<Megaphone size={14} />} label="Ads Management" onClick={() => { setActiveTab("ads"); setIsSidebarOpen(false); }} />
            </nav>

            <div className="mt-auto space-y-2">
              <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/5" onClick={() => { 
                localStorage.removeItem("admin_unlocked"); 
                localStorage.removeItem("admin_last_login");
                window.location.reload(); 
              }}>
                <Settings size={18} className="mr-2" /> Log Out
              </Button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-10 overflow-x-hidden overflow-y-auto">
        <div className="max-w-full md:max-w-6xl mx-auto space-y-6 md:space-y-10">
          <header className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold capitalize">{activeTab.replace("-", " ")}</h1>
                <p className="text-white/50 text-xs mt-0.5 tracking-tight">Manage platform content and settings.</p>
              </div>
            </div>
            
            {activeTab !== "dashboard" && activeTab !== "categories" && activeTab !== "settings" && activeTab !== "ads" && activeTab !== "notices" && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    let type: any = "Movie";
                    if (activeTab === "series") type = "Series";
                    if (activeTab === "anime") type = "Anime";
                    if (activeTab === "serial") type = "Serial";
                    if (activeTab === "tv-shows") type = "TV Show";
                    if (activeTab === "mini-drama") type = "Mini Drama";
                    setActiveSeasonId(null);
                    setMovieDialog({ open: true, draft: { ...movieDialog.draft, type, season: movieDialog.draft.season || "S01", seasons: [], episodes: [], subcollectionsLoaded: false, deletedEpisodeIds: [] } });
                  }} 
                  className="bg-white text-black hover:bg-white/90 font-bold rounded-full px-4 h-9 text-[11px] shrink-0 shadow-lg shadow-white/5"
                >
                  <Plus size={12} className="mr-1" /> Add
                </Button>
                
                <div className="relative ml-auto w-36 sm:w-64">
                  <Input 
                    placeholder="Search titles..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border-white/10 h-9 text-[11px] pl-3 pr-8 rounded-full focus:ring-purple-500/20 w-full"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                    <Search size={12} />
                  </div>
                </div>
              </div>
            )}
          </header>

          {activeTab === "dashboard" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard label="Total Content" value={stats.total} icon={<List className="text-blue-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="Movies" value={stats.movies} icon={<Film className="text-purple-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="Series" value={stats.series} icon={<Tv className="text-pink-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="Anime" value={stats.anime} icon={<Tv className="text-orange-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="Serial" value={stats.serial} icon={<Tv className="text-red-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="TV Shows" value={stats.tvShows} icon={<Tv className="text-cyan-400" size={14} />} loading={isLoadingMovies} />
              <StatCard label="Mini Dramas" value={stats.miniDrama} icon={<PlayCircle className="text-emerald-400" size={14} />} />
              <StatCard label="Total Views" value={stats.totalViews} icon={<Eye className="text-green-400" size={14} />} loading={isLoadingMovies} />

              {topViewed.length > 0 && (
                <div className="col-span-2 md:col-span-3 lg:col-span-4 bg-[#0a0a0a]/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-none">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Most Watched</p>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {topViewed.map((m: Movie, i: number) => (
                      <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs font-black text-white/20 w-4 shrink-0">{i + 1}</span>
                        <img src={m.poster_url || ""} alt="" className="w-8 h-11 rounded object-cover bg-white/5 border border-white/10 shrink-0" />
                        <p className="flex-1 min-w-0 truncate text-sm font-bold text-white/80">{m.title}</p>
                        <div className="flex items-center gap-1 text-white/50 text-xs font-bold shrink-0">
                          <Eye size={13} />
                          {(m.view_count || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="col-span-2 md:col-span-3 lg:col-span-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-none text-center">
                <p className="text-xs text-white/40 font-bold tracking-widest italic">
                  Made by Shanto
                </p>
              </div>
            </div>
          )}

          {["movies", "series", "anime", "tv-shows", "mini-drama", "serial"].includes(activeTab) && (
            <div className="bg-[#0a0a0a]/40 rounded-xl md:rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-none shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-3 md:px-6 py-4 font-black text-white/30 text-[8px] md:text-[9px] uppercase tracking-[0.2em]">Asset Info</th>
                      <th className="hidden sm:table-cell px-6 py-4 font-black text-white/30 text-[9px] uppercase tracking-[0.2em]">Genre</th>
                      <th className="hidden xs:table-cell px-6 py-4 font-black text-white/30 text-[9px] uppercase tracking-[0.2em]">Status</th>
                      <th className="px-3 md:px-6 py-4 font-black text-white/30 text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                  {movies
                    .filter((m: Movie) => {
                      const matchesTab = (
                        (activeTab === "movies" && m.type === "Movie") ||
                        (activeTab === "series" && m.type === "Series") ||
                        (activeTab === "anime" && m.type === "Anime") ||
                        (activeTab === "serial" && m.type === "Serial") ||
                        (activeTab === "tv-shows" && m.type === "TV Show") ||
                        (activeTab === "mini-drama" && m.type === "Mini Drama")
                      );
                      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesSearch;
                    })
                    .map((m: Movie) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group/row">
                      <td className="px-3 md:px-6 py-4">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="relative shrink-0">
                            <img src={m.poster_url || ""} alt="" className="w-10 h-14 rounded-lg object-cover bg-white/5 border border-white/10 group-hover/row:border-purple-500/50 transition-colors" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity rounded-lg" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm tracking-tight truncate group-hover/row:text-purple-300 transition-colors">{m.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">{m.year}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span className="text-[9px] text-purple-400/80 font-black uppercase tracking-widest">{m.quality}</span>
                            </div>
                            <button
                              type="button"
                              title="Click to copy share link"
                              className="mt-1 text-[9px] text-cyan-300/70 hover:text-cyan-300 truncate max-w-[220px] block text-left underline-offset-2 hover:underline"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const link = buildShareLink(m);
                                try {
                                  await navigator.clipboard.writeText(link);
                                  toast.success("Share link copied");
                                } catch {
                                  toast.error(link);
                                }
                              }}
                            >
                              {buildShareLink(m).replace(/^https?:\/\//, "")}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4">
                        <Badge variant="outline" className="bg-white/5 border-white/5 text-white/40 text-[9px] font-black uppercase tracking-widest h-6 px-3 rounded-lg group-hover/row:border-white/20 transition-colors">{m.genre}</Badge>
                      </td>
                      <td className="hidden xs:table-cell px-6 py-4">
                        <div className="flex items-center gap-2">
                          {m.is_featured && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" title="Featured" />}
                          {m.is_trending && <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" title="Trending" />}
                          {!m.is_featured && !m.is_trending && <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Standard</span>}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <div
                            className="flex items-center gap-1 h-8 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold shrink-0"
                            title="Total views"
                          >
                            <Eye size={13} />
                            {(m.view_count || 0).toLocaleString()}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-cyan-500/20 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30 transition-all" title="Copy share link" onClick={async () => {
                            const link = buildShareLink(m);
                            try {
                              await navigator.clipboard.writeText(link);
                              toast.success("Share link copied");
                            } catch {
                              toast.error(link);
                            }
                          }}><Link2 size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-purple-500/20 hover:text-purple-300 border border-transparent hover:border-purple-500/30 transition-all" onClick={async () => {
                            // If editing an existing movie, we need to fetch its sub-collections (servers/episodes) first
                            const editToastId = toast.loading("Loading asset details...");
                            try {
                              const movieDetails = await qc.fetchQuery({
                                queryKey: ["movie", m.id, "admin-edit"],
                                queryFn: () => (window as any).fetchMovieWithSubcollections(m.id)
                              });
                              const allSeasons = Array.isArray(movieDetails?.seasons) ? movieDetails.seasons : [];
                              const firstSeason = allSeasons[0];
                              setActiveSeasonId(firstSeason?.id || null);
                              setMovieDialog({
                                open: true,
                                draft: {
                                  ...(movieDetails || m),
                                  telegram_url: (movieDetails || m)?.telegram_url || (movieDetails || m)?.telegram_player_url || (movieDetails || m)?.telegram_download_url || "",
                                  seasons: allSeasons.map((season: any) => ({
                                    ...season,
                                    episodes: (season.episodes || []).map((ep: any) => ({
                                      ...ep,
                                      telegram_url: ep.telegram_url || ep.telegram_player_url || ep.telegram_download_url || "",
                                    })),
                                  })),
                                  episodes: (firstSeason?.episodes || []).map((ep: any) => ({
                                    ...ep,
                                    telegram_url: ep.telegram_url || ep.telegram_player_url || ep.telegram_download_url || "",
                                  })),
                                  season: movieDetails?.season || (firstSeason?.season_number ? `S${String(firstSeason.season_number).padStart(2, "0")}` : "S01"),
                                  subcollectionsLoaded: true,
                                  deletedEpisodeIds: [],
                                },
                              });
                              toast.dismiss(editToastId);
                            } catch (err) {
                              console.error("Fetch error:", err);
                              setMovieDialog({ open: true, draft: { ...m, episodes: [], subcollectionsLoaded: false } });
                              toast.dismiss(editToastId);
                            }
                          }}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-500/20 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all" onClick={async () => { 
                            if(confirm("Permanently delete this asset and all its episodes/servers?")) {
                              const deleteToastId = toast.loading("Purging asset and sub-collections...");
                              try {
                                const { deleteMovie } = await import("@/lib/movies");
                                await deleteMovie(m.id);
                                qc.invalidateQueries({ queryKey: ["admin_movies"] });
                                qc.invalidateQueries({ queryKey: ["movies"] });
                                toast.success("Asset Purged", { id: deleteToastId });
                              } catch (err: any) {
                                console.error("Delete error:", err);
                                toast.error(`Purge failed: ${err.message}`, { id: deleteToastId });
                              }
                            }
                          }}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Social Media Links</h2>
                  <p className="text-xs text-white/40 mt-1">These links control the social buttons in the public footer.</p>
                </div>
                {([
                  ["facebook", "Facebook Group"],
                  ["telegram", "Telegram Channel"],
                  ["whatsapp", "WhatsApp Group"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs text-white/60">{label}</Label>
                    <Input value={socialLinks[key]} onChange={(e) => setSocialLinks((current) => ({ ...current, [key]: e.target.value }))} placeholder="https://..." className="bg-black/30 border-white/10 h-10 text-xs" />
                  </div>
                ))}
                <Button
                  disabled={socialLinksLoading}
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, "site_settings", "social_links"), { ...socialLinks, updated_at: serverTimestamp() }, { merge: true });
                      toast.success("Social links updated");
                    } catch (error) {
                      console.error(error);
                      toast.error("Failed to save social links");
                    }
                  }}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold"
                >Save Social Links</Button>
              </div>

              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Footer Pages</h2>
                  <p className="text-xs text-white/40 mt-1">Control the About, Contact, Privacy and Terms content shown from the public footer.</p>
                </div>
                {([
                  ["about", "About"],
                  ["contact", "Contact"],
                  ["privacy", "Privacy"],
                  ["terms", "Terms"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs text-white/60">{label}</Label>
                    <Textarea
                      value={footerContent[key]}
                      onChange={(e) => setFooterContent((current) => ({ ...current, [key]: e.target.value }))}
                      placeholder={`Write ${label} content...`}
                      className="bg-black/30 border-white/10 min-h-24 text-xs"
                    />
                  </div>
                ))}
                <Button
                  disabled={footerContentLoading}
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, "site_settings", "footer_content"), { ...footerContent, updated_at: serverTimestamp() }, { merge: true });
                      toast.success("Footer content updated");
                    } catch (error) {
                      console.error(error);
                      toast.error("Failed to save footer content");
                    }
                  }}
                  className="w-full bg-white text-black hover:bg-white/90 font-bold"
                >Save Footer Content</Button>
              </div>
            </div>
          )}

          {activeTab === "notices" && <NoticeManager />}

          {activeTab === "ads" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <AdSettingCard 
                  title="Head" 
                  description="Global <head> injection" 
                  adKey="head" 
                />
                <AdSettingCard 
                  title="Post Head" 
                  description="Injection after <head>" 
                  adKey="post_head" 
                />
                <AdSettingCard 
                  title="Body" 
                  description="Injection in <body>" 
                  adKey="body" 
                />
                <AdSettingCard 
                  title="Popunder" 
                  description="Network 1 (rotates with Popunder 2)" 
                  adKey="popunder" 
                  defaultCode={'<script src="https://pl28801838.profitableratecpmnetwork.com/0b/99/08/0b9908b59a350225fca21e5960cf3409.js"></script>'}
                />
                <AdSettingCard 
                  title="Popunder 2" 
                  description="Network 2 (optional): paste code, Save, then switch ACTIVE" 
                  adKey="popunder_2" 
                />
                <AdSettingCard 
                  title="Direct Link (Player)" 
                  description="Shown once per 5 min before Play" 
                  adKey="direct_link_player" 
                  defaultCode="https://omg10.com/4/9952290"
                />
                <AdSettingCard 
                  title="Direct Link (Download + Telegram)" 
                  description="Shown once per 5 min before Download/Telegram links" 
                  adKey="direct_link_download_telegram" 
                  defaultCode="https://www.profitableratecpmnetwork.com/apwc0p5hb?key=b6f67e83f420f8866a0416190f5239fd"
                />
                <AdSettingCard 
                  title="Social Bar" 
                  description="Floating bar at edge" 
                  adKey="social_bar"
                  hasPosition
                />
                <AdSettingCard 
                  title="Banner (Top)" 
                  description="Visible banner at top" 
                  adKey="banner_top" 
                />
                <AdSettingCard 
                  title="Download Tutorial Popup" 
                  description="Homepage popup link — shown once per 5h" 
                  adKey="download_tutorial_link" 
                  defaultCode=""
                />
                <AdSettingCard 
                  title="Banner (Bottom)" 
                  description="Visible banner at bottom" 
                  adKey="banner_bottom" 
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Content Editor Dialog */}
      <Dialog open={movieDialog.open} onOpenChange={o => setMovieDialog(s => ({ ...s, open: o }))}>
        <DialogContent className="max-w-2xl w-[95vw] bg-[#0a0a0a] border-white/10 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <DialogHeader><h2 className="text-lg font-bold">{movieDialog.draft.id ? "Edit Content" : "Add New Content"}</h2></DialogHeader>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Information & Links</p>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] h-5">{movieDialog.draft.type}</Badge>
          </div>
          
          <div className="p-4 md:p-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Title</Label>
                <Input placeholder="Inception" value={movieDialog.draft.title} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, title: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Type</Label>
                <Select value={movieDialog.draft.type} onValueChange={v => setMovieDialog(s => ({ ...s, draft: { ...s.draft, type: v as any } }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-8 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="Movie">Movie</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Anime">Anime</SelectItem>
                    <SelectItem value="Serial">Serial</SelectItem>
                    <SelectItem value="TV Show">TV Show</SelectItem>
                    <SelectItem value="Mini Drama">Mini Drama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-white/60">Description</Label>
              <Textarea placeholder="Plot summary..." value={movieDialog.draft.description || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, description: e.target.value } }))} className="bg-white/5 border-white/10 min-h-[60px] text-xs px-2 py-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Poster URL</Label>
                <Input placeholder="https://..." value={movieDialog.draft.poster_url || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, poster_url: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Backdrop URL</Label>
                <Input placeholder="https://..." value={movieDialog.draft.backdrop_url || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, backdrop_url: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Banner URL</Label>
                <Input placeholder="https://..." value={movieDialog.draft.banner_url || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, banner_url: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Trailer ID (YouTube)</Label>
                <Input placeholder="dQw4w9WgXcQ" value={movieDialog.draft.youtube_trailer_id || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, youtube_trailer_id: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Telegram Link</Label>
                <Input placeholder="Telegram link" value={movieDialog.draft.telegram_url || movieDialog.draft.telegram_player_url || movieDialog.draft.telegram_download_url || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, telegram_url: e.target.value } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Quality</Label>
                <Select value={movieDialog.draft.quality} onValueChange={v => setMovieDialog(s => ({ ...s, draft: { ...s.draft, quality: v } }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-8 text-xs px-2"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="FHD">FHD</SelectItem>
                    <SelectItem value="HD">HD</SelectItem>
                    <SelectItem value="4K">4K Ultra HD</SelectItem>
                    <SelectItem value="CAM">CAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Rating</Label>
                <Input type="number" step="0.1" max="10" min="0" value={movieDialog.draft.rating || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, rating: parseFloat(e.target.value) } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Year</Label>
                <Input type="number" value={movieDialog.draft.year || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, year: parseInt(e.target.value) } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Languages (Comma separated)</Label>
                <Input
                  placeholder="English, Bengali, Hindi"
                  value={Array.isArray(movieDialog.draft.languages) ? movieDialog.draft.languages.join(", ") : (movieDialog.draft.languages || "")}
                  onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, languages: e.target.value } }))}
                  className="bg-white/5 border-white/10 h-8 text-xs px-2"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-white/60">Season Badge</Label>
                <Input placeholder="S01" value={movieDialog.draft.season || ""} onChange={e => setMovieDialog(s => ({ ...s, draft: { ...s.draft, season: e.target.value.toUpperCase() } }))} className="bg-white/5 border-white/10 h-8 text-xs px-2" />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 md:gap-10 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center space-x-2">
                <Switch checked={movieDialog.draft.is_featured} onCheckedChange={v => setMovieDialog(s => ({ ...s, draft: { ...s.draft, is_featured: v } }))} className="scale-75" />
                <Label className="cursor-pointer text-xs">Featured</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={movieDialog.draft.is_trending} onCheckedChange={v => setMovieDialog(s => ({ ...s, draft: { ...s.draft, is_trending: v } }))} className="scale-75" />
                <Label className="cursor-pointer text-xs">Trending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={movieDialog.draft.is_upcoming} onCheckedChange={v => setMovieDialog(s => ({ ...s, draft: { ...s.draft, is_upcoming: v } }))} className="scale-75" />
                <Label className="cursor-pointer text-xs">Upcoming</Label>
              </div>
            </div>

            {(["Movie", "Series", "Mini Drama", "Anime", "Serial", "TV Show"].includes(movieDialog.draft.type)) && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-purple-400 text-sm">
                      <PlayCircle size={16} /> {movieDialog.draft.type === "Movie" ? "Seasons & Quality" : "Seasons & Episodes"}
                    </h3>
                    <p className="text-[9px] text-white/35 mt-1">{movieDialog.draft.type === "Movie" ? "প্রথমে একটা সিজন যোগ করুন, তারপর প্রতিটা কোয়ালিটির টেলিগ্রাম লিংক দিন।" : "প্রথমে একটা সিজন যোগ করুন, তারপর প্রতিটা এপিসোডের টেলিগ্রাম লিংক দিন।"}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-[10px]"
                    onClick={() => {
                      const seasons = Array.isArray(movieDialog.draft.seasons) ? [...movieDialog.draft.seasons] : [];
                      const nextNumber = seasons.reduce((max: number, s: any, index: number) =>
                        Math.max(max, Number(s.season_number) || index + 1), 0) + 1;
                      const newSeason = {
                        id: `new-${Date.now()}-${nextNumber}`,
                        season_number: nextNumber,
                        title: `Season ${nextNumber}`,
                        episodes: [],
                      };
                      seasons.push(newSeason);
                      setActiveSeasonId(newSeason.id);
                      setMovieDialog(s => ({
                        ...s,
                        draft: { ...s.draft, seasons, episodes: [] }
                      }));
                    }}
                  >
                    <Plus size={14} className="mr-1" /> Add Season
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(movieDialog.draft.seasons || []).map((season: any, index: number) => {
                    const active = (activeSeasonId || movieDialog.draft.seasons?.[0]?.id) === season.id;
                    return (
                      <button
                        key={season.id || index}
                        type="button"
                        onClick={() => {
                          setActiveSeasonId(season.id);
                          setMovieDialog(s => ({ ...s, draft: { ...s.draft, episodes: season.episodes || [] } }));
                        }}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-[10px] font-black transition-all",
                          active
                            ? "border-purple-300/70 bg-purple-500/15 text-purple-200"
                            : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                        )}
                      >
                        {season.title || `Season ${index + 1}`}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const seasons = Array.isArray(movieDialog.draft.seasons) ? movieDialog.draft.seasons : [];
                  const current = seasons.find((s: any) => s.id === activeSeasonId) || seasons[0];
                  if (!current) {
                    return (
                      <div className="py-5 text-center text-white/25 text-[11px] italic border border-dashed border-white/5 rounded-xl">
                        No seasons added yet. Click <b>Add Season</b> to begin.
                      </div>
                    );
                  }

                  const currentEpisodes = Array.isArray(current.episodes) ? current.episodes : [];
                  const updateCurrentSeason = (nextEpisodes: any[]) => {
                    const nextSeasons = seasons.map((s: any) =>
                      s.id === current.id ? { ...s, episodes: nextEpisodes } : s
                    );
                    setMovieDialog(s => ({
                      ...s,
                      draft: { ...s.draft, seasons: nextSeasons, episodes: nextEpisodes }
                    }));
                  };

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-white/40 uppercase font-bold">Season Name</Label>
                          <Input
                            value={current.title || ""}
                            onChange={e => {
                              const nextSeasons = seasons.map((s: any) => s.id === current.id ? { ...s, title: e.target.value } : s);
                              setMovieDialog(s => ({ ...s, draft: { ...s.draft, seasons: nextSeasons } }));
                            }}
                            className="bg-white/5 border-white/10 h-8 text-xs px-2"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-white/40 uppercase font-bold">Season Number</Label>
                          <Input
                            type="number"
                            min="1"
                            value={current.season_number ?? 1}
                            onChange={e => {
                              const value = parseInt(e.target.value) || 1;
                              const nextSeasons = seasons.map((s: any) => s.id === current.id ? { ...s, season_number: value } : s);
                              setMovieDialog(s => ({ ...s, draft: { ...s.draft, seasons: nextSeasons } }));
                            }}
                            className="bg-white/5 border-white/10 h-8 text-xs px-2"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-white/45 uppercase font-bold tracking-widest">
                          {current.title || "Season"} — {movieDialog.draft.type === "Movie" ? "Quality" : "Episodes"}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-[10px]"
                          onClick={() => {
                            const nextNumber = currentEpisodes.reduce((max: number, ep: any, index: number) =>
                              Math.max(max, getEpisodeEndNumber(ep?.episode_number, index + 1)), 0) + 1;
                            updateCurrentSeason([
                              ...currentEpisodes,
                              { episode_number: String(nextNumber), title: `${movieDialog.draft.type === "Movie" ? "Quality" : "Episode"} ${nextNumber}`, url: "", download_url: "", telegram_url: "" }
                            ]);
                          }}
                        >
                          <Plus size={14} className="mr-1" /> {movieDialog.draft.type === "Movie" ? "Add Quality" : "Add Episode"}
                        </Button>
                      </div>

                      {currentEpisodes.map((ep: any, idx: number) => (
                        <div key={ep.id || idx} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2 relative">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2 pr-8">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-white/40 uppercase font-bold">{movieDialog.draft.type === "Movie" ? "Quality" : "Episode"}</Label>
                              <Input
                                value={ep.episode_number ?? String(idx + 1)}
                                onChange={e => {
                                  const next = [...currentEpisodes];
                                  next[idx] = { ...next[idx], episode_number: e.target.value };
                                  updateCurrentSeason(next);
                                }}
                                className="bg-white/5 border-white/10 h-8 text-xs px-2"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-white/40 uppercase font-bold">Title</Label>
                              <Input
                                value={ep.title || ""}
                                onChange={e => {
                                  const next = [...currentEpisodes];
                                  next[idx] = { ...next[idx], title: e.target.value };
                                  updateCurrentSeason(next);
                                }}
                                className="bg-white/5 border-white/10 h-8 text-xs px-2"
                              />
                            </div>
                            <div className="space-y-1 lg:col-span-2">
                              <Label className="text-[10px] text-white/40 uppercase font-bold">Telegram Link</Label>
                              <Input
                                value={ep.telegram_url || ep.telegram_player_url || ep.telegram_download_url || ""}
                                onChange={e => {
                                  const next = [...currentEpisodes];
                                  next[idx] = { ...next[idx], telegram_url: e.target.value };
                                  updateCurrentSeason(next);
                                }}
                                placeholder="Telegram link"
                                className="bg-white/5 border-white/10 h-8 text-xs px-2"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:bg-red-500/10"
                            onClick={() => updateCurrentSeason(currentEpisodes.filter((_: any, i: number) => i !== idx))}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      ))}
                      {currentEpisodes.length === 0 && (
                        <p className="text-center py-4 text-white/20 text-[11px] italic border border-dashed border-white/5 rounded-xl">
                          {movieDialog.draft.type === "Movie" ? "No quality options added to this season yet." : "No episodes added to this season yet."}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-white/5 border-t border-white/10 flex flex-row gap-3 mt-auto sticky bottom-0 z-50">
            <Button variant="ghost" onClick={() => setMovieDialog({ ...movieDialog, open: false })} className="hover:bg-white/5 h-10 text-xs flex-1 border border-white/5">Cancel</Button>
            {movieDialog.draft.id && (
              <Button 
                variant="outline"
                className="h-10 text-xs flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => {
                  window.open(`/movie/${movieDialog.draft.id}`, '_blank');
                }}
              >
                <Eye size={14} className="mr-2" /> Preview
              </Button>
            )}
            <Button onClick={saveMovie} className="bg-white text-black hover:bg-white/90 font-bold px-4 h-10 text-xs flex-1 shadow-lg shadow-white/10 active:scale-95 transition-transform">Save Content</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function AdSettingCard({ title, description, adKey, hasPosition, defaultCode = "" }: { title: string; description: string; adKey: string; hasPosition?: boolean; defaultCode?: string }) {
  const [code, setCode] = useState(defaultCode);
  // If a default exists and no record is saved yet, the site uses the default (i.e. it is ON).
  const [isEnabled, setIsEnabled] = useState(Boolean(defaultCode));
  const [position, setPosition] = useState("bottom");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "ads_settings", adKey);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCode(data.code || defaultCode);
          setIsEnabled(data.is_enabled !== false && Boolean(data.is_enabled));
          setPosition(data.position || "bottom");
        }
      } catch (error) {
        console.error("Error loading ad settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [adKey]);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "ads_settings", adKey), { 
        code, 
        is_enabled: isEnabled, 
        position,
        updated_at: serverTimestamp() 
      }, { merge: true });

      toast.success(`${title} saved successfully`);
    } catch (error) {
      console.error("Error saving ad settings:", error);
      toast.error("Failed to save ad settings");
    }
  };

  const handleStatusToggle = async (status: boolean) => {
    try {
      await setDoc(
        doc(db, "ads_settings", adKey),
        { code, is_enabled: status, position, updated_at: serverTimestamp() },
        { merge: true }
      );
      setIsEnabled(status);
      toast.success(`Ad ${status ? 'Activated' : 'Revoked'}`);
    } catch (error) {
      toast.error("Action failed");
    }
  };

  if (isLoading) return <div className="h-40 bg-white/5 rounded-2xl" />;

  return (
    <div className="p-2 bg-[#0a0a0a] border border-white/5 rounded-lg backdrop-blur-none space-y-2 relative group">
      <div className="flex items-center justify-between gap-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[10px] flex items-center gap-1 leading-tight truncate">
            {title}
            {isEnabled ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[7px] h-3 px-1 ml-1">ACTIVE</Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[7px] h-3 px-1 ml-1">REVOKED</Badge>
            )}
          </h3>
          <p className="text-[8px] text-white/30 truncate">{description}</p>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Textarea 
          placeholder="Paste ad code here..." 
          className="bg-black/60 border-white/10 min-h-[60px] text-[10px] font-mono p-2 focus:ring-purple-500/40 rounded resize-none text-white"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="flex items-center gap-1">
          {hasPosition && (
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger className="h-6 text-[8px] bg-white/5 border-white/5 px-1.5 w-16">
                <SelectValue placeholder="Pos" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                <SelectItem value="top" className="text-[9px]">Top</SelectItem>
                <SelectItem value="bottom" className="text-[9px]">Bottom</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button 
            onClick={handleSave}
            className="h-6 text-[8px] flex-1 bg-white text-black hover:bg-white/90 font-bold rounded px-2"
          >
            Save
          </Button>
          
          <div className="flex gap-1">
            <Button 
              size="icon"
              variant="outline"
              className={cn("h-6 w-6 border-white/10", isEnabled ? "text-red-400 hover:bg-red-400/10" : "text-emerald-400 hover:bg-emerald-400/10")}
              onClick={() => handleStatusToggle(!isEnabled)}
              title={isEnabled ? "Revoke" : "Activate"}
            >
              {isEnabled ? <RotateCcw size={10} /> : <CheckCircle2 size={10} />}
            </Button>
          </div>
        </div>
      </div>

      {code && (
        <div className="mt-2 pt-2 border-t border-white/5">
           <p className="text-[7px] font-bold text-white/20 uppercase mb-1">Snippet Preview</p>
           <div className="p-1.5 bg-black/40 rounded text-[8px] font-mono text-white/40 truncate">
             {code.substring(0, 50)}...
           </div>
        </div>
      )}
    </div>
  );
}




function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-500 relative group/nav",
        active 
          ? "bg-gradient-to-r from-purple-500/15 to-pink-500/5 text-white shadow-[inset_0_0_20px_rgba(168,85,247,0.05)] border border-white/5" 
          : "text-white/30 hover:text-white/80 hover:bg-white/5 border border-transparent"
      )}
    >
      <span className={cn(
        "transition-all duration-500 group-hover/nav:scale-110 group-hover/nav:rotate-3",
        active ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" : "text-white/20"
      )}>
        {icon}
      </span>
      {label}
      {active && (
        <>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-purple-400 to-pink-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          <ChevronRight size={10} className="ml-auto text-purple-500/50" />
        </>
      )}
    </button>
  );
}

function StatCard({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading?: boolean }) {
  return (
    <div className="p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-none group hover:bg-white/[0.08] transition-all duration-500">
      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-500 border border-white/5">
        {icon}
      </div>
      <p className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest leading-none">{label}</p>
      {loading ? (
        <div className="h-6 md:h-8 w-12 bg-white/10 rounded mt-1" />
      ) : (
        <p className="text-xl md:text-2xl font-black mt-1 tracking-tighter">{value}</p>
      )}
    </div>
  );
}
