import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, saveSession, clearSession } from "./api";
import DoctorDashboard from "./pages/doctor/DoctorDashboard.jsx";
import PatientDashboard from "./pages/patient/PatientDashboard.jsx";
import GuestBookingPage from "./pages/public/GuestBookingPage.jsx";
import RoleRoute from "./routes/RoleRoute.jsx";
import WorkspaceLayout from "./components/layout/WorkspaceLayout.jsx";
import DashboardPage from "./pages/admin/DashboardPage.jsx";
import AppointmentsPage from "./pages/admin/AppointmentsPage.jsx";
import PatientsPage from "./pages/admin/PatientsPage.jsx";
import DoctorsPage from "./pages/admin/DoctorsPage.jsx";
import DepartmentsPage from "./pages/admin/DepartmentsPage.jsx";
import AdmissionsPage from "./pages/admin/AdmissionsPage.jsx";
import LabTestsPage from "./pages/admin/LabTestsPage.jsx";
import BedsPage from "./pages/admin/BedsPage.jsx";
import BillingPage from "./pages/admin/BillingPage.jsx";
import ReportsPage from "./pages/admin/ReportsPage.jsx";
import DoctorAppointmentsPage from "./pages/doctor/DoctorAppointmentsPage.jsx";
import PatientAppointmentsPage from "./pages/patient/PatientAppointmentsPage.jsx";
import PatientBillsPage from "./pages/patient/PatientBillsPage.jsx";
import PatientRecordsPage from "./pages/patient/PatientRecordsPage.jsx";
import DoctorPatientsPage from "./pages/doctor/DoctorPatientsPage.jsx";
import ProfilePage from "./pages/shared/ProfilePage.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

const landing = (role) => `/${String(role || "").toLowerCase()}/dashboard`;
function LoginPage({ onLogin, allowedRoles, portalTitle, portalSubtitle, expectedRole }) {
  const navigate = useNavigate();
  const [login, setLogin] = useState({ email: "", password: "" });
  const [activating, setActivating] = useState(false);
  const [activation, setActivation] = useState({ patientId: "", name: "", email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (activating) {
        await api("/auth/register", { method: "POST", body: JSON.stringify(activation) });
        setLogin({ email: activation.email, password: activation.password });
        setActivating(false);
        setNotice("Your hospital record is linked. Your account is ready—sign in now.");
      } else {
        await onLogin(login, allowedRoles);
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const isPatient = expectedRole === "Patient";
  return <main className="auth-screen"><section className="auth-card">
    <div className="brand-mark">✚</div><p className="eyebrow">CITY CARE HOSPITAL</p>
    <h1>{activating ? "Activate patient account" : portalTitle}</h1>
    <p className="muted">{activating ? "Your patient record must already exist in hospital records." : portalSubtitle}</p>
    {activating ? <form className="form-stack" onSubmit={submit}>
      <label>Patient ID<input value={activation.patientId} placeholder="PT-ABC123" onChange={e=>setActivation({...activation,patientId:e.target.value.toUpperCase()})} required /></label>
      <label>Full name as registered<input value={activation.name} onChange={e=>setActivation({...activation,name:e.target.value})} required /></label>
      <label>Registered email<input type="email" value={activation.email} onChange={e=>setActivation({...activation,email:e.target.value})} required /></label>
      <label>Choose username<input required minLength="3" maxLength="32" pattern={"[a-zA-Z0-9._\\-]{3,32}"} value={activation.username} placeholder="patient01" onChange={e=>setActivation({...activation,username:e.target.value.toLowerCase()})} /></label>
      <label>Create password<input type="password" minLength="8" maxLength="128" value={activation.password} onChange={e=>setActivation({...activation,password:e.target.value})} required /></label>
      <button disabled={busy}>{busy ? "Checking record…" : "Activate account"}</button>
    </form> : <form className="form-stack" onSubmit={submit}>
      <label>Email or username<input type="text" autoComplete="username" placeholder="admin01 or admin@example.com" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required /></label>
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>}
    {error && <p className="form-message" role="alert">{error}</p>}
    {notice && <p className="success-message" role="status">{notice}</p>}
    {isPatient && !activating && <button className="link-button" onClick={()=>{setActivating(true);setError("");setNotice("");}}>First time here? Activate account using your Patient ID</button>}
    {activating && <button className="link-button" onClick={()=>{setActivating(false);setError("");}}>Back to patient sign in</button>}
    <div className="auth-links">
      {expectedRole !== "Doctor" && <button className="link-button" onClick={()=>navigate("/doctor/login")}>Doctor login</button>}
      {expectedRole !== "Patient" && <button className="link-button" onClick={()=>navigate("/patient/login")}>Patient login</button>}
      {expectedRole !== "Staff" && <button className="link-button" onClick={()=>navigate("/login")}>Staff login</button>}
    </div>
    {!isPatient && !activating && <button type="button" className="secondary-button full" onClick={() => navigate("/book-appointment")}>Book appointment without login</button>}
    {expectedRole === "Staff" && <p className="auth-hint">Demo accounts are created by running <code>npm run seed</code>.</p>}
    {isPatient && <p className="auth-hint">Not in the hospital records yet? Contact Reception to register before activating your patient account.</p>}
    {expectedRole === "Doctor" && <p className="auth-hint">Doctor accounts are created by the hospital administrator when a doctor is added.</p>}
  </section></main>;
}
export default function App() {
  const [user, setUser] = useState(() => { try { return localStorage.getItem("hms_token") ? JSON.parse(localStorage.getItem("hms_user")) : null; } catch { return null; } });
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("hms:session-expired", expire);
    return () => window.removeEventListener("hms:session-expired", expire);
  }, []);
  const login = async (credentials, allowedRoles) => {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
    if (allowedRoles?.length && !allowedRoles.includes(data.user.role)) {
      const rightPortal = data.user.role === "Doctor" ? "/doctor/login" : data.user.role === "Patient" ? "/patient/login" : "/login";
      throw new Error(`This account belongs to ${data.user.role}. Please use the correct sign-in page: ${rightPortal}`);
    }
    saveSession(data); setUser(data.user);
  };
  const logout = async () => {
    try { await api("/auth/logout", { method: "POST" }); }
    catch (error) { console.warn("Server logout could not be confirmed:", error.message); }
    finally { clearSession(); setUser(null); }
  };
  const home = useMemo(() => user ? landing(user.role) : "/login", [user]);
  if (!user) return <ToastProvider><Routes>
    <Route path="/book-appointment" element={<GuestBookingPage onPatientLogin={()=>window.location.assign("/patient/login")} />} />
    <Route path="/login" element={<LoginPage onLogin={login} allowedRoles={["Admin", "Receptionist"]} expectedRole="Staff" portalTitle="Staff sign in" portalSubtitle="Administrator and Receptionist access to hospital operations." />} />
    <Route path="/doctor/login" element={<LoginPage onLogin={login} allowedRoles={["Doctor"]} expectedRole="Doctor" portalTitle="Doctor sign in" portalSubtitle="Access your clinical schedule and assigned patients." />} />
    <Route path="/patient/login" element={<LoginPage onLogin={login} allowedRoles={["Patient"]} expectedRole="Patient" portalTitle="Patient sign in" portalSubtitle="View your appointments, medical records and bills." />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes></ToastProvider>;
  return <ToastProvider><Routes>
    <Route path="/" element={<Navigate to={home} replace />} />
    <Route element={<RoleRoute user={user} roles={["Admin"]} />}><Route path="/admin" element={<WorkspaceLayout user={user} onLogout={logout} />}>
      <Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="appointments" element={<AppointmentsPage />} /><Route path="patients" element={<PatientsPage />} /><Route path="doctors" element={<DoctorsPage />} /><Route path="departments" element={<DepartmentsPage />} /><Route path="wards" element={<BedsPage mode="wards" />} /><Route path="rooms" element={<BedsPage mode="rooms" />} /><Route path="beds" element={<BedsPage mode="beds" />} /><Route path="admissions" element={<AdmissionsPage />} /><Route path="lab-tests" element={<LabTestsPage />} /><Route path="billing" element={<BillingPage />} /><Route path="reports" element={<ReportsPage />} />
    </Route></Route>
    <Route element={<RoleRoute user={user} roles={["Receptionist"]} />}><Route path="/receptionist" element={<WorkspaceLayout user={user} onLogout={logout} />}>
      <Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<DashboardPage />} /><Route path="appointments" element={<AppointmentsPage />} /><Route path="patients" element={<PatientsPage />} /><Route path="admissions" element={<AdmissionsPage />} /><Route path="lab-tests" element={<LabTestsPage />} />
    </Route></Route>
    <Route element={<RoleRoute user={user} roles={["Doctor"]} />}>
      <Route path="/doctor/dashboard" element={<DoctorDashboard user={user} onLogout={logout} />} />
      <Route path="/doctor/appointments" element={<DoctorAppointmentsPage user={user} onLogout={logout} />} />
      <Route path="/doctor/patients" element={<DoctorPatientsPage user={user} onLogout={logout} />} />
      <Route path="/doctor/profile" element={<ProfilePage role="Doctor" user={user} onLogout={logout} />} />
    </Route>
    <Route element={<RoleRoute user={user} roles={["Patient"]} />}>
      <Route path="/patient/dashboard" element={<PatientDashboard user={user} onLogout={logout} />} />
      <Route path="/patient/appointments" element={<PatientAppointmentsPage user={user} onLogout={logout} />} />
      <Route path="/patient/records" element={<PatientRecordsPage user={user} onLogout={logout} />} />
      <Route path="/patient/billing" element={<PatientBillsPage user={user} onLogout={logout} />} />
      <Route path="/patient/profile" element={<ProfilePage role="Patient" user={user} onLogout={logout} />} />
    </Route>
    <Route path="/book-appointment" element={<GuestBookingPage onPatientLogin={() => window.location.assign(home)} />} />
    <Route path="*" element={<Navigate to={home} replace />} />
  </Routes></ToastProvider>;
}
