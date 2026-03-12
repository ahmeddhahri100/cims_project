# Feature Specification: DevSecOps Infrastructure Fixes & SAST Integration

**Feature Branch**: `003-devsecops-pipeline-fixes`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "Analyse and fix errors in gitlab ci and k8s files to continue the pipeline, and integrate Semgrep SAST with local UI mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix and Run CI/CD Pipeline (Priority: P1)

As a DevOps engineer, I want to fix the existing errors in the `.gitlab-ci.yml` and Kubernetes manifests so that the pipeline can successfully build, test, and deploy the microservices.

**Why this priority**: Stabilizing the pipeline is the foundation for all subsequent automation and security enhancements.

**Independent Test**: Can be tested by triggering a pipeline run in GitLab and verifying that it reaches the deployment stage without syntax errors or placeholder failures.

**Acceptance Scenarios**:
1. **Given** a commit is pushed to `develop`, **When** the pipeline runs, **Then** all microservices (auth, patient, rdv, frontend) are successfully built and pushed to the registry.
2. **Given** a successful build, **When** the deployment job executes, **Then** the microservices are deployed to the Kubernetes cluster using correct image tags.

---

### User Story 2 - Align K8s with Polyglot Architecture (Priority: P2)

As a system architect, I want the Kubernetes manifests to reflect the target polyglot database architecture (Postgres, MongoDB, MySQL) so that the environment is consistent with the service requirements.

**Why this priority**: Correct infrastructure is necessary for the functional integrity of the patient and rdv services.

**Independent Test**: Can be tested by applying the manifests to a cluster and verifying that `mongodb` and `mysql` pods are running and accessible.

**Acceptance Scenarios**:
1. **Given** the `k8s/` manifests are applied, **When** checking the cluster state, **Then** separate deployments for Postgres, MongoDB, and MySQL are active.
2. **Given** the service-specific deployments, **When** they start up, **Then** they successfully connect to their respective databases using the updated `configmap` and `secrets`.

---

### User Story 3 - Local SAST Reporting (Priority: P3)

As a security-conscious developer, I want to see Semgrep SAST results in a way that I can easily interact with on my local machine without relying on a centralized platform.

**Why this priority**: Faster feedback loop for developers and meets the user's specific request for a "local UI".

**Independent Test**: Can be tested by running the SAST scan and opening the resulting SARIF file in a SARIF viewer.

**Acceptance Scenarios**:
1. **Given** a local scan is run, **When** it completes, **Then** a `semgrep.sarif` file is generated in the root directory.
2. **Given** the `semgrep.sarif` file, **When** opened in a compatible viewer (e.g., VS Code SARIF extension), **Then** findings are displayed with code snippets and remediation guidance.

### Edge Cases

- **Broken Registry Auth**: How does the system handle failures when pushing images to the GitLab registry? (MUST fail gracefully with clear error).
- **Database Connection Timeouts**: How does the system handle microservices starting before their respective databases? (Kubernetes readiness/liveness probes and retry logic).
- **Empty SAST Scan**: What happens if Semgrep finds zero vulnerabilities? (Must report success and generate an empty but valid report).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automate the building of Docker images for all services in the pipeline.
- **FR-002**: System MUST push images to the GitLab Container Registry with unique version tags.
- **FR-003**: System MUST provide Kubernetes manifests for PostgreSQL, MongoDB, and MySQL.
- **FR-004**: System MUST update microservice deployments to use appropriate environment variables for their specific databases.
- **FR-005**: System MUST integrate a `semgrep-sast` job in the GitLab CI pipeline.
- **FR-006**: System MUST generate SAST reports in SARIF format for local UI viewing.
- **FR-007**: System MUST allow manual triggers for production deployment.

### Key Entities

- **CI/CD Pipeline**: The automated workflow defined in `.gitlab-ci.yml`.
- **Kubernetes Manifests**: The declarative files in `k8s/` defining the cluster state.
- **SAST Report (SARIF)**: The standardized output format for security findings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GitLab CI pipeline completes from build to staging in under 15 minutes.
- **SC-002**: 100% of Kubernetes manifests pass `kubectl apply --dry-run=client` validation.
- **SC-003**: Semgrep SAST job generates a valid SARIF file for every run.
- **SC-004**: Developers can view security findings locally using standard SARIF viewers.
