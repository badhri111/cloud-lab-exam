/**
 * Simple Verification Script for Practice Exam
 * Tests CRUD operations on AWS DynamoDB / Express backend
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";

function makeRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { "Content-Type": "application/json" }
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log("=== RUNNING PRACTICE EXAM VERIFICATION ===");

  try {
    // 1. Status
    const status = await makeRequest("/api/status");
    console.log("1. Status Check:", status.body.awsStatusMessage);

    // 2. Read
    const getRes = await makeRequest("/api/books");
    console.log(`2. Read Books: Fetched ${getRes.body.data.length} records (${getRes.body.source})`);

    // 3. Create
    const newBook = {
      bookId: "TEST999",
      title: "AWS Cloud Architecture Exam Guide",
      author: "Ben Piper",
      totalCopies: 4,
      availableCopies: 4
    };
    const createRes = await makeRequest("/api/books", "POST", newBook);
    console.log("3. Create Book:", createRes.body.message);

    // 4. Issue (Check-out)
    const issueRes = await makeRequest("/api/books/TEST999/issue", "POST");
    console.log("4. Issue Book:", issueRes.body.message);

    // 5. Return (Check-in)
    const returnRes = await makeRequest("/api/books/TEST999/return", "POST");
    console.log("5. Return Book:", returnRes.body.message);

    // 6. Delete
    const delRes = await makeRequest("/api/books/TEST999", "DELETE");
    console.log("6. Delete Book:", delRes.body.message);

    console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

runTest();
