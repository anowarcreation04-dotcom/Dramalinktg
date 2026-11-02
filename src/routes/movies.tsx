import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies } from "@/lib/movies";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movies — DramaLinkTG" },
      { name: "description", content: "Browse movies on DramaLinkTG." },
      { property: "og:title", content: "Movies — DramaLinkTG" },
      { property: "og:description", content: "Browse movies on DramaLinkTG." },
    ],
    links: [{ rel: "canonical", href: "https://dramalinktg.anowarcreation04.workers.dev/movies" }],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const [visibleCount, setVisibleCount] = useState(24);
  const { data: allMovies = [], isLoading } = useQuery({
    queryKey: ["movies", "Movie"],
    queryFn: () => fetchMovies({ type: "Movie", onlyPublished: true, limitCount: 300 }),
  });

  const movies = allMovies;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFE7BE] to-[#9333EA]">All Movies</span>
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-1">Browse all uploaded movies.</p>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-10 mt-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-white/40">No movies found.</div>
        ) : (
          <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {movies.slice(0, visibleCount).map((m: any) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
          {visibleCount < movies.length && (
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
