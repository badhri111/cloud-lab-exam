/**
 * Cloud Database Abstraction Client for College Library Management System
 * 
 * Supports:
 *  1. Google Cloud Firestore (Serverless NoSQL, Scale-to-Zero, 0 Fixed Cost)
 *  2. Cloud REST API (Express / MongoDB Atlas / Vercel Functions)
 *  3. Local Cloud-Simulation (Resilient persistent fallback for lab testing)
 */

const SAMPLE_BOOKS_SEED = [
  {
    id: "book-1",
    isbn: "978-0132143011",
    title: "Distributed Systems: Concepts and Design (5th Edition)",
    author: "George Coulouris, Jean Dollimore, Tim Kindberg, Gordon Blair",
    category: "Computer Science",
    publisher: "Pearson Education",
    year: 2012,
    shelfLocation: "Rack CS-01, Shelf A",
    totalCopies: 8,
    availableCopies: 6,
    description: "Comprehensive coverage of distributed algorithms, cloud computing principles, P2P networks, and virtualization.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-2",
    isbn: "978-0262033848",
    title: "Introduction to Algorithms (CLRS 3rd Edition)",
    author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
    category: "Computer Science",
    publisher: "MIT Press",
    year: 2009,
    shelfLocation: "Rack CS-02, Shelf B",
    totalCopies: 12,
    availableCopies: 2,
    description: "Essential reference for algorithms, data structures, graph theory, NP-completeness, and multithreaded algorithms.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-3",
    isbn: "978-0134092669",
    title: "Cloud Computing: Concepts, Technology & Architecture",
    author: "Thomas Erl, Ricardo Puttini, Zaigham Mahmood",
    category: "Information Technology",
    publisher: "Prentice Hall",
    year: 2014,
    shelfLocation: "Rack IT-01, Shelf C",
    totalCopies: 6,
    availableCopies: 5,
    description: "Definitive guide on cloud delivery models (IaaS, PaaS, SaaS), serverless architectures, and multi-tenant scaling.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-4",
    isbn: "978-1449373320",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    category: "Data Science & AI",
    publisher: "O'Reilly Media",
    year: 2017,
    shelfLocation: "Rack DS-03, Shelf A",
    totalCopies: 5,
    availableCopies: 0,
    description: "The big ideas behind reliable, scalable, and maintainable systems: replication, partitioning, and stream processing.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-5",
    isbn: "978-0131873254",
    title: "Software Engineering: A Practitioner's Approach",
    author: "Roger S. Pressman, Bruce R. Maxim",
    category: "Software Engineering",
    publisher: "McGraw Hill",
    year: 2019,
    shelfLocation: "Rack SE-01, Shelf D",
    totalCopies: 10,
    availableCopies: 8,
    description: "Standard college textbook for software engineering life cycles, agile methodologies, and quality assurance.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-6",
    isbn: "978-0134685991",
    title: "Effective Java (3rd Edition)",
    author: "Joshua Bloch",
    category: "Computer Science",
    publisher: "Addison-Wesley",
    year: 2018,
    shelfLocation: "Rack CS-03, Shelf C",
    totalCopies: 7,
    availableCopies: 1,
    description: "Best practice guide for modern Java programming, concurrency, lambdas, and design patterns.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "book-7",
    isbn: "978-0134670959",
    title: "Operating Systems: Internals and Design Principles",
    author: "William Stallings",
    category: "Computer Science",
    publisher: "Pearson",
    year: 2018,
    shelfLocation: "Rack CS-04, Shelf A",
    totalCopies: 9,
    availableCopies: 9,
    description: "In-depth treatment of process management, thread scheduling, memory virtualization, and file systems.",
    updatedAt: new Date().toISOString()
  }
];

class CloudDatabaseService {
  constructor() {
    this.STORAGE_KEY = "psg_library_books_v1";
    this.MODE_KEY = "psg_library_backend_mode";
    this.REST_URL_KEY = "psg_library_rest_url";
    this.FIREBASE_CONFIG_KEY = "psg_library_firebase_config";

    this.currentMode = localStorage.getItem(this.MODE_KEY) || "LOCAL_SIMULATION";
    this.restBaseUrl = localStorage.getItem(this.REST_URL_KEY) || "http://localhost:5000/api/books";
    this.firestoreInitialized = false;

    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      this.resetToSampleData();
    }
  }

  resetToSampleData() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(SAMPLE_BOOKS_SEED));
    return [...SAMPLE_BOOKS_SEED];
  }

  getMode() {
    return this.currentMode;
  }

  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem(this.MODE_KEY, mode);
  }

  setRestBaseUrl(url) {
    this.restBaseUrl = url.replace(/\/+$/, "");
    localStorage.setItem(this.REST_URL_KEY, this.restBaseUrl);
  }

  getRestBaseUrl() {
    return this.restBaseUrl;
  }

  /**
   * READ: Fetch all book records
   */
  async getAllBooks() {
    if (this.currentMode === "FIRESTORE" && window.firestoreClient && window.firestoreClient.isReady()) {
      try {
        return await window.firestoreClient.getAllBooks();
      } catch (err) {
        console.warn("Firestore fetch error, falling back to local simulation:", err);
      }
    }

    if (this.currentMode === "REST_API") {
      try {
        const response = await fetch(this.restBaseUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.data || data;
      } catch (err) {
        console.warn("REST API fetch error, falling back to local simulation:", err);
      }
    }

    // Default: Local Cloud Simulation
    await this.simulateCloudLatency();
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * READ: Fetch single book record by ID
   */
  async getBookById(id) {
    if (this.currentMode === "FIRESTORE" && window.firestoreClient && window.firestoreClient.isReady()) {
      return await window.firestoreClient.getBookById(id);
    }

    if (this.currentMode === "REST_API") {
      const response = await fetch(`${this.restBaseUrl}/${id}`);
      if (!response.ok) throw new Error("Book not found in Cloud Database");
      const data = await response.json();
      return data.data || data;
    }

    await this.simulateCloudLatency();
    const books = await this.getAllBooks();
    const found = books.find((b) => b.id === id);
    if (!found) throw new Error("Book not found in Cloud Database");
    return found;
  }

  /**
   * CREATE: Add new book record
   */
  async addBook(bookData) {
    const newBook = {
      ...bookData,
      id: bookData.id || "book-" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      totalCopies: parseInt(bookData.totalCopies, 10) || 1,
      availableCopies: parseInt(bookData.availableCopies, 10) || 0,
      year: parseInt(bookData.year, 10) || new Date().getFullYear(),
      updatedAt: new Date().toISOString()
    };

    // Validation
    if (newBook.availableCopies > newBook.totalCopies) {
      throw new Error("Available copies cannot exceed total copies owned.");
    }

    if (this.currentMode === "FIRESTORE" && window.firestoreClient && window.firestoreClient.isReady()) {
      return await window.firestoreClient.addBook(newBook);
    }

    if (this.currentMode === "REST_API") {
      const response = await fetch(this.restBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBook)
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to add book (${response.status})`);
      }
      const created = await response.json();
      return created.data || created;
    }

    await this.simulateCloudLatency();
    const books = await this.getAllBooks();
    // Check duplicate ISBN
    const duplicate = books.find((b) => b.isbn.trim().toLowerCase() === newBook.isbn.trim().toLowerCase());
    if (duplicate) {
      throw new Error(`A book with ISBN ${newBook.isbn} already exists: "${duplicate.title}"`);
    }

    books.unshift(newBook);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
    return newBook;
  }

  /**
   * UPDATE: Update book record
   */
  async updateBook(id, updateData) {
    const totalCopies = parseInt(updateData.totalCopies, 10);
    const availableCopies = parseInt(updateData.availableCopies, 10);

    if (availableCopies > totalCopies) {
      throw new Error("Available copies cannot exceed total copies owned.");
    }

    if (this.currentMode === "FIRESTORE" && window.firestoreClient && window.firestoreClient.isReady()) {
      return await window.firestoreClient.updateBook(id, updateData);
    }

    if (this.currentMode === "REST_API") {
      const response = await fetch(`${this.restBaseUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to update book (${response.status})`);
      }
      const res = await response.json();
      return res.data || res;
    }

    await this.simulateCloudLatency();
    const books = await this.getAllBooks();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) throw new Error("Book record not found.");

    const updated = {
      ...books[index],
      ...updateData,
      id,
      totalCopies,
      availableCopies,
      year: parseInt(updateData.year, 10) || books[index].year,
      updatedAt: new Date().toISOString()
    };

    books[index] = updated;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
    return updated;
  }

  /**
   * DELETE: Remove book record
   */
  async deleteBook(id) {
    if (this.currentMode === "FIRESTORE" && window.firestoreClient && window.firestoreClient.isReady()) {
      return await window.firestoreClient.deleteBook(id);
    }

    if (this.currentMode === "REST_API") {
      const response = await fetch(`${this.restBaseUrl}/${id}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to delete book (${response.status})`);
      }
      return true;
    }

    await this.simulateCloudLatency();
    const books = await this.getAllBooks();
    const filtered = books.filter((b) => b.id !== id);
    if (filtered.length === books.length) {
      throw new Error("Book record not found.");
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * ISSUE BOOK: Decrements available copies by 1
   */
  async issueBook(id) {
    const book = await this.getBookById(id);
    if (!book) throw new Error("Book not found.");
    if (book.availableCopies <= 0) {
      throw new Error(`Cannot issue book: "${book.title}" is currently OUT OF STOCK.`);
    }

    const updated = await this.updateBook(id, {
      ...book,
      availableCopies: book.availableCopies - 1
    });

    return updated;
  }

  /**
   * RETURN BOOK: Increments available copies by 1
   */
  async returnBook(id) {
    const book = await this.getBookById(id);
    if (!book) throw new Error("Book not found.");
    if (book.availableCopies >= book.totalCopies) {
      throw new Error(`Cannot return book: All ${book.totalCopies} registered copies are already on the shelf.`);
    }

    const updated = await this.updateBook(id, {
      ...book,
      availableCopies: book.availableCopies + 1
    });

    return updated;
  }

  /**
   * Simulates cloud network roundtrip latency (100 - 250ms)
   */
  simulateCloudLatency() {
    return new Promise((resolve) => setTimeout(resolve, 120));
  }
}

// Global Singleton Instance
window.cloudDb = new CloudDatabaseService();
