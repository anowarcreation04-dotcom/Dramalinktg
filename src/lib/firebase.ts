import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDcxQG3bBZziMtUR4usMp-wtwhBdkE5lHc",
  authDomain: "dramalinktg.firebaseapp.com",
  projectId: "dramalinktg",
  storageBucket: "dramalinktg.firebasestorage.app",
  messagingSenderId: "506843084188",
  appId: "1:506843084188:web:9f1a61051ef52401a04459",
  measurementId: "G-T7J3WD2XTF"
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
        vapidKey: "YOUR_VAPID_KEY",
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

