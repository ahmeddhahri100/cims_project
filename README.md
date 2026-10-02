# CIMS Project

## What is this project?

**CIMS** is a hospital information system. It replaces the paper-based processes of a clinic with a single web application where doctors manage their patients and appointments.

A real clinic has a security problem: sensitive patient data is spread across many small services, each with its own database, and nobody has a global view of what is happening inside the system. A compromised account, a leaked token or a malicious request leaves no visible trace.

This project has **two parts**:

1. **The hospital application** — patients, doctors and appointments.
2. **A security platform** — a dashboard that watches the application, reads its logs and explains suspicious activity using AI.

---

## What is the solution?

### 1. The hospital application (`microservice/`)

The system is split into three independent services, each owning its own database:

- **Authentication** — sign up, sign in, roles (`patient`, `doctor`, `admin`). Issues a token that the other services verify.
- **Patients** — patient records, profiles, created and updated by doctors.
- **Appointments** — booking, cancelling and tracking doctor availability, with a calendar view.

A React front end talks to all three. The user interface is available in **French and English**.

### 2. The security platform (`platform_VOC/`)

Instead of adding monitoring code into the hospital services, the platform observes them **from the outside**:

- The application runs on Kubernetes, and **Filebeat** ships its logs to Elasticsearch.
- **n8n** reads those logs on a schedule and hands them to a **local AI model (Ollama)**.
- The AI decides whether the activity is a genuine attack, rates the threat, and explains what happened in plain language.
- Results appear on a **live dashboard**, are stored for history, and are emailed as alerts.
- Results can also be exported as a **PDF report**, and a **chatbot** answers questions about past incidents by querying the database in natural language.

### 3. Secure development pipeline

Every change is checked automatically before it ships: unit tests, dependency and container scanning, static analysis of the source code, and an OWASP web scan. The Kubernetes configuration is applied by **ArgoCD**, so the running system always matches the repository.

---

## What are the results?

### A working end-to-end system

- Three services with three different databases (PostgreSQL, MongoDB, MySQL), running together and authenticating against each other.
- Doctors can register patients and manage appointments through a bilingual (French / English) web interface.

### A functioning AI security layer

- Attack attempts are captured, classified by a local AI model, and explained in readable language instead of raw log lines.
- Every incident keeps a timestamped history, so a security engineer can review what happened and when.
- Alerts are emailed with a threat level, and reports can be exported as PDF.
- A natural-language chatbot answers questions about past incidents.

### Automated security checking

Every push triggers the pipeline, which runs **four scanners** in addition to the unit tests: Trivy (filesystem and container images), Semgrep static analysis, and OWASP ZAP.

| Measured result | Value |
|---|---|
| Security issues found by static analysis | **21** findings |
| Categories they fall into | 5 (privilege escalation, containers running as root, missing CSRF protection, wildcard CORS, missing non-root user) |
| Custom security rules written for this project | 6 |
| Tools scanning every change | 4 |
| Kubernetes manifests managed | 19 |

The 21 findings above come from a local Semgrep run. They are real issues the pipeline is designed to surface — privilege escalation and root containers in particular — and they demonstrate that the pipeline works rather than passing silently.

> **Fill in your own figures here.** The numbers above are code-derived. Add the ones only you can measure from your own testing: attacks correctly classified vs. missed, false-positive rate, and the time saved compared with reading logs manually.

---

## Repository layout

```
cims_project/
├── microservice/     the hospital application (3 services + web interface)
├── platform_VOC/     the AI security platform (dashboard, automation, AI)
└── README.md
```

Each folder contains its own setup instructions.

---

## Note on credentials

This repository contains **no real credentials**. Values you find in the configuration files are local-development placeholders that exist only to let the project start on a laptop. Real deployments must supply their own secrets through environment variables — the `.env.example` and `secrets.example.yaml` templates show which ones are required.

Two vulnerabilities are known and documented rather than hidden:

- The front end should authenticate to Keycloak using **PKCE** instead of a client secret, because any value in a front-end variable is visible to whoever opens the browser.
- The two halves of the project both use port `8080` for Keycloak, so they cannot run at the same time on one machine.