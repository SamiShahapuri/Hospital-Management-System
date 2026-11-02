# Hospital Management System — documentation index

This folder contains the documents currently committed to the repository.

| File | Purpose |
|---|---|
| [SRSdocument.pdf](SRSdocument.pdf) | Software Requirements Specification: functional and non-functional requirements |
| [testPlanDocument.pdf](testPlanDocument.pdf) | Test plan for login, patient records, doctors, appointments, admissions, billing, notifications, and reports |
| [useCaseDiagram.jpeg](useCaseDiagram.jpeg) | Use-case diagram for Admin, Doctor, Receptionist, and Patient roles |
| [useCaseFlowDocumentation.pdf](useCaseFlowDocumentation.pdf) | Main, alternate, and exception flows for the use cases |

## User roles

- **Admin** — manages departments, doctors, and reports; can access staff workflows.
- **Doctor** — reviews patient records, records clinical history and prescriptions, and completes appointments.
- **Receptionist** — registers patients, manages appointments and admissions, and handles billing.
- **Patient** — books/reschedules/cancels their own appointments and views their own clinical history.

## Implementation notes

The current backend implements room/bed conflict protection, active appointment-slot conflict protection, itemized bill calculations, and role checks. Notifications are in-app dashboard reminders; they do not send email or SMS. Review the root README for setup and CI commands.

The submitted SAD was not found in the current repository snapshot. Add the originally submitted SAD before final submission or record that it is stored separately.
