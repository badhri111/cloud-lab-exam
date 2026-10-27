/**
 * Main Application Controller for College Library Management System
 * Handles UI events, CRUD interactions, filtering, search, and dashboard metrics.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const booksTableBody = document.getElementById("booksTableBody");
  const cardViewContainer = document.getElementById("cardViewContainer");
  const tableViewContainer = document.getElementById("tableViewContainer");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const categoryFilter = document.getElementById("categoryFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const sortBySelect = document.getElementById("sortBySelect");

  // KPI elements
  const totalTitlesCount = document.getElementById("totalTitlesCount");
  const totalCopiesCount = document.getElementById("totalCopiesCount");
  const availableCopiesCount = document.getElementById("availableCopiesCount");
  const issuedCopiesCount = document.getElementById("issuedCopiesCount");
  const lowStockCount = document.getElementById("lowStockCount");
  const displayedCount = document.getElementById("displayedCount");
  const totalCountInFilter = document.getElementById("totalCountInFilter");

  // Cloud Status
  const cloudStatusPill = document.getElementById("cloudStatusPill");
  const cloudStatusText = document.getElementById("cloudStatusText");

  // View Toggles
  const tableViewBtn = document.getElementById("tableViewBtn");
  const cardViewBtn = document.getElementById("cardViewBtn");

  // Modals
  const bookFormModal = document.getElementById("bookFormModal");
  const bookForm = document.getElementById("bookForm");
  const formModalTitle = document.getElementById("formModalTitle");
  const openAddModalBtn = document.getElementById("openAddModalBtn");
  const closeFormModalBtn = document.getElementById("closeFormModalBtn");
  const cancelFormModalBtn = document.getElementById("cancelFormModalBtn");
  const emptyStateAddBtn = document.getElementById("emptyStateAddBtn");

  const viewDetailsModal = document.getElementById("viewDetailsModal");
  const viewModalBody = document.getElementById("viewModalBody");
  const closeViewModalBtn = document.getElementById("closeViewModalBtn");
  const closeViewModalFooterBtn = document.getElementById("closeViewModalFooterBtn");
  const editFromViewBtn = document.getElementById("editFromViewBtn");

  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const deleteBookTitle = document.getElementById("deleteBookTitle");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
  const cancelDeleteModalBtn = document.getElementById("cancelDeleteModalBtn");

  const cloudConfigModal = document.getElementById("cloudConfigModal");
  const openCloudConfigBtn = document.getElementById("openCloudConfigBtn");
  const closeCloudModalBtn = document.getElementById("closeCloudModalBtn");
  const closeCloudModalFooterBtn = document.getElementById("closeCloudModalFooterBtn");
  const resetCatalogBtn = document.getElementById("resetCatalogBtn");

  // Cloud config tabs & forms
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const firebaseConfigJson = document.getElementById("firebaseConfigJson");
  const saveFirestoreConfigBtn = document.getElementById("saveFirestoreConfigBtn");
  const restApiUrlInput = document.getElementById("restApiUrlInput");
  const saveRestConfigBtn = document.getElementById("saveRestConfigBtn");
  const activateLocalModeBtn = document.getElementById("activateLocalModeBtn");

  // Application State
  let allBooks = [];
  let currentView = "table"; // 'table' or 'card'
  let bookToDeleteId = null;
  let currentViewingBook = null;

  // Initialize
  init();

  async function init() {
    updateCloudStatusBadge();
    setupEventListeners();
    await loadBooks();
  }

  function updateCloudStatusBadge() {
    const mode = window.cloudDb.getMode();
    const indicator = cloudStatusPill.querySelector(".status-indicator");

    indicator.className = "status-indicator online";
    if (mode === "FIRESTORE") {
      cloudStatusText.textContent = "Cloud DB: Firestore (Serverless)";
    } else if (mode === "REST_API") {
      cloudStatusText.textContent = "Cloud DB: REST API (Atlas)";
    } else {
      cloudStatusText.textContent = "Cloud DB: Local Simulation (Ready)";
    }
  }

  function setupEventListeners() {
    // Search & Filter Listeners
    searchInput.addEventListener("input", () => {
      clearSearchBtn.style.display = searchInput.value ? "block" : "none";
      renderBooks();
    });

    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearSearchBtn.style.display = "none";
      renderBooks();
    });

    categoryFilter.addEventListener("change", renderBooks);
    availabilityFilter.addEventListener("change", renderBooks);
    sortBySelect.addEventListener("change", renderBooks);

    // View Switching
    tableViewBtn.addEventListener("click", () => {
      currentView = "table";
      tableViewBtn.classList.add("active");
      cardViewBtn.classList.remove("active");
      tableViewContainer.style.display = "block";
      cardViewContainer.style.display = "none";
      renderBooks();
    });

    cardViewBtn.addEventListener("click", () => {
      currentView = "card";
      cardViewBtn.classList.add("active");
      tableViewBtn.classList.remove("active");
      tableViewContainer.style.display = "none";
      cardViewContainer.style.display = "grid";
      renderBooks();
    });

    // Add Book Modal Open
    const openAddHandler = () => {
      bookForm.reset();
      document.getElementById("bookIdInput").value = "";
      formModalTitle.innerHTML = '<i class="fa-solid fa-book-medical"></i> Add New Book Record';
      // Default year to current
      document.getElementById("bookYearInput").value = new Date().getFullYear();
      bookFormModal.style.display = "flex";
      document.getElementById("bookTitleInput").focus();
    };

    openAddModalBtn.addEventListener("click", openAddHandler);
    emptyStateAddBtn.addEventListener("click", openAddHandler);

    // Close Form Modal
    const closeFormHandler = () => {
      bookFormModal.style.display = "none";
    };
    closeFormModalBtn.addEventListener("click", closeFormHandler);
    cancelFormModalBtn.addEventListener("click", closeFormHandler);

    // Book Form Submission (Create / Update)
    bookForm.addEventListener("submit", handleSaveBook);

    // Close View Details Modal
    const closeViewHandler = () => {
      viewDetailsModal.style.display = "none";
      currentViewingBook = null;
    };
    closeViewModalBtn.addEventListener("click", closeViewHandler);
    closeViewModalFooterBtn.addEventListener("click", closeViewHandler);
    editFromViewBtn.addEventListener("click", () => {
      if (currentViewingBook) {
        closeViewHandler();
        openEditModal(currentViewingBook);
      }
    });

    // Delete Confirmation Modal
    const closeDeleteHandler = () => {
      deleteConfirmModal.style.display = "none";
      bookToDeleteId = null;
    };
    closeDeleteModalBtn.addEventListener("click", closeDeleteHandler);
    cancelDeleteModalBtn.addEventListener("click", closeDeleteHandler);
    confirmDeleteBtn.addEventListener("click", handleConfirmDelete);

    // Cloud DB Config Modal
    cloudStatusPill.addEventListener("click", openCloudConfigModal);
    openCloudConfigBtn.addEventListener("click", openCloudConfigModal);
    closeCloudModalBtn.addEventListener("click", () => (cloudConfigModal.style.display = "none"));
    closeCloudModalFooterBtn.addEventListener("click", () => (cloudConfigModal.style.display = "none"));

    // Reset Demo Records
    resetCatalogBtn.addEventListener("click", async () => {
      if (confirm("Reset library catalog back to default sample textbooks?")) {
        window.cloudDb.resetToSampleData();
        showToast("Catalog reset to sample college textbooks.", "info");
        await loadBooks();
      }
    });

    // Tab Navigation inside Cloud Settings
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add("active");
      });
    });

    // Save Firestore Config
    saveFirestoreConfigBtn.addEventListener("click", () => {
      const val = firebaseConfigJson.value.trim();
      if (!val) {
        showToast("Please paste a valid Firebase configuration JSON.", "warning");
        return;
      }
      try {
        const parsed = JSON.parse(val);
        if (window.firestoreClient) {
          window.firestoreClient.initializeWithConfig(parsed);
          window.cloudDb.setMode("FIRESTORE");
          updateCloudStatusBadge();
          showToast("Connected to Google Cloud Firestore!", "success");
          cloudConfigModal.style.display = "none";
          loadBooks();
        }
      } catch (e) {
        showToast("Invalid JSON syntax: " + e.message, "error");
      }
    });

    // Save REST Config
    saveRestConfigBtn.addEventListener("click", () => {
      const url = restApiUrlInput.value.trim();
      if (!url) {
        showToast("Please enter a valid REST API URL.", "warning");
        return;
      }
      window.cloudDb.setRestBaseUrl(url);
      window.cloudDb.setMode("REST_API");
      updateCloudStatusBadge();
      showToast("Configured Cloud REST API endpoint.", "success");
      cloudConfigModal.style.display = "none";
      loadBooks();
    });

    // Activate Local Mode
    activateLocalModeBtn.addEventListener("click", () => {
      window.cloudDb.setMode("LOCAL_SIMULATION");
      updateCloudStatusBadge();
      showToast("Switched to Local Cloud-Simulation mode.", "info");
      cloudConfigModal.style.display = "none";
      loadBooks();
    });

    // Modal background click to close
    window.addEventListener("click", (e) => {
      if (e.target === bookFormModal) closeFormHandler();
      if (e.target === viewDetailsModal) closeViewHandler();
      if (e.target === deleteConfirmModal) closeDeleteHandler();
      if (e.target === cloudConfigModal) cloudConfigModal.style.display = "none";
    });
  }

  function openCloudConfigModal() {
    restApiUrlInput.value = window.cloudDb.getRestBaseUrl();
    const savedFirebase = localStorage.getItem("psg_library_firebase_config");
    if (savedFirebase) {
      try {
        firebaseConfigJson.value = JSON.stringify(JSON.parse(savedFirebase), null, 2);
      } catch (e) {
        firebaseConfigJson.value = savedFirebase;
      }
    }
    cloudConfigModal.style.display = "flex";
  }

  // ==================== DATA FETCH & RENDERING ====================

  async function loadBooks() {
    try {
      allBooks = await window.cloudDb.getAllBooks();
      updateDashboardKPIs();
      renderBooks();
    } catch (err) {
      showToast("Failed to fetch books: " + err.message, "error");
      console.error(err);
    }
  }

  function updateDashboardKPIs() {
    const totalTitles = allBooks.length;
    let totalCopies = 0;
    let availableCopies = 0;
    let lowStockCountNum = 0;

    allBooks.forEach((book) => {
      const total = parseInt(book.totalCopies, 10) || 0;
      const avail = parseInt(book.availableCopies, 10) || 0;
      totalCopies += total;
      availableCopies += avail;

      if (avail <= 2) {
        lowStockCountNum++;
      }
    });

    const issuedCopies = Math.max(0, totalCopies - availableCopies);

    totalTitlesCount.textContent = totalTitles.toLocaleString();
    totalCopiesCount.textContent = totalCopies.toLocaleString();
    availableCopiesCount.textContent = availableCopies.toLocaleString();
    issuedCopiesCount.textContent = issuedCopies.toLocaleString();
    lowStockCount.textContent = lowStockCountNum.toLocaleString();
  }

  function getFilteredAndSortedBooks() {
    const query = searchInput.value.trim().toLowerCase();
    const cat = categoryFilter.value;
    const avail = availabilityFilter.value;
    const sort = sortBySelect.value;

    let filtered = allBooks.filter((book) => {
      // Search text match
      const matchQuery =
        !query ||
        (book.title && book.title.toLowerCase().includes(query)) ||
        (book.author && book.author.toLowerCase().includes(query)) ||
        (book.isbn && book.isbn.toLowerCase().includes(query)) ||
        (book.category && book.category.toLowerCase().includes(query)) ||
        (book.shelfLocation && book.shelfLocation.toLowerCase().includes(query));

      // Category match
      const matchCat = cat === "ALL" || book.category === cat;

      // Availability match
      let matchAvail = true;
      const copies = parseInt(book.availableCopies, 10) || 0;
      if (avail === "AVAILABLE") {
        matchAvail = copies > 2;
      } else if (avail === "LOW") {
        matchAvail = copies > 0 && copies <= 2;
      } else if (avail === "OUT") {
        matchAvail = copies === 0;
      }

      return matchQuery && matchCat && matchAvail;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sort === "title_asc") return a.title.localeCompare(b.title);
      if (sort === "title_desc") return b.title.localeCompare(a.title);
      if (sort === "available_desc") return (b.availableCopies || 0) - (a.availableCopies || 0);
      if (sort === "available_asc") return (a.availableCopies || 0) - (b.availableCopies || 0);
      if (sort === "year_desc") return (b.year || 0) - (a.year || 0);
      return 0;
    });

    return filtered;
  }

  function renderBooks() {
    const books = getFilteredAndSortedBooks();

    displayedCount.textContent = books.length;
    totalCountInFilter.textContent = allBooks.length;

    if (books.length === 0) {
      booksTableBody.innerHTML = "";
      cardViewContainer.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    if (currentView === "table") {
      renderTableView(books);
    } else {
      renderCardView(books);
    }
  }

  function getAvailabilityMetadata(available, total) {
    const avail = parseInt(available, 10) || 0;
    const tot = parseInt(total, 10) || 1;
    const percentage = Math.min(100, Math.max(0, Math.round((avail / tot) * 100)));

    if (avail === 0) {
      return {
        pillClass: "status-out",
        fillClass: "fill-red",
        label: "Out of Stock",
        percentage
      };
    } else if (avail <= 2) {
      return {
        pillClass: "status-low",
        fillClass: "fill-amber",
        label: "Low Stock",
        percentage
      };
    } else {
      return {
        pillClass: "status-available",
        fillClass: "fill-green",
        label: "Available",
        percentage
      };
    }
  }

  function renderTableView(books) {
    booksTableBody.innerHTML = "";

    books.forEach((book) => {
      const availMeta = getAvailabilityMetadata(book.availableCopies, book.totalCopies);
      const isOutOfStock = book.availableCopies <= 0;
      const isFullyStocked = book.availableCopies >= book.totalCopies;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="isbn-badge">${escapeHtml(book.isbn || "N/A")}</span>
        </td>
        <td class="book-title-cell">
          <span class="book-main-title">${escapeHtml(book.title)}</span>
          <span class="book-author-name"><i class="fa-solid fa-user-pen"></i> ${escapeHtml(book.author || "Unknown")}</span>
        </td>
        <td>
          <span class="category-tag">${escapeHtml(book.category || "General")}</span>
        </td>
        <td>
          <span class="shelf-location-tag"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(book.shelfLocation || "Unassigned")}</span>
        </td>
        <td>
          <strong>${book.totalCopies}</strong> copies
        </td>
        <td class="availability-cell">
          <div class="stock-status-pill ${availMeta.pillClass}">
            <i class="fa-solid fa-circle"></i> ${availMeta.label}
          </div>
          <div class="stock-meter">
            <div class="progress-track" title="${book.availableCopies} of ${book.totalCopies} available (${availMeta.percentage}%)">
              <div class="progress-fill ${availMeta.fillClass}" style="width: ${availMeta.percentage}%;"></div>
            </div>
            <span class="copies-fraction">${book.availableCopies} / ${book.totalCopies}</span>
          </div>
        </td>
        <td class="text-center">
          <div class="circulation-btns">
            <button class="btn btn-xs btn-secondary issue-btn" data-id="${book.id}" ${isOutOfStock ? "disabled" : ""} title="${isOutOfStock ? 'No copies available to issue' : 'Issue (Check-out) 1 copy to patron'}">
              <i class="fa-solid fa-arrow-up-from-bracket"></i> Issue
            </button>
            <button class="btn btn-xs btn-secondary return-btn" data-id="${book.id}" ${isFullyStocked ? "disabled" : ""} title="${isFullyStocked ? 'All copies already returned' : 'Return (Check-in) 1 copy to shelf'}">
              <i class="fa-solid fa-arrow-down-to-bracket"></i> Return
            </button>
          </div>
        </td>
        <td class="text-center">
          <div class="action-buttons-group">
            <button class="btn-action-icon view-btn-act" data-id="${book.id}" title="View Details">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-action-icon edit-btn-act" data-id="${book.id}" title="Edit Book">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-action-icon delete-btn-act" data-id="${book.id}" title="Delete Record">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      `;

      // Attach row event listeners
      tr.querySelector(".issue-btn").addEventListener("click", () => handleIssueBook(book.id));
      tr.querySelector(".return-btn").addEventListener("click", () => handleReturnBook(book.id));
      tr.querySelector(".view-btn-act").addEventListener("click", () => handleViewBook(book.id));
      tr.querySelector(".edit-btn-act").addEventListener("click", () => openEditModal(book));
      tr.querySelector(".delete-btn-act").addEventListener("click", () => openDeleteModal(book));

      booksTableBody.appendChild(tr);
    });
  }

  function renderCardView(books) {
    cardViewContainer.innerHTML = "";

    books.forEach((book) => {
      const availMeta = getAvailabilityMetadata(book.availableCopies, book.totalCopies);
      const isOutOfStock = book.availableCopies <= 0;
      const isFullyStocked = book.availableCopies >= book.totalCopies;

      const card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML = `
        <div>
          <div class="card-top">
            <span class="isbn-badge">${escapeHtml(book.isbn || "N/A")}</span>
            <div class="stock-status-pill ${availMeta.pillClass}">
              <i class="fa-solid fa-circle"></i> ${availMeta.label}
            </div>
          </div>
          <h4 class="card-title">${escapeHtml(book.title)}</h4>
          <p class="card-author"><i class="fa-solid fa-user-pen"></i> ${escapeHtml(book.author || "Unknown")}</p>
          
          <div class="card-meta-list">
            <div><strong>Department:</strong> ${escapeHtml(book.category || "General")}</div>
            <div><strong>Location:</strong> <i class="fa-solid fa-location-dot"></i> ${escapeHtml(book.shelfLocation || "Unassigned")}</div>
            <div><strong>Publication:</strong> ${escapeHtml(book.publisher || "N/A")} (${book.year || "N/A"})</div>
          </div>

          <div style="margin-bottom: 0.75rem;">
            <div class="stock-meter">
              <div class="progress-track" title="${book.availableCopies} of ${book.totalCopies} available">
                <div class="progress-fill ${availMeta.fillClass}" style="width: ${availMeta.percentage}%;"></div>
              </div>
              <span class="copies-fraction"><strong>${book.availableCopies}</strong> / ${book.totalCopies} Available</span>
            </div>
          </div>
        </div>

        <div>
          <div class="circulation-btns" style="margin-bottom: 0.75rem;">
            <button class="btn btn-sm btn-secondary issue-btn" data-id="${book.id}" style="flex: 1;" ${isOutOfStock ? "disabled" : ""}>
              <i class="fa-solid fa-arrow-up-from-bracket"></i> Issue
            </button>
            <button class="btn btn-sm btn-secondary return-btn" data-id="${book.id}" style="flex: 1;" ${isFullyStocked ? "disabled" : ""}>
              <i class="fa-solid fa-arrow-down-to-bracket"></i> Return
            </button>
          </div>

          <div class="card-footer-actions">
            <button class="btn-text view-btn-act" data-id="${book.id}">
              <i class="fa-solid fa-circle-info"></i> Details
            </button>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn-action-icon edit-btn-act" data-id="${book.id}" title="Edit Book">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-action-icon delete-btn-act" data-id="${book.id}" title="Delete Record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      card.querySelector(".issue-btn").addEventListener("click", () => handleIssueBook(book.id));
      card.querySelector(".return-btn").addEventListener("click", () => handleReturnBook(book.id));
      card.querySelector(".view-btn-act").addEventListener("click", () => handleViewBook(book.id));
      card.querySelector(".edit-btn-act").addEventListener("click", () => openEditModal(book));
      card.querySelector(".delete-btn-act").addEventListener("click", () => openDeleteModal(book));

      cardViewContainer.appendChild(card);
    });
  }

  // ==================== CRUD OPERATIONS ====================

  async function handleSaveBook(e) {
    e.preventDefault();

    const bookId = document.getElementById("bookIdInput").value;
    const title = document.getElementById("bookTitleInput").value.trim();
    const isbn = document.getElementById("bookIsbnInput").value.trim();
    const author = document.getElementById("bookAuthorInput").value.trim();
    const category = document.getElementById("bookCategoryInput").value;
    const publisher = document.getElementById("bookPublisherInput").value.trim();
    const year = parseInt(document.getElementById("bookYearInput").value, 10);
    const shelfLocation = document.getElementById("bookLocationInput").value.trim();
    const totalCopies = parseInt(document.getElementById("bookTotalCopiesInput").value, 10);
    const availableCopies = parseInt(document.getElementById("bookAvailableCopiesInput").value, 10);
    const description = document.getElementById("bookDescriptionInput").value.trim();

    if (availableCopies > totalCopies) {
      showToast("Validation Error: Available copies cannot exceed Total copies.", "warning");
      return;
    }

    const bookPayload = {
      title,
      isbn,
      author,
      category,
      publisher,
      year: year || new Date().getFullYear(),
      shelfLocation,
      totalCopies,
      availableCopies,
      description
    };

    try {
      if (bookId) {
        // UPDATE operation
        await window.cloudDb.updateBook(bookId, bookPayload);
        showToast(`Updated "${title}" successfully in Cloud DB!`, "success");
      } else {
        // CREATE operation
        await window.cloudDb.addBook(bookPayload);
        showToast(`Added "${title}" successfully to Cloud DB!`, "success");
      }

      bookFormModal.style.display = "none";
      await loadBooks();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  function openEditModal(book) {
    formModalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Update Book Details';
    document.getElementById("bookIdInput").value = book.id;
    document.getElementById("bookTitleInput").value = book.title;
    document.getElementById("bookIsbnInput").value = book.isbn;
    document.getElementById("bookAuthorInput").value = book.author;
    document.getElementById("bookCategoryInput").value = book.category;
    document.getElementById("bookPublisherInput").value = book.publisher || "";
    document.getElementById("bookYearInput").value = book.year || "";
    document.getElementById("bookLocationInput").value = book.shelfLocation || "";
    document.getElementById("bookTotalCopiesInput").value = book.totalCopies;
    document.getElementById("bookAvailableCopiesInput").value = book.availableCopies;
    document.getElementById("bookDescriptionInput").value = book.description || "";

    bookFormModal.style.display = "flex";
  }

  function openDeleteModal(book) {
    bookToDeleteId = book.id;
    deleteBookTitle.textContent = `${book.title} (ISBN: ${book.isbn})`;
    deleteConfirmModal.style.display = "flex";
  }

  async function handleConfirmDelete() {
    if (!bookToDeleteId) return;

    try {
      await window.cloudDb.deleteBook(bookToDeleteId);
      showToast("Book record deleted successfully from Cloud DB.", "success");
      deleteConfirmModal.style.display = "none";
      bookToDeleteId = null;
      await loadBooks();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  }

  async function handleViewBook(id) {
    try {
      const book = await window.cloudDb.getBookById(id);
      currentViewingBook = book;
      const availMeta = getAvailabilityMetadata(book.availableCopies, book.totalCopies);
      const issuedCopies = Math.max(0, book.totalCopies - book.availableCopies);

      viewModalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; line-height: 1.35;">${escapeHtml(book.title)}</h2>
            <p style="font-size: 0.9rem; color: #64748b; margin-top: 4px;"><i class="fa-solid fa-user-pen"></i> By ${escapeHtml(book.author)}</p>
          </div>
          <div class="stock-status-pill ${availMeta.pillClass}">
            <i class="fa-solid fa-circle"></i> ${availMeta.label}
          </div>
        </div>

        <div class="view-grid">
          <div class="view-field">
            <span class="view-field-label">ISBN / Accession No</span>
            <span class="view-field-value"><span class="isbn-badge">${escapeHtml(book.isbn)}</span></span>
          </div>

          <div class="view-field">
            <span class="view-field-label">Department / Category</span>
            <span class="view-field-value"><span class="category-tag">${escapeHtml(book.category)}</span></span>
          </div>

          <div class="view-field">
            <span class="view-field-label">Publisher & Year</span>
            <span class="view-field-value">${escapeHtml(book.publisher || "Not Specified")} (${book.year || "N/A"})</span>
          </div>

          <div class="view-field">
            <span class="view-field-label">Rack / Shelf Location</span>
            <span class="view-field-value"><i class="fa-solid fa-location-dot" style="color: #4f46e5;"></i> ${escapeHtml(book.shelfLocation)}</span>
          </div>

          <div class="view-field">
            <span class="view-field-label">Inventory Circulation</span>
            <span class="view-field-value">
              <strong>${book.availableCopies}</strong> Available / <strong>${issuedCopies}</strong> Issued / <strong>${book.totalCopies}</strong> Total
            </span>
          </div>

          <div class="view-field">
            <span class="view-field-label">Last Synchronized</span>
            <span class="view-field-value" style="font-size: 0.8rem; font-weight: 500; color: #64748b;">
              ${book.updatedAt ? new Date(book.updatedAt).toLocaleString() : "Just now"}
            </span>
          </div>
        </div>

        ${
          book.description
            ? `
          <div style="margin-top: 1rem; background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <span class="view-field-label" style="margin-bottom: 0.25rem;">Abstract / Course Syllabus Notes</span>
            <p style="font-size: 0.85rem; color: #334155; line-height: 1.5;">${escapeHtml(book.description)}</p>
          </div>
        `
            : ""
        }
      `;

      viewDetailsModal.style.display = "flex";
    } catch (err) {
      showToast("Could not load details: " + err.message, "error");
    }
  }

  async function handleIssueBook(id) {
    try {
      const updated = await window.cloudDb.issueBook(id);
      showToast(`1 copy of "${updated.title}" checked out. Available now: ${updated.availableCopies}`, "success");
      await loadBooks();
    } catch (err) {
      showToast(err.message, "warning");
    }
  }

  async function handleReturnBook(id) {
    try {
      const updated = await window.cloudDb.returnBook(id);
      showToast(`1 copy of "${updated.title}" returned. Available now: ${updated.availableCopies}`, "success");
      await loadBooks();
    } catch (err) {
      showToast(err.message, "warning");
    }
  }

  // ==================== UTILITIES ====================

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-triangle-exclamation";
    if (type === "warning") iconClass = "fa-circle-exclamation";

    toast.innerHTML = `
      <div class="toast-message">
        <i class="fa-solid ${iconClass}"></i>
        <span>${escapeHtml(message)}</span>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
