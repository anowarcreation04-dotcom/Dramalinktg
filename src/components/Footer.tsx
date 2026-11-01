import { Facebook, Send, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import dramaLogo from "@/assets/dramalinktg-logo.svg";
import { db } from "@/lib/firebase";

const DEFAULT_SOCIALS = {
  facebook: "https://facebook.com/groups/DramaWorldBD",
  telegram: "https://t.me/addlist/U6W7xf_GYgMyMThl",
  whatsapp: "https://wa.me/8801000000000",
};

const DEFAULT_FOOTER_CONTENT = {
  about: "About DramaLinkTG",
  contact: "Contact us through our official social channels.",
  privacy: "Your privacy matters to us.",
  terms: "By using DramaLinkTG, you agree to our terms of service.",
};

type Social = {
  href: string;
  label: string;
  icon: typeof Facebook;
  color: string;
  glow: string;
};

type FooterKey = keyof typeof DEFAULT_FOOTER_CONTENT;

export function Footer() {
  const [links, setLinks] = useState(DEFAULT_SOCIALS);
  const [footerContent, setFooterContent] = useState(DEFAULT_FOOTER_CONTENT);
  const [activePage, setActivePage] = useState<FooterKey | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDoc(doc(db, "site_settings", "social_links")),
      getDoc(doc(db, "site_settings", "footer_content")),
    ])
      .then(([socialSnap, footerSnap]) => {
        if (!active) return;
        if (socialSnap.exists()) {
          const data = socialSnap.data();
          setLinks((current) => ({
            facebook: data.facebook || current.facebook,
            telegram: data.telegram || current.telegram,
            whatsapp: data.whatsapp || current.whatsapp,
          }));
        }
        if (footerSnap.exists()) {
          const data = footerSnap.data();
          setFooterContent((current) => ({
            about: typeof data.about === "string" ? data.about : current.about,
            contact: typeof data.contact === "string" ? data.contact : current.contact,
            privacy: typeof data.privacy === "string" ? data.privacy : current.privacy,
            terms: typeof data.terms === "string" ? data.terms : current.terms,
          }));
        }
      })
      .catch((error) => console.error("Failed to load footer settings", error));
    return () => { active = false; };
  }, []);

  const socials: Social[] = [
    { href: links.facebook, label: "Facebook Group", icon: Facebook, color: "#1877F2", glow: "24,119,242" },
    { href: links.telegram, label: "Telegram Channel", icon: Send, color: "#26A5E4", glow: "38,165,228" },
    { href: links.whatsapp, label: "WhatsApp Group", icon: MessageCircle, color: "#25D366", glow: "37,211,102" },
  ];

  return (
    <>
      <footer className="mt-8 bg-background border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 min-h-[320px] flex flex-col items-center justify-center gap-4 text-center">
          <img src={dramaLogo} alt="DramaLinkTG" className="h-16 sm:h-20 md:h-24 w-auto max-w-[280px] object-contain drop-shadow-[0_0_35px_rgba(168,85,247,0.55)]" />

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-1 w-full max-w-[260px] sm:max-w-sm">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="group flex flex-col items-center justify-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1 py-1.5 text-white/80 hover:text-white transition-all hover:-translate-y-0.5"
                style={{ ["--sc" as string]: s.color, ["--sg" as string]: s.glow }}
              >
                <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center border border-white/10 bg-black/40 transition-all group-hover:border-[color:var(--sc)] group-hover:bg-[color:var(--sc)]/15 group-hover:shadow-[0_0_20px_rgba(var(--sg),0.42)]">
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider leading-tight">{s.label}</span>
              </a>
            ))}
          </div>

          <p className="font-display font-medium leading-snug tracking-tight max-w-2xl mt-4 text-sm sm:text-base md:text-lg text-white/80">
            Stream your favorite movies &amp; series.<br />
            Pick up where you left off, anytime.<br />
            Switch servers with a single tap.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-white/50">
            {(Object.keys(DEFAULT_FOOTER_CONTENT) as FooterKey[]).map((key) => (
              <button key={key} type="button" onClick={() => setActivePage(key)} className="hover:text-pink-300 transition-colors">
                {key}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-white/40 mt-2 uppercase tracking-widest">© {new Date().getFullYear()} DramaLinkTG — All rights reserved</p>
        </div>
      </footer>

      {activePage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={activePage}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-bold uppercase tracking-wider text-white">{activePage}</h2>
              <button type="button" onClick={() => setActivePage(null)} aria-label="Close" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(80vh-70px)] overflow-y-auto px-5 py-6 text-sm leading-7 text-white/75 whitespace-pre-wrap">
              {footerContent[activePage]}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
