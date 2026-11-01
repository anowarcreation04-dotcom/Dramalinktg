export const POPUNDER_AD_SNIPPET =
  '<script src="https://pl28801838.profitableratecpmnetwork.com/0b/99/08/0b9908b59a350225fca21e5960cf3409.js"></script>';

export const DEFAULT_DIRECT_LINK_PLAYER = "https://omg10.com/4/9952290";
export const DEFAULT_DIRECT_LINK_DOWNLOAD_TELEGRAM =
  "https://www.profitableratecpmnetwork.com/apwc0p5hb?key=b6f67e83f420f8866a0416190f5239fd";

/**
 * Loads the single configured Popunder placement on public pages.
 *
 * Ad scripts are appended as real script elements. Putting scripts inside
 * innerHTML does not execute them in browsers, which was the main reason the
 * previous popunder implementation could silently do nothing.
 */
export function isPopunderLoaded(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[data-anivoflix-popunder-loader="true"]'));
}

// ---------------------------------------------------------------------------
// Two-network Popunder (e.g. Adsterra + Monetag), shown one after the other.
//
// The first network's script loads with the page. As soon as a popunder seems
// to have fired (the page goes to the background right after a tap), the other
// network's script is loaded on the same page, so the visitor's NEXT tap can
// show the other network's ad. Only one network is active at a time at the
// start, so two popunders never open on the same first tap.
// A loaded ad script can't be unloaded, so set a frequency cap (e.g. once per
// few minutes) inside each network's own dashboard so the first one does not
// fire again right after the second one starts.
// ---------------------------------------------------------------------------
// true: each page load starts with a random network (fair split of impressions)
// false: always start with "Popunder" (network 1), then "Popunder 2"
const POPUNDER_RANDOM_FIRST = true;

// Each placement is inserted as a real <script> node. This is important for
// third-party ad code because script tags inside innerHTML do not run.
function loadPopunderCode(code: string): void {
  for (const source of extractScripts(code)) {
    const script = document.createElement("script");
    script.dataset.anivoflixPopunderScript = "true";

    for (const [name, value] of Object.entries(source.attributes)) {
      if (name !== "src") script.setAttribute(name, value);
    }

    if (source.src) {
      script.src = source.src;
      script.async = false;
    } else {
      script.textContent = source.content;
    }

    document.body.appendChild(script);
  }
}

// Calls onFire once when the page goes to the background within a moment of a
// tap, which is what happens when a popunder opens (or the visitor leaves).
function watchForPopunderFire(onFire: () => void): void {
  let lastTap = 0;
  let done = false;

  const markTap = () => {
    lastTap = Date.now();
  };
  const onHide = () => {
    if (done) return;
    if (document.visibilityState === "hidden" && Date.now() - lastTap < 2500) {
      done = true;
      document.removeEventListener("pointerdown", markTap, true);
      document.removeEventListener("visibilitychange", onHide);
      onFire();
    }
  };

  document.addEventListener("pointerdown", markTap, true);
  document.addEventListener("visibilitychange", onHide);
}

export async function injectGlobalPopunderAds(): Promise<() => void> {
  if (typeof document === "undefined") return () => {};

  // Prevent duplicate injection across route changes on the public app.
  if (document.querySelector('[data-anivoflix-popunder-loader="true"]')) {
    return () => {};
  }

  const marker = document.createElement("meta");
  marker.dataset.anivoflixPopunderLoader = "true";
  document.head.appendChild(marker);

  // Network 1: the original "Popunder" setting (default code if never saved).
  let primary: string | null = POPUNDER_AD_SNIPPET;
  // Network 2: optional "Popunder 2" setting; only used when saved AND active.
  let secondary: string | null = null;

  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const [snapA, snapB] = await Promise.all([
      getDoc(doc(db, "ads_settings", "popunder")),
      getDoc(doc(db, "ads_settings", "popunder_2")).catch(() => null),
    ]);

    const dataA = snapA.exists() ? snapA.data() : null;
    if (dataA) {
      if (dataA.is_enabled === false) {
        // Admin turned network 1 OFF.
        primary = null;
      } else if (typeof dataA.code === "string" && dataA.code.trim()) {
        primary = dataA.code.trim();
      }
    }

    const dataB = snapB && snapB.exists() ? snapB.data() : null;
    if (dataB && dataB.is_enabled === true && typeof dataB.code === "string" && dataB.code.trim()) {
      secondary = dataB.code.trim();
    }
  } catch (error) {
    console.error("Failed to load Popunder settings; using default:", error);
  }

  const codes = [primary, secondary].filter((c): c is string => Boolean(c));
  if (codes.length === 0) return () => {};

  // Only one network is active: behave exactly like before.
  if (codes.length === 1) {
    loadPopunderCode(codes[0]);
    return () => {};
  }

  // Two networks: load one now, and the other right after the first one's ad
  // has been shown.
  const firstIndex = POPUNDER_RANDOM_FIRST && Math.random() < 0.5 ? 1 : 0;
  const secondIndex = firstIndex === 0 ? 1 : 0;
  loadPopunderCode(codes[firstIndex]);
  watchForPopunderFire(() => loadPopunderCode(codes[secondIndex]));

  // Do not remove the third-party ad script during SPA route changes. Many
  // popunder providers register listeners/timers on window and removing the
  // tag immediately can disable the placement after navigation.
  return () => {};
}

/**
 * Fetches the two configurable Direct Link ad URLs (Player, and
 * Download + Telegram) from Firestore, falling back to the known-good
 * defaults if an admin record is missing/disabled/empty.
 */
export async function getDirectLinkUrls(): Promise<{ player: string | null; downloadTelegram: string | null }> {
  const result: { player: string | null; downloadTelegram: string | null } = {
    player: DEFAULT_DIRECT_LINK_PLAYER,
    downloadTelegram: DEFAULT_DIRECT_LINK_DOWNLOAD_TELEGRAM,
  };

  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    const [playerSnap, dtSnap] = await Promise.all([
      getDoc(doc(db, "ads_settings", "direct_link_player")),
      getDoc(doc(db, "ads_settings", "direct_link_download_telegram")),
    ]);

    // Admin switch OFF => null => no ad redirect at all.
    const playerData = playerSnap.exists() ? playerSnap.data() : null;
    if (playerData) {
      if (playerData.is_enabled === false) result.player = null;
      else if (typeof playerData.code === "string" && playerData.code.trim()) result.player = playerData.code.trim();
    }

    const dtData = dtSnap.exists() ? dtSnap.data() : null;
    if (dtData) {
      if (dtData.is_enabled === false) result.downloadTelegram = null;
      else if (typeof dtData.code === "string" && dtData.code.trim()) result.downloadTelegram = dtData.code.trim();
    }
  } catch (error) {
    console.error("Failed to load Direct Link settings; using defaults:", error);
  }

  return result;
}

const DIRECT_LINK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Gates a Play/Download/Telegram button click behind a Direct Link ad.
 *
 * First click on a given button (or first click after the 5-minute cooldown
 * expires) navigates the SAME tab to the Direct Link ad instead of running
 * the real action. Within 5 minutes of that click, further clicks on that
 * exact button run the real action directly (no ad), matching "click once
 * for the ad, click again for the destination" per-button behavior.
 */
export function runGatedClick(buttonKey: string, directLinkUrl: string | null, action: () => void): void {
  // Ad disabled from the admin panel: just run the real action.
  if (!directLinkUrl || typeof window === "undefined") {
    action();
    return;
  }

  const storageKey = `anivoflix_adgate_${buttonKey}`;

  try {
    const stored = window.localStorage.getItem(storageKey);
    const lastTriggeredAt = stored ? Number(stored) : 0;
    const withinCooldown = lastTriggeredAt > 0 && Date.now() - lastTriggeredAt < DIRECT_LINK_COOLDOWN_MS;

    if (withinCooldown) {
      action();
      return;
    }

    window.localStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // If localStorage is unavailable, fail open and just run the action.
    action();
    return;
  }

  window.location.href = directLinkUrl;
}

/**
 * Reads one admin-controlled ad slot. Returns the code ONLY if the record
 * exists, is enabled and is not empty. Disabled / missing => null (no ad).
 */
export async function getAdCode(key: string): Promise<string | null> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const snap = await getDoc(doc(db, "ads_settings", key));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.is_enabled !== true) return null;
    if (typeof data.code !== "string" || !data.code.trim()) return null;
    return data.code.trim();
  } catch (error) {
    console.error(`Failed to load ad "${key}":`, error);
    return null;
  }
}

/**
 * Puts admin-entered ad code (HTML and/or <script>) inside a container.
 * <script> tags are re-created as real elements so they actually execute
 * (scripts added through innerHTML never run).
 */
export function mountAdCode(container: HTMLElement, code: string): void {
  if (typeof document === "undefined") return;
  const tpl = document.createElement("template");
  // Plain JavaScript without any tag: wrap it in a script.
  tpl.innerHTML = /<[a-z!][\s\S]*>/i.test(code) ? code : `<script>${code}</script>`;

  tpl.content.querySelectorAll("script").forEach((old) => {
    const fresh = document.createElement("script");
    for (const attr of Array.from(old.attributes)) fresh.setAttribute(attr.name, attr.value);
    if (old.src) fresh.async = false;
    else fresh.textContent = old.textContent;
    old.replaceWith(fresh);
  });

  container.appendChild(tpl.content);
}

let globalAdsInjected = false;

/**
 * Injects the Head / Post Head / Body / Social Bar placements configured
 * in the admin panel. Only enabled placements are loaded.
 */
export async function injectGlobalPageAds(): Promise<void> {
  if (typeof document === "undefined" || globalAdsInjected) return;
  globalAdsInjected = true;

  const [head, postHead, body, socialBar] = await Promise.all([
    getAdCode("head"),
    getAdCode("post_head"),
    getAdCode("body"),
    getAdCode("social_bar"),
  ]);

  const place = (code: string | null, name: string, parent: HTMLElement, atStart = false) => {
    if (!code) return;
    const holder = document.createElement("div");
    holder.dataset.anivoflixAd = name;
    holder.style.display = "contents";
    if (atStart && parent.firstChild) parent.insertBefore(holder, parent.firstChild);
    else parent.appendChild(holder);
    mountAdCode(holder, code);
  };

  place(head, "head", document.head);
  place(postHead, "post_head", document.body, true);
  place(body, "body", document.body);
  place(socialBar, "social_bar", document.body);
}

type ScriptSource = {
  src?: string;
  content: string;
  attributes: Record<string, string>;
};

function extractScripts(code: string): ScriptSource[] {
  const trimmed = code.trim();
  const results: ScriptSource[] = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(trimmed))) {
    const attrText = match[1] || "";
    const attributes: Record<string, string> = {};
    const attrRegex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrText))) {
      attributes[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
    }

    results.push({
      src: attributes.src,
      content: match[2] || "",
      attributes,
    });
  }

  // Also support an admin-entered raw JavaScript snippet.
  if (results.length === 0 && trimmed) {
    results.push({ content: trimmed, attributes: {} });
  }

  return results;
}

// Kept as a no-op compatibility export for older imports. The site no longer
// injects the separate OneClick flow; only the two Popunder placements run.
export function clearOneClickAdArtifacts(): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll('script[data-anivoflix-one-click="true"], script[data-anivoflix-global-one-click="true"]')
    .forEach((node) => node.remove());
}

export function triggerOneClickAd(): void {
  // Intentionally disabled: the public site now uses only the two Popunders.
}

export function injectGlobalOneClickAd(): () => void {
  return () => {};
}
