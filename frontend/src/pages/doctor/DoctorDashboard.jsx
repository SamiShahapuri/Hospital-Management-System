import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import AvailabilityEditor from "../../components/AvailabilityEditor.jsx";
import { Avatar, PageHeader, ProfileEditor, AppointmentRow, dateLabel, timeLabel } from "../../components/role/RoleWidgets.jsx";

export default function DoctorDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [recordTarget, setRecordTarget] = useState(null);
  const [recordType, setRecordType] = useState("history");
  const [recordForm, setRecordForm] = useState({ diagnosis: "", treatment: "", note: "", medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
  const [savingRecord, setSavingRecord] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // Load the profile first: it also links legacy doctor accounts to their doctor record.
      // The appointments request must run after that link exists so the API can scope results correctly.
      const doctor = await api("/doctors/me/profile");
      const [appts, reminderRows] = await Promise.all([api("/appointments"), api("/notifications")]);
      setProfile(doctor); setAppointments(appts); setReminders(reminderRows); setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const todayAppointments = useMemo(() => appointments.filter((item) => new Date(item.scheduledAt).toDateString() === new Date().toDateString() && ["Booked", "Confirmed"].includes(item.status)), [appointments]);
  const nextAppointments = useMemo(() => appointments.filter((item) => ["Booked", "Confirmed"].includes(item.status) && new Date(item.scheduledAt) >= new Date()).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)).slice(0, 7), [appointments]);
  const recentPatients = useMemo(() => {
    const seen = new Set();
    return [...appointments].sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)).filter((item) => item.patient?._id && !seen.has(item.patient._id) && seen.add(item.patient._id)).slice(0, 6);
  }, [appointments]);

  async function updateAppointment(id, action) {
    try { await api(`/appointments/${id}/${action}`, { method: "PATCH" }); await load(); }
    catch (e) { setError(e.message); }
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!recordTarget) return;
    setSavingRecord(true); setError("");
    try {
      const endpoint = recordType === "history" ? `/patients/${recordTarget._id}/history` : `/patients/${recordTarget._id}/prescriptions`;
      const body = recordType === "history"
        ? { diagnosis: recordForm.diagnosis, treatment: recordForm.treatment, note: recordForm.note }
        : { medicine: recordForm.medicine, dosage: recordForm.dosage, frequency: recordForm.frequency, duration: recordForm.duration, instructions: recordForm.instructions };
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      setRecordTarget(null); setRecordForm({ diagnosis: "", treatment: "", note: "", medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
      await load();
    } catch (e) { setError(e.message); }
    finally { setSavingRecord(false); }
  }

  if (loading && !profile) return <div className="screen-loader">Loading your doctor workspace…</div>;
  return <div className="role-page doctor-theme">
    <PageHeader role="Doctor" name={profile?.fullName || user.name} photo={profile?.photo} onLogout={onLogout} onEdit={() => setShowProfile(true)} />
    <main className="role-main">
      <section className="role-welcome doctor-welcome"><div><p className="eyebrow">DOCTOR WORKSPACE</p><h1>Good day, {profile?.fullName || user.name}</h1><p>{profile?.specialization || "Doctor"}{profile?.department ? ` · ${profile.department}` : ""}. Here is your schedule and patient activity.</p><div className="welcome-meta"><span>▦ {dateLabel(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span>◷ {profile?.availability?.length ? `${profile.availability.length} working days set` : "Schedule not set"}</span></div></div><Avatar name={profile?.fullName || user.name} photo={profile?.photo} /></section>
      {error && <div className="notice error-notice">{error}</div>}
      <section className="summary-grid doctor-summary">
        <div className="summary-card"><span className="summary-icon blue">▦</span><div><small>Today's appointments</small><strong>{todayAppointments.length}</strong></div></div>
        <div className="summary-card"><span className="summary-icon green">✓</span><div><small>Completed visits</small><strong>{appointments.filter((a) => a.status === "Completed").length}</strong></div></div>
        <div className="summary-card"><span className="summary-icon amber">◷</span><div><small>Upcoming visits</small><strong>{appointments.filter((a) => ["Booked", "Confirmed"].includes(a.status) && new Date(a.scheduledAt) >= new Date()).length}</strong></div></div>
        <div className="summary-card"><span className="summary-icon purple">♙</span><div><small>Patients seen</small><strong>{new Set(appointments.map((a) => a.patient?._id).filter(Boolean)).size}</strong></div></div>
      </section>
      {reminders.length > 0 && <section className="panel patient-reminder-panel"><div className="section-heading"><div><h2>Upcoming reminders</h2><p className="muted">Appointments due within the next 24 hours.</p></div><span className="subtle-tag">{reminders.length}</span></div>{reminders.map(item => <article className="patient-reminder" key={item.id}><span className="reminder-dot"/><div><strong>{item.type}</strong><p>{item.message}</p><small>{new Date(item.dueAt).toLocaleString()}</small></div></article>)}</section>}
      <section className="dashboard-columns doctor-columns">
        <div className="panel"><div className="section-heading"><div><h2>My appointments</h2><p className="muted">Your upcoming patient visits</p></div><button className="button button-light button-small" onClick={load}>Refresh</button></div>
          {nextAppointments.length ? nextAppointments.map((item) => <AppointmentRow key={item._id} appointment={item} canManage canCancel={false} onComplete={(id) => updateAppointment(id, "complete")} />) : <div className="empty-state"><span>▦</span><strong>No upcoming appointments</strong><p>Your next booked visits will appear here.</p></div>}
        </div>
        <div className="panel"><div className="section-heading"><div><h2>Recent patients</h2><p className="muted">Patients from your appointments</p></div></div>
          {recentPatients.length ? recentPatients.map((item) => <div className="patient-row" key={item.patient._id}><Avatar name={item.patient.fullName} size="small" /><div><strong>{item.patient.fullName}</strong><small>{item.patient.phone || "Contact not recorded"}</small></div><div className="patient-row-actions"><button className="text-action" onClick={() => { setRecordTarget(item.patient); setRecordType("history"); }}>Add note</button><button className="text-action" onClick={() => { setRecordTarget(item.patient); setRecordType("prescription"); }}>Prescription</button></div></div>) : <div className="empty-state"><span>♙</span><strong>No patient visits yet</strong><p>Patient names will appear after appointments are booked.</p></div>}
        </div>
      </section>
      {profile && <AvailabilityEditor profile={profile} onSaved={setProfile} />}
      <section className="panel doctor-profile-strip"><div className="profile-strip-left"><Avatar name={profile?.fullName || user.name} photo={profile?.photo} /><div><strong>{profile?.fullName || user.name}</strong><small>{profile?.specialization || "Specialization not set"} · {profile?.department || "Department not assigned"}</small><small>{profile?.email || user.email} {profile?.phone ? `· ${profile.phone}` : "· Contact number not added"}</small></div></div><button className="button button-light button-small" onClick={() => setShowProfile(true)}>Update contact details</button></section>
    </main>
    {showProfile && profile && <ProfileEditor role="Doctor" profile={profile} userEmail={user.email} onClose={() => setShowProfile(false)} onSaved={(updated) => { setProfile(updated); localStorage.setItem("hms_user", JSON.stringify({ ...user, email: updated.email })); }} />}
    {recordTarget && <div className="modal-backdrop"><section className="profile-modal record-modal"><div className="section-heading"><div><p className="eyebrow">PATIENT CARE</p><h2>{recordType === "history" ? "Add clinical note" : "Add prescription"}</h2><p className="muted">For {recordTarget.fullName}</p></div><button className="icon-button" onClick={() => setRecordTarget(null)}>×</button></div>
      <div className="record-tabs"><button className={recordType === "history" ? "active" : ""} onClick={() => setRecordType("history")}>Clinical note</button><button className={recordType === "prescription" ? "active" : ""} onClick={() => setRecordType("prescription")}>Prescription</button></div>
      <form className="profile-edit-form" onSubmit={saveRecord}>{recordType === "history" ? <><label>Diagnosis<input value={recordForm.diagnosis} maxLength="300" onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })} required /></label><label>Treatment<textarea rows="3" maxLength="1000" value={recordForm.treatment} onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })} required /></label><label>Additional note<textarea rows="2" maxLength="1000" value={recordForm.note} onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })} /></label></> : <><label>Medicine<input value={recordForm.medicine} maxLength="200" onChange={(e) => setRecordForm({ ...recordForm, medicine: e.target.value })} required /></label><label>Dosage<input placeholder="500 mg" maxLength="100" value={recordForm.dosage} onChange={(e) => setRecordForm({ ...recordForm, dosage: e.target.value })} /></label><label>Frequency<input placeholder="Twice daily" maxLength="100" value={recordForm.frequency} onChange={(e) => setRecordForm({ ...recordForm, frequency: e.target.value })} /></label><label>Duration<input placeholder="5 days" maxLength="100" value={recordForm.duration} onChange={(e) => setRecordForm({ ...recordForm, duration: e.target.value })} /></label><label>Instructions<textarea rows="3" maxLength="1000" value={recordForm.instructions} onChange={(e) => setRecordForm({ ...recordForm, instructions: e.target.value })} /></label></>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setRecordTarget(null)}>Cancel</button><button className="button button-primary" disabled={savingRecord}>{savingRecord ? "Saving…" : "Save record"}</button></div></form>
    </section></div>}
    <footer className="role-footer">City Care Hospital <span>Doctor workspace</span></footer>
  </div>;
}

