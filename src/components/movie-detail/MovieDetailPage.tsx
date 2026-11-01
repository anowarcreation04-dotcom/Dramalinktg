import { DescriptionBox } from "./DescriptionBox";
import { useParams, useRouter, useLoaderData } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Star, Bookmark, BookmarkCheck, RotateCcw, Share2, Play, Download, ArrowLeft, Server, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovie, fetchMovies, incrementMovieView, subscribeToMovie } from "@/lib/movies";
import { addToContinueWatching, CONTINUE_WATCHING_DELAY_MS } from "@/lib/continueWatching";
import type { Movie } from "@/lib/movies";
import { db } from "@/lib/firebase";
import { getDirectLinkUrls, runGatedClick, DEFAULT_DIRECT_LINK_PLAYER, DEFAULT_DIRECT_LINK_DOWNLOAD_TELEGRAM } from "@/lib/adGate";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// This page is shared by the legacy /movie/$id route and the single
// dynamic /$id route used by admin share links.

export const movieLoader = async ({ params }: { params: { id: string } }) => {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
    const movie = await Promise.race([fetchMovie(params.id), timeout]);
    return { movie };
  } catch {
    return { movie: null };
  }
};

export const movieHead = ({ params, loaderData }: { params: { id: string }; loaderData?: { movie: any } }) => {
    const url = `https://anivoflix.com/${encodeURIComponent(params.id)}`;
    const movie = loaderData?.movie;
    if (!movie) {
      return {
        meta: [
          { title: "Watch — DramaLinkTG" },
          { name: "description", content: "Watch movies and series on DramaLinkTG with resume playback across every device." },
          { property: "og:title", content: "Watch — DramaLinkTG" },
          { property: "og:description", content: "Watch movies and series on DramaLinkTG with resume playback across every device." },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const rawDesc = (movie.description ?? "").trim();
    const desc = rawDesc.length >= 50
      ? rawDesc.slice(0, 160)
      : `Watch ${movie.title}${movie.year ? ` (${movie.year})` : ""} on DramaLinkTG — a ${movie.genre} title with resume playback across every device. ${rawDesc}`.trim().slice(0, 160);
    const title = `${movie.title}${movie.year ? ` (${movie.year})` : ""} — DramaLinkTG`;
    const image = movie.backdrop_url ?? movie.poster_url ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name: movie.title,
            description: rawDesc || undefined,
            image: image || undefined,
            genre: movie.genre,
            datePublished: movie.year ? String(movie.year) : undefined,
            aggregateRating: movie.rating
              ? { "@type": "AggregateRating", ratingValue: movie.rating, bestRating: 10, ratingCount: 1 }
              : undefined,
            url,
          }),
        },
      ],
    };
  };

export const MovieDetailErrorComponent = ({ error }: { error: Error }) => (
  <div className="min-h-screen bg-[#0a0a0a] text-white p-10 text-center">Error: {error.message}</div>
);

export const MovieDetailNotFoundComponent = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white p-10 text-center">Movie not found</div>
);

function formatTime(s: number) {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    : `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function MoviePage() {
  // `strict: false` lets this component work with both the public /$id
  // route and the legacy /movie/$id route.
  const { id } = useParams({ strict: false }) as { id: string };
  const router = useRouter();
  // AUTH-TODO: Replace hardcoded 'guest' with actual Firebase Auth UID.
  const user = { id: "guest" }; 
  const userId = user?.id;


  const viewStateKey = `anivoflix_viewstate_${id}`;
  const readViewState = (): { episodeAction: "play" | "download" | null; serverChoice: "main" | "telegram" | null; selectedEpisode: number } => {
    if (typeof window === "undefined") return { episodeAction: null, serverChoice: null, selectedEpisode: 0 };
    try {
      const raw = window.sessionStorage.getItem(viewStateKey);
      if (!raw) return { episodeAction: null, serverChoice: null, selectedEpisode: 0 };
      const parsed = JSON.parse(raw);
      return {
        episodeAction: parsed.episodeAction === "play" || parsed.episodeAction === "download" ? parsed.episodeAction : null,
        serverChoice: parsed.serverChoice === "main" || parsed.serverChoice === "telegram" ? parsed.serverChoice : null,
        selectedEpisode: typeof parsed.selectedEpisode === "number" ? parsed.selectedEpisode : 0,
      };
    } catch {
      return { episodeAction: null, serverChoice: null, selectedEpisode: 0 };
    }
  };
  const initialViewState = readViewState();

  const [playing, setPlaying] = useState(false);
  const [episodeAction, setEpisodeAction] = useState<"play" | "download" | null>(initialViewState.episodeAction);
  const [serverChoice, setServerChoice] = useState<"main" | "telegram" | null>(initialViewState.serverChoice);
  const [directLinks, setDirectLinks] = useState<{ player: string | null; downloadTelegram: string | null }>({
    player: DEFAULT_DIRECT_LINK_PLAYER,
    downloadTelegram: DEFAULT_DIRECT_LINK_DOWNLOAD_TELEGRAM,
  });

  useEffect(() => {
    let cancelled = false;
    getDirectLinkUrls().then((urls) => {
      if (!cancelled) setDirectLinks(urls);
    });
    return () => { cancelled = true; };
  }, []);
  const [selectedEpisode, setSelectedEpisode] = useState(initialViewState.selectedEpisode);

  // Keep the current episode/server view saved so that returning via the
  // browser's Back button after a Direct Link ad redirect (a full page
  // navigation) lands back on the same download/player view instead of
  // resetting to the top of the page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        viewStateKey,
        JSON.stringify({ episodeAction, serverChoice, selectedEpisode })
      );
    } catch {
      // Ignore storage failures (e.g. private browsing quota) — this is a
      // convenience restore, not required for the ad gate itself to work.
    }
  }, [episodeAction, serverChoice, selectedEpisode, viewStateKey]);

  const playerRef = useRef<HTMLDivElement>(null);

  // The route loader already fetched this movie on the server (for SEO
  // meta tags) — reuse that as the query's initial data instead of
  // fetching it again from Firestore on the client. Removes a full
  // fetch + the loading skeleton flash on every movie page open.
  const loaderData = useLoaderData({ strict: false }) as { movie?: any } | undefined;
  const queryClient = useQueryClient();
  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", id],
    queryFn: () => fetchMovie(id),
    initialData: loaderData?.movie ?? undefined,
    staleTime: 0,
  });

  // Keep episodes/seasons in sync in real time. Admin deletions therefore
  // disappear from the public page immediately instead of waiting for the
  // old five-minute cache to expire.
  useEffect(() => {
    if (!id) return;
    return subscribeToMovie(id, (liveMovie) => {
      queryClient.setQueryData(["movie", id], liveMovie);
    });
  }, [id, queryClient]);

  const { data: inList, refetch } = useQuery({
    queryKey: ["watchlist", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const snap = await getDoc(doc(db, `users/${user.id}/watchlist`, id));
      return snap.exists();
    },
    enabled: !!user,
  });
  const { data: progress } = useQuery({
    queryKey: ["progress", id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const snap = await getDoc(doc(db, `users/${user.id}/watch_progress`, id));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 300_000,
    gcTime: 600_000,
  });


  const relatedType = movie?.type || "Movie";

  const { data: related = [] } = useQuery({
    queryKey: ["related", relatedType],
    enabled: !!movie?.type,
    queryFn: async () => {
      const items = await fetchMovies({
        type: relatedType as any,
        onlyPublished: true,
        limitCount: 12,
      });
      return items.filter((item: any) => item.id !== id).slice(0, 12);
    },
    staleTime: 600_000,
    gcTime: 1_200_000,
    refetchOnWindowFocus: false,
  });
  // Hide empty seasons from visitors. A season is visible only when it has at least
  // one episode with a playable or downloadable link.
  const seasons = (((movie as any)?.seasons || []) as any[])
    .filter((season: any) => Array.isArray(season.episodes) && season.episodes.some((episode: any) =>
      Boolean(episode.url || episode.video_url || episode.download_url || episode.download)
    ))
    .slice()
    .sort((a: any, b: any) => (Number(a.season_number) || 0) - (Number(b.season_number) || 0));
  // Series-like types always use seasons/episodes. A plain "Movie" post also
  // gets the Season/Episode buttons as soon as the admin has added at least one
  // season with a link; a Movie without seasons keeps the normal single player.
  const isEpisodeContent =
    ["Series", "Mini Drama", "Anime", "Serial", "TV Show"].includes(movie?.type) ||
    (movie?.type === "Movie" && seasons.length > 0);
  // On a Movie post the "episode" buttons are quality options (480p, 720p, 1080p...),
  // so the wording says "Quality" instead of "Episode".
  const isMovieQuality = movie?.type === "Movie";
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEpisodeContent) { setSelectedSeasonId(null); return; }
    const first = seasons[0];
    if (first && (!selectedSeasonId || !seasons.some((s: any) => s.id === selectedSeasonId))) {
      setSelectedSeasonId(first.id);
    }
  }, [isEpisodeContent, seasons, selectedSeasonId]);

  const selectedSeason = seasons.find((s: any) => s.id === selectedSeasonId) || seasons[0];
  const episodeStartNumber = (value: unknown, fallback: number) => {
    const match = String(value ?? "").match(/\d+/);
    return match ? Number(match[0]) || fallback : fallback;
  };
  const episodeList = ((selectedSeason?.episodes || []) as any[])
    .slice()
    .sort((a: any, b: any) => episodeStartNumber(a.episode_number, 0) - episodeStartNumber(b.episode_number, 0));
  const telegramEpisodeList = episodeList.filter((ep: any) =>
    Boolean(ep.telegram_url || ep.telegram_player_url || ep.telegram_download_url)
  );
  const hasTelegramEpisodeLink = telegramEpisodeList.length > 0;
  const hasTelegramMovieLink = !isEpisodeContent && Boolean(
    (movie as any)?.telegram_url || (movie as any)?.telegram_player_url || (movie as any)?.telegram_download_url
  );

  // Whether there's actually something to play. If an admin hasn't added an
  // episode/server/video link for this post yet, we shouldn't show a Play
  // button that leads nowhere — only Download (if that link exists).
  const hasEpisodeVideo = isEpisodeContent && episodeList.some((ep: any) => !!ep.url);
  const hasEpisodeDownloadLink = isEpisodeContent && episodeList.some((ep: any) => !!ep.download_url);
  const hasDirectVideo = !isEpisodeContent && (
    Boolean((movie as any)?.video_url) ||
    (Array.isArray((movie as any)?.movie_servers) && (movie as any).movie_servers.some((s: any) => !!s.url))
  );
  const canOfferTelegram = isEpisodeContent ? hasTelegramEpisodeLink : hasTelegramMovieLink;
  // The Play button should appear whenever there's *any* way to play this
  // title — a direct/episode link, or (for series) a Telegram link acting
  // as the play destination — not only when the main-server link exists.
  const canPlay = hasDirectVideo || hasEpisodeVideo || (isEpisodeContent && hasTelegramEpisodeLink);
  // Same idea for Download: only show the button when a download-capable
  // link actually exists somewhere (main or Telegram), per episode/movie.
  const canDownload = Boolean((movie as any)?.download_url) || (isEpisodeContent && (hasEpisodeDownloadLink || hasTelegramEpisodeLink));

  const savedPos = progress?.position_seconds ?? 0;
  const savedDur = progress?.duration_seconds ?? 0;
  const hasResume = savedPos > 5 && (savedDur === 0 || savedPos < savedDur - 15);

  // Reset play state when switching movies. Player pages no longer use the
  // Smart-Link / one-hour unlock flow; the two global popunders are handled by
  // the root route instead.
  useEffect(() => {
    setPlaying(false);
    setEpisodeAction(null);
    setServerChoice(null);
    setSelectedEpisode(0);
    setSelectedSeasonId(null);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id]);

  useEffect(() => {
    setSelectedEpisode(0);
    setPlaying(false);
    setServerChoice(null);
    if (selectedSeasonId) setEpisodeAction(null);
  }, [selectedSeasonId]);

  // Count a view once per visitor per post per day (guarded via
  // sessionStorage so refreshes/re-renders in the same tab don't inflate
  // the number). This only runs on the public movie page, never in the
  // admin panel.
  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    try {
      const storageKey = `viewed:${id}:${new Date().toDateString()}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
      incrementMovieView(id);
    } catch {
      // sessionStorage unavailable (e.g. private mode edge cases) — still
      // count the view, just without the same-session dedupe.
      incrementMovieView(id);
    }
  }, [id]);

  // Continue Watching: if the visitor stays on this post for 2 minutes,
  // save it to their list. Leaving earlier cancels the timer.
  useEffect(() => {
    if (typeof window === "undefined" || !movie?.id) return;
    const timer = window.setTimeout(() => {
      addToContinueWatching(movie as any);
    }, CONTINUE_WATCHING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [movie?.id]);

  const startPlaying = (episodeIndex = selectedEpisode) => {
    setSelectedEpisode(episodeIndex);
    setPlaying(true);
    if (isEpisodeContent && episodeList.length > 0) setEpisodeAction("play");
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const chooseAction = (action: "play" | "download") => {
    setPlaying(false);
    setEpisodeAction(action);
    setServerChoice(null);
    setSelectedEpisode(0);
  };

  // Which server option(s) actually have a usable link for the action the
  // visitor picked. Used to hide "Main Server" / "Telegram Server" when that
  // path has no link at all, instead of showing a button that does nothing.
  const canUseMainServer = isEpisodeContent
    ? (episodeAction === "download" ? hasEpisodeDownloadLink : hasEpisodeVideo)
    : (episodeAction === "download" ? Boolean((movie as any)?.download_url) : hasDirectVideo);

  // The episode numbers shown for the current Play/Download + Main/Telegram
  // selection: only episodes that actually have a link for that exact
  // combination, so a missing Player/Download/Telegram link on one episode
  // hides just that episode's button instead of showing a dead button.
  const displayEpisodeList = serverChoice === "telegram"
    ? telegramEpisodeList
    : episodeAction === "download"
    ? episodeList.filter((ep: any) => !!ep.download_url)
    : episodeList.filter((ep: any) => !!ep.url);

  // Auto-pick the server when only one side actually has a link, so the
  // visitor isn't shown a choice between a working button and a dead one.
  useEffect(() => {
    if (!episodeAction || serverChoice) return;
    if (canUseMainServer && !canOfferTelegram) setServerChoice("main");
    else if (!canUseMainServer && canOfferTelegram) setServerChoice("telegram");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeAction, serverChoice, canUseMainServer, canOfferTelegram]);

  const handlePlayClick = () => chooseAction("play");

  const handleDownloadClick = () => {
    if (isEpisodeContent && episodeList.length > 0) {
      chooseAction("download");
      return;
    }
    if ((movie as any)?.download_url || (movie as any)?.telegram_url || (movie as any)?.telegram_player_url || (movie as any)?.telegram_download_url) {
      chooseAction("download");
      return;
    }
  };

  const handleServerChoice = (server: "main" | "telegram") => {
    if (!episodeAction) return;
    setServerChoice(server);
    setSelectedEpisode(0);
    if (server === "main" && !isEpisodeContent) {
      if (episodeAction === "play") {
        runGatedClick(`player-${id}`, directLinks.player, () => startPlaying(0));
      } else if ((movie as any)?.download_url) {
        const downloadUrl = (movie as any).download_url;
        runGatedClick(`download-${id}`, directLinks.downloadTelegram, () =>
          window.open(downloadUrl, "_blank", "noopener,noreferrer")
        );
      }
    } else if (server === "telegram" && !isEpisodeContent) {
      const url = (movie as any)?.telegram_url || (movie as any)?.telegram_player_url || (movie as any)?.telegram_download_url;
      if (url) {
        runGatedClick(`telegram-${id}`, directLinks.downloadTelegram, () =>
          window.open(url, "_blank", "noopener,noreferrer")
        );
      }
    }
  };

  const handleEpisodeClick = (episodeIndex: number) => {
    const ep = displayEpisodeList[episodeIndex];
    if (!ep || !episodeAction) return;
    const url = serverChoice === "telegram"
      ? (ep.telegram_url || ep.telegram_player_url || ep.telegram_download_url)
      : (episodeAction === "download" ? ep.download_url : ep.url);
    if (!url) return;

    const originalIndex = episodeList.findIndex((item: any) => item.id === ep.id);
    const buttonKeySuffix = ep.id || `${episodeIndex}`;
    setSelectedEpisode(originalIndex >= 0 ? originalIndex : episodeIndex);
    if (serverChoice === "main") {
      if (episodeAction === "play") {
        const targetIndex = originalIndex >= 0 ? originalIndex : episodeIndex;
        runGatedClick(`player-${id}-${buttonKeySuffix}`, directLinks.player, () => startPlaying(targetIndex));
      } else {
        runGatedClick(`download-${id}-${buttonKeySuffix}`, directLinks.downloadTelegram, () =>
          window.open(url, "_blank", "noopener,noreferrer")
        );
      }
    } else {
      runGatedClick(`telegram-${id}-${buttonKeySuffix}`, directLinks.downloadTelegram, () => {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success(episodeAction === "download" ? "Opening Telegram download…" : "Opening Telegram player…");
      });
    }
  };

  const toggleWatchlist = async () => {
    if (!user) return;
    const ref = doc(db, `users/${user.id}/watchlist`, id);
    if (inList) {
      // Logic for delete not yet fully implemented via helper but setDoc empty or actual deleteDoc
      toast.success("Removed from library");
    } else {
      await setDoc(ref, { movie_id: id, added_at: new Date().toISOString() });
      toast.success("Added to library");
    }
    refetch();
  };


  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: movie?.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };

  const download = () => {
    if (!movie?.download_url) return;
    window.open(movie.download_url, "_blank", "noopener,noreferrer");
    toast.success("Opening download link…");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Header />
        <div className="w-full aspect-video max-h-[80vh] bg-white/5" />
      </div>
    );
  }
  if (!movie) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Header />
        <div className="p-10 text-center text-white/70">Movie not found.</div>
      </div>
    );
  }

  const bg = movie.backdrop_url ?? movie.poster_url ?? "";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      {/* HERO: big poster + info + Play / Download */}
      <section className="relative">
        {bg && (
          <div className="absolute inset-0 -z-0 overflow-hidden">
            <img src={bg} alt="" className="w-full h-full object-cover opacity-40 blur-2xl scale-110" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/85 to-[#0a0a0a]" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
          <button
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-pink-300 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-[minmax(0,220px)_1fr] lg:grid-cols-[minmax(0,280px)_1fr] items-start">
            {/* Poster */}
            <div className="mx-auto w-40 sm:w-52 md:w-full">
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_25px_60px_-15px_rgba(34,211,238,0.35)] bg-white/5">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">No poster</div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0">
              <h1
                className="text-3xl sm:text-5xl md:text-6xl font-black leading-[0.95] tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-purple-200 drop-shadow-[0_2px_20px_rgba(168,85,247,0.3)]"
              >
                {movie.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {movie.rating != null && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-pink-400/15 text-cyan-200 border border-pink-300/40 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> {movie.rating.toFixed(1)}
                  </span>
                )}
                {movie.year && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border border-purple-400/40 text-purple-200 bg-purple-500/10">
                    {movie.year}
                  </span>
                )}
                {movie.duration_minutes && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border border-white/15 text-white/80 bg-white/5">
                    {formatRuntime(movie.duration_minutes)}
                  </span>
                )}
                {(movie as any).season && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border border-cyan-300/40 text-cyan-200 bg-cyan-400/10 uppercase">
                    {(movie as any).season}
                  </span>
                )}
                {movie.languages && movie.languages.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider border border-white/15 text-white/80 bg-white/5 uppercase">
                    {movie.languages.join(" / ")}
                  </span>
                )}
              </div>

              {movie.description && <DescriptionBox text={movie.description} />}

              {/* Primary CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                {canPlay && (
                  <button
                    onClick={handlePlayClick}
                    className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_10px_30px_-8px_rgba(34,211,238,0.6)] hover:shadow-[0_15px_40px_-8px_rgba(168,85,247,0.7)] active:scale-95 transition-all"
                  >
                    <Play className="w-5 h-5 fill-current relative z-10" />
                    <span className="relative z-10">{hasResume ? "Resume" : "Play"}</span>
                  </button>
                )}
                {canDownload && (
                  <button
                    type="button"
                    onClick={handleDownloadClick}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-white/10 backdrop-blur-none border border-white/20 hover:border-pink-300/60 hover:bg-pink-400/10 hover:text-cyan-200 active:scale-95 transition-all"
                  >
                    <Download className="w-5 h-5" /> Download
                  </button>
                )}
                {hasResume && (
                  <button
                    onClick={() => { setPlaying(false); setTimeout(startPlaying, 20); }}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-white/15 bg-white/5 text-white/80 hover:text-white transition"
                  >
                    <RotateCcw className="w-4 h-4" /> Restart
                  </button>
                )}
              </div>

              {canOfferTelegram && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-cyan-200/90 [text-shadow:0_0_10px_rgba(34,211,238,0.55)]">
                  <Send className="w-3.5 h-3.5 text-[#26A5E4] drop-shadow-[0_0_6px_rgba(38,165,228,0.8)]" />
                  Main Server কাজ না করলে Telegram Server ব্যবহার করুন
                </p>
              )}



              {episodeAction && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/80 mb-3">{episodeAction === "play" ? "Play Server" : "Download Server"}</p>
                  <div className="flex flex-wrap gap-2">
                    {canUseMainServer && (
                    <button
                      type="button"
                      onClick={() => handleServerChoice("main")}
                      className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black transition-all", serverChoice === "main" ? "border-purple-300/70 bg-gradient-to-r from-purple-600/80 to-pink-500/80 text-white" : "border-white/10 bg-white/[0.045] text-white/75 hover:border-purple-400/60 hover:text-white")}
                    >
                      <Server className="w-4 h-4" /> Main Server
                    </button>
                    )}
                    {canOfferTelegram && (
                      <button
                        type="button"
                        onClick={() => handleServerChoice("telegram")}
                        className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black transition-all", serverChoice === "telegram" ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.045] text-white/75 hover:border-cyan-400/60 hover:text-white")}
                      >
                        <Send className="w-4 h-4 text-[#26A5E4]" /> Telegram Server
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hasResume && savedDur > 0 && (
                <p className="mt-3 text-xs text-white/50">
                  You left off at {formatTime(savedPos)} / {formatTime(savedDur)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Player stays above the persistent episode controls. */}
      {playing && (
        <div ref={playerRef} className="w-full bg-black border-y border-white/10">
          <div className="max-w-7xl mx-auto">
            <Player
              key={`${id}-${selectedSeasonId || "main"}-${selectedEpisode}`}
              movieId={id}
              movieData={movie}
              episodeList={episodeList}
              userId={user?.id}
              startAt={hasResume && selectedEpisode === 0 ? savedPos : 0}
              posterUrl={movie.backdrop_url ?? movie.poster_url ?? undefined}
              initialEpisode={selectedEpisode}
            />
          </div>
        </div>
      )}

      {isEpisodeContent && seasons.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:p-4 shadow-[0_15px_50px_rgba(0,0,0,0.25)]">
            <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/85 mb-3">Seasons</p>
            <div className="flex flex-wrap gap-2">
              {seasons.map((season: any, index: number) => {
                const active = season.id === selectedSeason?.id;
                const label = season.title || `Season ${season.season_number ?? index + 1}`;
                return <button key={season.id || index} type="button"
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={cn("px-4 py-2 rounded-lg border text-xs font-black transition-all", active ? "border-purple-300/70 bg-gradient-to-r from-purple-600/80 to-pink-500/80 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)]" : "border-white/10 bg-white/[0.045] text-white/70 hover:border-purple-400/60 hover:text-white")}
                >{label}</button>;
              })}
            </div>
          </div>
        </section>
      )}

      {episodeAction && serverChoice && isEpisodeContent && displayEpisodeList.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5">


          <div className="rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-none p-3 sm:p-4 shadow-[0_15px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/85">
                  {isMovieQuality
                    ? (serverChoice === "telegram" ? "Telegram Quality" : episodeAction === "play" ? "Quality" : "Download Quality")
                    : (serverChoice === "telegram" ? "Telegram Episodes" : episodeAction === "play" ? "Episodes" : "Download Episodes")}
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/35 mt-1">
                  {isMovieQuality
                    ? (serverChoice === "telegram" ? "Select a quality to open its Telegram link." : episodeAction === "play" ? "Select a quality to start watching." : "Select a quality to download.")
                    : (serverChoice === "telegram" ? "Select an episode to open its Telegram link." : episodeAction === "play" ? "Select an episode to start watching." : "Select an episode to download.")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {displayEpisodeList.map((ep: any, idx: number) => {
                const label = String(ep.episode_number ?? idx + 1);
                const active = episodeList.findIndex((item: any) => item.id === ep.id) === selectedEpisode;
                return (
                  <button
                    key={ep.id || idx}
                    type="button"
                    data-anivoflix-episode-button="true"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => { event.stopPropagation(); handleEpisodeClick(idx); }}
                    className={cn(
                      "relative h-10 sm:h-11 rounded-lg border text-[10px] sm:text-[11px] font-black tracking-wider transition-all duration-200 overflow-hidden",
                      active
                        ? "border-purple-300/70 bg-gradient-to-r from-purple-600/80 to-pink-500/80 text-white shadow-[0_0_22px_rgba(168,85,247,0.5)]"
                        : "border-white/10 bg-white/[0.045] text-white/70 hover:border-purple-400/60 hover:bg-purple-500/10 hover:text-white hover:shadow-[0_0_18px_rgba(168,85,247,0.3)]"
                    )}
                    title={ep.title || `${isMovieQuality ? "Quality" : "Episode"} ${label}`}
                  >
                    <span className="relative z-10">{label}</span>
                    <span className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-400/70 to-transparent opacity-70" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Related posts stay directly below the Player / Download controls. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        {related.length > 0 && (
          <YouMayLike
            movies={related}
            title={relatedType === "Series" ? "Related Series" : relatedType === "Mini Drama" ? "Related Mini Drama" : `Related ${relatedType}`}
          />
        )}
      </div>
    </div>
  );
}

function YouMayLike({ movies, title = "Related Posts" }: { movies: Movie[]; title?: string }) {
  // The Popunder does NOT run on post pages at all: not on page open, and
  // not from this Related Posts section either.

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-500 to-pink-400" />
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {movies.map((m) => <MovieCard key={m.id} movie={m} />)}
      </div>
    </section>
  );
}

function Player({
  movieId,
  movieData,
  episodeList,
  userId,
  startAt,
  posterUrl,
  initialEpisode = 0,
}: {
  movieId: string;
  movieData: any;
  episodeList: any[];
  userId: string | undefined;
  startAt: number;
  posterUrl?: string;
  initialEpisode?: number;
}) {
  const movie = movieData;
  const episodes = Array.isArray(episodeList) ? episodeList : [];
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);

  const ref = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);
  const [currentServer, setCurrentServer] = useState(0);

  const servers = (movie as any)?.movie_servers || [];
  
  // Use episode URL if it's a series type and we have episodes
  const isSeries = movie?.type && (
    ["Series", "Mini Drama", "Anime", "Serial"].includes(movie.type) ||
    (movie.type === "Movie" && episodes.length > 0)
  );
  const episode = episodes[currentEpisode];
  const rawSrc = (isSeries && episode) 
    ? episode.url 
    : (servers[currentServer] as any)?.url || (movie as any)?.video_url || "";

  // Admins sometimes paste the whole <iframe ...></iframe> embed code
  // (copied straight from the video host) into the URL field instead of
  // just the link. If that happens, pull the real URL out of src="..."
  // so it still plays instead of silently breaking.
  const iframeSrcMatch = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(rawSrc || "");
  const src = iframeSrcMatch ? iframeSrcMatch[1] : (rawSrc || "").trim();

  const isYT = /youtube\.com|youtu\.be/.test(src);
  const isVimeo = /vimeo\.com/.test(src);
  // A "direct" file is one the <video> tag can actually decode itself
  // (a raw .mp4/.m3u8/etc. link). Anything else pasted into the admin
  // panel's "Embed link" field is assumed to be a 3rd-party player page
  // (e.g. streamtape/dood/mixdrop/google-drive-preview/etc.) which must
  // be loaded inside an <iframe>, not a <video> tag — a <video src="...">
  // pointed at a non-file page simply fails silently, which is why
  // episodes with those links were not playing.
  const isDirectFile = /\.(mp4|m3u8|webm|ogv|mov|mkv)(\?[^#]*)?(#.*)?$/i.test(src);

  const saveProgress = async (position: number, duration: number) => {
    if (!userId || !position || isNaN(position)) return;
    try {
      await setDoc(doc(db, `users/${userId}/watch_progress`, movieId), {
        position_seconds: position,
        duration_seconds: duration || 0,
        updated_at: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const onLoaded = () => {
      if (startAt > 0 && startAt < (v.duration || Infinity) - 5) {
        v.currentTime = startAt;
      }
      v.play().catch(() => {});
    };
    const onTime = () => {
      if (!userId) return;
      const now = v.currentTime;
      if (now - lastSaved.current >= 5) {
        lastSaved.current = now;
        saveProgress(now, v.duration || 0);
      }
    };
    const onPause = () => saveProgress(v.currentTime, v.duration || 0);
    const onEnded = () => saveProgress(v.duration || 0, v.duration || 0);

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") saveProgress(v.currentTime, v.duration || 0);
    };
    document.addEventListener("visibilitychange", flushOnHide);

    return () => {
      saveProgress(v.currentTime, v.duration || 0);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", flushOnHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, movieId, startAt]);

  const embed = isYT
    ? `${src.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}?autoplay=1${startAt ? `&start=${Math.floor(startAt)}` : ""}`
    : isVimeo
    ? `${src.replace("vimeo.com/", "player.vimeo.com/video/")}?autoplay=1${startAt ? `#t=${Math.floor(startAt)}s` : ""}`
    : (src && !isDirectFile)
    ? src // generic 3rd-party embed link pasted in the admin panel
    : null;

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden group">
      {!src ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm px-6 text-center">
          No video link found for this {movie?.type === "Movie" ? "quality" : "episode"}/server. Add one from the admin panel.
        </div>
      ) : embed ? (
        <iframe
          key={embed}
          src={embed}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      ) : (
        <video
          key={src}
          ref={ref}
          src={src}
          poster={posterUrl}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      )}
      


      {/* Server Switcher */}
      {servers.length > 1 && !isSeries && (
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
          {servers.map((s: any, idx: number) => (
            <button
              key={s.id}
              onClick={() => setCurrentServer(idx)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-none transition-all",
                currentServer === idx 
                  ? "bg-pink-500 border-transparent text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]" 
                  : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white"
              )}
            >
              Server {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
