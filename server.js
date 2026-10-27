require("dotenv").config();
const express = require("express");
const path = require("path");
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand
} = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configuration
let awsConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  sessionToken: process.env.AWS_SESSION_TOKEN || "",
  tableName: process.env.DYNAMODB_TABLE || "LibraryBooks"
};

let ddbDocClient = null;
let isAwsConnected = false;
let awsStatusMessage = "Checking AWS DynamoDB configuration...";

// In-Memory fallback store so the app works immediately even before entering AWS keys
let localBooks = [
  {
    bookId: "CS101",
    title: "Operating System Concepts",
    author: "Silberschatz",
    totalCopies: 5,
    availableCopies: 4
  },
  {
    bookId: "CS102",
    title: "Cloud Computing Fundamentals",
    author: "Rajkumar Buyya",
    totalCopies: 3,
    availableCopies: 1
  },
  {
    bookId: "CS103",
    title: "Computer Networks",
    author: "Andrew S. Tanenbaum",
    totalCopies: 6,
    availableCopies: 0
  }
];

function initAwsClient() {
  if (awsConfig.accessKeyId && awsConfig.secretAccessKey) {
    try {
      const credentials = {
        accessKeyId: awsConfig.accessKeyId.trim(),
        secretAccessKey: awsConfig.secretAccessKey.trim()
      };
      if (awsConfig.sessionToken && awsConfig.sessionToken.trim()) {
        credentials.sessionToken = awsConfig.sessionToken.trim();
      }

      const client = new DynamoDBClient({
        region: awsConfig.region,
        credentials
      });

      ddbDocClient = DynamoDBDocumentClient.from(client);
      isAwsConnected = true;
      awsStatusMessage = `Connected to AWS DynamoDB (Region: ${awsConfig.region}, Table: ${awsConfig.tableName})`;
      console.log(`[AWS] ` + awsStatusMessage);

      // Verify or create table
      ensureDynamoTable(client, awsConfig.tableName);
    } catch (err) {
      isAwsConnected = false;
      awsStatusMessage = "AWS Client Error: " + err.message;
      console.error("[AWS Error]", err.message);
    }
  } else {
    isAwsConnected = false;
    awsStatusMessage = "No AWS credentials provided. Running in Local Demo Mode.";
    console.log("[AWS] " + awsStatusMessage);
  }
}

async function ensureDynamoTable(rawClient, tableName) {
  try {
    await rawClient.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`[AWS DynamoDB] Table "${tableName}" exists and is active.`);
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      console.log(`[AWS DynamoDB] Table "${tableName}" not found. Creating on-demand table...`);
      try {
        await rawClient.send(
          new CreateTableCommand({
            TableName: tableName,
            KeySchema: [{ AttributeName: "bookId", KeyType: "HASH" }],
            AttributeDefinitions: [{ AttributeName: "bookId", AttributeType: "S" }],
            BillingMode: "PAY_PER_REQUEST" // Zero fixed monthly cost (scale to zero)
          })
        );
        console.log(`[AWS DynamoDB] Table "${tableName}" created successfully with PAY_PER_REQUEST billing.`);
      } catch (createErr) {
        console.warn(`[AWS DynamoDB] Could not auto-create table: ${createErr.message}`);
      }
    } else {
      console.warn(`[AWS DynamoDB] DescribeTable check: ${err.message}`);
    }
  }
}

// Initialize on startup
initAwsClient();

// ==================== API ROUTES ====================

// AWS Status & Configuration Check
app.get("/api/status", (req, res) => {
  res.json({
    isAwsConnected,
    awsStatusMessage,
    region: awsConfig.region,
    tableName: awsConfig.tableName,
    hasSessionToken: Boolean(awsConfig.sessionToken)
  });
});

// Update AWS Credentials via simple UI form
app.post("/api/config", (req, res) => {
  const { region, accessKeyId, secretAccessKey, sessionToken, tableName } = req.body;
  awsConfig.region = region || awsConfig.region;
  awsConfig.accessKeyId = accessKeyId || "";
  awsConfig.secretAccessKey = secretAccessKey || "";
  awsConfig.sessionToken = sessionToken || "";
  awsConfig.tableName = tableName || awsConfig.tableName;

  initAwsClient();

  res.json({
    success: true,
    isAwsConnected,
    awsStatusMessage
  });
});

// READ: Get all books
app.get("/api/books", async (req, res) => {
  if (isAwsConnected && ddbDocClient) {
    try {
      const command = new ScanCommand({ TableName: awsConfig.tableName });
      const result = await ddbDocClient.send(command);
      return res.json({ success: true, source: "AWS DynamoDB", data: result.Items || [] });
    } catch (err) {
      console.error("[DynamoDB Scan Error]", err.message);
      return res.status(500).json({ success: false, message: "DynamoDB Scan Error: " + err.message });
    }
  }

  // Fallback: Local
  res.json({ success: true, source: "Local In-Memory", data: localBooks });
});

// CREATE / UPDATE: Add or edit a book
app.post("/api/books", async (req, res) => {
  const { bookId, title, author, totalCopies, availableCopies } = req.body;

  if (!bookId || !title || !author) {
    return res.status(400).json({ success: false, message: "bookId, title, and author are required" });
  }

  const tot = parseInt(totalCopies, 10) || 1;
  const avail = parseInt(availableCopies, 10);

  if (avail > tot) {
    return res.status(400).json({ success: false, message: "Available copies cannot exceed total copies" });
  }

  const bookItem = {
    bookId: String(bookId).trim(),
    title: String(title).trim(),
    author: String(author).trim(),
    totalCopies: tot,
    availableCopies: isNaN(avail) ? tot : avail
  };

  if (isAwsConnected && ddbDocClient) {
    try {
      const command = new PutCommand({
        TableName: awsConfig.tableName,
        Item: bookItem
      });
      await ddbDocClient.send(command);
      return res.json({ success: true, source: "AWS DynamoDB", message: "Book saved to AWS DynamoDB", data: bookItem });
    } catch (err) {
      console.error("[DynamoDB Put Error]", err.message);
      return res.status(500).json({ success: false, message: "DynamoDB Error: " + err.message });
    }
  }

  // Fallback: Local
  const idx = localBooks.findIndex((b) => b.bookId === bookItem.bookId);
  if (idx >= 0) {
    localBooks[idx] = bookItem;
  } else {
    localBooks.push(bookItem);
  }
  res.json({ success: true, source: "Local In-Memory", message: "Book saved locally", data: bookItem });
});

// DELETE: Delete a book
app.delete("/api/books/:id", async (req, res) => {
  const bookId = req.params.id;

  if (isAwsConnected && ddbDocClient) {
    try {
      const command = new DeleteCommand({
        TableName: awsConfig.tableName,
        Key: { bookId }
      });
      await ddbDocClient.send(command);
      return res.json({ success: true, source: "AWS DynamoDB", message: `Book ${bookId} deleted from AWS DynamoDB` });
    } catch (err) {
      console.error("[DynamoDB Delete Error]", err.message);
      return res.status(500).json({ success: false, message: "DynamoDB Error: " + err.message });
    }
  }

  // Fallback: Local
  localBooks = localBooks.filter((b) => b.bookId !== bookId);
  res.json({ success: true, source: "Local In-Memory", message: `Book ${bookId} deleted` });
});

// ISSUE: Check-out book (Decrement available copies)
app.post("/api/books/:id/issue", async (req, res) => {
  const bookId = req.params.id;

  if (isAwsConnected && ddbDocClient) {
    try {
      const getCmd = new GetCommand({ TableName: awsConfig.tableName, Key: { bookId } });
      const current = await ddbDocClient.send(getCmd);
      if (!current.Item) {
        return res.status(404).json({ success: false, message: "Book not found in AWS DynamoDB" });
      }

      if (current.Item.availableCopies <= 0) {
        return res.status(400).json({ success: false, message: "Out of Stock! Cannot issue." });
      }

      const updatedCopies = current.Item.availableCopies - 1;
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: awsConfig.tableName,
          Key: { bookId },
          UpdateExpression: "SET availableCopies = :val",
          ExpressionAttributeValues: { ":val": updatedCopies }
        })
      );

      return res.json({ success: true, message: `1 copy issued. Available: ${updatedCopies}`, availableCopies: updatedCopies });
    } catch (err) {
      return res.status(500).json({ success: false, message: "DynamoDB Error: " + err.message });
    }
  }

  // Fallback: Local
  const book = localBooks.find((b) => b.bookId === bookId);
  if (!book) return res.status(404).json({ success: false, message: "Book not found" });
  if (book.availableCopies <= 0) return res.status(400).json({ success: false, message: "Out of Stock!" });

  book.availableCopies -= 1;
  res.json({ success: true, message: `1 copy issued. Available: ${book.availableCopies}`, availableCopies: book.availableCopies });
});

// RETURN: Check-in book (Increment available copies)
app.post("/api/books/:id/return", async (req, res) => {
  const bookId = req.params.id;

  if (isAwsConnected && ddbDocClient) {
    try {
      const getCmd = new GetCommand({ TableName: awsConfig.tableName, Key: { bookId } });
      const current = await ddbDocClient.send(getCmd);
      if (!current.Item) {
        return res.status(404).json({ success: false, message: "Book not found in AWS DynamoDB" });
      }

      if (current.Item.availableCopies >= current.Item.totalCopies) {
        return res.status(400).json({ success: false, message: "All copies already returned!" });
      }

      const updatedCopies = current.Item.availableCopies + 1;
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: awsConfig.tableName,
          Key: { bookId },
          UpdateExpression: "SET availableCopies = :val",
          ExpressionAttributeValues: { ":val": updatedCopies }
        })
      );

      return res.json({ success: true, message: `1 copy returned. Available: ${updatedCopies}`, availableCopies: updatedCopies });
    } catch (err) {
      return res.status(500).json({ success: false, message: "DynamoDB Error: " + err.message });
    }
  }

  // Fallback: Local
  const book = localBooks.find((b) => b.bookId === bookId);
  if (!book) return res.status(404).json({ success: false, message: "Book not found" });
  if (book.availableCopies >= book.totalCopies) return res.status(400).json({ success: false, message: "All copies returned!" });

  book.availableCopies += 1;
  res.json({ success: true, message: `1 copy returned. Available: ${book.availableCopies}`, availableCopies: book.availableCopies });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` AWS CLOUD LIBRARY SYSTEM (PRACTICE EXAM)`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Database: AWS DynamoDB (Table: ${awsConfig.tableName})`);
  console.log(` Billing Mode: PAY_PER_REQUEST ($0 Fixed Cost)`);
  console.log(`====================================================`);
});
