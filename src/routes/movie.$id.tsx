import { createFileRoute } from "@tanstack/react-router";
import {
  MoviePage,
  movieLoader,
  movieHead,
  MovieDetailErrorComponent,
  MovieDetailNotFoundComponent,
} from "@/components/movie-detail/MovieDetailPage";

// Legacy/default detail URL. Kept working alongside the category-specific
// routes below (movies.$id.tsx, series.$id.tsx, etc.) so any link ever
// shared as /movie/<id> keeps working.
export const Route = createFileRoute("/movie/$id")({
  loader: movieLoader,
  head: movieHead,
  component: MoviePage,
  errorComponent: MovieDetailErrorComponent,
  notFoundComponent: MovieDetailNotFoundComponent,
});
