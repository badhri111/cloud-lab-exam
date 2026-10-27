# College Library Management System — AWS DynamoDB (Practice Exam)

> **Cloud Computing Practice Lab**  
> **Topic:** Automated Library Management System with AWS DynamoDB, Zero Fixed Monthly Cost, and Auto-Scaling.

---

## 1. Quick Overview

This project is a lightweight, simplified web application designed for a Cloud Computing lab exam:
* **Web UI**: Clean single-page interface to add, view, update, delete, issue, and return books.
* **AWS Cloud Database**: **AWS DynamoDB** (NoSQL document store).
* **Zero Fixed Cost & Auto-Scaling**: Configured with DynamoDB **On-Demand Capacity Mode (`PAY_PER_REQUEST`)**. When idle, 0 compute resources are active, resulting in **$0 baseline monthly cost**. It automatically scales when requests arrive.
* **Resilient**: Works both with live AWS DynamoDB and in Local Fallback mode, ensuring you can demonstrate the CRUD operations even if AWS credentials expire during the exam.

---

## 2. System Architecture

```text
  [ Librarian Web Browser ]
             │
             │ HTTP / JSON
             ▼
    [ Node.js Web Server ]
             │
             │ AWS SDK v3 (@aws-sdk/client-dynamodb)
             ▼
    [ AWS Cloud: DynamoDB ]
      • Table: LibraryBooks
      • Partition Key: bookId (String)
      • Billing Mode: PAY_PER_REQUEST ($0 idle / on-demand scaling)
```

---

## 3. How to Run Locally

### 1. Install & Start Server
```bash
npm install
npm start
```
Open in browser:
👉 **`http://localhost:5000`**

### 2. Run Automated Verification Test
In another terminal:
```bash
npm test
```

---

## 4. Connecting to AWS DynamoDB

You can connect to AWS in **two easy ways**:

### Method A: Directly from the Web Interface (Fastest for Exams)
1. Open `http://localhost:5000`.
2. Click **"AWS Settings"** at the top right of the orange AWS card.
3. Paste your AWS credentials (from AWS Console or AWS Academy Learner Lab *"AWS Details"*):
   - **AWS Region**: `us-east-1`
   - **AWS Access Key ID**: `ASIA...` or `AKIA...`
   - **AWS Secret Access Key**: `...`
   - **AWS Session Token**: *(Required if using AWS Academy Learner Lab)*
4. Click **"Connect to AWS"**. The indicator will turn green!
5. The application will automatically create the `LibraryBooks` table in DynamoDB if it doesn't already exist.

### Method B: Using `.env` File
Edit `.env` in the root folder:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token   # leave blank if not using Learner Lab
DYNAMODB_TABLE=LibraryBooks
PORT=5000
```
Then restart the server with `npm start`.

---

## 5. Hosting the Web App on AWS S3 ($0 Fixed Cost)

To demonstrate hosting on AWS without fixed server costs:
1. Create an Amazon S3 bucket (e.g. `psg-library-app-25mx203`).
2. Enable **Static Website Hosting** under the bucket properties.
3. Upload the files inside `public/` (`index.html`, `style.css`, `app.js`) to the S3 bucket.
4. Set bucket policy to allow public read:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::psg-library-app-25mx203/*"
    }
  ]
}
```
Access the static web app via the S3 website endpoint URL (`http://psg-library-app-25mx203.s3-website-us-east-1.amazonaws.com`).

---

## 6. Examiner Viva Answers

* **Q: Why does this solution have no fixed monthly cost?**  
  *Ans:* DynamoDB uses **PAY_PER_REQUEST** (On-Demand capacity). There is no hourly instance fee. Under AWS Free Tier, the first 25 GB of storage and 2.5 million read/write requests per month are 100% free.

* **Q: How does it scale automatically?**  
  *Ans:* AWS DynamoDB partitions data automatically across SSD storage clusters in the cloud as data or throughput increases, handling thousands of concurrent read/write requests without manual server provisioning.

* **Q: How is book availability tracked?**  
  *Ans:* Each record maintains `totalCopies` and `availableCopies`. When a student borrows a book, an atomic update decrements `availableCopies` by 1. When returned, it increments by 1. If `availableCopies` reaches 0, the system marks it as `Out of Stock` and blocks checkouts.
