// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getStorage, ref } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBZP4kNQQ3P64kJDMZit_blizapfoBzLas",
    authDomain: "nft-collections-7f143.firebaseapp.com",
    projectId: "nft-collections-7f143",
    storageBucket: "nft-collections-7f143.appspot.com",
    messagingSenderId: "796524096657",
    appId: "1:796524096657:web:dd9f10740e922226c9a330",
    measurementId: "G-R73HP6DZYN"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);