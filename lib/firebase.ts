import { initializeApp } from "firebase/app"
import {
  getAuth,
  onAuthStateChanged as onAuthStateChangedFirebase,
  createUserWithEmailAndPassword as createUserWithEmailAndPasswordFirebase,
  signInWithEmailAndPassword as signInWithEmailAndPasswordFirebase,
  signInWithPopup as signInWithPopupFirebase,
  signOut as signOutFirebase,
  updateProfile as updateProfileFirebase,
  GoogleAuthProvider,
  type User,
} from "firebase/auth"
import {
  getFirestore,
  doc as docFirebase,
  setDoc as setDocFirebase,
  getDoc as getDocFirebase,
  updateDoc as updateDocFirebase,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"

// Initialize Firebase only on client side
let app: any = null
let auth: any = null
let db: any = null
let googleProvider: any = null

if (typeof window !== "undefined") {
  const firebaseConfig = {
    apiKey: "AIzaSyCvIhy5tUEeLjRKgZbJ5n5qDh5-nSFoaYA",
    authDomain: "cryingmap-ac135.firebaseapp.com",
    projectId: "cryingmap-ac135",
    storageBucket: "cryingmap-ac135.firebasestorage.app",
    messagingSenderId: "41181872008",
    appId: "1:41181872008:web:3a6ccc7e02a707f53d843d",
    measurementId: "G-W8CSWRCFXS",
  }

  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  googleProvider = new GoogleAuthProvider()
}

export function getFirebase() {
  return { auth, db, googleProvider }
}

export const onAuthStateChanged = onAuthStateChangedFirebase
export const createUserWithEmailAndPassword = createUserWithEmailAndPasswordFirebase
export const signInWithEmailAndPassword = signInWithEmailAndPasswordFirebase
export const signInWithPopup = signInWithPopupFirebase
export const signOut = signOutFirebase
export const updateProfile = updateProfileFirebase

export const doc = docFirebase
export const setDoc = setDocFirebase
export const getDoc = getDocFirebase
export const updateDoc = updateDocFirebase

export {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
}

export async function ensureUserDoc(user: User, username?: string) {
  if (!db) return

  const userRef = docFirebase(db, "users", user.uid)
  const userSnap = await getDocFirebase(userRef)

  if (!userSnap.exists()) {
    const userData = {
      uid: user.uid,
      email: user.email,
      username: username || user.displayName || user.email?.split("@")[0] || "user",
      displayName: user.displayName || username || user.email?.split("@")[0] || "user",
      createdAt: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString(),
      stats: {
        cries: 0,
        following: 0,
        followers: 0,
        countries: 0,
        avgRating: 0,
        totalLikes: 0,
        totalComments: 0,
      },
      achievements: {},
      privacySettings: {},
      subscriptionType: "free",
      isPremium: false,
      isAdFree: false,
      adFreePurchaseDate: null,
      premiumType: null,
      premiumStartDate: null,
      premiumEndDate: null,
      nameColor: "#FF6B35",
      selectedTheme: "default",
      badges: [],
      permanentAdFree: false,
    }

    await setDocFirebase(userRef, userData)
  }
}
