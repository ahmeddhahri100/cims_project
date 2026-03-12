# Research: DevSecOps Infrastructure Fixes

This document tracks research tasks and decisions for stabilizing the CIMS pipeline and integrating SAST.

## Research Tasks

- [x] **RT-001**: Semgrep SARIF report generation and local UI viewing.
- [ ] **RT-002**: GitLab CI syntax validation and registry tagging best practices.
- [ ] **RT-003**: Kubernetes manifests for MongoDB and MySQL (official images and configurations).

## Findings

### RT-001: Semgrep SARIF & Local UI
- **Decision**: Use `semgrep scan --sarif --output semgrep.sarif`.
- **Rationale**: SARIF is the industry standard for static analysis results.
- **Alternatives considered**: JSON (machine readable but lacks built-in viewer support in many IDEs), HTML (static, non-interactive).
- **Local UI**: The user can use the "SARIF Viewer" extension in VS Code to open the `.sarif` file, which provides a rich, interactive UI with code highlighting and remediation advice.

### RT-002: GitLab CI Alignment
- **Decision**: Use `$CI_COMMIT_SHORT_SHA` for image tagging and ensure registry authentication is handled via `$CI_REGISTRY_USER`.
- **Rationale**: Short SHA provides a unique, traceable tag per commit while keeping things readable.

### RT-003: Polyglot Database Manifests
- **Decision**: Use `mongo:6.0` for Patient service and `mysql:8.0` for RDV service.
- **Rationale**: Compatible with the modern stacks intended for these services.
- **Config**: Databases will be exposed internally via ClusterIP services named `mongodb-patient` and `mysql-rdv`.
