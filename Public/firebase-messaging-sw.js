importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDcxQG3bBZziMtUR4usMp-wtwhBdkE5lHc",
  authDomain: "dramalinktg.firebaseapp.com",
  projectId: "dramalinktg",
  storageBucket: "dramalinktg.firebasestorage.app",
  messagingSenderId: "506843084188",
  appId: "1:506843084188:web:9f1a61051ef52401a04459",
  measurementId: "G-T7J3WD2XTF"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});