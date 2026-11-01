import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

const BASE_URL = "https://anivoflix.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/movies", changefreq: "daily", priority: "0.9" },
          { path: "/series", changefreq: "daily", priority: "0.9" },
          { path: "/browse", changefreq: "daily", priority: "0.8" },
          { path: "/search", changefreq: "weekly", priority: "0.5" },
        ];

        try {
          const snap = await getDocs(query(collection(db, "movies"), orderBy("updated_at", "desc")));
          snap.forEach((docSnap) => {
            const m = docSnap.data() as { updated_at?: { toDate?: () => Date } | string };
            const raw = m.updated_at;
            const lastmod =
              raw && typeof raw === "object" && typeof raw.toDate === "function"
                ? raw.toDate().toISOString()
                : raw
                  ? new Date(raw as string).toISOString()
                  : undefined;
            entries.push({
              path: `/movie/${docSnap.id}`,
              lastmod,
              changefreq: "weekly",
              priority: "0.7",
            });
          });
        } catch {
          // If DB is unreachable at build/request time, still serve the static routes.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
