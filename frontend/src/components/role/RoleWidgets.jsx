import { useState } from "react";
import { api } from "../../api";

export const localDateTime = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const dateLabel = (value, options = { day: "numeric", month: "short", year: "numeric" }) => value ? new Date(value).toLocaleDateString("en-IN", options) : "—";
export const timeLabel = (value) => value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
const initials = (name = "User") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export function Avatar({ name, photo, size = "large" }) {
  return <div className={`profile-avatar ${size}`}>{photo ? <img src={photo} alt={`${name} profile`} /> : <span>{initials(name)}</span>}</div>;
}

function Status({ value }) {
  const key = String(value || "Booked").toLowerCase();
  return <span className={`status-tag ${key}`}>{value === "Booked" ? "Scheduled" : value || "Scheduled"}</span>;
}

export function PageHeader({ role, name, photo, onLogout, onEdit }) {
  return <header className="role-header">
    <div className="hospital-brand"><span className="brand-mark">✚</span><span><strong>City Care Hospital</strong><small>Care Today, Healthier Tomorrow</small></span></div>
    <div className="role-header-actions"><div className="header-user"><Avatar name={name} photo={photo} size="small" /><span><strong>{name}</strong><small>{role}</small></span></div>
      <a className="button button-light button-small" href={role === "Doctor" ? "/doctor/profile" : "/patient/profile"}>Profile</a>
      <a className="button button-light button-small" href={role === "Doctor" ? "/doctor/appointments" : "/patient/appointments"}>My appointments</a>
      {role === "Patient" && <a className="button button-light button-small" href="/patient/billing">My bills</a>}
      {role === "Patient" && <a className="button button-light button-small" href="/patient/records">Records</a>}
      {role === "Doctor" && <a className="button button-light button-small" href="/doctor/patients">My patients</a>}
      <button className="button button-light button-small" onClick={onEdit}>Edit profile</button>
      <button className="button button-outline button-small" onClick={onLogout}>Log out</button>
    </div>
  </header>;
}

export function ProfileEditor({ role, profile, onClose, onSaved, userEmail }) {
  const [email, setEmail] = useState(profile?.email || userEmail || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [photo, setPhoto] = useState(profile?.photo || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setError("Choose a PNG, JPG or WEBP image."); return; }
    if (file.size > 1_500_000) { setError("Photo must be 1.5 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result)); setFileName(file.name); setError(""); };
    reader.onerror = () => setError("Could not read the selected photo.");
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "").length;
    if (phone && (digits < 7 || digits > 15)) { setError("Contact number must contain 7–15 digits."); return; }
    if (!email.trim()) { setError("Email address is required."); return; }
    setBusy(true);
    try {
      const updates = { email: email.trim(), phone: phone.trim(), photo };
      if (role === "Patient") updates.address = address.trim();
      const updated = await api(role === "Patient" ? "/patients/me/profile" : "/doctors/me/profile", {
        method: "PATCH", body: JSON.stringify(updates)
      });
      onSaved(updated);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2 id="profile-modal-title">Edit profile</h2><p className="muted">Update your contact details and profile photo.</p></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <form onSubmit={save} className="profile-edit-form">
        <div className="photo-edit-row"><Avatar name={profile?.fullName || profile?.name || "User"} photo={photo} /><div><label className="button button-light photo-button">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} hidden /></label>{fileName && <small className="muted file-name">{fileName}</small>}<small className="field-hint">PNG, JPG or WEBP · up to 1.5 MB</small></div></div>
        <div className="form-grid">
          <label>Full name <input value={profile?.fullName || profile?.name || ""} readOnly disabled /></label>
          {role === "Patient" && <label>Blood group <input value={profile?.bloodGroup || "Not recorded"} readOnly disabled /></label>}
          {role === "Doctor" && <label>Department <input value={profile?.department || "Not assigned"} readOnly disabled /></label>}
          <label>Email address <input type="email" value={email} maxLength="254" onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contact number <input type="tel" value={phone} maxLength="30" onChange={(e) => setPhone(e.target.value)} placeholder="Enter contact number" /></label>
          {role === "Patient" && <label className="form-span">Address <textarea value={address} maxLength="300" rows="2" onChange={(e) => setAddress(e.target.value)} placeholder="Enter your address" /></label>}
        </div>
        <div className="protected-note">{role === "Patient" ? "Name, blood group and medical identity details are protected and cannot be edited here." : "Name, specialization and department are protected and cannot be edited here."}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
      </form>
    </section>
  </div>;
}

export function AppointmentRow({ appointment, onComplete, onCancel, onReschedule, canManage = false, canCancel = true }) {
  return <div className="appointment-row">
    <div className="appointment-date"><strong>{new Date(appointment.scheduledAt).getDate()}</strong><span>{new Date(appointment.scheduledAt).toLocaleDateString("en-IN", { month: "short" })}</span></div>
    <div className="appointment-detail"><strong>{appointment.patient?.fullName || appointment.doctor?.fullName || "Appointment"}</strong><span>{appointment.doctor?.fullName ? `${appointment.doctor.fullName} · ` : ""}{appointment.reason || "Consultation"}</span><small>{dateLabel(appointment.scheduledAt)} · {timeLabel(appointment.scheduledAt)}</small></div>
    <Status value={appointment.status} />
    {canManage && ["Booked", "Confirmed"].includes(appointment.status) && <div className="row-actions">{onComplete && <button className="text-action" onClick={() => onComplete(appointment._id)}>Complete</button>}{onReschedule && <button className="text-action" onClick={() => onReschedule(appointment)}>Change time</button>}{canCancel && onCancel && <button className="text-action danger" onClick={() => onCancel(appointment._id)}>Cancel</button>}</div>}
  </div>;
}

