import { useEffect, useState } from "react";
import dramaLogo from "@/assets/dramalinktg-logo.svg";

const KEY = "anivoflix-splash-date";

/** Full-screen splash shown once per calendar day per browser. */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem(KEY);
      if (last === today) return;
      localStorage.setItem(KEY, today);
      setVisible(true);
      const fadeT = setTimeout(() => setFading(true), 500);
      const hideT = setTimeout(() => setVisible(false), 700);
      return () => {
        clearTimeout(fadeT);
        clearTimeout(hideT);
      };
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d0e12] transition-opacity duration-150 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25),transparent_60%)]"
      />
      <img
        src={dramaLogo}
        alt="DramaLinkTG"
        className="relative h-24 sm:h-36 md:h-44 w-auto drop-shadow-[0_0_40px_rgba(236,72,153,0.6)] animate-[splashIn_0.45s_ease-out]"
      />
      <style>{`
        @keyframes splashIn {
          0% { opacity: 0; transform: scale(0.85); filter: blur(8px); }
          60% { opacity: 1; transform: scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
