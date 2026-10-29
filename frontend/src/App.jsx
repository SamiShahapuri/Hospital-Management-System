import { useEffect, useState } from "react";
import { api, saveSession, clearSession } from "./api";

const initialLogin = { email: "", password: "" };
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("hms_user"));
      return localStorage.getItem("hms_token") && typeof savedUser?.name === "string" ? savedUser : null;
    } catch { return null; }
  });
  const [login, setLogin] = useState(initialLogin);
  const [registerMode, setRegisterMode] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({ name: "", email: "", password: "" });
  const [notice, setNotice] = useState("");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [bills, setBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [medicalForm, setMedicalForm] = useState({ patient: "", diagnosis: "", treatment: "", note: "" });
  const [prescriptionForm, setPrescriptionForm] = useState({ patient: "", medicine: "", instructions: "" });
  const [billingForm, setBillingForm] = useState({ patient: "", description: "", quantity: "1", unitPrice: "", notes: "" });
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [search, setSearch] = useState("");
  const [appointmentForm, setAppointmentForm] = useState({ patient: "", doctor: "", scheduledAt: "", reason: "" });
  const [reschedulingAppointment, setReschedulingAppointment] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [admissionForm, setAdmissionForm] = useState({ patient: "", roomNumber: "", bedNumber: "" });
  const [doctorForm, setDoctorForm] = useState({ fullName: "", specialization: "", department: "" });
  const [departmentForm, setDepartmentForm] = useState({ name: "", description: "" });
  const [departments, setDepartments] = useState([]);
  const [editingDoctor, setEditingDoctor] = useState("");
  const [doctorEditForm, setDoctorEditForm] = useState({ fullName: "", specialization: "", department: "" });
  const [editingDepartment, setEditingDepartment] = useState("");
  const [departmentEditForm, setDepartmentEditForm] = useState({ name: "", description: "" });

  async function refresh() {
    try {
      const canManageAdmissions = ["Admin", "Doctor", "Receptionist"].includes(user?.role);
      const canManageBilling = user?.role === "Admin" || user?.role === "Receptionist";
      const canSeeNotifications = ["Admin", "Doctor", "Receptionist"].includes(user?.role);
      const canSeeReports = user?.role === "Admin";
      const [p, d, a, ad, depts, b, n, report] = await Promise.all([
        api("/patients"), api("/doctors"), api("/appointments"),
        canManageAdmissions ? api("/admissions") : Promise.resolve([]),
        api("/departments"), canManageBilling ? api("/billing") : Promise.resolve([]),
        canSeeNotifications ? api("/notifications") : Promise.resolve([]),
        canSeeReports ? api("/reports/summary") : Promise.resolve(null)
      ]);
      setPatients(p); setDoctors(d); setAppointments(a); setAdmissions(ad); setDepartments(depts);
      if (user?.role === "Patient" && p[0]?._id) {
        setAppointmentForm(current => ({ ...current, patient: p[0]._id }));
      }
      setBills(b); setNotifications(n); setReportSummary(report); setNotice("");
    } catch (e) {
      setNotice(e.message);
      if (e.status === 401) { clearSession(); setUser(null); }
    }
  }
  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      setUser(null);
      setNotice("Your session expired. Please sign in again.");
    };
    window.addEventListener("hms:session-expired", handleSessionExpired);
    return () => window.removeEventListener("hms:session-expired", handleSessionExpired);
  }, []);

  useEffect(() => { if (user) refresh(); }, [user]);

  async function submitLogin(e) {
    e.preventDefault();
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(login) });
      saveSession(data); setUser(data.user); setNotice(`Welcome, ${data.user.name}`);
    } catch (e) { setNotice(e.message); }
  }
  async function submitRegistration(e) {
    e.preventDefault();
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify(registrationForm) });
      setLogin({ email: registrationForm.email, password: registrationForm.password });
      setRegistrationForm({ name: "", email: "", password: "" });
      setRegisterMode(false);
      setNotice("Patient account created. Sign in to continue.");
    } catch (e) { setNotice(e.message); }
  }

  async function registerPatient(e) {
    e.preventDefault();
    try {
      await api("/patients", { method: "POST", body: JSON.stringify(form) });
      setForm({ fullName: "", phone: "", email: "" });
      setNotice("Patient registered successfully."); await refresh();
    } catch (e) { setNotice(e.message); }
  }
  async function addDoctor(e) {
    e.preventDefault();
    try {
      await api("/doctors", { method: "POST", body: JSON.stringify({ ...doctorForm, availability: [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: "09:00", endTime: "17:00" })) }) });
      setDoctorForm({ fullName: "", specialization: "", department: "" });
      setNotice("Doctor profile created."); await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function addDepartment(e) {
    e.preventDefault();
    try {
      await api("/departments", { method: "POST", body: JSON.stringify(departmentForm) });
      setDepartmentForm({ name: "", description: "" });
      setNotice("Department created successfully.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  function beginDoctorEdit(doctor) {
    setEditingDoctor(doctor._id);
    setDoctorEditForm({
      fullName: doctor.fullName || "",
      specialization: doctor.specialization || "",
      department: doctor.department || ""
    });
  }

  async function saveDoctorEdit(e) {
    e.preventDefault();
    try {
      await api(`/doctors/${editingDoctor}`, {
        method: "PATCH",
        body: JSON.stringify(doctorEditForm)
      });
      setEditingDoctor("");
      setNotice("Doctor profile updated.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function deactivateDoctor(id) {
    if (!window.confirm("Deactivate this doctor? Existing appointments will remain in history.")) return;
    try {
      await api(`/doctors/${id}`, { method: "DELETE" });
      if (editingDoctor === id) setEditingDoctor("");
      setNotice("Doctor deactivated.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  function beginDepartmentEdit(department) {
    setEditingDepartment(department._id);
    setDepartmentEditForm({
      name: department.name || "",
      description: department.description || ""
    });
  }

  async function saveDepartmentEdit(e) {
    e.preventDefault();
    try {
      await api(`/departments/${editingDepartment}`, {
        method: "PATCH",
        body: JSON.stringify(departmentEditForm)
      });
      setEditingDepartment("");
      setNotice("Department updated; assigned doctor records were synchronized.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function deactivateDepartment(id) {
    if (!window.confirm("Deactivate this department? Active doctors must be reassigned or deactivated first.")) return;
    try {
      await api(`/departments/${id}`, { method: "DELETE" });
      if (editingDepartment === id) setEditingDepartment("");
      setNotice("Department deactivated.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function bookAppointment(e) {
    e.preventDefault();
    const scheduledDate = appointmentForm.scheduledAt ? new Date(appointmentForm.scheduledAt) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setNotice("Choose a valid future appointment date and time.");
      return;
    }
    try {
      await api("/appointments", { method: "POST", body: JSON.stringify({ ...appointmentForm, scheduledAt: scheduledDate.toISOString() }) });
      setAppointmentForm({ patient: "", doctor: "", scheduledAt: "", reason: "" });
      setNotice("Appointment booked successfully."); await refresh();
    } catch (e) { setNotice(e.message); }
  }
  async function admitPatient(e) {
    e.preventDefault();
    try {
      await api("/admissions", { method: "POST", body: JSON.stringify(admissionForm) });
      setAdmissionForm({ patient: "", roomNumber: "", bedNumber: "" });
      setNotice("Patient admitted and bed allocated."); await refresh();
    } catch (e) { setNotice(e.message); }
  }
  async function savePrescription(e) {
    e.preventDefault();
    try {
      await api(`/patients/${prescriptionForm.patient}/prescriptions`, {
        method: "POST",
        body: JSON.stringify({ medicine: prescriptionForm.medicine, instructions: prescriptionForm.instructions })
      });
      setPrescriptionForm({ patient: "", medicine: "", instructions: "" });
      setNotice("Prescription recorded successfully.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function createBill(e) {
    e.preventDefault();
    try {
      await api("/billing", {
        method: "POST",
        body: JSON.stringify({
          patient: billingForm.patient,
          items: [{
            description: billingForm.description,
            quantity: Number(billingForm.quantity),
            unitPrice: Number(billingForm.unitPrice)
          }],
          notes: billingForm.notes
        })
      });
      setBillingForm({ patient: "", description: "", quantity: "1", unitPrice: "", notes: "" });
      setNotice("Bill created successfully.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function markBillPaid(id) {
    try {
      await api(`/billing/${id}/pay`, { method: "PATCH" });
      setNotice("Bill marked as paid.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function cancelBill(id) {
    try {
      await api(`/billing/${id}/cancel`, { method: "PATCH" });
      setNotice("Unpaid bill cancelled.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function saveMedicalRecord(e) {
    e.preventDefault();
    try {
      await api(`/patients/${medicalForm.patient}/history`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis: medicalForm.diagnosis,
          treatment: medicalForm.treatment,
          note: medicalForm.note
        })
      });
      setMedicalForm({ patient: "", diagnosis: "", treatment: "", note: "" });
      setNotice("Diagnosis and treatment recorded successfully.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  function startReschedule(appointment) {
    const localDate = new Date(new Date(appointment.scheduledAt).getTime() - new Date(appointment.scheduledAt).getTimezoneOffset() * 60000);
    setReschedulingAppointment(appointment._id);
    setRescheduleDate(localDate.toISOString().slice(0, 16));
  }

  async function saveReschedule(e) {
    e.preventDefault();
    const scheduledDate = rescheduleDate ? new Date(rescheduleDate) : null;
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setNotice("Choose a valid future appointment date and time.");
      return;
    }
    try {
      await api(`/appointments/${reschedulingAppointment}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: scheduledDate.toISOString() })
      });
      setReschedulingAppointment("");
      setRescheduleDate("");
      setNotice("Appointment rescheduled successfully.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function completeAppointment(id) {
    try {
      await api(`/appointments/${id}/complete`, { method: "PATCH" });
      setNotice("Appointment marked as completed.");
      await refresh();
    } catch (e) { setNotice(e.message); }
  }

  async function cancelAppointment(id) {
    try { await api(`/appointments/${id}/cancel`, { method: "PATCH" }); setNotice("Appointment cancelled."); await refresh(); }
    catch (e) { setNotice(e.message); }
  }
  async function discharge(id) {
    try { await api(`/admissions/${id}/discharge`, { method: "PATCH" }); setNotice("Patient discharged; bed is now available."); await refresh(); }
    catch (e) { setNotice(e.message); }
  }

  if (!user) return <main className="login-wrap"><section className="login card">
    <div className="logo">✚</div><p className="eyebrow">SPRINT 2 DEMO</p><h1>Hospital Management</h1>
    <p className="muted">Sign in to manage patients, doctors and appointments.</p>
    {registerMode ? <form onSubmit={submitRegistration} className="stack">
      <label>Full name<input value={registrationForm.name} onChange={e => setRegistrationForm({ ...registrationForm, name: e.target.value })} maxLength="100" required /></label>
      <label>Email<input type="email" value={registrationForm.email} onChange={e => setRegistrationForm({ ...registrationForm, email: e.target.value })} required /></label>
      <label>Password (at least 8 characters)<input type="password" value={registrationForm.password} onChange={e => setRegistrationForm({ ...registrationForm, password: e.target.value })} minLength="8" required /></label>
      <button>Create patient account</button>
    </form> : <form onSubmit={submitLogin} className="stack">
      <label>Email<input type="email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} required /></label>
      <label>Password<input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required /></label>
      <button>Sign in</button>
    </form>}
    <button type="button" className="outline register-toggle" onClick={() => { setRegisterMode(!registerMode); setNotice(""); }}>
      {registerMode ? "Back to sign in" : "Create a patient account"}
    </button>
    <p className="hint">Demo staff accounts are created with <code>npm run seed</code>. Patient accounts can be created here.</p>
    {notice && <p className="notice">{notice}</p>}
  </section></main>;

  const filteredPatients = patients.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()));
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>✚</span><div><strong>CarePoint</strong><small>Hospital System</small></div></div>
      <p className="nav-label">WORKSPACE</p><a className="active" href="#overview">Overview</a><a href="#patients">Patients</a><a href="#appointments">Appointments</a><a href="#admissions">Admissions</a>
      <div className="sidebar-bottom"><div className="avatar">{user.name?.[0] || "U"}</div><div><strong>{user.name}</strong><small>{user.role}</small></div><button className="quiet" onClick={() => { clearSession(); setUser(null); }}>↪</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><p className="eyebrow">HOSPITAL / OVERVIEW</p><h1>Good day, {user.name?.split(" ")[0] || "there"}</h1><p className="muted">Here’s the current snapshot of your hospital.</p></div><div className="top-right"><span className="live-dot"></span> Sprint 2 <button className="outline" onClick={refresh}>Refresh data</button></div></header>
      {notice && <div className="notice">{notice}</div>}
      <section className="metrics" id="overview">
        <Metric label="Registered patients" value={patients.length} note="Patient records" icon="♙"/>
        <Metric label="Doctors" value={doctors.length} note="Clinical team" icon="✚"/>
        <Metric label="Appointments" value={appointments.filter(a => a.status === "Booked").length} note="Currently booked" icon="▦"/>
        <Metric label="Active admissions" value={admissions.filter(a => a.status === "Admitted").length} note="Beds occupied" icon="▤"/>
      </section>
      <section className="quick-actions">
        {(user.role === "Admin" || user.role === "Receptionist") && <div className="card quick-card">
          <div className="section-head"><div><h2>Add doctor</h2><p className="muted">Default availability: weekdays, 09:00–17:00</p></div></div>
          <form className="quick-form" onSubmit={addDoctor}>
            <input placeholder="Doctor full name" value={doctorForm.fullName} onChange={e => setDoctorForm({ ...doctorForm, fullName: e.target.value })} required />
            <input placeholder="Specialization" value={doctorForm.specialization} onChange={e => setDoctorForm({ ...doctorForm, specialization: e.target.value })} required />
            <select value={doctorForm.department} onChange={e => setDoctorForm({ ...doctorForm, department: e.target.value })}><option value="">No department yet</option>{departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}</select>
            <button>Add doctor</button>
          </form>
          <div className="manage-list" aria-label="Active doctor management">
            {doctors.map(doctor => <div className="manage-row" key={doctor._id}>
              <div className="manage-main"><strong>{doctor.fullName}</strong><small>{doctor.specialization}{doctor.department ? ` · ${doctor.department}` : ""}</small></div>
              <div className="manage-actions">
                <button type="button" className="tiny outline" onClick={() => beginDoctorEdit(doctor)}>Edit</button>
                {user.role === "Admin" && <button type="button" className="tiny outline" onClick={() => deactivateDoctor(doctor._id)}>Deactivate</button>}
              </div>
            </div>)}
            {!doctors.length && <p className="empty">No active doctors yet.</p>}
          </div>
          {editingDoctor && <form className="quick-form edit-form" onSubmit={saveDoctorEdit}>
            <strong>Edit doctor profile</strong>
            <input aria-label="Doctor full name" value={doctorEditForm.fullName} onChange={e => setDoctorEditForm({ ...doctorEditForm, fullName: e.target.value })} required maxLength="120" />
            <input aria-label="Doctor specialization" value={doctorEditForm.specialization} onChange={e => setDoctorEditForm({ ...doctorEditForm, specialization: e.target.value })} required maxLength="100" />
            <select aria-label="Doctor department" value={doctorEditForm.department} onChange={e => setDoctorEditForm({ ...doctorEditForm, department: e.target.value })}>
              <option value="">No department</option>
              {departments.map(department => <option key={department._id} value={department.name}>{department.name}</option>)}
              {doctorEditForm.department && !departments.some(department => department.name === doctorEditForm.department) && <option value={doctorEditForm.department}>{doctorEditForm.department} (inactive)</option>}
            </select>
            <div className="manage-actions">
              <button type="submit">Save changes</button>
              <button type="button" className="outline" onClick={() => setEditingDoctor("")}>Cancel</button>
            </div>
          </form>}
        </div>}
        {(user.role === "Admin" || user.role === "Receptionist" || user.role === "Patient") && <div className="card quick-card">
          <div className="section-head"><div><h2>Book appointment</h2><p className="muted">Select a patient, doctor and future time</p></div></div>
          <form className="quick-form" onSubmit={bookAppointment}>
            <select value={appointmentForm.patient} onChange={e => setAppointmentForm({ ...appointmentForm, patient: e.target.value })} required><option value="">{user.role === "Patient" ? "Your patient profile" : "Choose patient"}</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}</select>
            <select value={appointmentForm.doctor} onChange={e => setAppointmentForm({ ...appointmentForm, doctor: e.target.value })} required><option value="">Choose doctor</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.fullName} — {d.specialization}</option>)}</select>
            <input type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={appointmentForm.scheduledAt} onChange={e => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })} required />
            <input placeholder="Reason (optional)" value={appointmentForm.reason} onChange={e => setAppointmentForm({ ...appointmentForm, reason: e.target.value })} />
            <button>Book appointment</button>
          </form>
        </div>}
        {(user.role === "Admin" || user.role === "Receptionist" || user.role === "Doctor") && <div className="card quick-card">
          <div className="section-head"><div><h2>Admit patient</h2><p className="muted">Allocate an available room and bed</p></div></div>
          <form className="quick-form" onSubmit={admitPatient}>
            <select value={admissionForm.patient} onChange={e => setAdmissionForm({ ...admissionForm, patient: e.target.value })} required><option value="">Choose patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}</select>
            <input placeholder="Room number" value={admissionForm.roomNumber} onChange={e => setAdmissionForm({ ...admissionForm, roomNumber: e.target.value })} required />
            <input placeholder="Bed number" value={admissionForm.bedNumber} onChange={e => setAdmissionForm({ ...admissionForm, bedNumber: e.target.value })} required />
            <button>Admit patient</button>
          </form>
        </div>}

        {(user.role === "Admin" || user.role === "Doctor") && <div className="card quick-card">
          <div className="section-head"><div><h2>Record diagnosis & treatment</h2><p className="muted">Add a clinical entry to the patient record</p></div></div>
          <form className="quick-form" onSubmit={saveMedicalRecord}>
            <select value={medicalForm.patient} onChange={e => setMedicalForm({ ...medicalForm, patient: e.target.value })} required>
              <option value="">Choose patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}
            </select>
            <input placeholder="Diagnosis" value={medicalForm.diagnosis} onChange={e => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })} maxLength="300" required />
            <textarea placeholder="Treatment plan" value={medicalForm.treatment} onChange={e => setMedicalForm({ ...medicalForm, treatment: e.target.value })} maxLength="1000" rows="2" required />
            <textarea placeholder="Additional clinical note (optional)" value={medicalForm.note} onChange={e => setMedicalForm({ ...medicalForm, note: e.target.value })} maxLength="1000" rows="2" />
            <button>Save clinical record</button>
          </form>
        </div>}
        {(user.role === "Admin" || user.role === "Doctor") && <div className="card quick-card">
          <div className="section-head"><div><h2>Record prescription</h2><p className="muted">Store medication instructions on a patient record</p></div></div>
          <form className="quick-form" onSubmit={savePrescription}>
            <select value={prescriptionForm.patient} onChange={e => setPrescriptionForm({ ...prescriptionForm, patient: e.target.value })} required>
              <option value="">Choose patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}
            </select>
            <input placeholder="Medicine" value={prescriptionForm.medicine} onChange={e => setPrescriptionForm({ ...prescriptionForm, medicine: e.target.value })} maxLength="200" required />
            <textarea placeholder="Dosage and instructions" value={prescriptionForm.instructions} onChange={e => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })} maxLength="1000" rows="2" />
            <button>Save prescription</button>
          </form>
        </div>}
        {(user.role === "Admin" || user.role === "Receptionist") && <div className="card quick-card">
          <div className="section-head"><div><h2>Create bill</h2><p className="muted">Create an itemized patient bill</p></div></div>
          <form className="quick-form" onSubmit={createBill}>
            <select value={billingForm.patient} onChange={e => setBillingForm({ ...billingForm, patient: e.target.value })} required>
              <option value="">Choose patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}
            </select>
            <input placeholder="Service or item description" value={billingForm.description} onChange={e => setBillingForm({ ...billingForm, description: e.target.value })} maxLength="200" required />
            <div className="inline-fields">
              <input type="number" min="1" max="1000" step="1" aria-label="Quantity" placeholder="Quantity" value={billingForm.quantity} onChange={e => setBillingForm({ ...billingForm, quantity: e.target.value })} required />
              <input type="number" min="0" max="1000000" step="0.01" aria-label="Unit price" placeholder="Unit price (₹)" value={billingForm.unitPrice} onChange={e => setBillingForm({ ...billingForm, unitPrice: e.target.value })} required />
            </div>
            <input placeholder="Billing note (optional)" value={billingForm.notes} onChange={e => setBillingForm({ ...billingForm, notes: e.target.value })} maxLength="500" />
            <button>Create bill</button>
          </form>
        </div>}
        {user.role === "Admin" && <div className="card quick-card">
          <div className="section-head"><div><h2>Manage departments</h2><p className="muted">Maintain hospital departments</p></div></div>
          <form className="quick-form" onSubmit={addDepartment}>
            <input placeholder="Department name" value={departmentForm.name} onChange={e => setDepartmentForm({ ...departmentForm, name: e.target.value })} required />
            <input placeholder="Description (optional)" value={departmentForm.description} onChange={e => setDepartmentForm({ ...departmentForm, description: e.target.value })} />
            <button>Add department</button>
          </form>
          <div className="manage-list" aria-label="Department management">
            {departments.map(department => <div className="manage-row" key={department._id}>
              <div className="manage-main"><strong>{department.name}</strong><small>{department.description || "No description"}</small></div>
              <div className="manage-actions">
                <button type="button" className="tiny outline" onClick={() => beginDepartmentEdit(department)}>Edit</button>
                <button type="button" className="tiny outline" onClick={() => deactivateDepartment(department._id)}>Deactivate</button>
              </div>
            </div>)}
            {!departments.length && <p className="empty">No active departments yet.</p>}
          </div>
          {editingDepartment && <form className="quick-form edit-form" onSubmit={saveDepartmentEdit}>
            <strong>Edit department</strong>
            <input aria-label="Department name" value={departmentEditForm.name} onChange={e => setDepartmentEditForm({ ...departmentEditForm, name: e.target.value })} required maxLength="100" />
            <input aria-label="Department description" value={departmentEditForm.description} onChange={e => setDepartmentEditForm({ ...departmentEditForm, description: e.target.value })} maxLength="500" />
            <div className="manage-actions">
              <button type="submit">Save changes</button>
              <button type="button" className="outline" onClick={() => setEditingDepartment("")}>Cancel</button>
            </div>
          </form>}
        </div>}
      </section>
      <section className="content-grid">
        <div className="card patients-card" id="patients"><div className="section-head"><div><h2>Patient directory</h2><p className="muted">Register and search patient records</p></div><span className="pill">{patients.length} records</span></div>
          {(user.role === "Admin" || user.role === "Receptionist") && <form className="patient-form" onSubmit={registerPatient}>
            <input placeholder="Patient full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/>
            <input placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
            <button>+ Register</button>
          </form>}
          <input className="search" placeholder="⌕  Search patients by name..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Phone</th><th>Registered</th></tr></thead><tbody>
            {filteredPatients.map(p => <tr key={p._id}><td><div className="person"><span className="mini-avatar">{p.fullName[0]}</span><strong>{p.fullName}</strong></div></td><td>{p.phone || "—"}</td><td>{new Date(p.createdAt).toLocaleDateString()}</td></tr>)}
            {!filteredPatients.length && (
  <tr>
    <td colSpan="3" className="empty">
      {search.trim()
        ? "No patients match your search."
        : "No patient records yet. Register a patient to get started."}
    </td>
  </tr>
)}
          </tbody></table></div>
        </div>
        <div className="right-column">
          <div className="card" id="appointments"><div className="section-head"><div><h2>Appointments</h2><p className="muted">Upcoming schedule</p></div><span className="icon-box">▦</span></div>
            {appointments.slice(0, 5).map(a => <div className="list-row" key={a._id}><div className="date-box"><strong>{new Date(a.scheduledAt).getDate()}</strong><small>{new Date(a.scheduledAt).toLocaleString("en", { month: "short" })}</small></div><div className="list-main"><strong>{a.patient?.fullName || "Patient"}</strong><small>{a.doctor?.fullName || "Doctor"} · {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div><span className={`status ${a.status.toLowerCase()}`}>{a.status}</span>{a.status === "Booked" && ["Admin", "Doctor"].includes(user.role) && <button className="tiny outline" onClick={() => completeAppointment(a._id)}>Complete</button>}{a.status === "Booked" && ["Admin", "Receptionist", "Patient"].includes(user.role) && <><button className="tiny outline" onClick={() => startReschedule(a)}>Reschedule</button><button className="tiny outline" onClick={() => cancelAppointment(a._id)}>Cancel</button></>}</div>)}
            {reschedulingAppointment && appointments.some(a => a._id === reschedulingAppointment) && <form className="reschedule-form" onSubmit={saveReschedule}>
              <label>New appointment time<input type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} required /></label>
              <button>Save new time</button><button type="button" className="outline" onClick={() => { setReschedulingAppointment(""); setRescheduleDate(""); }}>Cancel edit</button>
            </form>}
            {!appointments.length && <p className="empty">No appointments yet.</p>}
          </div>
          {user.role === "Patient" && <div className="card"><div className="section-head"><div><h2>My medical records</h2><p className="muted">Your recorded diagnoses, treatment plans, and prescriptions</p></div></div>
            {(patients[0]?.medicalHistory || []).slice().reverse().map((record, index) => <div className="list-row" key={record._id || `history-${index}`}>
              <div className="bed-icon">✚</div><div className="list-main"><strong>{record.diagnosis || "Clinical note"}</strong><small>{record.treatment || record.note || "No treatment details recorded"}</small></div>
              <span className="pill">{record.recordedAt ? new Date(record.recordedAt).toLocaleDateString() : "—"}</span>
            </div>)}
            {(patients[0]?.prescriptions || []).slice().reverse().map((prescription, index) => <div className="list-row" key={prescription._id || `prescription-${index}`}>
              <div className="bed-icon">Rx</div><div className="list-main"><strong>{prescription.medicine}</strong><small>{prescription.instructions || "No instructions recorded"}</small></div>
              <span className="pill">{prescription.recordedAt ? new Date(prescription.recordedAt).toLocaleDateString() : "—"}</span>
            </div>)}
            {!patients[0] && <p className="empty">No patient profile is linked to this account yet.</p>}
            {patients[0] && !(patients[0].medicalHistory || []).length && !(patients[0].prescriptions || []).length && <p className="empty">No medical records have been added yet.</p>}
          </div>}
          <div className="card" id="admissions"><div className="section-head"><div><h2>Admissions & beds</h2><p className="muted">Inpatient status</p></div><span className="icon-box">▤</span></div>
            {admissions.filter(a => a.status === "Admitted").slice(0, 4).map(a => <div className="list-row" key={a._id}><div className="bed-icon">▤</div><div className="list-main"><strong>{a.patient?.fullName || "Patient"}</strong><small>Room {a.roomNumber} · Bed {a.bedNumber}</small></div><button className="tiny outline" onClick={() => discharge(a._id)}>Discharge</button></div>)}
            {!admissions.some(a => a.status === "Admitted") && <p className="empty">No active admissions.</p>}
          </div>
          {(user.role === "Admin" || user.role === "Doctor" || user.role === "Receptionist") && <div className="card"><div className="section-head"><div><h2>Notifications</h2><p className="muted">Upcoming appointments and unpaid bills</p></div><span className="icon-box">♧</span></div>
            {notifications.slice(0, 5).map(notification => <div className="list-row" key={notification.id}>
              <div className="bed-icon">!</div><div className="list-main"><strong>{notification.type}</strong><small>{notification.message}</small></div>
              <span className="pill">{new Date(notification.dueAt).toLocaleDateString()}</span>
            </div>)}
            {!notifications.length && <p className="empty">No reminders to show.</p>}
          </div>}
          {user.role === "Admin" && reportSummary && <div className="card"><div className="section-head"><div><h2>Operations report</h2><p className="muted">Live summary across hospital records</p></div><span className="icon-box">▤</span></div>
            <div className="report-grid">
              <div><small>Patients</small><strong>{reportSummary.patients}</strong></div>
              <div><small>Active doctors</small><strong>{reportSummary.activeDoctors}</strong></div>
              <div><small>Booked appointments</small><strong>{reportSummary.appointments?.Booked || 0}</strong></div>
              <div><small>Active admissions</small><strong>{reportSummary.admissions?.Admitted || 0}</strong></div>
              <div><small>Paid revenue</small><strong>₹{Number(reportSummary.paidRevenue || 0).toFixed(2)}</strong></div>
              <div><small>Outstanding</small><strong>₹{Number(reportSummary.outstandingAmount || 0).toFixed(2)}</strong></div>
            </div>
            <small className="muted">Generated {new Date(reportSummary.generatedAt).toLocaleString()}</small>
          </div>}
          {(user.role === "Admin" || user.role === "Doctor") && <div className="card"><div className="section-head"><div><h2>Recent clinical records</h2><p className="muted">Latest diagnosis and treatment entries</p></div></div>
            {patients.flatMap(p => (p.medicalHistory || []).map((h, index) => ({ ...h, patientName: p.fullName, patientId: p._id, fallbackKey: index })))
              .sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)).slice(0, 5).map(h =>
                <div className="list-row" key={`${h.patientId}-${h._id || h.fallbackKey}`}>
                  <div className="bed-icon">✚</div><div className="list-main"><strong>{h.patientName}</strong>
                    <small>{h.diagnosis || h.note || "Clinical entry"}{h.treatment ? ` · ${h.treatment}` : ""}</small>
                  </div><span className="pill">{h.recordedAt ? new Date(h.recordedAt).toLocaleDateString() : "—"}</span>
                </div>)}
            {!patients.some(p => (p.medicalHistory || []).length) && <p className="empty">No clinical records yet.</p>}
          </div>}
          {(user.role === "Admin" || user.role === "Receptionist") && <div className="card"><div className="section-head"><div><h2>Billing & payments</h2><p className="muted">Latest patient bills</p></div><span className="icon-box">₹</span></div>
            {bills.slice(0, 5).map(bill => <div className="list-row" key={bill._id}>
              <div className="bed-icon">₹</div><div className="list-main"><strong>{bill.patient?.fullName || "Patient"} · ₹{Number(bill.subtotal).toFixed(2)}</strong>
                <small>{(bill.items || []).map(item => `${item.description} × ${item.quantity}`).join(", ")}</small>
              </div><span className={`status ${bill.status.toLowerCase()}`}>{bill.status}</span>
              {bill.status === "Unpaid" && <button className="tiny outline" onClick={() => markBillPaid(bill._id)}>Mark paid</button>}
              {bill.status === "Unpaid" && <button className="tiny outline" onClick={() => cancelBill(bill._id)}>Cancel</button>}
            </div>)}
            {!bills.length && <p className="empty">No bills yet.</p>}
          </div>}
        </div>
      </section>
      <footer>CarePoint HMS · Sprint 2 <span>Demo data only · Do not enter real patient information</span></footer>
    </main>
  </div>;
}
function Metric({ label, value, note, icon }) {
  return <div className="card metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><small>{note}</small></div>;
}
