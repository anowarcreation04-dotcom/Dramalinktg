import { 
  collection, 
  getDocs, 
  doc, 
  query, 
  where, 
  deleteDoc, 
  setDoc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";

export type AdSetting = {
  key: string;
  code: string;
  is_enabled: boolean;
  position: "top" | "bottom" | null;
  type: "injection" | "banner";
};

export async function fetchAds() {
  try {
    const snapshot = await getDocs(collection(db, "ads_settings"));
    return snapshot.docs.map(d => ({ key: d.id, ...d.data() })) as AdSetting[];
  } catch (error) {
    console.error("Error fetching ads:", error);
    return [];
  }
}

export async function saveAd(ad: AdSetting) {
  const { key, ...data } = ad;
  await setDoc(doc(db, "ads_settings", key), data);
}

export async function deleteAd(key: string) {
  await deleteDoc(doc(db, "ads_settings", key));
}
