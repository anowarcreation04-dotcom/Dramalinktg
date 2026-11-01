import type { Movie } from "@/lib/movies";

// Continue Watching list is stored per-visitor in their own browser
// (localStorage), so no login is needed and it costs zero Firestore reads.
const STORAGE_KEY = "anivoflix_continue_watching";
export const CONTINUE_WATCHING_MAX = 8;
// A visitor must stay on a post this long before it is added to the list.
export const CONTINUE_WATCHING_DELAY_MS = 2 * 60 * 1000; // 2 minutes

export type ContinueWatchingItem = Pick<
  Movie,
  "id" | "title" | "poster_url" | "quality" | "languages" | "type" | "season" | "rating" | "year"
> & { watchedAt: number };

export function getContinueWatching(): ContinueWatchingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, CONTINUE_WATCHING_MAX) : [];
  } catch {
    return [];
  }
}

export function addToContinueWatching(movie: Partial<Movie> & { id: string }) {
  if (typeof window === "undefined" || !movie?.id) return;
  const item: ContinueWatchingItem = {
    id: movie.id,
    title: movie.title || "Untitled",
    poster_url: movie.poster_url ?? null,
    quality: movie.quality || "HD",
    languages: Array.isArray(movie.languages) ? movie.languages : [],
    type: (movie.type || "Movie") as Movie["type"],
    season: movie.season ?? null,
    rating: movie.rating ?? null,
    year: movie.year ?? null,
    watchedAt: Date.now(),
  };
  try {
    // Newest first; if the post is already in the list, move it to the front.
    const next = [item, ...getContinueWatching().filter((m) => m.id !== item.id)].slice(
      0,
      CONTINUE_WATCHING_MAX,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / full) — ignore silently.
  }
}
