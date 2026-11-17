# Hospital Management System — documentation index

This folder contains the documents currently committed to the repository.

| File | Purpose |
|---|---|
| [SRSdocument.pdf](SRSdocument.pdf) | Software Requirements Specification: functional and non-functional requirements |
| [SOFTWARE_ARCHITECTURE_DESIGN.md](SOFTWARE_ARCHITECTURE_DESIGN.md) | As-built architecture, components, APIs, data relationships, workflow design, and architecture decisions |
| [Software_Architecture_and_Design.pdf](Software_Architecture_and_Design.pdf) | Submission-ready rendering of the as-built architecture and design |
| [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md) | Security requirements, implementation status, role-permission matrix, and verification mapping |
| [Security_Requirements.pdf](Security_Requirements.pdf) | Submission-ready rendering of the security requirements and control status |
| [testPlanDocument.pdf](testPlanDocument.pdf) | Test plan for login, patient records, doctors, appointments, admissions, billing, notifications, and reports |
| [useCaseDiagram.jpeg](useCaseDiagram.jpeg) | Use-case diagram for Admin, Doctor, Receptionist, and Patient roles |
| [useCaseFlowDocumentation.pdf](useCaseFlowDocumentation.pdf) | Main, alternate, and exception flows for the use cases |
| [TEST_PLAN_COVERAGE.md](TEST_PLAN_COVERAGE.md) | Requirement and test-case implementation mapping |
| [FINAL_VERIFICATION_CHECKLIST.md](FINAL_VERIFICATION_CHECKLIST.md) | Remaining manual and environment verification checklist |
| [TestingReport/Software_Testing_Report.pdf](TestingReport/Software_Testing_Report.pdf) | Executed unit, integration, and system testing assessment |
| [TestingReport/Test_Cases.xlsx](TestingReport/Test_Cases.xlsx) | Test register, defect log, and summary workbook |
| [TestingReport/TESTING_README.md](TestingReport/TESTING_README.md) | Reproduction commands, actual results, evidence locations, and limitations |

## User roles

- **Admin** — manages departments, doctors, and reports; can access staff workflows.
- **Doctor** — reviews patient records, records clinical history and prescriptions, and completes appointments.
- **Receptionist** — registers patients, manages appointments and admissions, and handles billing.
- **Patient** — books/reschedules/cancels their own appointments and views their own clinical history.

## Implementation notes

The current backend implements room/bed conflict protection, active appointment-slot conflict protection, itemized bill calculations, and role checks. Notifications are in-app dashboard reminders; they do not send email or SMS. Review the root README for setup and CI commands.

The as-built architecture baseline is maintained in `SOFTWARE_ARCHITECTURE_DESIGN.md`. The submitted SRS and Test Plan remain the requirements and planning baselines; implementation differences and actual execution results are recorded in the coverage mapping and testing report.

## Document control

- The Markdown architecture, security, coverage, checklist, and testing-evidence files describe the repository as implemented.
- The PDF SRS, Test Plan, and use-case flow are submitted baseline documents and should not be silently rewritten to match later implementation changes.
- A mapped feature is not automatically a passed test. Only the Testing Report and its execution logs provide pass evidence.
- Known limitations must remain visible until the corresponding work is executed and verified.
