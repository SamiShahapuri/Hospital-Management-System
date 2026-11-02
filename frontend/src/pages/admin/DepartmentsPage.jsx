import { useEffect, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import DepartmentIllustration from "../../components/departments/DepartmentIllustration";
import { useToast } from "../../context/ToastContext";

const empty = { name: "", description: "", icon: "stethoscope" };
const icons = [
  ["heart", "Heart / Cardiology"], ["brain", "Brain / Neurology"], ["bone", "Bone / Orthopedics"],
  ["child", "Child / Pediatrics"], ["skin", "Skin / Dermatology"], ["stethoscope", "Stethoscope / General Medicine"]
];

export default function DepartmentsPage() {
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setRows(await api("/departments")); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const method = editing ? "PATCH" : "POST";
      const path = editing ? `/departments/${editing}` : "/departments";
      await api(path, { method, body: JSON.stringify(form) });
      setForm(empty); setEditing(null);
      notify(editing ? "Department updated." : "Department created.");
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function deactivate(id) {
    if (!window.confirm("Deactivate this department? Reassign active doctors first.")) return;
    try { await api(`/departments/${id}`, { method: "DELETE" }); notify("Department deactivated."); await load(); }
    catch (e) { setError(e.message); }
  }

  return <div className="page-body">
    <PageTitle title="Departments" subtitle="Six focused hospital services, each with a dedicated medical illustration." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel">
      <div className="panel-heading"><div><h3>{editing ? "Edit department" : "Create department"}</h3><p>Choose an illustration so the service is easy to recognise across the system.</p></div>{editing && <button className="link-button" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</button>}</div>
      <form className="form-grid" onSubmit={save}>
        <label>Department name<input required maxLength="100" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Description<input maxLength="500" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label>Medical illustration<select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>{icons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="department-preview"><DepartmentIllustration type={form.icon} size={64} /><span>Preview</span></div>
        <div className="form-actions"><button disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add department"}</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h3>Active departments</h3><p>{rows.length} services configured for appointments and doctor assignment.</p></div><span className="subtle-tag">6 seed services</span></div>
      <div className="department-grid">{rows.map(d => <article className="department-card illustrated" key={d._id}>
        <DepartmentIllustration type={d.icon} size={92} />
        <div className="department-copy"><h3>{d.name}</h3><p>{d.description || "Clinical service department"}</p></div>
        <div className="department-actions"><button className="text-button" onClick={() => { setEditing(d._id); setForm({ name: d.name, description: d.description || "", icon: d.icon || "stethoscope" }); }}>Edit</button><button className="text-button danger-text" onClick={() => deactivate(d._id)}>Deactivate</button></div>
      </article>)}</div>
      {!rows.length && <div className="empty-state">No departments found. Run the backend seed command to create the six demo services.</div>}
    </section>
  </div>;
}
