import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, ExternalLink, Sparkles, X } from "lucide-react";
import { fetchNotices } from "@/lib/notices";

const HEAD_FONT = { fontFamily: "'Baloo Da 2', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" } as const;
const BODY_FONT = { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" } as const;

// Lives only in memory: it resets on every fresh visit or page reload, so the
// notice shows again each time someone enters the site. It only stays closed
// while the visitor keeps browsing inside the same open session.
let dismissedThisVisit = false;

export function NoticeBoard() {
  const [dismissed, setDismissed] = useState(dismissedThisVisit);

  const { data } = useQuery({
    queryKey: ["site", "notices"],
    queryFn: fetchNotices,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (!data || !data.is_enabled) return null;
  const items = data.items.filter((i) => i.is_active && (i.title.trim() || i.text.trim()));
  if (items.length === 0) return null;

  if (dismissed) return null;

  const dismiss = () => {
    dismissedThisVisit = true;
    setDismissed(true);
  };

  return (
    <section className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-5">
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-500/[0.08] to-white/[0.02] shadow-[0_0_40px_-12px_rgba(168,85,247,0.45)]">
        <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-purple-600/20 blur-3xl" />

        <button
          type="button"
          onClick={dismiss}
          aria-label="নোটিশ বন্ধ করুন"
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 transition hover:bg-pink-500/20 hover:text-white hover:border-pink-400/40 active:scale-90"
        >
          <X size={16} />
        </button>

        <div className="relative flex items-center gap-3 pl-5 pr-14 pt-5 pb-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-pink-500/30">
            <Megaphone size={18} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-pink-500 ring-2 ring-[#0a0a0f]" />
            </span>
          </div>
          <div className="min-w-0">
            <h2 style={HEAD_FONT} className="bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-2xl sm:text-3xl font-extrabold leading-tight tracking-normal text-transparent break-words">
              {data.headline}
            </h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-400" />
          </div>
        </div>

        <ul className="relative space-y-2.5 px-3 pb-3 sm:px-4 sm:pb-4">
          {items.map((n, idx) => (
            <li
              key={n.id}
              className="group relative flex gap-3 rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 backdrop-blur-sm transition hover:border-purple-400/30 hover:bg-black/40"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/80 to-pink-500/80 text-[11px] font-black text-white">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                {n.title.trim() && (
                  <p style={HEAD_FONT} className="flex items-start gap-1.5 text-[17px] sm:text-xl font-bold leading-tight tracking-normal text-white break-words">
                    <Sparkles size={15} className="mt-1.5 shrink-0 text-pink-400" />
                    <span>{n.title}</span>
                  </p>
                )}
                {n.text.trim() && (
                  <p style={BODY_FONT} className="text-[15px] sm:text-base font-medium leading-[1.75] tracking-normal text-white/75 whitespace-pre-line break-words">
                    {n.text}
                  </p>
                )}
                {n.link_url.trim() && (
                  <a
                    style={BODY_FONT}
                    href={n.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1.5 text-[13px] font-bold text-white shadow-md shadow-pink-600/25 transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
                  >
                    {n.link_label.trim() || "বিস্তারিত দেখুন"}
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
