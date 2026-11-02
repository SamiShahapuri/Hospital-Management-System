import { useEffect, useState } from "react";
import { api } from "../../api";
import { localDateTime, dateLabel, timeLabel } from "../../components/role/RoleWidgets.jsx";

export default function GuestBookingPage({ onPatientLogin }) {
  const [options, setOptions] = useState({ departments: [], doctors: [] });
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", department: "", doctor: "", scheduledAt: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => { api("/public/booking-options").then(setOptions).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (!form.doctor || !selectedDate) { setAvailableSlots([]); setForm(current => ({ ...current, scheduledAt: "" })); return; }
    let active = true; setLoadingSlots(true); setAvailableSlots([]);
    api(`/public/availability?doctor=${encodeURIComponent(form.doctor)}&date=${encodeURIComponent(selectedDate)}`)
      .then(data => { if (active) setAvailableSlots(data.slots || []); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [form.doctor, selectedDate]);
  const filteredDoctors = options.doctors.filter((doctor) => !form.department || doctor.department === form.department);

  async function submit(event) {
    event.preventDefault(); setError("");
    const chosen = form.scheduledAt ? new Date(form.scheduledAt) : null;
    if (!chosen || Number.isNaN(chosen.getTime()) || chosen <= new Date()) { setError("Please choose a future date and time."); return; }
    setBusy(true);
    try {
      const data = await api("/public/book-appointment", { method: "POST", body: JSON.stringify({ ...form, scheduledAt: chosen.toISOString() }) });
      setConfirmation(data.appointment);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (confirmation) return <div className="guest-page"><GuestHeader onPatientLogin={onPatientLogin} /><main className="guest-confirm"><span className="confirm-icon">✓</span><p className="eyebrow">BOOKING CONFIRMED</p><h1>Your appointment is booked</h1><p>Thank you, {confirmation.patient?.fullName}. Please arrive 10 minutes before your appointment.</p><div className="confirm-card"><div><small>Doctor</small><strong>{confirmation.doctor?.fullName}</strong></div><div><small>Department</small><strong>{confirmation.doctor?.department || confirmation.doctor?.specialization}</strong></div><div><small>Date and time</small><strong>{dateLabel(confirmation.scheduledAt)} · {timeLabel(confirmation.scheduledAt)}</strong></div><div><small>Patient contact</small><strong>{confirmation.patient?.phone}</strong></div></div><button className="button button-primary" onClick={() => { setConfirmation(null); setForm({ fullName: "", email: "", phone: "", department: "", doctor: "", scheduledAt: "", reason: "" }); setSelectedDate(""); }}>Book another appointment</button></main></div>;

  return <div className="guest-page"><GuestHeader onPatientLogin={onPatientLogin} />
    <main>
      <section className="guest-hero" id="home"><div className="guest-hero-copy"><p className="eyebrow">CITY CARE HOSPITAL</p><h1>Book your appointment in a few simple steps.</h1><p>Quality care from trusted doctors. Choose a department, select a time and send your booking — no account needed.</p><div className="guest-perks"><span>✓ No login required</span><span>✓ Quick confirmation</span><span>✓ Trusted specialists</span></div></div><div className="hero-art"><div className="hero-building"><span>✚</span><strong>CITY CARE</strong><small>HOSPITAL</small></div><div className="hero-float-card"><span>♥</span><strong>Care that puts you first</strong><small>Here for you, every step.</small></div></div></section>
      <section className="guest-booking-layout"><div className="booking-form-panel" id="book"><div className="section-heading"><div><p className="eyebrow">APPOINTMENT REQUEST</p><h2>Book an appointment</h2><p className="muted">Fill in your details. Fields marked * are required.</p></div><span className="booking-step">01 <small>/ 01</small></span></div>
        <form className="guest-form" onSubmit={submit}><div className="form-grid"><label>Full name *<input value={form.fullName} maxLength="120" onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" required /></label><label>Email address *<input type="email" value={form.email} maxLength="254" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required /></label><label>Contact number *<input type="tel" value={form.phone} maxLength="30" onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" required /></label><label>Department *<select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, doctor: "" })} required><option value="">Select department</option>{options.departments.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}</select></label><label>Doctor *<select value={form.doctor} onChange={(e) => { setForm({ ...form, doctor: e.target.value, scheduledAt: "" }); setSelectedDate(""); }} required><option value="">Select doctor</option>{filteredDoctors.map((d) => <option key={d._id} value={d._id}>{d.fullName} · {d.specialization}</option>)}</select></label><label>Preferred date *<input type="date" min={localDateTime().slice(0,10)} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setForm({ ...form, scheduledAt: "" }); }} required /></label><label>Available time slot *<select value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} disabled={!selectedDate || loadingSlots || !form.doctor} required><option value="">{loadingSlots ? "Checking availability…" : !selectedDate ? "Choose a date first" : availableSlots.length ? "Select a time" : "No slots available"}</option>{availableSlots.map(slot => <option key={slot.scheduledAt} value={slot.scheduledAt}>{slot.label}</option>)}</select></label><label className="form-span">Reason for visit <textarea value={form.reason} maxLength="500" rows="3" onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Briefly describe the reason for your visit (optional)" /></label></div>
          {selectedDate && form.doctor && !loadingSlots && <p className="field-hint">{availableSlots.length ? `${availableSlots.length} available slots · ${options.doctors.find(d => d._id === form.doctor)?.consultationDuration || 30} minute consultation` : "No available slots for this doctor on the selected date."}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="booking-submit-row"><p>Your details are used only to arrange this appointment.</p><button className="button button-primary" disabled={busy || !options.doctors.length}>{busy ? "Submitting…" : "Confirm appointment →"}</button></div>
        </form>
      </div>
      <aside className="guest-help-panel" id="help"><div className="help-icon">☎</div><h3>Need help?</h3><p>Our appointment desk can help you choose the right doctor.</p><a href="tel:+918012345678">+91 80 1234 5678</a><small>Monday – Saturday · 9 AM – 6 PM</small><div className="help-divider" /><strong>Already have an account?</strong><p>Sign in to manage your appointments and medical records.</p><button className="button button-light" onClick={onPatientLogin}>Patient login →</button></aside></section>
    </main><footer className="role-footer guest-footer">City Care Hospital <span>Care Today, Healthier Tomorrow</span></footer>
  </div>;
}

function GuestHeader({ onPatientLogin }) {
  return <header className="guest-header"><div className="hospital-brand"><span className="brand-mark">✚</span><span><strong>City Care Hospital</strong><small>Care Today, Healthier Tomorrow</small></span></div><nav><a href="#home">Home</a><a href="#book">Book appointment</a><a href="#help">Contact</a></nav><button className="button button-outline button-small" onClick={onPatientLogin}>Patient login</button></header>;
}
