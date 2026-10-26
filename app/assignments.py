"""FR-3: assign doctors to one or more departments (admin only)."""
import sqlite3

from flask import Blueprint, flash, redirect, render_template, request, url_for

from .auth import require_role
from .db import get_db

bp = Blueprint("assignments", __name__, url_prefix="/assignments")


def _parse_ids():
    """Return (doctor_id, department_id) as ints, or None if the form is invalid."""
    try:
        return int(request.form["doctor_id"]), int(request.form["department_id"])
    except (KeyError, ValueError):
        return None


@bp.get("/")
@require_role("admin")
def index():
    db = get_db()
    departments = db.execute("SELECT id, name FROM departments ORDER BY name").fetchall()
    doctors = db.execute("SELECT id, name, specialization FROM doctors ORDER BY name").fetchall()
    rows = db.execute(
        """SELECT dd.department_id, d.id AS doctor_id, d.name, d.specialization
           FROM doctor_departments dd JOIN doctors d ON d.id = dd.doctor_id
           ORDER BY d.name"""
    ).fetchall()

    by_department = {dep["id"]: [] for dep in departments}
    for r in rows:
        by_department[r["department_id"]].append(r)

    return render_template(
        "assignments.html",
        departments=departments,
        doctors=doctors,
        by_department=by_department,
    )


@bp.post("/assign")
@require_role("admin")
def assign():
    ids = _parse_ids()
    if ids is None:
        flash("Choose both a doctor and a department.", "error")
        return redirect(url_for("assignments.index"))
    doctor_id, department_id = ids

    db = get_db()
    doctor = db.execute("SELECT name FROM doctors WHERE id = ?", (doctor_id,)).fetchone()
    department = db.execute("SELECT name FROM departments WHERE id = ?", (department_id,)).fetchone()
    if doctor is None or department is None:
        flash("That doctor or department does not exist.", "error")
        return redirect(url_for("assignments.index"))

    try:
        db.execute(
            "INSERT INTO doctor_departments (doctor_id, department_id) VALUES (?, ?)",
            (doctor_id, department_id),
        )
        db.commit()
    except sqlite3.IntegrityError:  # primary key (doctor_id, department_id) already exists
        flash(f"{doctor['name']} is already assigned to {department['name']}.", "error")
    else:
        flash(f"{doctor['name']} assigned to {department['name']}.", "ok")
    return redirect(url_for("assignments.index"))


@bp.post("/remove")
@require_role("admin")
def remove():
    ids = _parse_ids()
    if ids is None:
        flash("Choose both a doctor and a department.", "error")
        return redirect(url_for("assignments.index"))
    doctor_id, department_id = ids

    db = get_db()
    cur = db.execute(
        "DELETE FROM doctor_departments WHERE doctor_id = ? AND department_id = ?",
        (doctor_id, department_id),
    )
    db.commit()
    if cur.rowcount:
        flash("Assignment removed.", "ok")
    else:
        flash("That assignment does not exist.", "error")
    return redirect(url_for("assignments.index"))
