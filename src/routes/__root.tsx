import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { SplashScreen } from "@/components/SplashScreen";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { injectGlobalPopunderAds, injectGlobalPageAds, isPopunderLoaded } from "@/lib/adGate";
import { AdBanner } from "@/components/AdBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DramaLinkTG — Stream Movies in the Neon Age" },
      { name: "description", content: "Discover, watch and collect cinematic experiences on DramaLinkTG. Cyberpunk-styled streaming built for the future." },
      { name: "theme-color", content: "#0d0e12" },
      { property: "og:site_name", content: "DramaLinkTG" },
      { property: "og:title", content: "DramaLinkTG — Stream Movies in the Neon Age" },
      { property: "og:description", content: "Discover, watch and collect cinematic experiences on DramaLinkTG. Cyberpunk-styled streaming built for the future." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://dramalinktg.anowarcreation04.workers.dev/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DramaLinkTG — Stream Movies in the Neon Age" },
      { name: "twitter:description", content: "Discover, watch and collect cinematic experiences on DramaLinkTG. Cyberpunk-styled streaming built for the future." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "dns-prefetch", href: "https://api.themoviedb.org" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Baloo+Da+2:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem('neonflix:theme');var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t==='light'?'light':'dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
      },
      // Capture the browser's "install app" event as early as possible so the
      // footer "Get the App" button can use it (it can fire before React loads).
      {
        children: `window.__anivoInstallPrompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__anivoInstallPrompt=e;});window.addEventListener('appinstalled',function(){window.__anivoInstallPrompt=null;});`,
      },
      // NOTE: the one-click/popunder ad tags used to live here as raw
      // <head>-level scripts, which meant they loaded on EVERY route
      // including /admin and /adminpanell (this __root head() is merged
      // into every page). They are now injected at runtime from
      // RootComponent below, gated by `isAdminPage`, so the admin panel
      // stays ad-free while the public site behaves the same as before.
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "DramaLinkTG",
          url: "https://dramalinktg.anowarcreation04.workers.dev/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "DramaLinkTG",
          url: "https://dramalinktg.anowarcreation04.workers.dev/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://dramalinktg.anowarcreation04.workers.dev/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useRouterState({ select: (s) => s.location });
  const isAdminPage = pathname.startsWith("/adminpanell") || pathname.startsWith("/admin");
  
  // Post pages (/$id and /movie/$id): the Popunder never loads there (neither
  // on page open nor from the Related section). All other public pages load it
  // normally.
  const isPostPage = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/$id" || m.routeId === "/movie/$id"),
  });

  // A third-party popunder script can't be unloaded once it has run, so if it
  // was already loaded earlier in this session (e.g. user came from the home
  // page via in-app navigation) we do one full reload of the post page so it
  // starts clean.
  useEffect(() => {
    if (typeof window === "undefined" || isAdminPage) return;

    if (isPostPage) {
      if (isPopunderLoaded()) window.location.reload();
      return;
    }

    let cleanup: (() => void) | undefined;
    void injectGlobalPopunderAds().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, [isAdminPage, isPostPage]);

  // Head / Post Head / Body / Social Bar placements are unchanged.
  useEffect(() => {
    if (typeof window === "undefined" || isAdminPage) return;
    void injectGlobalPageAds();
  }, [isAdminPage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Defer notification setup so it never competes with the main content
    // for bandwidth/CPU on first load — this was a big source of slowness
    // on slower mobile connections.
    const run = () => {
      import("@/lib/firebase").then(({ requestForToken, onMessageListener }) => {
        requestForToken();
        onMessageListener().then((payload) => {
          console.log("Message received: ", payload);
        });
      });
    };
    const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => number);
    const id = ric ? ric(run) : window.setTimeout(run, 3000);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />
      {!isAdminPage && <AdBanner adKey="banner_top" />}
      <Outlet />
      {!isAdminPage && <AdBanner adKey="banner_bottom" />}
      {!isAdminPage && <Footer />}
      {!isAdminPage && <BottomNav />}
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
