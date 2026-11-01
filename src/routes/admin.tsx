import { createFileRoute } from "@tanstack/react-router";
import { AdminContent } from "./adminpanell";

export const Route = createFileRoute("/admin")({
  component: AdminContent,
});
