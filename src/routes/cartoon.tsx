import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy compatibility route: Cartoon was removed from the site UI and replaced by Anime.
// Existing bookmarks to /cartoon are sent to the Anime category.
export const Route = createFileRoute("/cartoon")({
  beforeLoad: () => {
    throw redirect({ to: "/anime" });
  },
});
