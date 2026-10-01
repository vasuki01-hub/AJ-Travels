import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  terminate,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPqFG7ssGq1ko4fo_Z7X0E5iNf2itDGUA",
  authDomain: "aj-travels-7ae50.firebaseapp.com",
  projectId: "aj-travels-7ae50",
  storageBucket: "aj-travels-7ae50.firebasestorage.app",
  messagingSenderId: "90484382183",
  appId: "1:90484382183:web:bf499841b2c27b815dc542",
  measurementId: "G-4XDB27Y4CZ"
};

const app = initializeApp(firebaseConfig);
// Firebase Analytics removed to prevent unhandled promise rejections (200.js errors)

window.Firebase = {
  app,
  auth: getAuth(app),
  db: getFirestore(app),
  terminate,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc
};

window.dispatchEvent(new Event('firebase-ready'));
