"""Minimal role check used by the assignment pages.

TEMPORARY: the real login (issue for FR-1) will set session["role"].
Until that is merged, /dev-login/<role> lets you sign in as a role for testing.
Remove the dev route (or set DEV_LOGIN=False) once real login exists.
"""
from functools import wraps

from flask import Blueprint, abort, current_app, redirect, session, url_for

ROLES = {"admin", "doctor", "receptionist", "patient"}

bp = Blueprint("auth", __name__)


def require_role(*allowed):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            role = session.get("role")
            if role is None:
                abort(401)  # not logged in
            if role not in allowed:
                abort(403)  # logged in, but not allowed
            return view(*args, **kwargs)

        return wrapped

    return decorator


@bp.get("/dev-login/<role>")
def dev_login(role):
    if not current_app.config.get("DEV_LOGIN") or role not in ROLES:
        abort(404)
    session["role"] = role
    return redirect(url_for("assignments.index"))


@bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.dev_login", role="patient"))
