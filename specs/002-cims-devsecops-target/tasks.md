# Tasks: CIMS DevSecOps Target Architecture

**Input**: Design documents from `/specs/002-cims-devsecops-target/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Infrastructure initialization for local development.

- [x] T001 [P] Configure Docker Compose for core databases in `docker-compose.yml` (PostgreSQL, MongoDB, MySQL)
- [x] T002 [P] Configure Docker Compose for security/AI tools in `docker-compose.yml` (Keycloak, Ollama, n8n)
- [ ] T003 Initialize Minikube cluster and enable ingress addon
- [ ] T004 Install Argo CD via Helm in `argocd` namespace

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core Kubernetes and CI/CD foundations.

- [ ] T005 [P] Create base Kubernetes manifests in `k8s/base/` (Namespaces, ResourceQuotas)
- [ ] T006 [P] Define core NetworkPolicies for microservice isolation in `k8s/network-policy.yaml`
- [ ] T007 Configure repository-wide GitLab CI base template in `.gitlab-ci.yml`
- [ ] T008 Setup project structure for microservices in `services/` (auth, patient, rdv)

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Secure Microservices Deployment (Priority: P1) 🎯 MVP

**Goal**: Automate Build -> Scan -> Deploy pipeline for microservices.

**Independent Test**: Commit change, verify GitLab CI pass (Semgrep/Trivy) and Argo CD sync.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create `auth-service` skeleton with Node.js/Express in `services/auth-service/`
- [ ] T010 [P] [US1] Create `patient-service` skeleton with Node.js/Express in `services/patient-service/`
- [ ] T011 [P] [US1] Create `rdv-service` skeleton with Python/FastAPI in `services/rdv-service/`
- [ ] T012 [P] [US1] Implement Semgrep SAST scanning script in `pipeline/scan-sast.sh`
- [ ] T013 [P] [US1] Implement Trivy container scanning script in `pipeline/scan-image.sh`
- [ ] T014 [US1] Configure GitLab CI jobs for SAST and Container scanning in `.gitlab-ci.yml`
- [ ] T015 [US1] Create Argo CD application manifests for services in `k8s/argocd-apps/`
- [ ] T016 [US1] Verify automated deployment to Minikube after successful scans

**Checkpoint**: User Story 1 functional - automated secure delivery pipeline operational.

---

## Phase 4: User Story 2 - AI-Powered Pentesting Integration (Priority: P2)

**Goal**: Integrate DAST and AI analysis for automated reporting.

**Independent Test**: Trigger ZAP scan, verify n8n receives report and Ollama generates insights.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Implement OWASP ZAP DAST scanning script in `pipeline/scan-dast.sh`
- [ ] T018 [P] [US2] Configure n8n workflow for VOC orchestration in `voc-platform/workflows/security-analysis.json`
- [ ] T019 [US2] Implement Ollama integration in n8n for report analysis
- [ ] T020 [US2] Verify automated pentest report generation after service deployment

---

## Phase 5: User Story 3 - Centralized Auth & Monitoring (Priority: P2)

**Goal**: Implement centralized security governance and observability.

**Independent Test**: Login via Keycloak SSO and view metrics in Grafana.

### Implementation for User Story 3

- [ ] T021 [P] [US3] Configure Keycloak realms and clients for the CIMS application
- [ ] T022 [P] [US3] Integrate `keycloak-connect` in Node.js services (`auth`, `patient`)
- [ ] T023 [P] [US3] Integrate Keycloak validation in Python `rdv-service`
- [ ] T024 [P] [US3] Deploy Prometheus and Grafana to Minikube using Helm
- [ ] T025 [US3] Configure ELK stack for log centralizarion in `k8s/devsecops/elk/`
- [ ] T026 [US3] Create Grafana dashboards for CIMS metrics and security events

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Update `README.md` with final architecture and setup instructions
- [ ] T028 Final validation of `quickstart.md` journey
- [ ] T029 Perform security audit of all NetworkPolicies and Ingress configs

---

## Dependencies & Execution Order

- **Phase 1 & 2**: Sequential - must be completed before any User Story.
- **US1 (P1)**: Highest priority - establishes the core "Secure Deployment" value.
- **US2 & US3**: Can be worked on in parallel after US1 skeleton exists.
