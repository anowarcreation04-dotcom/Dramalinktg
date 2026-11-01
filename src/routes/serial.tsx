import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies } from "@/lib/movies";

export const Route = createFileRoute("/serial")({
  head: () => ({
    title: "Serial — DramaLinkTG",
    meta: [{ name: "description", content: "Watch the latest serials on DramaLinkTG." }],
  }),
  component: SerialPage,
});

function SerialPage() {
  const [visibleCount, setVisibleCount] = useState(24);
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", "serial"],
    queryFn: () => fetchMovies({ type: "Serial", onlyPublished: true, limitCount: 300 }),
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Header />
      <div className="max-w-7xl mx-auto py-10 px-4 w-full">
        <h1 className="text-3xl font-bold mb-8">Serial</h1>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
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
            </div>)}
          </>
        ) : (
          <p className="text-white/40">No serials found.</p>
        )}
      </div>
    </div>
  );
}
