# Tasks: DevSecOps Infrastructure Fixes & SAST Integration

**Input**: Design documents from `/specs/003-devsecops-pipeline-fixes/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL. The user has not explicitly requested a TDD approach for this infrastructure task, so we focus on validation and deployment verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initializing the feature environment and verify preconditions.

- [ ] T001 Verify Minikube status and Docker driver configuration
- [x] T002 Initialize the feature branch `003-devsecops-pipeline-fixes`
- [x] T003 Create documentation structure in `specs/003-devsecops-pipeline-fixes/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration that MUST be complete before user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Define common environment variables in `k8s/configmap.yaml`
- [x] T005 [P] Define sensitive credentials in `k8s/secrets.yaml`
- [x] T006 [P] Update `k8s/namespace.yaml` for correct labels/annotations
- [x] T007 [P] Configure GitLab CI global variables (IMAGE_PREFIX, etc.) in `.gitlab-ci.yml`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Fix and Run CI/CD Pipeline (Priority: P1) 🎯 MVP

**Goal**: Stabilize the pipeline to build and deploy with unique tags.

**Independent Test**: Trigger a pipeline and verify `build` and `deploy` stages pass.

### Implementation for User Story 1

- [x] T008 [US1] Update `build` stage in `.gitlab-ci.yml` to use `$CI_COMMIT_SHORT_SHA` for tagging
- [x] T009 [US1] Update `deploy` stage in `.gitlab-ci.yml` to use environment variables for image tags
- [x] T010 [US1] Fix registry authentication in `.gitlab-ci.yml` using `$CI_REGISTRY_USER` and `$CI_REGISTRY_PASSWORD`
- [x] T011 [US1] Validate pipeline syntax using GitLab Lint API or manual check

**Checkpoint**: User Story 1 (Pipeline MVP) is fully functional.

---

## Phase 4: User Story 2 - Align K8s with Polyglot Architecture (Priority: P2)

**Goal**: Separate databases and update service connection configs.

**Independent Test**: Verify `patient-service` connects to MongoDB and `rdv-service` to MySQL.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create MongoDB deployment and service in `k8s/mongodb-deployment.yaml`
- [x] T013 [P] [US2] Create MySQL deployment and service in `k8s/mysql-deployment.yaml`
- [x] T014 [US2] Update `patient-service` environment variables in `k8s/patient-deployment.yaml` to use MongoDB URI
- [x] T015 [US2] Update `rdv-service` environment variables in `k8s/rdv-deployment.yaml` to use MySQL DSN
- [x] T016 [US2] Update `postgres-deployment.yaml` to ensure isolation for `auth-service`
- [x] T017 [US2] Run `kubectl apply --dry-run=client -f k8s/` to validate all manifests

**Checkpoint**: User Story 2 (Polyglot Infrastructure) is complete and verifiable.

---

## Phase 5: User Story 3 - Local SAST Reporting (Priority: P3)

**Goal**: Integrate Semgrep with SARIF output for local UI visibility.

**Independent Test**: Run scan and verify `semgrep.sarif` can be opened in VS Code SARIF viewer.

### Implementation for User Story 3

- [x] T018 [P] [US3] Configure Semgrep rules in `.semgrep.yml`
- [x] T019 [P] [US3] Create Semgrep execution script `pipeline/scan-sast.sh` with SARIF output
- [x] T020 [US3] Add `semgrep-sast` job to `.gitlab-ci.yml` with SARIF artifact storage
- [x] T021 [US3] Verify local SARIF generation by running Semgrep in Docker

**Checkpoint**: User Story 3 (SAST) provides local UI reporting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation updates.

- [x] T022 [P] Update `README.md` with instructions for local SARIF viewing
- [x] T023 Final validation of `quickstart.md` on Minikube
- [x] T024 Clean up any temporary or placeholder files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion.
- **User Stories (Phase 3-5)**: All depend on Foundational completion.
- **Polish (Phase 6)**: Depends on all user stories completion.

### Parallel Opportunities

- T005, T006, T007 (Foundational)
- T012, T013 (K8s Deployments)
- T018, T019 (SAST Setup)

---

## Parallel Example: User Story 2

```bash
# Apply new database manifests in parallel
kubectl apply -f k8s/mongodb-deployment.yaml &
kubectl apply -f k8s/mysql-deployment.yaml &
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (Pipeline stabilization).
3. **VALIDATE**: Ensure images are built and tagged correctly.

### Incremental Delivery

1. Setup + Foundation → Infrastructure ready.
2. Add US1 → Pipeline ready (MVP).
3. Add US2 → Polyglot DBs ready.
4. Add US3 → Security reporting ready.
