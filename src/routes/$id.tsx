import { createFileRoute } from "@tanstack/react-router";
import {
  MoviePage,
  movieLoader,
  movieHead,
  MovieDetailErrorComponent,
  MovieDetailNotFoundComponent,
} from "@/components/movie-detail/MovieDetailPage";

// Public share URL: https://anivoflix.com/<post-id>
// A single top-level dynamic route avoids category-specific route conflicts.
export const Route = createFileRoute("/$id")({
  loader: movieLoader,
  head: movieHead,
  component: MoviePage,
  errorComponent: MovieDetailErrorComponent,
  notFoundComponent: MovieDetailNotFoundComponent,
});
