// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// 🔴 여기에 아까 Firebase 사이트에서 복사한 본인의 설정 코드를 덮어씌우세요!
// (apiKey, authDomain 등등 들어있는 부분)
const firebaseConfig = {
  apiKey: "AIzaSyAle9zTJ1EMJfK3uqCiEjQp2aTk14WbfX4",
  authDomain: "egg-break-412ae.firebaseapp.com",
  databaseURL: "https://egg-break-412ae-default-rtdb.firebaseio.com",
  projectId: "egg-break-412ae",
  storageBucket: "egg-break-412ae.firebasestorage.app",
  messagingSenderId: "916101940082",
  appId: "1:916101940082:web:b649703c0f4a07533bd3eb",
  measurementId: "G-RPBD2LFVY3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);