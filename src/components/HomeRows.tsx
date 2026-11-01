import { memo, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MovieCard } from "@/components/MovieCard";
import { fetchTopWatched } from "@/lib/movies";
import type { Movie } from "@/lib/movies";
import { getContinueWatching } from "@/lib/continueWatching";

function RowShell({
  title,
  children,
  scrollerRef,
}: {
  title: string;
  children: React.ReactNode;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  };
  const btn =
    "h-8 w-8 rounded-full border border-white/10 bg-white/5 hover:border-pink-400/60 hover:bg-pink-400/10 text-white/70 hover:text-white transition flex items-center justify-center";
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-3 sm:px-6">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-400" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollBy(-1)} aria-label="Scroll left" className={btn}>‹</button>
          <button onClick={() => scrollBy(1)} aria-label="Scroll right" className={btn}>›</button>
        </div>
      </div>
      <div
        ref={scrollerRef as React.RefObject<HTMLDivElement>}
        className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar px-3 sm:px-6 pb-2 scroll-smooth snap-x snap-mandatory"
      >
        {children}
      </div>
    </section>
  );
}

/** Posts the visitor stayed on for 2+ minutes (stored in their browser). Max 8. */
export const ContinueWatchingRow = memo(function ContinueWatchingRow() {
  const [items, setItems] = useState<ReturnType<typeof getContinueWatching>>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getContinueWatching());
  }, []);

  if (items.length === 0) return null;

  return (
    <RowShell title="Continue Watching" scrollerRef={scrollerRef}>
      {items.map((m) => (
        <div
          key={m.id}
          className="shrink-0 grow-0 snap-start basis-[31%] xs:basis-[28%] sm:basis-[22%] md:basis-[18%] lg:basis-[14.5%] min-w-0 max-w-[31%] xs:max-w-[28%] sm:max-w-[22%] md:max-w-[18%] lg:max-w-[14.5%]"
        >
          <MovieCard movie={m as unknown as Movie} />
        </div>
      ))}
    </RowShell>
  );
});

/** Top 10 most-viewed posts on the site, numbered 1, 2, 3... */
export const TopWatchRow = memo(function TopWatchRow() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ["home", "top-watch"],
    queryFn: () => fetchTopWatched(10),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    gcTime: 600_000,
  });

  if (isLoading || movies.length === 0) return null;

  return (
    <RowShell title="Top Watch" scrollerRef={scrollerRef}>
      {movies.map((m, i) => (
        <div
          key={m.id}
          className="shrink-0 grow-0 snap-start flex items-end basis-[52%] xs:basis-[46%] sm:basis-[34%] md:basis-[26%] lg:basis-[20%] min-w-0"
        >
          <span
            className="select-none font-black leading-none -mr-2 z-10 text-[64px] sm:text-[84px] text-transparent pb-8"
            style={{ WebkitTextStroke: "2px rgba(236,72,153,0.85)" }}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <MovieCard movie={m} />
          </div>
        </div>
      ))}
    </RowShell>
  );
});
