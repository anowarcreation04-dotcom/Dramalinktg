import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Movie } from "@/lib/movies";

/**
 * Compact cinematic slider — DRAMA PLAY style.
 * Left: badges + title + Watch Now button. Right: floating 2:3 poster.
 * Auto-slide every 2.5s, pauses on hover, supports pointer/touch swipe.
 */
export function HeroSlider({ movies, intervalMs = 2500 }: { movies: Movie[]; intervalMs?: number }) {
  const [i, setI] = useState(0);
  const pausedRef = useRef(false);
  const dragRef = useRef<{ startX: number; dx: number; active: boolean }>({ startX: 0, dx: 0, active: false });
  const [dx, setDx] = useState(0);

  useEffect(() => {
    if (movies.length < 2) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setI((n) => (n + 1) % movies.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [movies.length, intervalMs]);

  if (movies.length === 0) {
    return (
      <section className="relative overflow-hidden mx-2 sm:mx-3 mt-2 rounded-[14px] bg-black/40 backdrop-blur-none border border-white/5 flex flex-col items-center justify-center text-center h-[240px] sm:h-[340px] md:h-[400px] lg:h-[460px]">
        <div className="space-y-4 animate-in fade-in duration-700">
          <p className="text-white/20 font-display font-black text-4xl sm:text-6xl lg:text-8xl uppercase tracking-tighter italic select-none">
            No Post
          </p>
        </div>
      </section>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, dx: 0, active: true };
    pausedRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const delta = e.clientX - dragRef.current.startX;
    dragRef.current.dx = delta;
    setDx(delta);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const width = (e.currentTarget as HTMLElement).clientWidth || 1;
    const threshold = width * 0.15;
    const delta = dragRef.current.dx;
    dragRef.current.active = false;
    setDx(0);
    if (delta > threshold) setI((n) => (n - 1 + movies.length) % movies.length);
    else if (delta < -threshold) setI((n) => (n + 1) % movies.length);
    setTimeout(() => { pausedRef.current = false; }, 500);
  };

  return (
    <section
      className="relative overflow-hidden mx-2 sm:mx-3 mt-2 rounded-[14px] bg-black touch-pan-y select-none h-[240px] sm:h-[340px] md:h-[400px] lg:h-[460px]"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (Math.abs(dragRef.current.dx) > 8) { e.preventDefault(); e.stopPropagation(); }
      }}
    >
      <div
        className={"flex h-full w-full " + (dragRef.current.active ? "" : "transition-transform duration-[600ms] ease-[cubic-bezier(.4,0,.2,1)]")}
        style={{ transform: `translateX(calc(-${i * 100}% + ${dx}px))` }}
      >
        {movies.map((m, idx) => {
          const bg = m.backdrop_url ?? m.poster_url ?? "";
          const poster = m.poster_url ?? m.backdrop_url ?? "";
          // Only the active slide (and its immediate neighbor) need to load
          // eagerly — the rest can wait, so the initial page paint isn't
          // competing with images the person isn't looking at yet.
          const isNear = Math.abs(idx - i) <= 1 || Math.abs(idx - i) >= movies.length - 1;
          return (
            <a
              key={m.id}
              href={`/movie/${encodeURIComponent(m.id)}`}
              className="relative shrink-0 w-full h-full overflow-hidden group"
            >
              {bg && isNear && (
                <img
                  src={bg}
                  alt=""
                  loading={idx === i ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={idx === i ? "high" : "auto"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {/* Refined gradient overlay: bottom-heavy to clear space for text and make it readable */}
              <div
                className="absolute inset-0 z-[2]"
                style={{
                  background: "linear-gradient(to top, rgba(13,14,18,1) 0%, rgba(13,14,18,0.7) 30%, transparent 60%, rgba(13,14,18,0.4) 100%)"
                }}
              />

              {/* Centered content design for a cleaner "Cinematic" look */}
              <div className="absolute inset-x-0 bottom-0 z-[4] p-6 sm:p-10 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest rounded-sm px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/20">
                    Trending
                  </span>
                  {m.year && <span className="text-xs font-bold text-white/60 tracking-wider px-2 border-l border-white/20">{m.year}</span>}
                  {m.languages && m.languages.length > 0 && (
                    <span className="text-xs font-bold text-white/60 tracking-wider px-2 border-l border-white/20">{m.languages[0]}</span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black leading-tight text-white mb-6 drop-shadow-2xl max-w-4xl tracking-tighter">
                  {m.title}
                </h1>

                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/10 backdrop-blur-none border border-white/20 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-500 transition-all duration-300 shadow-xl">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white translate-x-0.5" />
                  </div>
                  <span className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-white group-hover:text-purple-400 transition-colors">
                    Watch Now
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {movies.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex gap-[5px]">
          {movies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Slide ${idx + 1}`}
              className={"h-[6px] rounded-full transition-all duration-300 " + (idx === i ? "w-[18px] bg-[#9333EA]" : "w-[6px] bg-white/25 hover:bg-white/50")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
