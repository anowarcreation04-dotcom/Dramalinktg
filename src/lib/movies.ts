import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { db } from "./firebase";

export type ContentType = "Movie" | "Series" | "Anime" | "TV Show" | "Mini Drama" | "Cartoon" | "Serial";

export type Movie = {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  video_url: string | null;
  download_url: string | null;
  telegram_url?: string | null;
  telegram_player_url?: string | null;
  telegram_download_url?: string | null;
  banner_url: string | null;
  trailer_url: string | null;
  genre: string;
  year: number | null;
  duration_minutes: number | null;
  rating: number | null;
  is_featured: boolean;
  quality: string;
  languages: string[];
  type: ContentType;
  is_trending: boolean;
  is_upcoming: boolean;
  release_date: string | null;
  youtube_trailer_id: string | null;
  created_at: any;
  updated_at: any;
  season?: string | null;
  view_count: number;
};

export type MovieServer = {
  id: string;
  movie_id: string;
  name: string;
  url: string;
};

export type Season = {
  id: string;
  movie_id: string;
  season_number: number;
  title: string | null;
};

export type Episode = {
  id: string;
  season_id: string;
  episode_number: number | string;
  title: string | null;
  url: string;
  download_url: string | null;
};

export const GENRES = [
  "Action", "Sci-Fi", "Drama", "Thriller", "Mystery", 
  "Romance", "Comedy", "Horror", "Animation", "Documentary", 
  "Adventure", "Fantasy", "Crime"
] as const;

export const LANGUAGES = [
  "English", "Bengali", "Hindi", "Korean", "Japanese", 
  "Spanish", "French", "German"
] as const;

// Helper to convert Firestore dates
const episodeSortKey = (value: unknown) => {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const mapMovie = (doc: any): Movie => {
  const data = doc.data();
  if (!data) {
    console.error("mapMovie received empty data for doc:", doc.id);
  }
  
  const ensureDate = (field: any) => {
    if (!field) return new Date().toISOString();
    if (typeof field.toDate === 'function') return field.toDate().toISOString();
    if (typeof field === 'string') return new Date(field).toISOString();
    if (field instanceof Date) return field.toISOString();
    return new Date().toISOString();
  };

  return {
    id: doc.id,
    title: data?.title || "Untitled",
    description: data?.description || "",
    poster_url: data?.poster_url || null,
    backdrop_url: data?.backdrop_url || null,
    video_url: data?.video_url || null,
    download_url: data?.download_url || null,
    telegram_url: data?.telegram_url || null,
    telegram_player_url: data?.telegram_player_url || null,
    telegram_download_url: data?.telegram_download_url || null,
    banner_url: data?.banner_url || null,
    trailer_url: data?.trailer_url || null,
    genre: data?.genre || "Action",
    year: data?.year || null,
    duration_minutes: data?.duration_minutes || null,
    rating: data?.rating || null,
    is_featured: !!data?.is_featured,
    quality: data?.quality || "HD",
    languages: Array.isArray(data?.languages) ? data.languages : [],
    type: data?.type || "Movie",
    is_trending: !!data?.is_trending,
    is_upcoming: !!data?.is_upcoming,
    status: data?.status || "published",
    release_date: data?.release_date || null,
    youtube_trailer_id: data?.youtube_trailer_id || null,
    created_at: ensureDate(data?.created_at),
    updated_at: ensureDate(data?.updated_at),
    season: data?.season || null,
    view_count: typeof data?.view_count === "number" ? data.view_count : 0,
  } as Movie;
};

import { onSnapshot, Unsubscribe } from "firebase/firestore";

export function subscribeToMovies(
  opts: { genre?: string; featured?: boolean; search?: string; type?: ContentType; onlyPublished?: boolean; language?: string; trendingOnly?: boolean; limitCount?: number },
  onUpdate: (movies: Movie[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  const moviesRef = collection(db, "movies");
  // Always query by created_at desc if possible to get latest content
  let q = query(moviesRef, orderBy("created_at", "desc"), limit(Math.max((opts?.limitCount || 24) * 4, 48)));

  if (opts?.genre) q = query(moviesRef, where("genre", "==", opts.genre), limit(Math.max((opts?.limitCount || 24) * 4, 48)));
  if (opts?.featured) q = query(moviesRef, where("is_featured", "==", true));
  if (opts?.type) q = query(moviesRef, where("type", "==", opts.type), limit(Math.max((opts?.limitCount || 24) * 4, 48)));
  if (opts?.language) q = query(moviesRef, where("languages", "array-contains", opts.language), limit(Math.max((opts?.limitCount || 24) * 4, 48)));
  if (opts?.trendingOnly) q = query(moviesRef, where("is_trending", "==", true), limit(Math.max((opts?.limitCount || 12) * 4, 48)));

  return onSnapshot(q, (snapshot) => {
    let movies = snapshot.docs.map(mapMovie);
    
    // Client-side filtering to avoid index errors in Firebase
    if (opts?.onlyPublished) {
      movies = movies.filter(m => (m as any).status !== "draft");
    }

    // Sort manually in memory to ensure new posts appear at top without needing complex Firestore indexes
    movies.sort((a, b) => {
      const dateA = new Date((a as any).updated_at || a.created_at).getTime();
      const dateB = new Date((b as any).updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

    if (opts?.search) {
      const search = opts.search.toLowerCase();
      movies = movies.filter(m => m.title.toLowerCase().includes(search));
    }
    // Update local caches
    const cacheKey = JSON.stringify(opts || {});
    moviesListCache.set(cacheKey, { data: movies, timestamp: Date.now() });
    onUpdate(movies);
  }, (error) => {
    console.error("Firestore movies subscription error:", error);
    if (onError) onError(error);
  });
}


/**
 * Live catalog search used by the header search box.
 * It loads the published catalog, then performs case-insensitive substring
 * matching so a single word can match every post containing that word.
 */
let searchCatalogCache: { data: Movie[]; timestamp: number } | null = null;

export async function fetchSearchMovies(searchTerm: string): Promise<Movie[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  try {
    const now = Date.now();
    // Reuse the catalog briefly while the user types. This avoids a Firestore
    // read on every search keystroke and makes the header feel instant.
    if (!searchCatalogCache || now - searchCatalogCache.timestamp > 60_000) {
      const moviesRef = collection(db, "movies");
      const snapshot = await getDocs(query(moviesRef, orderBy("updated_at", "desc")));
      searchCatalogCache = {
        data: snapshot.docs
          .map(mapMovie)
          .filter((m) => (m as any).status !== "draft"),
        timestamp: now,
      };
    }

    return searchCatalogCache.data.filter((m) => m.title.toLowerCase().includes(term));
  } catch (error) {
    console.error("Error fetching live search results:", error);
    return [];
  }
}

export async function fetchMovies(opts?: { genre?: string; featured?: boolean; search?: string; type?: ContentType; onlyPublished?: boolean; language?: string; trendingOnly?: boolean; limitCount?: number }) {
  const cacheKey = JSON.stringify(opts || {});
  const cached = moviesListCache.get(cacheKey);
  // Public movie lists should refresh quickly enough to pick up newly published posts,
  // while still avoiding a Firestore request on every render. Admin data bypasses this cache.
  const cacheTtl = opts?.onlyPublished === false ? 0 : 30_000;

  if (cacheTtl > 0 && cached && Date.now() - cached.timestamp < cacheTtl) return cached.data;

  try {
    const moviesRef = collection(db, "movies");
    const requestedLimit = opts?.limitCount || 24;
    // Keep the Firestore query ordered by created_at, but read a small safety window
    // when public results are filtered for drafts. This prevents a few draft records
    // near the top from hiding newly published posts from "New Release".
    const initialQueryLimit = opts?.onlyPublished
      ? Math.min(Math.max(requestedLimit * 4, requestedLimit), Math.max(100, requestedLimit))
      : Math.max(requestedLimit, 100);

      const buildQuery = (queryLimit: number) => {
      // Slider/Featured is intentionally unbounded: every post explicitly marked
      // as Featured must remain available to the homepage until the admin turns
      // Featured off. Other public lists keep their safety limit.
      if (opts?.featured) {
        return query(moviesRef, where("is_featured", "==", true));
      }

      // Latest Release includes every content category, but never download the
      // entire movies collection on the homepage. Ordering by updated_at keeps
      // edited older posts at the top while the limit prevents large catalogs
      // from causing UI/network stalls.
      if (!opts?.genre && !opts?.type && !opts?.language && !opts?.trendingOnly) {
        return query(moviesRef, orderBy("updated_at", "desc"), limit(queryLimit));
      }

      let nextQuery = query(moviesRef, limit(queryLimit));

      if (opts?.genre) nextQuery = query(moviesRef, where("genre", "==", opts.genre), limit(queryLimit));
      if (opts?.type) nextQuery = query(moviesRef, where("type", "==", opts.type), limit(queryLimit));
      if (opts?.language) nextQuery = query(moviesRef, where("languages", "array-contains", opts.language), limit(queryLimit));
      if (opts?.trendingOnly) nextQuery = query(moviesRef, where("is_trending", "==", true), limit(queryLimit));

      return nextQuery;
    };

    let snapshot = await getDocs(buildQuery(initialQueryLimit));
    let movies = snapshot.docs.map(mapMovie);

    // Client-side filtering is retained for compatibility with older records that
    // may not have a status field. Public/admin-created records use "published".
    if (opts?.onlyPublished) {
      movies = movies.filter(m => (m as any).status !== "draft");

      // If drafts consumed part of the first safety window, expand once more so the
      // requested number of published posts can still be returned in newest-first order.
      if (movies.length < requestedLimit && snapshot.docs.length === initialQueryLimit && initialQueryLimit < 100) {
        const expandedLimit = Math.min(initialQueryLimit * 2, 100);
        snapshot = await getDocs(buildQuery(expandedLimit));
        movies = snapshot.docs.map(mapMovie).filter(m => (m as any).status !== "draft");
      }
    }

    // Sort manually in memory so the newest published content always stays first.
    movies.sort((a, b) => {
      const dateA = new Date((a as any).updated_at || a.created_at).getTime();
      const dateB = new Date((b as any).updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

    // Bounded public queries honor their requested size. Featured/Slider is
    // deliberately unbounded so no manually selected slider post disappears.
    if (!opts?.featured) {
      movies = movies.slice(0, requestedLimit);
    }

    if (opts?.search) {
      const search = opts.search.toLowerCase();
      movies = movies.filter(m => m.title.toLowerCase().includes(search));
    }

    moviesListCache.set(cacheKey, { data: movies, timestamp: Date.now() });
    return movies;
  } catch (error) {
    console.error("Error fetching movies:", error);
    throw error;
  }
}

export const movieCache = new Map<string, any>();
export const moviesListCache = new Map<string, any>();


export function subscribeToMovie(id: string, onUpdate: (movie: any) => void): Unsubscribe {
  return onSnapshot(doc(db, "movies", id), async (movieDoc) => {
    if (!movieDoc.exists()) {
      onUpdate(null);
      return;
    }

    const movieData = mapMovie(movieDoc);

    // Parallel fetch sub-collections (we don't subscribe to these to save connections, but refetch on main doc change)
    const [serversSnapshot, seasonsSnapshot] = await Promise.all([
      getDocs(collection(db, `movies/${id}/servers`)),
      getDocs(query(collection(db, `movies/${id}/seasons`)))
    ]);

    const movie_servers = serversSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const seasons = (await Promise.all(seasonsSnapshot.docs.map(async (sDoc) => {
      const episodesSnapshot = await getDocs(query(collection(db, `movies/${id}/seasons/${sDoc.id}/episodes`)));
      const episodes = episodesSnapshot.docs
        .map(eDoc => ({ id: eDoc.id, ...eDoc.data() }))
        .sort((a: any, b: any) => episodeSortKey(a.episode_number) - episodeSortKey(b.episode_number));
      // Only expose seasons that contain at least one usable play or download link.
      const hasUsableEpisode = episodes.some((episode: any) =>
        Boolean(episode.url || episode.video_url || episode.download_url || episode.download)
      );
      if (!hasUsableEpisode) return null;
      return {
        id: sDoc.id,
        ...sDoc.data(),
        episodes
      };
    }))).filter(Boolean);

    const result = {
      ...movieData,
      movie_servers,
      seasons
    };
    
    movieCache.set(id, { data: result, timestamp: Date.now() });
    onUpdate(result);
  }, (error) => {
    console.error("Firestore movie subscription error:", error);
  });
}

export async function fetchMovie(id: string) {
  const cached = movieCache.get(id);
  if (cached && Date.now() - cached.timestamp < 300000) return cached.data;

  try {
    const movieDoc = await getDoc(doc(db, "movies", id));
    if (!movieDoc.exists()) return null;

    const movieData = mapMovie(movieDoc);

    // Parallel fetch sub-collections
    const [serversSnapshot, seasonsSnapshot] = await Promise.all([
      getDocs(collection(db, `movies/${id}/servers`)),
      getDocs(query(collection(db, `movies/${id}/seasons`)))
    ]);

    const movie_servers = serversSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const seasons = (await Promise.all(seasonsSnapshot.docs.map(async (sDoc) => {
      const episodesSnapshot = await getDocs(query(collection(db, `movies/${id}/seasons/${sDoc.id}/episodes`)));
      const episodes = episodesSnapshot.docs
        .map(eDoc => ({ id: eDoc.id, ...eDoc.data() }))
        .sort((a: any, b: any) => episodeSortKey(a.episode_number) - episodeSortKey(b.episode_number));
      // Only expose seasons that contain at least one usable play or download link.
      const hasUsableEpisode = episodes.some((episode: any) =>
        Boolean(episode.url || episode.video_url || episode.download_url || episode.download)
      );
      if (!hasUsableEpisode) return null;
      return {
        id: sDoc.id,
        ...sDoc.data(),
        episodes
      };
    }))).filter(Boolean);

    const result = {
      ...movieData,
      movie_servers,
      seasons
    };
    
    movieCache.set(id, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error("Error fetching movie:", error);
    throw error;
  }
}

// Global helper for Admin Panel to fetch full data for editing
if (typeof window !== 'undefined') {
  (window as any).fetchMovieWithSubcollections = fetchMovie;
}

// Bumps a movie/series' view counter by 1. Called once per page open from
// the movie detail page. Fails silently (a missed view shouldn't ever break
// the page for a visitor) and never throws.
export async function incrementMovieView(id: string) {
  if (!id) return;
  try {
    await updateDoc(doc(db, "movies", id), {
      view_count: increment(1),
    });
    // Keep any cached copy of this movie roughly in sync so an admin
    // navigating right after doesn't see a stale count.
    const cached = movieCache.get(id);
    if (cached?.data) {
      cached.data.view_count = (cached.data.view_count || 0) + 1;
    }
  } catch (error) {
    console.error("Error incrementing view count:", error);
  }
}

export async function deleteMovie(id: string) {
  try {
    // Firestore batches are limited to 500 writes. A large series can easily
    // exceed that when its episodes/servers are deleted together, so delete
    // in safe chunks and only remove the parent movie after its children.
    const refsToDelete: any[] = [];

    const serversSnap = await getDocs(collection(db, `movies/${id}/servers`));
    refsToDelete.push(...serversSnap.docs.map((d) => d.ref));

    const seasonsSnap = await getDocs(collection(db, `movies/${id}/seasons`));
    for (const seasonDoc of seasonsSnap.docs) {
      const epsSnap = await getDocs(collection(db, `movies/${id}/seasons/${seasonDoc.id}/episodes`));
      refsToDelete.push(...epsSnap.docs.map((d) => d.ref));
      refsToDelete.push(seasonDoc.ref);
    }

    refsToDelete.push(doc(db, "movies", id));

    for (let i = 0; i < refsToDelete.length; i += 450) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 450).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    movieCache.delete(id);
    moviesListCache.clear();
  } catch (error) {
    console.error("Error deleting movie:", error);
    throw error;
  }
}

// Most-viewed published posts (highest view_count first), used by the
// homepage "Top Watch" row.
export async function fetchTopWatched(count = 10): Promise<Movie[]> {
  try {
    // Read a safety window so drafts near the top can't shrink the result.
    const snapshot = await getDocs(
      query(collection(db, "movies"), orderBy("view_count", "desc"), limit(Math.max(count * 3, 30))),
    );
    return snapshot.docs
      .map(mapMovie)
      .filter((m) => (m as any).status !== "draft" && m.view_count > 0)
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, count);
  } catch (error) {
    console.error("Error fetching top watched:", error);
    return [];
  }
}
