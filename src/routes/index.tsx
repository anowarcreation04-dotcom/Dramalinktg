import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieCard, MovieRow } from "@/components/MovieCard";
import { NoticeBoard } from "@/components/NoticeBoard";
import { HeroSlider } from "@/components/HeroSlider";
import { ContinueWatchingRow, TopWatchRow } from "@/components/HomeRows";
import { fetchMovies } from "@/lib/movies";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  // Fetch the above-the-fold data on the server so the first HTML the
  // browser gets already has real content — the client then reuses this
  // via initialData instead of re-fetching from scratch after hydration.
  // This removes one full network round-trip (JS parse → Firestore →
  // render) from what the person actually has to wait through.
  loader: async () => {
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1200));
      const [newest, trending, featured] = await Promise.race([
        Promise.all([
          fetchMovies({ onlyPublished: true, limitCount: 12 }),
          fetchMovies({ onlyPublished: true, trendingOnly: true, limitCount: 12 }),
          fetchMovies({ onlyPublished: true, featured: true }),
        ]),
        timeout,
      ]);
      return { newest, trending, featured };
    } catch {
      return { newest: [], trending: [], featured: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "DramaLinkTG" },
      { name: "description", content: "Discover movies, series and mini dramas on DramaLinkTG." },
      { property: "og:title", content: "DramaLinkTG" },
      { property: "og:description", content: "Discover movies, series and mini dramas on DramaLinkTG." },
      { property: "og:url", content: "https://dramalinktg.anowarcreation04.workers.dev/" },
    ],
    links: [{ rel: "canonical", href: "https://dramalinktg.anowarcreation04.workers.dev/" }],
  }),
  component: Home_,
});

function Home_() {
  const loaderData = Route.useLoaderData();
  const [showAllNew, setShowAllNew] = useState(false);
  const { data: newest = [], isLoading: newestLoading } = useQuery({
    queryKey: ["home", "new-release", showAllNew ? "all" : "initial"],
    queryFn: () => fetchMovies({ onlyPublished: true, limitCount: showAllNew ? 60 : 12 }),
    initialData: !showAllNew && loaderData?.newest?.length ? loaderData.newest : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    gcTime: 600_000,
  });

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["home", "featured-slider"],
    queryFn: () => fetchMovies({ onlyPublished: true, featured: true }),
    initialData: loaderData?.featured?.length ? loaderData.featured : undefined,
    staleTime: 10_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    gcTime: 600_000,
  });

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["home", "trending"],
    queryFn: () => fetchMovies({ onlyPublished: true, trendingOnly: true, limitCount: 12 }),
    initialData: loaderData?.trending?.length ? loaderData.trending : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    gcTime: 600_000,
  });

  const homeLoading = newestLoading || trendingLoading || featuredLoading;
  const newVisible = showAllNew ? newest : newest.slice(0, 12);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
      <DownloadTutorialPopup />
      <Header />
      <NoticeBoard />

      {homeLoading ? (
        <div className="w-full h-[240px] sm:h-[340px] md:h-[400px] lg:h-[460px] bg-white/5 relative flex items-center justify-center">
          <div className="text-white/20 font-black text-4xl tracking-tighter uppercase italic select-none">Loading...</div>
        </div>
      ) : (
        <HeroSlider movies={featured.length > 0 ? featured : newest.slice(0, 5)} intervalMs={2500} />
      )}

      <div className="max-w-7xl mx-auto py-10 space-y-10 w-full flex-1 px-4">
        <MovieRow title="Trending" movies={trending.slice(0, 12)} isLoading={trendingLoading} />

        <section className="space-y-4">
          <div className="flex items-center justify-between px-3 sm:px-6">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-400" />
              New Release
            </h2>
          </div>
          {newestLoading ? (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 px-3 sm:px-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-white/[0.04] border border-white/5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 px-3 sm:px-6">
              {newVisible.map((movie: any) => (
                <div key={movie.id} className="min-w-0">
                  <MovieRowCard movie={movie} />
                </div>
              ))}
            </div>
          )}
          {!newestLoading && !showAllNew && newest.length >= 12 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllNew(true)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white hover:border-pink-400/50 hover:bg-pink-400/10 transition"
              >
                Show More
              </button>
            </div>
          )}
          {showAllNew && !newestLoading && newest.length > 12 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllNew(false)}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white hover:border-pink-400/50 hover:bg-pink-400/10 transition"
              >
                Show Less
              </button>
            </div>
          )}
        </section>

        <ContinueWatchingRow />
        <TopWatchRow />
      </div>
    </div>
  );
}

function MovieRowCard({ movie }: { movie: any }) {
  return <MovieCard movie={movie} />;
}

const TUTORIAL_POPUP_STORAGE_KEY = "anivoflix_tutorial_popup_last_shown";
const TUTORIAL_POPUP_INTERVAL_MS = 5 * 60 * 60 * 1000; // 5 hours

function DownloadTutorialPopup() {
  const [visible, setVisible] = useState(false);
  const [tutorialUrl, setTutorialUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "ads_settings", "download_tutorial_link"));
        if (cancelled || !snap.exists()) return;

        const data = snap.data();
        const url = typeof data.code === "string" ? data.code.trim() : "";
        if (!data.is_enabled || !url) return;

        let lastShown = 0;
        try {
          lastShown = Number(window.localStorage.getItem(TUTORIAL_POPUP_STORAGE_KEY)) || 0;
        } catch {
          // Ignore storage access issues (e.g. private browsing).
        }

        const dueToShow = Date.now() - lastShown >= TUTORIAL_POPUP_INTERVAL_MS;
        if (!dueToShow) return;

        setTutorialUrl(url);
        setVisible(true);
        try {
          window.localStorage.setItem(TUTORIAL_POPUP_STORAGE_KEY, String(Date.now()));
        } catch {
          // Ignore storage access issues.
        }
      } catch (error) {
        console.error("Failed to load download tutorial popup settings:", error);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-xs rounded-2xl border border-purple-500/20 bg-[#0c0a12] p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close"
          className="absolute top-3 right-3 text-white/40 hover:text-white transition"
        >
          ✕
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-purple-600 to-pink-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7L8 5z" fill="white" />
          </svg>
        </div>

        <h3 className="text-white font-bold text-base mb-1">How to download and play</h3>
        <p className="text-purple-300 text-sm mb-1">কিভাবে ডাউনলোড করবেন ও দেখবেন</p>
        <p className="text-white/40 text-xs mb-5">Quick guide to get started</p>

        <button
          type="button"
          onClick={() => {
            window.open(tutorialUrl, "_blank", "noopener,noreferrer");
            setVisible(false);
          }}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm py-2.5 hover:opacity-90 transition"
        >
          Watch Tutorial
        </button>
      </div>
    </div>
  );
}
