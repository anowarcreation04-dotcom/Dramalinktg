import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies } from "@/lib/movies";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "Series — DramaLinkTG" },
      { name: "description", content: "Browse TV series on DramaLinkTG." },
      { property: "og:title", content: "Series — DramaLinkTG" },
      { property: "og:description", content: "Browse TV series on DramaLinkTG." },
    ],
    links: [{ rel: "canonical", href: "https://anivoflix.com/series" }],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const [visibleCount, setVisibleCount] = useState(24);
  const { data: series = [], isLoading } = useQuery({
    queryKey: ["movies", "Series"],
    // Only the "Series" type — Anime, TV Show and Mini Drama each have
    // their own dedicated category page and must not show up here.
    queryFn: () => fetchMovies({ type: "Series", onlyPublished: true, limitCount: 300 }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFE7BE] to-[#9333EA]">All Series</span>
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-1">Browse all uploaded series.</p>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-10 mt-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-20 text-white/40">No series found.</div>
        ) : (
          <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {series.slice(0, visibleCount).map((s: any) => (
              <MovieCard key={s.id} movie={s} />
            ))}
          </div>
          {visibleCount < series.length && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + 24)}
                className="px-7 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
              >
                Show More
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
