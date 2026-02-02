**Sunlife Lab – Backend System**
Inverter Lifecycle, Warranty & Service Management

⸻
📌 Overview
This backend system manages the complete lifecycle of a solar inverter, from factory to customer and beyond:
Factory → Dealer → Customer → Service Center → Warranty Replacement
It is designed with auditability, stock enforcement, and warranty correctness as first-class principles.
⸻

🧱 Core Concepts

Roles

Role	Description
FACTORY_ADMIN	Creates models, dispatches inverters & parts
DEALER	Receives inverters, sells to customers
SERVICE_CENTER	Handles service jobs & part replacements


⸻

Key Design Principles
	•	Immutable audit records (dispatches, sales, replacements)
	•	Derived stock (no manual stock edits)
	•	Warranty enforcement at service time
	•	Strict role-based access control

⸻

⚙️ Tech Stack
	•	Node.js + Express
	•	MongoDB + Mongoose
	•	JWT Authentication
	•	ES Modules
	•	Postman-first API design

⸻

🚀 Setup Instructions

1️⃣ Clone & Install

git clone https://github.com/qjcoder/sunlife-lab-system.git
cd backend
npm install


⸻

2️⃣ Environment Variables (.env)

PORT=5050
MONGO_URI=mongodb://127.0.0.1:27017/sunlife_lab
JWT_SECRET=supersecretkey


⸻

3️⃣ Start Server

npm run dev

You should see:

✅ MongoDB connected
🚀 Server running on port 5050


⸻

🔐 Initial Factory Admin (One-Time)

Create the first admin using a script (already used in your flow):

node createAdmin.js

This creates:
	•	Role: FACTORY_ADMIN
	•	Full system access

⸻

🔁 COMPLETE SYSTEM FLOW (Postman Order)

This is the exact order you must follow.

⸻

🟢 STEP 1 — Login (Factory Admin)

POST

/api/auth/login

Save the JWT token for next requests.

⸻

🟢 STEP 2 — Create Inverter Model

POST

/api/inverter-models

{
  "brand": "Sunlife",
  "productLine": "SL-Sky",
  "variant": "4kW",
  "modelCode": "SL-SKY-4KW",
  "warranty": {
    "partsMonths": 12,
    "serviceMonths": 24
  }
}


⸻

🟢 STEP 3 — Register Inverter Unit (Factory)

POST

/api/inverters

{
  "serialNumber": "SN-SKY-4KW-0001",
  "inverterModel": "<MODEL_ID>"
}


⸻

🟢 STEP 4 — Create Dealer Account

POST

/api/dealers

{
  "name": "Punjab Solar Traders",
  "email": "punjab@sunlife.com",
  "password": "dealer123"
}


⸻

🟢 STEP 5 — Dispatch Inverter to Dealer

POST

/api/inverter-dispatches

{
  "dispatchNumber": "FD-2026-001",
  "dealer": "Punjab Solar Traders",
  "inverterUnits": ["<INVERTER_UNIT_ID>"],
  "remarks": "Initial dealer stock"
}


⸻

🟢 STEP 6 — Dealer Login

POST

/api/auth/login


⸻

🟢 STEP 7 — Dealer Stock Check

GET

/api/inverter-stock

Shows all unsold inverters assigned to dealer.

⸻

🟢 STEP 8 — Dealer → Customer Sale

POST

/api/inverter-sales

{
  "serialNumber": "SN-SKY-4KW-0001",
  "saleInvoiceNo": "INV-2026-001",
  "saleDate": "2026-02-05",
  "customerName": "Ali Raza",
  "customerContact": "0300-1234567"
}

✅ Warranty starts here

⸻

🟢 STEP 9 — Create Service Center

POST

/api/service-centers

{
  "name": "Lahore Service Center",
  "email": "lahore@sunlife.com",
  "password": "lahore123"
}


⸻

🟢 STEP 10 — Dispatch Parts to Service Center

POST

/api/part-dispatches

{
  "serviceCenter": "Lahore Service Center",
  "dispatchedItems": [
    { "partCode": "PCB-MAIN", "partName": "Main Control Board", "quantity": 5 },
    { "partCode": "FAN-DC", "partName": "Cooling Fan", "quantity": 10 }
  ],
  "remarks": "Initial stock"
}


⸻

🟢 STEP 11 — Service Center Stock Check

GET

/api/service-center-stock

Returns derived stock:

dispatchedQty - usedQty = remainingQty


⸻

🟢 STEP 12 — Service Center Login

POST

/api/auth/login


⸻

🟢 STEP 13 — Create Service Job

POST

/api/service-jobs

{
  "serialNumber": "SN-SKY-4KW-0001",
  "serviceCenter": "Lahore Service Center",
  "reportedFault": "No output voltage",
  "visitDate": "2026-02-10"
}

Warranty snapshot is taken automatically.

⸻

🟢 STEP 14 — Replace Part (Warranty Enforced)

POST

/api/service-jobs/:serviceJobId/replaced-parts

{
  "partCode": "PCB-MAIN",
  "partName": "Main Control Board",
  "quantity": 1,
  "replacementDate": "2026-02-10",
  "replacementType": "REPLACEMENT",
  "dispatchId": "<PART_DISPATCH_ID>"
}

Automatic Rules Applied
	•	✔ Warranty valid?
	•	✔ Max 2 replacements?
	•	✔ Stock available?
	•	✔ Correct service center?
	•	✔ Dispatch audit link?

⸻

📦 Stock Logic (Very Important)

There is NO editable stock table.

Stock is derived from:

ServiceCenterStock = Sum(PartDispatch) − Sum(ReplacedPart)

This guarantees:
	•	No stock tampering
	•	Full audit history
	•	Financial & warranty integrity

⸻

🔐 Security Summary
	•	JWT-based auth
	•	Role-based access per route
	•	Ownership enforced at query level
	•	Invalid access = 403 or 404

⸻

📌 Current Status

✅ Production-ready backend
✅ End-to-end tested via Postman
✅ Warranty & stock fully enforced

⸻

🔜 Next (Optional Enhancements)
	•	Postman collection export
	•	Swagger / OpenAPI docs
	•	Frontend dashboard
	•	Analytics & reports
	•	Multi-warehouse support

⸻

🏁 Final Note

This is not CRUD.
This is a real-world, auditable business system.
