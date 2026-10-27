/**
 * Firebase Modular Web SDK v10 Integration for Cloud Firestore
 * Fully Serverless Cloud Database with $0 Fixed Cost & Auto-Scaling
 */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

class FirestoreCloudClient {
  constructor() {
    this.app = null;
    this.db = null;
    this.COLLECTION_NAME = "library_books";
    this.ready = false;

    this.initFromSavedConfig();
  }

  isReady() {
    return this.ready && this.db !== null;
  }

  initFromSavedConfig() {
    const savedConfig = localStorage.getItem("psg_library_firebase_config");
    if (savedConfig) {
      try {
        const configObj = JSON.parse(savedConfig);
        this.initializeWithConfig(configObj);
      } catch (e) {
        console.warn("Could not parse saved Firebase config:", e);
      }
    }
  }

  initializeWithConfig(config) {
    try {
      if (!config || !config.projectId) {
        throw new Error("Invalid Firebase Configuration: 'projectId' is required.");
      }

      const existingApps = getApps();
      this.app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
      this.db = getFirestore(this.app);
      this.ready = true;
      localStorage.setItem("psg_library_firebase_config", JSON.stringify(config));
      console.log("Connected successfully to Google Cloud Firestore [Project: " + config.projectId + "]");
      return true;
    } catch (err) {
      this.ready = false;
      this.db = null;
      console.error("Firebase initialization failed:", err);
      throw err;
    }
  }

  async getAllBooks() {
    if (!this.isReady()) throw new Error("Cloud Firestore is not initialized.");
    const booksRef = collection(this.db, this.COLLECTION_NAME);
    const q = query(booksRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    const books = [];
    snapshot.forEach((docSnap) => {
      books.push({ id: docSnap.id, ...docSnap.data() });
    });
    return books;
  }

  async getBookById(id) {
    if (!this.isReady()) throw new Error("Cloud Firestore is not initialized.");
    const docRef = doc(this.db, this.COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Book not found in Cloud Firestore.");
    return { id: snap.id, ...snap.data() };
  }

  async addBook(bookData) {
    if (!this.isReady()) throw new Error("Cloud Firestore is not initialized.");
    const id = bookData.id || "book-" + Date.now();
    const docRef = doc(this.db, this.COLLECTION_NAME, id);
    await setDoc(docRef, { ...bookData, id });
    return { ...bookData, id };
  }

  async updateBook(id, updateData) {
    if (!this.isReady()) throw new Error("Cloud Firestore is not initialized.");
    const docRef = doc(this.db, this.COLLECTION_NAME, id);
    await updateDoc(docRef, { ...updateData, updatedAt: new Date().toISOString() });
    return { ...updateData, id };
  }

  async deleteBook(id) {
    if (!this.isReady()) throw new Error("Cloud Firestore is not initialized.");
    const docRef = doc(this.db, this.COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  }
}

// Attach to window
window.firestoreClient = new FirestoreCloudClient();
