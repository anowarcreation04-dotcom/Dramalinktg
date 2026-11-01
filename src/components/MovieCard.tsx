import { Play, Star } from "lucide-react";
import { memo, useRef } from "react";
import type { Movie } from "@/lib/movies";
import dramaLogo from "@/assets/dramalinktg-logo.svg";

/**
 * Portrait 2:3 poster card.
 * Width driven by parent grid/flex — 3 across on tiny phones, more on wider screens.
 */
export const MovieCard = memo(function MovieCard({ movie, preferredLanguage }: { movie: Movie; preferredLanguage?: string }) {
  // Normally the badge shows the first language a post was tagged with. But
  // when a page has an active language filter (e.g. Library), show whichever
  // language the visitor actually selected, as long as this post has it.
  const matchedLanguage = preferredLanguage
    ? movie.languages?.find((l) => l.toLowerCase() === preferredLanguage.toLowerCase())
    : undefined;
  const language = matchedLanguage || movie.languages?.[0] || "ENG";
  const languageLabel = language.toLowerCase() === "english" ? "ENG" : language;
  const season = movie.season || ((movie.type === "Series" || movie.type === "Mini Drama") ? "S01" : "");

  return (
    <a
      href={`/${encodeURIComponent(movie.id)}`}
      className="group block w-full"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2 bg-white/[0.04] ring-1 ring-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.28)] group-hover:ring-purple-400/50">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25),#0d0e12_70%)] p-4">
            <img src={dramaLogo} alt="DramaLinkTG" className="max-h-[55%] w-auto opacity-40 mix-blend-screen" />
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 z-10">
          <div className="bg-black/70 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/15 text-cyan-200 tracking-wider">
            {movie.quality || "HD"}
          </div>
        </div>

        {season && (
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <div className="bg-black/70 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/15 text-white/90 tracking-wider">
              {season}
            </div>
          </div>
        )}

        <div className="absolute top-1.5 right-1.5 z-10">
          <div className="bg-black/70 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/15 text-white tracking-wider">
            {languageLabel}
          </div>
        </div>

        {movie.rating != null && (
          <div className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-white bg-black/65 backdrop-blur-none px-1.5 py-0.5 rounded-md border border-white/10">
            <Star className="h-2.5 w-2.5 fill-pink-300 text-pink-300" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black/10">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.55)] scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white fill-current" />
          </div>
        </div>
      </div>

      <div className="px-1">
        <p className="text-[11px] sm:text-xs font-semibold truncate text-white group-hover:text-pink-200 transition-colors">{movie.title}</p>
        <p className="text-[9px] sm:text-[10px] text-white/45 truncate mt-0.5">
          {movie.year || ""}
        </p>
      </div>
    </a>
  );
});

/** Horizontally scrollable row — 3 cards visible on tiny phones, more on larger screens. */
export const MovieRow = memo(function MovieRow({
  title,
  movies,
  isLoading,
}: {
  title: string;
  movies: Movie[];
  isLoading?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-6">
          <div className="h-7 w-48 bg-white/10 rounded-lg" />
        </div>
        <div className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar px-3 sm:px-6 pb-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="shrink-0 basis-[31%] xs:basis-[28%] sm:basis-[22%] md:basis-[18%] lg:basis-[14.5%]"
            >
              <div className="aspect-[2/3] rounded-2xl bg-white/[0.04] border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-6">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-white/10" />
            {title}
          </h2>
        </div>
        <div className="px-3 sm:px-6">
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl border border-white/5 bg-white/[0.02] border-dashed">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-bold">No Post — Wait for update</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 below-fold-section">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-400" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-none hover:border-pink-400/60 hover:bg-pink-400/10 text-white/70 hover:text-white transition flex items-center justify-center"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="h-8 w-8 rounded-full border border-white/10 bg-white/5 backdrop-blur-none hover:border-pink-400/60 hover:bg-pink-400/10 text-white/70 hover:text-white transition flex items-center justify-center"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar px-3 sm:px-6 pb-2 scroll-smooth snap-x snap-mandatory"
      >
        {movies.map((m) => (
          <div
            key={m.id}
            className="shrink-0 grow-0 snap-start basis-[31%] xs:basis-[28%] sm:basis-[22%] md:basis-[18%] lg:basis-[14.5%] min-w-0 max-w-[31%] xs:max-w-[28%] sm:max-w-[22%] md:max-w-[18%] lg:max-w-[14.5%]"
          >
            <MovieCard movie={m} />
          </div>
        ))}
      </div>
    </section>
  );
});
