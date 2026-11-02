# Start the Hospital Management System on Windows

This guide is for the existing MERN project in this ZIP. Use demo records only.

## 1. Extract the ZIP

Extract the project to a normal folder, for example `C:\Users\YourName\Desktop\Hospital-Management-System`.

## 2. Start MongoDB

Make sure the local MongoDB service is running. In PowerShell:

```powershell
Get-Service MongoDB
```

If it is stopped, open PowerShell as Administrator and run:

```powershell
Start-Service MongoDB
```

The example backend URI is `mongodb://127.0.0.1:27017/hospital_management_sprint1`.

## 3. Start the backend

Open PowerShell in the extracted project folder:

```powershell
cd .\backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run seed
npm.cmd run dev
```

Keep this terminal open. The API should report that it is listening on `http://localhost:5000`.

The seed command creates the six illustrated departments, six doctors, three patient records and demo staff accounts. It also prints the seeded Patient IDs and email addresses. Run it again only when you want to refresh the demo accounts/data; it resets the seeded demo account passwords and clears their login lockout counters.

### Demo login accounts

| Portal | Username | Password |
|---|---|---|
| Staff Admin | `admin01` | `Admin@123` |
| Staff Receptionist | `reception01` | `Recep@123` |
| Doctor | `drsmith` | `Doctor@123` |

The same accounts can also sign in using their email addresses. Five additional seeded Doctors are listed in the seed output; they use `Doctor@123` by default.

## 4. Start the frontend

Open a second PowerShell window in the project folder:

```powershell
cd .\frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## 5. Patient login is a two-step process

A Patient cannot create a new hospital record from the login page.

1. Sign in as `admin01` or `reception01`.
2. Open Patient Records and register the patient with full name, age, gender, phone, email and address.
3. Copy the generated Patient ID and share it with the patient.
4. Open `/patient/login` in the browser, choose **First time here? Activate account using your Patient ID**, and enter the Patient ID, exact registered full name and email.
5. Choose username `patient01` and password `Pat@1234` to match the sample in the submitted test plan. The patient can then sign in using that username or email.

If the patient details do not exactly match the existing hospital record, activation is rejected. Register or correct the hospital record first.

## 6. Doctor login

Doctors use `/doctor/login`, not the staff login page. The seeded test account is `drsmith` / `Doctor@123`. When Admin/Receptionist adds a new Doctor, the form creates their Doctor account; share the username and initial password securely.

## Important notes

- Staff login: `/login`
- Doctor login: `/doctor/login`
- Patient login: `/patient/login`
- Guest appointment booking: `/book-appointment`
- Backend health check: `http://localhost:5000/api/health`
- If the frontend reports that it cannot reach the API, make sure the backend terminal is still running and that `frontend/.env` contains `VITE_API_URL=http://localhost:5000/api`.
- If port 5000 or 5173 is already in use, stop the other process or change the corresponding environment/configuration value.
- Never use this academic demo with real patient information or real hospital operations.
