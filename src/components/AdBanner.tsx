import { useEffect, useRef } from "react";
import { getAdCode, mountAdCode } from "@/lib/adGate";

/**
 * Visible banner slot controlled from the admin panel.
 * Renders nothing unless the slot is enabled and has code.
 */
export function AdBanner({ adKey }: { adKey: "banner_top" | "banner_bottom" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    getAdCode(adKey).then((code) => {
      if (cancelled || !code || !el) return;
      el.innerHTML = "";
      mountAdCode(el, code);
    });
    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [adKey]);

  return <div ref={ref} className="w-full flex justify-center overflow-hidden empty:hidden" />;
}
