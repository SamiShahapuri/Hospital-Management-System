DROP TABLE IF EXISTS doctor_departments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE doctors (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    specialization TEXT NOT NULL
);

-- A doctor can belong to many departments, but only once to each one.
CREATE TABLE doctor_departments (
    doctor_id     INTEGER NOT NULL REFERENCES doctors(id)     ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY (doctor_id, department_id)
);
