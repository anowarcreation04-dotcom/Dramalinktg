import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type NoticeItem = {
  id: string;
  title: string;
  text: string;
  link_url: string;
  link_label: string;
  is_active: boolean;
};

export type NoticeSettings = {
  is_enabled: boolean;
  headline: string;
  items: NoticeItem[];
};

export const DEFAULT_NOTICES: NoticeSettings = {
  is_enabled: false,
  headline: "নোটিশ",
  items: [],
};

const NOTICE_DOC = ["site_settings", "notices"] as const;

export async function fetchNotices(): Promise<NoticeSettings> {
  try {
    const snap = await getDoc(doc(db, ...NOTICE_DOC));
    if (!snap.exists()) return DEFAULT_NOTICES;
    const d = snap.data();
    return {
      is_enabled: !!d.is_enabled,
      headline: typeof d.headline === "string" ? d.headline : DEFAULT_NOTICES.headline,
      items: Array.isArray(d.items)
        ? d.items.map((i: any, idx: number) => ({
            id: String(i?.id ?? idx),
            title: String(i?.title ?? ""),
            text: String(i?.text ?? ""),
            link_url: String(i?.link_url ?? ""),
            link_label: String(i?.link_label ?? ""),
            is_active: i?.is_active !== false,
          }))
        : [],
    };
  } catch (error) {
    console.error("Failed to load notices:", error);
    return DEFAULT_NOTICES;
  }
}

export async function saveNotices(settings: NoticeSettings) {
  await setDoc(doc(db, ...NOTICE_DOC), {
    ...settings,
    updated_at: serverTimestamp(),
  });
}

export async function setNoticesEnabled(is_enabled: boolean) {
  await setDoc(doc(db, ...NOTICE_DOC), { is_enabled, updated_at: serverTimestamp() }, { merge: true });
}

export const DEFAULT_DESCRIPTION_HEADING = "নোট";

export async function fetchDescriptionHeading(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "site_settings", "description_box"));
    const h = snap.exists() ? snap.data().heading : null;
    return typeof h === "string" && h.trim() ? h.trim() : DEFAULT_DESCRIPTION_HEADING;
  } catch (error) {
    console.error("Failed to load description heading:", error);
    return DEFAULT_DESCRIPTION_HEADING;
  }
}

export async function saveDescriptionHeading(heading: string) {
  await setDoc(
    doc(db, "site_settings", "description_box"),
    { heading: heading.trim() || DEFAULT_DESCRIPTION_HEADING, updated_at: serverTimestamp() },
    { merge: true },
  );
}
