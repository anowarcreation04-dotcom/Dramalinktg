import { Link } from "@tanstack/react-router";
import { House, Clapperboard, MonitorPlay, Sparkles, LayoutGrid } from "lucide-react";

type NavItem = {
  to: "/" | "/movies" | "/series" | "/library" | "/anime" | "/tv-shows" | "/mini-drama" | "/serial";
  label: string;
  icon: typeof House;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/movies", label: "Movie", icon: Clapperboard },
  { to: "/series", label: "Series", icon: MonitorPlay },
  { to: "/mini-drama", label: "Mini Drama", icon: Sparkles },
];

/**
 * Fixed bottom navigation — glass surface, hover glow, active gradient pill.
 * Center slot: oversized Telegram CTA linking to the channel.
 * Mobile only (md+ uses header sidebar).
 */
export function BottomNav() {
  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-black/60 backdrop-blur-none border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          <NavLinkItem item={navItems[0]} />
          <NavLinkItem item={navItems[1]} />
          
          <div className="flex justify-center -translate-y-1">
            <Link
              to="/library"
              className="group relative flex flex-col items-center justify-center transition-all"
            >
              <div className="absolute inset-0 bg-pink-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full scale-150" />
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <div className="p-2.5 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 border border-white/20 shadow-[0_0_20px_rgba(236,72,153,0.4)] group-hover:scale-110 transition-all duration-300">
                  <LayoutGrid
                    className="h-5 w-5 text-white transition-transform duration-300 group-hover:-rotate-12 group-hover:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-[7px] font-black uppercase tracking-[0.1em] text-pink-400 group-hover:text-pink-300 transition-colors mt-0.5">
                  Library
                </span>
              </div>
            </Link>
          </div>

          <NavLinkItem item={navItems[2]} />
          <NavLinkItem item={navItems[3]} />
        </div>
      </nav>
      <div className="h-16 md:hidden pb-safe" aria-hidden />
    </>
  );
}

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.to}
      activeOptions={item.exact ? { exact: true } : undefined}
      activeProps={{
        className:
          "group relative flex flex-col items-center justify-center h-full w-full",
      }}
      className="group relative flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white transition-all h-full w-full"
    >
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-data-[status=active]:opacity-100 transition-opacity" />
      
      {/* Active Indicator Bar - At the Bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-pink-500 rounded-t-full opacity-0 group-data-[status=active]:opacity-100 transition-opacity shadow-[0_-2px_10px_rgba(236,72,153,0.5)]" />

      <div className="relative z-10">
        <item.icon
          className="h-5 w-5 transition-all duration-300 group-hover:-translate-y-0.5 group-data-[status=active]:text-pink-500 group-data-[status=active]:drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]"
          strokeWidth={2.5}
        />
      </div>
      <span className="relative z-10 text-[9px] font-bold uppercase tracking-wider group-data-[status=active]:text-white transition-colors">
        {item.label}
      </span>
    </Link>
  );
}
