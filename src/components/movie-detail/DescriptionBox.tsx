import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_DESCRIPTION_HEADING, fetchDescriptionHeading } from "@/lib/notices";
import { AlignLeft, ChevronDown } from "lucide-react";

const HEAD_FONT = { fontFamily: "'Baloo Da 2', 'Hind Siliguri', 'Noto Sans Bengali', sans-serif" } as const;
const BODY_FONT = { fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif" } as const;

const LONG_TEXT_LIMIT = 220;

export function DescriptionBox({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: heading = DEFAULT_DESCRIPTION_HEADING } = useQuery({
    queryKey: ["site", "description-heading"],
    queryFn: fetchDescriptionHeading,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const content = text.trim();
  if (!content) return null;

  const isLong = content.length > LONG_TEXT_LIMIT;

  return (
    <div className="relative mt-4 max-w-2xl overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-500/[0.08] to-white/[0.02] p-4 sm:p-5 shadow-[0_0_30px_-12px_rgba(168,85,247,0.45)]">
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-pink-500/15 blur-3xl" />

      <div className="relative mb-2.5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-md shadow-pink-500/25">
          <AlignLeft size={16} className="text-white" />
        </span>
        <div>
          <h3
            style={HEAD_FONT}
            className="bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-lg font-extrabold leading-tight text-transparent"
          >
            {heading}
          </h3>
          <div className="mt-0.5 h-0.5 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-400" />
        </div>
      </div>

      <p
        style={BODY_FONT}
        className={`relative text-[15px] sm:text-base font-medium leading-[1.8] text-white/80 whitespace-pre-line break-words ${
          isLong && !expanded ? "line-clamp-4" : ""
        }`}
      >
        {content}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={BODY_FONT}
          className="relative mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[13px] font-bold text-pink-300 transition hover:border-pink-400/40 hover:bg-pink-400/10 active:scale-95"
        >
          {expanded ? "কম দেখুন" : "আরও দেখুন"}
          <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
