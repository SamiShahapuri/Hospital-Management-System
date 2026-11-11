# 🏥 Hospital Management System

A web-based **Hospital Management System (HMS)** designed to simplify hospital operations by managing patients, doctors, departments, appointments, admissions, billing, laboratory tests and reports through a centralized platform.

This project was developed as part of the **Software Engineering Mini-Project** at PES University.

---

## 👥 Team Members

| Name | SRN | GitHub |
|---|---|---|
| Sami Shahapuri | PES1UG24CS611 | Sami Shahapuri |
| Sachin B R | PES1UG25CS839 | Sachin B R |
| Shahid Tahsildar | PES1UG24CS619 | Shahid Tahsildar |


---

## ✨ Key Features

- **Authentication & Role Management:** Secure login with role-based access for Admin, Receptionist, Doctor and Patient.
- **Patient Management:** Register patients and manage their personal details and medical records.
- **Doctor Management:** Manage doctor profiles, specializations, availability and departments.
- **Department Management:** Organize hospital departments, wards, rooms and beds.
- **Appointment Management:** Book, reschedule, confirm, cancel and complete appointments.
- **Admission & Discharge:** Manage patient admissions, bed allocation, transfers and discharge.
- **Clinical Records:** Maintain diagnosis, treatment history, clinical notes and prescriptions.
- **Billing & Payments:** Generate itemized bills, record payments and manage outstanding balances.
- **Laboratory Management:** Schedule lab tests, record results and manage test status.
- **Notifications:** Display reminders for upcoming appointments, laboratory tests and pending bills.
- **Reports:** Generate reports for patients, doctors, appointments, admissions and payments.
- **Guest Booking:** Allow visitors to book appointments without creating an account.

---

## 👤 User Roles

| Role | Responsibilities |
|---|---|
| Admin | Manages doctors, departments, facilities, admissions, billing and reports. |
| Receptionist | Handles patient registration, appointments and front-desk operations. |
| Doctor | Manages appointments, patient visits, clinical notes, prescriptions and availability. |
| Patient | Books appointments and views personal medical records, prescriptions and bills. |
| Guest | Books appointments without creating a login account. |

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT |
| Password Security | bcrypt |
| Version Control | Git & GitHub |
| CI/CD | GitHub Actions |

---

## 📋 Prerequisites

Before running the project, install the following:

1. **Node.js:** Version 20 or newer.
   - https://nodejs.org/
2. **MongoDB Community Server:** Install and run MongoDB locally.
   - https://www.mongodb.com/try/download/community
3. **Git:** For cloning and managing the repository.
   - https://git-scm.com/
4. **Visual Studio Code:** Recommended code editor.
   - https://code.visualstudio.com/

Verify the installations:

```bash
node -v
npm -v
git --version
mongosh --version
```

Make sure the MongoDB server is running before starting the backend.

---

## 🚀 Installation and Setup

### Step 1: Clone the Repository

Open a terminal and execute:

```bash
git clone https://github.com/SamiShahapuri/Hospital-Management-System.git
```

Navigate into the project:

```bash
cd Hospital-Management-System
```

### Step 2: Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install the required dependencies:

```bash
npm install
```

Create the environment configuration file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open the `.env` file and configure the environment variables.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hospital_management
JWT_SECRET=replace_with_a_long_random_secret
HOSPITAL_TIME_ZONE=Asia/Kolkata
```

Use the actual variable names from `.env.example` if they differ.

Initialize the database with demo data:

```bash
npm run seed
```

Start the backend server:

```bash
npm run dev
```

The backend API will be available at:

`http://localhost:5000`

### Step 3: Frontend Setup

Open a **second terminal** from the project root.

Navigate to the frontend directory:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Create the frontend environment file.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Configure the API URL in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

The frontend application will be available at:

`http://localhost:5173`

---

## ▶️ Running the Application

Make sure both the MongoDB server and the backend are running before accessing the frontend.

| Component | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| API Base URL | http://localhost:5000/api |

Keep the backend and frontend running in separate terminals.

---

## 🔐 Demo Login Credentials

The following accounts are available after running the database seed command.

| Role | Username | Password |
|---|---|---|
| Admin | admin01 | Admin@123 |
| Receptionist | reception01 | Recep@123 |
| Doctor | drsmith | Doctor@123 |
| Patient | patient01 | Pat@1234 |

Additional demo doctor accounts are also created by the seed script.

**Login Pages:**

- Staff: `/login`
- Doctor: `/doctor/login`
- Patient: `/patient/login`
- Guest Booking: `/book-appointment`

**Note:** Patients must have an existing hospital record created by an Admin or Receptionist before activating their login account.

These credentials are intended only for local academic demonstrations. Never use demo credentials or fallback secrets in production.

---

## 📁 Project Structure

```text
Hospital-Management-System/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── Documents/
│   ├── SRSdocument.pdf
│   ├── testPlanDocument.pdf
│   ├── useCaseDiagram.jpeg
│   ├── useCaseFlowDocumentation.pdf
│   ├── TEST_PLAN_COVERAGE.md
│   └── FINAL_VERIFICATION_CHECKLIST.md
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   └── routes/
│   ├── test/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
│
├── VideoDemo/
│   └── login.mp4
│
└── README.md
```

---

## 🧪 Testing

Automated backend tests can be executed using:

```bash
cd backend
npm test
```

For integration testing, configure a separate MongoDB test database and enable the integration test environment variable:

```powershell
$env:MONGODB_URI='mongodb://127.0.0.1:27017/hms_integration_test'
$env:HMS_INTEGRATION_TESTS='1'
npm run test:integration
```

The project also uses GitHub Actions to automate backend checks, syntax validation and frontend builds.

Refer to `Documents/TEST_PLAN_COVERAGE.md` for the test case implementation mapping.

---

## 📚 Project Documentation

| Document | Description |
|---|---|
| SRS | Software Requirements Specification |
| SAD | System Architecture Document |
| Test Plan | Software testing scenarios and test cases |
| Use Case Diagram | Actors and system interactions |
| Use Case Flow | Step-by-step use case descriptions |
| Test Coverage | Mapping of test cases to implementation |

---

## 🔄 Development Workflow

1. Select an issue from the GitHub Project board.
2. Create a new feature branch from `main`.
3. Implement the assigned functionality.
4. Commit and push your changes.
5. Create a Pull Request targeting `main`.
6. GitHub Actions automatically executes the configured checks.
7. The repository owner reviews and merges the Pull Request.

**GitHub Repository:** https://github.com/SamiShahapuri/Hospital-Management-System

**Project Board:** https://github.com/users/SamiShahapuri/projects/3

---

## ⚠️ Important Note

This application is developed for academic and educational purposes. It is not intended for real hospital deployment.

Use only demonstration data. Production deployment would require additional security reviews, proper secret management, audit logging, backups, email verification and secure medical data storage.

---

**Developed as part of the Software Engineering Mini-Project – PES University.**
