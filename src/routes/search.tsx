import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchSearchMovies } from "@/lib/movies";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional().default("") }),
  head: () => ({
    meta: [
      { title: "Search — DramaLinkTG" },
      { name: "description", content: "Search the DramaLinkTG catalog to find movies and series by title across every genre." },
      { property: "og:title", content: "Search — DramaLinkTG" },
      { property: "og:description", content: "Search the DramaLinkTG catalog to find movies and series by title across every genre." },
      { property: "og:url", content: "https://anivoflix.com/search" },
    ],
    links: [{ rel: "canonical", href: "https://anivoflix.com/search" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["movies", "search", q],
    queryFn: () => (q ? fetchSearchMovies(q) : Promise.resolve([])),
    enabled: !!q,
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-6">
          Results for <span className="text-gradient-neon">"{q}"</span>
        </h1>
        {!q ? (
          <p className="text-muted-foreground">Start typing to search the catalog.</p>
        ) : isLoading ? (
          <p className="text-muted-foreground">Searching…</p>
        ) : movies.length === 0 ? (
          <p className="text-muted-foreground">No matches. Try a different title.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((m: any) => <MovieCard key={m.id} movie={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}
