# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature aims to stabilize the CIMS DevSecOps pipeline by fixing syntax errors in `.gitlab-ci.yml`, aligning Kubernetes manifests with the target polyglot database architecture (PostgreSQL, MongoDB, MySQL), and integrating Semgrep SAST with SARIF reporting for local UI visibility.

## Technical Context

**Language/Version**: Node.js 18+ (Auth, Patient, Frontend), Python 3.9+ (RDV)  
**Primary Dependencies**: Express, FastAPI, Semgrep, kubectl, Minikube  
**Storage**: PostgreSQL (Auth), MongoDB (Patient), MySQL (RDV)  
**Testing**: GitLab CI, Semgrep SAST, kubectl dry-runs  
**Target Platform**: Kubernetes (Minikube)  
**Project Type**: Microservices Web Service  
**Performance Goals**: Pipeline completion < 15 mins  
**Constraints**: Must work on local Minikube environment  
**Scale/Scope**: 4 Microservices + 3 Database Types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Logic |
|------|--------|-------|
| I. Microservices Polyglottes | ✅ Pass | Moving Patient to MongoDB and RDV to MySQL ensures database independence. |
| III. Conteneurisation et Orchestration | ✅ Pass | Standardizing deployments via K8s manifests for all services. |
| IV. Communication RESTful | ✅ Pass | Services remain loosely coupled, configured via environment variables. |
| Local Development via Docker | ✅ Pass | Pipeline maintains parity between local Docker and K8s environments. |

## Project Structure

### Documentation (this feature)

```text
specs/003-devsecops-pipeline-fixes/
├── plan.md              # This file
├── research.md          # Research findings (Semgrep SARIF, PFE stack)
├── data-model.md        # Polyglot DB entities (Postgres, Mongo, MySQL)
├── quickstart.md        # Deployment guide for Minikube
└── contracts/           # API specs for the microservices
```

### Source Code (repository root)

```text
auth-service/       # Node.js + Postgres
patient-service/    # Node.js + MongoDB
rdv-service/        # Python + MySQL
frontend/           # React/Vite
k8s/                # Kubernetes Manifests
pipeline/           # DevSecOps scripts (Semgrep)
.gitlab-ci.yml      # Pipeline configuration
```

**Structure Decision**: Microservices architecture with service-specific directories and a central `k8s/` configuration folder.

## Complexity Tracking

> **No violations of core principles identified.**

## Status
**Plan Ready for Task Generation.**
