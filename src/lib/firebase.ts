import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDc1rooAJUFTESaK5skv2xpzsr1t-riyRY",
  authDomain: "anivoflix.firebaseapp.com",
  projectId: "anivoflix",
  storageBucket: "anivoflix.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BP8v9pU2Kz9fD5Yp6gNnC5B6mR7b9gHkL1xZz2qQ",
      });
      if (token) return token;
    }
  } catch (error) {
    console.error("Firebase Messaging error:", error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

