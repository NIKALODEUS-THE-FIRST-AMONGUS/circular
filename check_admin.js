import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAdmin() {
  const q = query(collection(db, "profiles"), where("email", "==", "admin@test.com"));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No profile found for admin@test.com");
    return;
  }
  snap.forEach(doc => {
    console.log("Profile Data:", JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  });
}

checkAdmin().catch(console.error);
