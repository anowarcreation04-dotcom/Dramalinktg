import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies } from "@/lib/movies";

export const Route = createFileRoute("/mini-drama")({
  head: () => ({
    meta: [
      { title: "Mini Drama — DramaLinkTG" },
      { name: "description", content: "Watch Mini Dramas on DramaLinkTG." },
    ],
  }),
  component: MiniDramaPage,
});

function MiniDramaPage() {
  const [visibleCount, setVisibleCount] = useState(24);
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", "Mini Drama"],
    queryFn: () => fetchMovies({ type: "Mini Drama", onlyPublished: true, limitCount: 300 }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-500">Mini Drama</span>
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-1">Bite-sized stories for you.</p>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-10 mt-6">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />)}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-white/40">No mini dramas found.</div>
        ) : (
          <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {movies.slice(0, visibleCount).map((m: any) => <MovieCard key={m.id} movie={m} />)}
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
