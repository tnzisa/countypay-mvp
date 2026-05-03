PERSON
2	AI Agent Developer
Reconciliation Agent + Anomaly Detection + Summary API

Your job is to build the intelligence layer of CountyPay. You will pull payment data from the backend, run anomaly detection rules against it, and expose a summary endpoint that the frontend dashboard consumes. You already have AI and LangChain experience — this is your home ground.

Your position in the system:
You consume: GET http://localhost:5000/api/payments/admin/all (requires admin token)
You expose: GET http://localhost:YOUR_PORT/reconciliation/summary
Person 4 (Frontend) will call your summary endpoint to populate the dashboard
Your service runs independently — it does not need to be inside the backend folder

Step 1 — Set Up Your Project
Create a new folder for your AI agent service. It runs as a separate Node.js service, not inside the existing backend.

1	Create the project folder
Open PowerShell and run these commands:

cd C:\Users\YOUR_NAME\.bob\countypay-mvp
mkdir ai-agent
cd ai-agent
npm init -y
npm install express axios cors dotenv

2	Create your .env file
In IBM Bob, create a file called ai-agent/.env with these values:

PORT=8080
BACKEND_URL=http://localhost:5000
ADMIN_PHONE=254700000000
ADMIN_PASSWORD=admin123

3	Create the project structure using IBM Bob
Switch to Code mode in IBM Bob and paste this prompt:

IBM Bob Prompt (paste into Bob chat):
Create the following file structure in ai-agent/: src/server.js (Express server on process.env.PORT), src/services/authService.js (login to backend and cache admin JWT token), src/services/paymentService.js (fetch all payments from backend), src/services/anomalyDetector.js (run 4 anomaly rules), src/routes/reconciliation.js (expose GET /reconciliation/summary). Do not implement logic yet, just create empty files with module.exports = {} placeholders.

Step 2 — Build the Auth Service
Your agent needs an admin JWT token to call the backend payments endpoint. Build a service that logs in once and caches the token, refreshing it when it expires.

IBM Bob Prompt (paste into Bob chat):
Implement ai-agent/src/services/authService.js. It must: (1) Call POST http://localhost:5000/api/auth/login with body {phone: process.env.ADMIN_PHONE, password: process.env.ADMIN_PASSWORD}. (2) Store the returned JWT token in memory. (3) Export a function getToken() that returns the cached token or fetches a new one if expired. (4) Export a function getAuthHeaders() that returns {Authorization: 'Bearer TOKEN', Content-Type: 'application/json'}. Use axios for the HTTP call. Add console.log for every login attempt.

Step 3 — Build the Payment Service
This service fetches all payment transactions from the backend. It calls the admin endpoint which returns all payments across all users and counties.

IBM Bob Prompt (paste into Bob chat):
Implement ai-agent/src/services/paymentService.js. It must: (1) Import getAuthHeaders from authService. (2) Export an async function getAllPayments() that calls GET http://localhost:5000/api/payments/admin/all with the auth headers. (3) Return the array of transactions. (4) Handle errors gracefully — if the call fails, log the error and return an empty array. (5) Export async function getPaymentsByCounty(countyCode) that filters the results by fee.county.code. Add console.log showing how many payments were fetched each time.

Step 4 — Build the Anomaly Detector
This is the core intelligence. Four rules run against every batch of payments. Each rule returns a list of flagged payments with a reason.

The 4 Rules to Implement
Rule 1: Stale Pending	Any payment with status 'pending' that is older than 15 minutes. This means M-Pesa callback never arrived.
Rule 2: Duplicate Payment	Same userId + feeId combination appearing more than once within 24 hours. Potential double charge.
Rule 3: High Value Outlier	Any payment where amount is more than double the standard fee amount for that fee type. Possible fraud.
Rule 4: Unconfirmed Blockchain	Any payment with status 'completed' but blockchainTxId is null or empty. Completed but not recorded on ledger.

IBM Bob Prompt (paste into Bob chat):
Implement ai-agent/src/services/anomalyDetector.js with these 4 exported functions: (1) detectStalePending(payments) - returns payments where status === 'pending' AND createdAt is more than 15 minutes ago. (2) detectDuplicates(payments) - returns payments where same userId AND feeId appear more than once within 24 hours, keeping all duplicates in the result. (3) detectHighValueOutliers(payments) - returns payments where amount > (fee.amount * 2). (4) detectUnconfirmedBlockchain(payments) - returns payments where status === 'completed' AND blockchainTxId is null or empty string. Each function returns an array of objects: {paymentId, rule, reason, amount, feeType, countyCode, phoneNumber}. Also export a main function runAllRules(payments) that calls all 4 and returns a combined deduplicated array.

Step 5 — Build the Summary Endpoint
This is what the frontend calls. It returns a single JSON object with totals, breakdowns, and the anomaly list. The shape must match exactly what Person 4 expects.

Required Response Shape
GET /reconciliation/summary

{
  "totalCollectedToday": 75000,
  "totalTransactions": 15,
  "completedTransactions": 12,
  "pendingTransactions": 3,
  "byFeeType": {
    "Business Permit": { "count": 5, "amount": 25000 },
    "Land Rates": { "count": 4, "amount": 60000 },
    "Parking Fee": { "count": 6, "amount": 1200 }
  },
  "byCounty": {
    "NRB": { "count": 8, "amount": 45000 },
    "MSA": { "count": 7, "amount": 41200 }
  },
  "anomalies": [
    {
      "paymentId": "uuid-here",
      "rule": "Stale Pending",
      "reason": "Payment pending for more than 15 minutes",
      "amount": 5000,
      "feeType": "Business Permit",
      "countyCode": "NRB",
      "phoneNumber": "254712345678"
    }
  ],
  "anomalyCount": 1,
  "lastUpdated": "2026-05-02T08:00:00.000Z"
}

IBM Bob Prompt (paste into Bob chat):
Implement ai-agent/src/routes/reconciliation.js as an Express router. It must expose GET /summary which: (1) Calls getAllPayments() from paymentService. (2) Calculates totalCollectedToday as sum of amount for completed payments created today. (3) Calculates totalTransactions, completedTransactions, pendingTransactions counts. (4) Calculates byFeeType breakdown: for each fee name, count and total amount. (5) Calculates byCounty breakdown: for each county code, count and total amount. (6) Calls runAllRules(payments) from anomalyDetector to get anomalies array. (7) Returns the complete JSON object shown in the summary shape above including lastUpdated as new Date().toISOString(). Enable CORS on this router so the frontend can call it cross-origin.

IBM Bob Prompt (paste into Bob chat):
Implement ai-agent/src/server.js as an Express server that: (1) Loads dotenv. (2) Uses express.json() and cors() middleware. (3) Mounts the reconciliation router at /reconciliation. (4) Listens on process.env.PORT or 8080. (5) On startup, calls getAllPayments() once to verify backend connectivity and logs the count. (6) Logs AI AGENT: Service started on port X when ready.

Step 6 — Test Your Service
Start the backend first, then start your AI agent service and confirm it connects correctly.

1	Start the AI agent
In PowerShell inside the ai-agent folder:

cd ai-agent
node src/server.js
# You should see:
# AI AGENT: Service started on port 8080
# AI AGENT: Fetched X payments from backend

2	Test the summary endpoint
In a second PowerShell terminal:

$summary = Invoke-RestMethod -Uri "http://localhost:8080/reconciliation/summary"
$summary | ConvertTo-Json -Depth 5
# Should return the full summary JSON object

3	Verify anomaly detection works
Trigger a stale pending payment by waiting 15 minutes or temporarily changing the threshold to 1 minute for testing:

IBM Bob Prompt (paste into Bob chat):
In anomalyDetector.js, temporarily change the stalePending threshold from 15 minutes to 1 minute so I can test it quickly. I will change it back to 15 minutes before the demo.

Integration complete when:
Once your summary endpoint returns valid JSON and Person 4 can call it from their dashboard, your integration is complete.
Share your service URL with Person 4: http://localhost:8080/reconciliation/summary
Push your ai-agent folder to a new branch on GitHub: git checkout -b ai-agent-dev && git push origin ai-agent-dev

 
