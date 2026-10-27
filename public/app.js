// Simple Client Script for Practice Exam
const booksBody = document.getElementById("booksBody");
const recordCount = document.getElementById("recordCount");
const alertBox = document.getElementById("alertBox");
const bookForm = document.getElementById("bookForm");
const formHeading = document.getElementById("formHeading");
const resetBtn = document.getElementById("resetBtn");

// AWS status elements
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const toggleAwsConfigBtn = document.getElementById("toggleAwsConfigBtn");
const awsConfigForm = document.getElementById("awsConfigForm");
const saveAwsBtn = document.getElementById("saveAwsBtn");

let isEditing = false;

// Init
window.addEventListener("DOMContentLoaded", () => {
  loadStatus();
  loadBooks();
  setupEvents();
});

function setupEvents() {
  // Toggle AWS credentials box
  toggleAwsConfigBtn.addEventListener("click", () => {
    awsConfigForm.style.display = awsConfigForm.style.display === "none" ? "block" : "none";
  });

  // Save AWS credentials
  saveAwsBtn.addEventListener("click", async () => {
    const payload = {
      region: document.getElementById("awsRegion").value.trim(),
      tableName: document.getElementById("awsTable").value.trim(),
      accessKeyId: document.getElementById("awsAccessKey").value.trim(),
      secretAccessKey: document.getElementById("awsSecretKey").value.trim(),
      sessionToken: document.getElementById("awsSessionToken").value.trim()
    };

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      showAlert(data.awsStatusMessage, data.isAwsConnected ? "success" : "error");
      loadStatus();
      loadBooks();
    } catch (err) {
      showAlert("Error updating AWS credentials: " + err.message, "error");
    }
  });

  // Submit Book Form (Create / Update)
  bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const bookId = document.getElementById("bookId").value.trim();
    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();
    const totalCopies = parseInt(document.getElementById("totalCopies").value, 10);
    const availableCopies = parseInt(document.getElementById("availableCopies").value, 10);

    if (availableCopies > totalCopies) {
      showAlert("Available copies cannot be greater than Total copies!", "error");
      return;
    }

    const payload = { bookId, title, author, totalCopies, availableCopies };

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save book");
      }

      showAlert(data.message + ` (${data.source})`, "success");
      resetForm();
      loadBooks();
    } catch (err) {
      showAlert(err.message, "error");
    }
  });

  // Reset Button
  resetBtn.addEventListener("click", resetForm);
}

// Fetch AWS Status
async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();

    if (data.isAwsConnected) {
      statusDot.className = "status-dot connected";
      statusText.textContent = `Connected to AWS DynamoDB (Region: ${data.region}, Table: ${data.tableName})`;
    } else {
      statusDot.className = "status-dot local";
      statusText.textContent = `Local Demo Mode (AWS credentials not set). Click 'AWS Settings' to connect.`;
    }
  } catch (err) {
    statusDot.className = "status-dot error";
    statusText.textContent = "Server connection error";
  }
}

// Fetch and Render Books
async function loadBooks() {
  try {
    const res = await fetch("/api/books");
    const data = await res.json();
    const books = data.data || [];

    recordCount.textContent = `${books.length} Books (${data.source})`;
    booksBody.innerHTML = "";

    if (books.length === 0) {
      booksBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #718096;">No book records found. Add one above!</td></tr>`;
      return;
    }

    books.forEach((book) => {
      const tr = document.createElement("tr");

      const isOut = book.availableCopies <= 0;
      const statusBadge = isOut
        ? `<span class="badge badge-danger">Out of Stock</span>`
        : `<span class="badge badge-success">Available</span>`;

      tr.innerHTML = `
        <td><strong>${escapeHtml(book.bookId)}</strong></td>
        <td>${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author)}</td>
        <td>${book.totalCopies}</td>
        <td><strong>${book.availableCopies}</strong></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-action" onclick="issueBook('${book.bookId}')" ${isOut ? "disabled" : ""}>Issue (-1)</button>
          <button class="btn-action" onclick="returnBook('${book.bookId}')" ${book.availableCopies >= book.totalCopies ? "disabled" : ""}>Return (+1)</button>
        </td>
        <td>
          <button class="btn-action" onclick="editBook('${book.bookId}', '${escapeHtml(book.title)}', '${escapeHtml(book.author)}', ${book.totalCopies}, ${book.availableCopies})">Edit</button>
          <button class="btn-action btn-danger" onclick="deleteBook('${book.bookId}')">Delete</button>
        </td>
      `;

      booksBody.appendChild(tr);
    });
  } catch (err) {
    showAlert("Failed to load books: " + err.message, "error");
  }
}

// Issue Book
window.issueBook = async function (bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}/issue`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    showAlert(data.message, "success");
    loadBooks();
  } catch (err) {
    showAlert(err.message, "error");
  }
};

// Return Book
window.returnBook = async function (bookId) {
  try {
    const res = await fetch(`/api/books/${bookId}/return`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    showAlert(data.message, "success");
    loadBooks();
  } catch (err) {
    showAlert(err.message, "error");
  }
};

// Edit Book (Populate Form)
window.editBook = function (bookId, title, author, totalCopies, availableCopies) {
  isEditing = true;
  formHeading.textContent = `Update Book (${bookId})`;
  document.getElementById("bookId").value = bookId;
  document.getElementById("bookId").readOnly = true; // Cannot change partition key
  document.getElementById("title").value = title;
  document.getElementById("author").value = author;
  document.getElementById("totalCopies").value = totalCopies;
  document.getElementById("availableCopies").value = availableCopies;
  document.getElementById("saveBtn").textContent = "Update Book";
};

// Delete Book
window.deleteBook = async function (bookId) {
  if (!confirm(`Are you sure you want to delete book ${bookId}?`)) return;

  try {
    const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    showAlert(data.message, "success");
    loadBooks();
  } catch (err) {
    showAlert(err.message, "error");
  }
};

function resetForm() {
  isEditing = false;
  formHeading.textContent = "Add Book Record";
  bookForm.reset();
  document.getElementById("bookId").readOnly = false;
  document.getElementById("saveBtn").textContent = "Save Book";
}

function showAlert(message, type = "success") {
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
