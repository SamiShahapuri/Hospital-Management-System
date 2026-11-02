import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";

const initials = (name = "User") => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export default function ProfilePage({ role, user, onLogout }) {
  const isPatient = role === "Patient";
  const endpoint = isPatient ? "/patients/me/profile" : "/doctors/me/profile";
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ email: "", phone: "", address: "", photo: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api(endpoint);
      setProfile(data);
      setForm({ email: data.email || user.email || "", phone: data.phone || "", address: data.address || "", photo: data.photo || "" });
      setError("");
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setError("Choose a PNG, JPG or WEBP image."); return; }
    if (file.size > 1_500_000) { setError("Photo must be 1.5 MB or smaller."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(current => ({ ...current, photo: String(reader.result) }));
    reader.onerror = () => setError("Could not read the selected photo.");
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setError(""); setMessage("");
    const digits = form.phone.replace(/\D/g, "").length;
    if (form.phone && (digits < 7 || digits > 15)) { setError("Contact number must contain 7–15 digits."); return; }
    if (!form.email.trim()) { setError("Email address is required."); return; }
    setBusy(true);
    try {
      const payload = { email: form.email.trim(), phone: form.phone.trim(), photo: form.photo };
      if (isPatient) payload.address = form.address.trim();
      const updated = await api(endpoint, { method: "PATCH", body: JSON.stringify(payload) });
      setProfile(updated);
      setForm({ email: updated.email || "", phone: updated.phone || "", address: updated.address || "", photo: updated.photo || "" });
      const storedUser = { ...user, email: updated.email || user.email };
      localStorage.setItem("hms_user", JSON.stringify(storedUser));
      setMessage("Your profile changes have been saved.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const dashboard = isPatient ? "/patient/dashboard" : "/doctor/dashboard";
  const links = isPatient
    ? [["Dashboard", "/patient/dashboard"], ["Appointments", "/patient/appointments"], ["Records", "/patient/records"], ["Billing", "/patient/billing"]]
    : [["Dashboard", "/doctor/dashboard"], ["Appointments", "/doctor/appointments"], ["My patients", "/doctor/patients"]];

  return <div className={`role-page ${isPatient ? "patient-theme" : "doctor-theme"}`}>
    <header className="role-header">
      <div className="hospital-brand"><span className="brand-mark">✚</span><span><strong>City Care Hospital</strong><small>{isPatient ? "Patient portal" : "Doctor workspace"}</small></span></div>
      <nav className="role-header-actions">{links.map(([label, path]) => <Link key={path} className="button button-light button-small" to={path}>{label}</Link>)}<button className="button button-outline button-small" onClick={onLogout}>Sign out</button></nav>
    </header>
    <main className="role-main profile-page-main">
      <PageTitle title="My profile" subtitle="Manage your contact information and profile photo." action={<Link className="secondary-button" to={dashboard}>Back to dashboard</Link>} />
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      {!profile ? <div className="loading-state">Loading your profile…</div> : <section className="panel profile-page-card">
        <form className="profile-edit-form" onSubmit={save}>
          <div className="photo-edit-row">
            <div className="profile-avatar large">{form.photo ? <img src={form.photo} alt="Profile" /> : <span>{initials(profile.fullName || user.name)}</span>}</div>
            <div><label className="button button-light photo-button">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={choosePhoto} hidden /></label><small className="field-hint">PNG, JPG or WEBP · up to 1.5 MB</small></div>
          </div>
          <div className="form-grid">
            <label>Full name<input value={profile.fullName || user.name || ""} readOnly disabled /></label>
            {isPatient && <label>Blood group<input value={profile.bloodGroup || "Not recorded"} readOnly disabled /></label>}
            {!isPatient && <label>Specialization<input value={profile.specialization || "Not set"} readOnly disabled /></label>}
            {!isPatient && <label>Department<input value={profile.department || "Not assigned"} readOnly disabled /></label>}
            <label>Email address<input type="email" maxLength="254" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Contact number<input type="tel" maxLength="30" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            {isPatient && <label className="form-span">Address<textarea rows="3" maxLength="300" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>}
          </div>
          <p className="protected-note">{isPatient ? "Your name, blood group and medical identity details are protected." : "Your name, specialization and department are protected."}</p>
          {message && <p className="success-message" role="status">{message}</p>}
          <div className="modal-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save profile changes"}</button></div>
        </form>
      </section>}
    </main>
  </div>;
}
