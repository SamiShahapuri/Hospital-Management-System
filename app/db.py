import sqlite3

import click
from flask import current_app, g

SEED_DEPARTMENTS = ["Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Emergency"]
SEED_DOCTORS = [
    ("Dr. Asha Rao", "Cardiologist"),
    ("Dr. Vikram Nair", "Neurologist"),
    ("Dr. Meera Iyer", "Pediatrician"),
    ("Dr. Rohan Mehta", "Orthopedic Surgeon"),
    ("Dr. Sana Khan", "Emergency Physician"),
]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db():
    with current_app.open_resource("schema.sql") as f:
        get_db().executescript(f.read().decode("utf-8"))


def seed_db():
    conn = get_db()
    conn.executemany("INSERT INTO departments (name) VALUES (?)", [(n,) for n in SEED_DEPARTMENTS])
    conn.executemany("INSERT INTO doctors (name, specialization) VALUES (?, ?)", SEED_DOCTORS)
    conn.commit()


@click.command("init-db")
@click.option("--seed", is_flag=True, help="Also insert sample doctors and departments.")
def init_db_command(seed):
    """Create the tables (this erases existing data)."""
    init_db()
    if seed:
        seed_db()
    click.echo("Database ready.")


def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
