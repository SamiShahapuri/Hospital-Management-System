import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { Avatar, PageHeader, ProfileEditor, AppointmentRow, localDateTime, dateLabel, timeLabel } from "../../components/role/RoleWidgets.jsx";

export default function PatientDashboard({ user, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [bills, setBills] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [booking, setBooking] = useState({ department: "", doctor: "", scheduledAt: "", reason: "" });
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlots, setBookingSlots] = useState([]);
  const [loadingBookingSlots, setLoadingBookingSlots] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [rescheduleDay, setRescheduleDay] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [patient, appts, doctorRows, departmentRows, billRows, reminderRows] = await Promise.all([api("/patients/me/profile"), api("/appointments"), api("/doctors"), api("/departments"), api("/billing"), api("/notifications")]);
      setProfile(patient); setAppointments(appts); setDoctors(doctorRows); setDepartments(departmentRows); setBills(billRows); setReminders(reminderRows);
      setBooking((current) => ({ ...current, doctor: current.doctor || doctorRows[0]?._id || "", department: current.department || doctorRows[0]?.department || "" }));
      setNotice("");
    } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!booking.doctor || !bookingDate) { setBookingSlots([]); setBooking(current => ({ ...current, scheduledAt: "" })); return; }
    let active = true; setLoadingBookingSlots(true); setBookingSlots([]);
    api(`/public/availability?doctor=${encodeURIComponent(booking.doctor)}&date=${encodeURIComponent(bookingDate)}`)
      .then(data => { if (active) setBookingSlots(data.slots || []); })
      .catch(e => setNotice(e.message))
      .finally(() => { if (active) setLoadingBookingSlots(false); });
    return () => { active = false; };
  }, [booking.doctor, bookingDate]);

  useEffect(() => {
    if (!editingAppointment || !rescheduleDay) { setRescheduleSlots([]); setRescheduleAt(""); return; }
    const target = appointments.find(item => item._id === editingAppointment);
    if (!target?.doctor?._id) return;
    let active = true;
    setLoadingRescheduleSlots(true); setRescheduleSlots([]); setRescheduleAt("");
    api(`/public/availability?doctor=${encodeURIComponent(target.doctor._id)}&date=${encodeURIComponent(rescheduleDay)}`)
      .then(data => { if (active) setRescheduleSlots(data.slots || []); })
      .catch(error => { if (active) setNotice(error.message); })
      .finally(() => { if (active) setLoadingRescheduleSlots(false); });
    return () => { active = false; };
  }, [editingAppointment, rescheduleDay, appointments]);

  async function book(event) {
    event.preventDefault();
    const chosen = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
    if (!chosen || Number.isNaN(chosen.getTime()) || chosen <= new Date()) { setNotice("Choose a future appointment date and time."); return; }
    setBusy(true); setNotice("");
    try {
      await api("/appointments", { method: "POST", body: JSON.stringify({ patient: profile._id, doctor: booking.doctor, scheduledAt: chosen.toISOString(), reason: booking.reason }) });
      setBooking((current) => ({ ...current, scheduledAt: "", reason: "" }));
      setNotice("Appointment booked successfully."); await load();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  async function cancelOwnAppointment(id) {
    if (!window.confirm("Cancel this appointment?")) return;
    try { await api(`/appointments/${id}/cancel`, { method: "PATCH" }); setNotice("Appointment cancelled."); await load(); }
    catch (e) { setNotice(e.message); }
  }

  function beginReschedule(appointment) {
    setEditingAppointment(appointment._id);
    setRescheduleDay(new Date(appointment.scheduledAt).toLocaleDateString("en-CA"));
    setRescheduleAt("");
  }

  async function saveReschedule(event) {
    event.preventDefault();
    const nextDate = rescheduleAt ? new Date(rescheduleAt) : null;
    if (!nextDate || Number.isNaN(nextDate.getTime()) || nextDate <= new Date()) { setNotice("Choose an available future time slot."); return; }
    setBusy(true);
    try {
      await api(`/appointments/${editingAppointment}/reschedule`, { method: "PATCH", body: JSON.stringify({ scheduledAt: nextDate.toISOString() }) });
      setEditingAppointment(null); setRescheduleDay(""); setRescheduleAt(""); setNotice("Appointment rescheduled successfully."); await load();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  if (loading && !profile) return <div className="screen-loader">Loading your patient portal…</div>;
  const history = [...(profile?.medicalHistory || [])].reverse().slice(0, 4);
  const prescriptions = [...(profile?.prescriptions || [])].reverse().slice(0, 4);
  const upcoming = appointments.filter((a) => ["Booked", "Confirmed"].includes(a.status) && new Date(a.scheduledAt) >= new Date());
  const displayAppointments = [...appointments].sort((a, b) => {
    const aUpcoming = ["Booked", "Confirmed"].includes(a.status) && new Date(a.scheduledAt) >= new Date();
    const bUpcoming = ["Booked", "Confirmed"].includes(b.status) && new Date(b.scheduledAt) >= new Date();
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? new Date(a.scheduledAt) - new Date(b.scheduledAt) : new Date(b.scheduledAt) - new Date(a.scheduledAt);
  });
  return <div className="role-page patient-theme">
    <PageHeader role="Patient" name={profile?.fullName || user.name} photo={profile?.photo} onLogout={onLogout} onEdit={() => setShowProfile(true)} />
    <main className="role-main">
      <section className="role-welcome patient-welcome"><div><p className="eyebrow">PATIENT PORTAL</p><h1>Welcome back, {profile?.fullName || user.name}</h1><p>Your appointments and important health information, all in one place.</p><div className="welcome-meta"><span>Patient ID · {profile?.patientId || profile?._id?.slice(-8).toUpperCase() || "—"}</span><span>Blood group · {profile?.bloodGroup || "Not recorded"}</span></div></div><Avatar name={profile?.fullName || user.name} photo={profile?.photo} /></section>
      {notice && <div className="notice">{notice}</div>}
      <section className="summary-grid patient-summary">
        <div className="summary-card"><span className="summary-icon blue">▦</span><div><small>Upcoming appointments</small><strong>{upcoming.length}</strong></div></div>
        <div className="summary-card"><span className="summary-icon green">✚</span><div><small>Medical records</small><strong>{profile?.medicalHistory?.length || 0}</strong></div></div>
        <div className="summary-card"><span className="summary-icon purple">Rx</span><div><small>Prescriptions</small><strong>{profile?.prescriptions?.length || 0}</strong></div></div>
        <div className="summary-card"><span className="summary-icon amber">♥</span><div><small>Blood group</small><strong>{profile?.bloodGroup || "—"}</strong></div></div>
        <div className="summary-card"><span className="summary-icon amber">₹</span><div><small>Outstanding bills</small><strong>{bills.filter(b => b.status === "Unpaid").length}</strong></div></div>
      </section>
      <section className="panel patient-reminder-panel"><div className="section-heading"><div><h2>Notifications & reminders</h2><p className="muted">Upcoming appointments and pending payments for your patient account.</p></div><span className="subtle-tag">{reminders.length} reminders</span></div>{reminders.length ? reminders.map(item => <article className="patient-reminder" key={item.id}><span className="reminder-dot"/><div><strong>{item.type}</strong><p>{item.message}</p><small>{new Date(item.dueAt).toLocaleString()}</small></div></article>) : <div className="empty-state">You have no reminders right now.</div>}</section>
      <section className="dashboard-columns patient-columns">
        <div className="panel"><div className="section-heading"><div><h2>My appointments</h2><p className="muted">Your booked visits and their status</p></div><button className="button button-light button-small" onClick={load}>Refresh</button></div>
          {displayAppointments.length ? displayAppointments.slice(0, 6).map((item) => <AppointmentRow key={item._id} appointment={item} canManage={["Booked", "Confirmed"].includes(item.status) && new Date(item.scheduledAt) >= new Date()} onCancel={cancelOwnAppointment} onReschedule={beginReschedule} />) : <div className="empty-state"><span>▦</span><strong>No appointments yet</strong><p>Book a consultation when you are ready.</p></div>}{editingAppointment && <form className="patient-reschedule-form" onSubmit={saveReschedule}><label>New date<input type="date" min={localDateTime().slice(0,10)} value={rescheduleDay} onChange={(e) => setRescheduleDay(e.target.value)} required /></label><label>Available time slot<select value={rescheduleAt} onChange={e => setRescheduleAt(e.target.value)} disabled={!rescheduleDay || loadingRescheduleSlots} required><option value="">{loadingRescheduleSlots ? "Checking slots…" : rescheduleSlots.length ? "Choose a time" : "No available slots"}</option>{rescheduleSlots.map(slot => <option key={slot.scheduledAt} value={slot.scheduledAt}>{slot.label}</option>)}</select></label><button className="button button-primary button-small" disabled={busy || !rescheduleAt}>{busy ? "Saving…" : "Save time"}</button><button type="button" className="button button-outline button-small" onClick={() => { setEditingAppointment(null); setRescheduleDay(""); setRescheduleAt(""); }}>Cancel</button></form>}
        </div>
        <div className="panel book-panel"><p className="eyebrow">QUICK BOOKING</p><h2>Book an appointment</h2><p className="muted">Choose your doctor and a suitable time.</p>
          <form className="profile-edit-form" onSubmit={book}><label>Department<select value={booking.department} onChange={(e) => { const department = e.target.value; const firstDoctor = doctors.find((d) => d.department === department); setBooking({ ...booking, department, doctor: firstDoctor?._id || "" }); }}><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}</select></label><label>Doctor<select value={booking.doctor} onChange={(e) => { setBooking({ ...booking, doctor: e.target.value, scheduledAt: "" }); setBookingDate(""); }} required><option value="">Select doctor</option>{doctors.filter((d) => !booking.department || d.department === booking.department).map((d) => <option key={d._id} value={d._id}>{d.fullName} · {d.specialization}</option>)}</select></label><label>Preferred date<input type="date" min={localDateTime().slice(0,10)} value={bookingDate} onChange={(e) => { setBookingDate(e.target.value); setBooking({ ...booking, scheduledAt: "" }); }} required /></label><label>Available time slot<select required disabled={!bookingDate || !booking.doctor || loadingBookingSlots} value={booking.scheduledAt} onChange={(e) => setBooking({ ...booking, scheduledAt: e.target.value })}><option value="">{loadingBookingSlots ? "Checking availability…" : !bookingDate ? "Choose a date first" : bookingSlots.length ? "Select a time" : "No available slots"}</option>{bookingSlots.map(slot => <option key={slot.scheduledAt} value={slot.scheduledAt}>{slot.label}</option>)}</select></label><label>Reason (optional)<input maxLength="500" value={booking.reason} onChange={(e) => setBooking({ ...booking, reason: e.target.value })} placeholder="What would you like help with?" /></label><button className="button button-primary" disabled={busy || !booking.doctor || !booking.scheduledAt}>{busy ? "Booking…" : "Book appointment →"}</button></form>
          <a className="text-action guest-link" href="tel:+918012345678">Need help? Call the appointment desk</a>
        </div>
      </section>
      <section className="dashboard-columns patient-record-columns">
        <div className="panel"><div className="section-heading"><div><h2>Recent medical records</h2><p className="muted">Diagnoses and treatment notes</p></div></div>{history.length ? history.map((item, index) => <div className="record-row" key={item._id || index}><span className="record-icon green">✚</span><div><strong>{item.diagnosis || "Clinical note"}</strong><small>{item.treatment || item.note || "No additional details"}</small><small>{dateLabel(item.recordedAt)}</small></div></div>) : <p className="empty-copy">Your medical records will appear here after your consultation.</p>}</div>
        <div className="panel"><div className="section-heading"><div><h2>My prescriptions</h2><p className="muted">Medicine and instructions</p></div></div>{prescriptions.length ? prescriptions.map((item, index) => <div className="record-row" key={item._id || index}><span className="record-icon purple">Rx</span><div><strong>{item.medicine}</strong><small>{item.instructions || "Follow your doctor's directions."}</small><small>{dateLabel(item.recordedAt)}</small></div></div>) : <p className="empty-copy">No prescriptions have been added yet.</p>}</div>
      </section>
      <section className="panel patient-bill-panel"><div className="section-heading"><div><h2>My bills</h2><p className="muted">Outstanding invoices and payment status</p></div><a className="text-action" href="/patient/billing">View all →</a></div>{bills.length ? bills.slice(0,3).map(b => <div className="record-row" key={b._id}><span className="record-icon purple">₹</span><div><strong>Invoice #{b._id.slice(-7).toUpperCase()}</strong><small>₹{Number(b.subtotal || 0).toLocaleString("en-IN")} · {b.status}</small><small>{dateLabel(b.issuedAt)}</small></div></div>) : <p className="empty-copy">No bills have been issued.</p>}</section>
      <section className="panel patient-profile-strip"><div className="profile-strip-left"><Avatar name={profile?.fullName || user.name} photo={profile?.photo} /><div><strong>{profile?.fullName || user.name}</strong><small>{profile?.email || user.email} · {profile?.phone || "Contact number not added"}</small><small>{profile?.address || "Address not added"}</small></div></div><button className="button button-light button-small" onClick={() => setShowProfile(true)}>Edit contact details</button></section>
    </main>
    {showProfile && profile && <ProfileEditor role="Patient" profile={profile} userEmail={user.email} onClose={() => setShowProfile(false)} onSaved={(updated) => { setProfile(updated); localStorage.setItem("hms_user", JSON.stringify({ ...user, email: updated.email })); }} />}
    <footer className="role-footer">City Care Hospital <span>Patient portal · Your information stays private</span></footer>
  </div>;
}

