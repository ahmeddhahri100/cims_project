# Quickstart: CIMS DevSecOps Environment

Follow these steps to verify the fixed pipeline and deploy locally on Minikube.

## Prerequisites
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- Docker

## Local Setup

1. **Start Minikube**:
   ```bash
   minikube start --driver=docker
   ```

2. **Apply Manifests**:
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/
   ```

3. **Verify Databases**:
   ```bash
   kubectl get pods -n cims
   # Should see postgres, mongodb-patient, and mysql-rdv running
   ```

## Local SAST Verification

1. **Run Semgrep**:
   ```bash
   docker run --rm -v "$(pwd):/src" returntocorp/semgrep semgrep scan --config auto --sarif --output semgrep.sarif
   ```

2. **View Results**:
   - Install the **SARIF Viewer** extension in VS Code.
   - Open `semgrep.sarif` in VS Code to see the interactive UI findings.

## Pipeline Verification
The GitLab CI pipeline is configured to:
1. Build and tag images with Git SHA.
2. Push to the registry.
3. Run Semgrep and export SARIF artifacts.
4. Deploy to Kubernetes using the updated polyglot manifests.
