// Rename to firebase-messaging-sw.js and insert your Firebase web config.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'YOUR_KEY',authDomain:'YOUR_DOMAIN',projectId:'YOUR_PROJECT_ID',storageBucket:'YOUR_BUCKET',messagingSenderId:'YOUR_SENDER_ID',appId:'YOUR_APP_ID'});
firebase.messaging();
