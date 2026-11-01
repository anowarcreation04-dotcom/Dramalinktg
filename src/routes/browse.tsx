import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies, GENRES } from "@/lib/movies";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse — DramaLinkTG" },
      { name: "description", content: "Browse the full DramaLinkTG catalog and filter by genre to find your next movie in the neon-lit grid." },
      { property: "og:title", content: "Browse — DramaLinkTG" },
      { property: "og:description", content: "Browse the full DramaLinkTG catalog and filter by genre to find your next movie in the neon-lit grid." },
      { property: "og:url", content: "https://anivoflix.com/browse" },
    ],
    links: [{ rel: "canonical", href: "https://anivoflix.com/browse" }],
  }),
  component: Browse,
});

function Browse() {
  const [genre, setGenre] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", "browse", genre],
    queryFn: () => fetchMovies(genre ? { genre, limitCount: 300 } : { limitCount: 300 }),
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-display font-black mb-6">
          <span className="text-gradient-neon">Browse</span> the Grid
        </h1>

        <div className="flex flex-wrap gap-2 mb-8">
          <FilterChip active={genre === null} onClick={() => { setGenre(null); setVisibleCount(24); }}>All</FilterChip>
          {GENRES.map((g) => (
            <FilterChip key={g} active={genre === g} onClick={() => { setGenre(g); setVisibleCount(24); }}>{g}</FilterChip>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-card/60" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <p className="text-muted-foreground">No movies in this genre yet.</p>
        ) : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 rounded-full text-sm font-medium border transition " +
        (active
          ? "bg-gradient-neon text-primary-foreground border-transparent glow-pink"
          : "border-border text-muted-foreground hover:text-foreground hover:border-primary")
      }
    >
      {children}
    </button>
  );
}
