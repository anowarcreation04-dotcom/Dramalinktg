import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { fetchMovies, type ContentType } from "@/lib/movies";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — DramaLinkTG" },
      { name: "description", content: "Browse every category and language on DramaLinkTG in one place." },
      { property: "og:title", content: "Library — DramaLinkTG" },
      { property: "og:description", content: "Browse every category and language on DramaLinkTG in one place." },
    ],
    links: [{ rel: "canonical", href: "https://anivoflix.com/library" }],
  }),
  component: LibraryPage,
});

// Serial order matches the site's main navigation (Header / BottomNav).
const CATEGORIES: { label: string; type: ContentType | null }[] = [
  { label: "All", type: null },
  { label: "Movie", type: "Movie" },
  { label: "Series", type: "Series" },
  { label: "Anime", type: "Anime" },
  { label: "Serial", type: "Serial" },
  { label: "TV Show", type: "TV Show" },
  { label: "Mini Drama", type: "Mini Drama" },
];

const LANGUAGES = ["All", "Hindi", "Bengali", "English", "Korean", "Chinese", "Filipino"];

function LibraryPage() {
  const [category, setCategory] = useState<ContentType | null>(null);
  const [language, setLanguage] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState(24);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["library", category, language],
    queryFn: async () => {
      // Fetch each relevant type on its own request so one type can never
      // crowd the others out of a shared result window, then merge.
      const types: ContentType[] = category
        ? [category]
        : ["Movie", "Series", "Anime", "Serial", "TV Show", "Mini Drama"];
      const lists = await Promise.all(
        types.map((type) => fetchMovies({ type, onlyPublished: true, limitCount: 300 })),
      );
      let combined = lists.flat();

      if (language !== "All") {
        combined = combined.filter((m: any) =>
          Array.isArray(m.languages) &&
          m.languages.some((l: string) => l.toLowerCase() === language.toLowerCase()),
        );
      }

      const time = (m: any) => new Date(m.updated_at || m.created_at).getTime();
      return combined.sort((a: any, b: any) => time(b) - time(a));
    },
  });

  const handleCategory = (type: ContentType | null) => {
    setCategory(type);
    setVisibleCount(24);
  };

  const handleLanguage = (lang: string) => {
    setLanguage(lang);
    setVisibleCount(24);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6 pb-4">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFE7BE] to-[#9333EA]">Library</span>
        </h1>
        <p className="text-white/50 text-xs sm:text-sm mt-1">Every category and language, in one place.</p>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => handleCategory(c.type)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                category === c.type
                  ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white"
                  : "bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mt-2 -mx-1 px-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguage(lang)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border",
                language === lang
                  ? "bg-pink-400/15 border-pink-300/50 text-pink-200"
                  : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-10 mt-5">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-white/40">No posts found.</div>
        ) : (
          <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 sm:gap-4">
            {posts.slice(0, visibleCount).map((p: any) => (
              <MovieCard key={p.id} movie={p} preferredLanguage={language !== "All" ? language : undefined} />
            ))}
          </div>
          {visibleCount < posts.length && (
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
