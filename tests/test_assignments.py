import pytest

from app import create_app
from app.db import get_db, init_db, seed_db


@pytest.fixture
def app(tmp_path):
    app = create_app({"TESTING": True, "DATABASE": str(tmp_path / "test.sqlite"), "SECRET_KEY": "test"})
    with app.app_context():
        init_db()
        seed_db()
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, role):
    client.get(f"/dev-login/{role}")


def count_assignments(app):
    with app.app_context():
        return get_db().execute("SELECT COUNT(*) FROM doctor_departments").fetchone()[0]


# ---- who may use it -------------------------------------------------------

def test_anonymous_user_is_rejected(client):
    assert client.get("/assignments/").status_code == 401
    assert client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1}).status_code == 401


@pytest.mark.parametrize("role", ["doctor", "receptionist", "patient"])
def test_non_admin_roles_are_forbidden(client, app, role):
    login(client, role)
    assert client.get("/assignments/").status_code == 403
    assert client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1}).status_code == 403
    assert count_assignments(app) == 0


# ---- assigning ------------------------------------------------------------

def test_admin_can_assign_and_it_is_displayed(client, app):
    login(client, "admin")
    resp = client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1}, follow_redirects=True)
    assert b"Dr. Asha Rao assigned to Cardiology." in resp.data
    assert count_assignments(app) == 1

    page = client.get("/assignments/").data.decode()
    cardiology = page.split("<h2>Cardiology</h2>")[1].split("</section>")[0]
    assert "Dr. Asha Rao" in cardiology
    neurology = page.split("<h2>Neurology</h2>")[1].split("</section>")[0]
    assert "Dr. Asha Rao" not in neurology


def test_doctor_can_belong_to_multiple_departments(client, app):
    login(client, "admin")
    client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1})
    client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 5})
    assert count_assignments(app) == 2


# ---- invalid and duplicate input -----------------------------------------

def test_duplicate_assignment_is_prevented(client, app):
    login(client, "admin")
    client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1})
    resp = client.post("/assignments/assign", data={"doctor_id": 1, "department_id": 1}, follow_redirects=True)
    assert b"already assigned" in resp.data
    assert count_assignments(app) == 1


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"doctor_id": "1"},
        {"doctor_id": "abc", "department_id": "1"},
        {"doctor_id": "1", "department_id": ""},
        {"doctor_id": "999", "department_id": "1"},
        {"doctor_id": "1", "department_id": "999"},
    ],
)
def test_invalid_input_is_rejected(client, app, data):
    login(client, "admin")
    resp = client.post("/assignments/assign", data=data, follow_redirects=True)
    assert resp.status_code == 200
    assert b'class="msg error"' in resp.data
    assert count_assignments(app) == 0


# ---- removing -------------------------------------------------------------

def test_admin_can_remove_assignment(client, app):
    login(client, "admin")
    client.post("/assignments/assign", data={"doctor_id": 2, "department_id": 2})
    resp = client.post("/assignments/remove", data={"doctor_id": 2, "department_id": 2}, follow_redirects=True)
    assert b"Assignment removed." in resp.data
    assert count_assignments(app) == 0


def test_removing_missing_assignment_is_handled(client):
    login(client, "admin")
    resp = client.post("/assignments/remove", data={"doctor_id": 2, "department_id": 2}, follow_redirects=True)
    assert b"does not exist" in resp.data
