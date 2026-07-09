# ArgoCD Setup for CIMS — GitOps Deployment

## What is ArgoCD?

ArgoCD is a **GitOps** tool for Kubernetes. It continuously monitors a Git repository (your GitLab repo) and ensures the desired state of applications in the cluster matches what's defined in the repo.

**Instead of**: `kubectl apply` in GitLab CI

**ArgoCD does**: Watch your GitLab repo → detect changes → auto-sync to cluster

### What ArgoCD brings to CIMS

| Capability | How it helps |
|---|---|
| **Auto-sync** | Push code → CI builds image → manifest updated → ArgoCD deploys automatically |
| **Self-healing** | If someone manually edits a pod/deployment, ArgoCD reverts it back to Git state |
| **Drift detection** | ArgoCD constantly compares cluster state vs Git state and reports differences |
| **Rollback** | One-click rollback to any previous Git commit from ArgoCD UI or CLI |
| **UI Dashboard** | Visual overview of all CIMS services, their health, sync status, and history |
| **Declarative** | Everything is code — no manual `kubectl` commands needed |

### Architecture: Before vs After ArgoCD

```
BEFORE:
Developer → push code → GitLab CI builds images → GitLab CI runs kubectl apply

AFTER:
Developer → push code → GitLab CI builds images → CI updates manifest in GitLab
                                                         ↓
                                              ArgoCD detects change → syncs to cluster
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GITLAB                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  cims-microservice                                              │   │
│  │  ├── k8s/ ←──── ArgoCD watches this directory                  │   │
│  │  │   ├── auth-deployment.yaml   (image: registry/...:abc1234)  │   │
│  │  │   ├── patient-deployment.yaml                                │   │
│  │  │   ├── rdv-deployment.yaml                                    │   │
│  │  │   ├── frontend-deployment.yaml                               │   │
│  │  │   ├── postgres-deployment.yaml                               │   │
│  │  │   ├── mysql-deployment.yaml                                  │   │
│  │  │   ├── mongodb-deployment.yaml                                │   │
│  │  │   ├── configmap.yaml                                         │   │
│  │  │   ├── secrets.yaml                                           │   │
│  │  │   ├── ingress.yaml                                           │   │
│  │  │   ├── hpa.yaml                                               │   │
│  │  │   ├── network-policy.yaml                                    │   │
│  │  │   ├── resource-quota.yaml                                    │   │
│  │  │   └── filebeat/                                              │   │
│  │  └── .gitlab-ci.yml ←── CI builds images + updates tags        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ ArgoCD polls / webhook
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                                 │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │   argocd    │  │    cims     │  │   argocd    │  │    cims      │  │
│  │  namespace  │  │  namespace  │  │  Application │  │  (all pods)  │  │
│  │             │  │             │  │              │  │              │  │
│  │ argocd-app  │  │ auth-service│──│  "cims"     │──│ patient-svc  │  │
│  │ controller  │  │ postgres    │  │ watches k8s/│  │ rdv-svc      │  │
│  │ api-server  │  │ mysql       │  │ repo path   │  │ frontend     │  │
│  │ repo-server │  │ mongodb     │  │              │  │ databases    │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Full Workflow

```
1. Developer pushes code change to GitLab (develop or main)
         │
2. GitLab CI starts pipeline:
   ├── build:     Buildah builds Docker images → pushes to GitLab Container Registry
   ├── test:      npm test / pytest
   ├── trivy-fs:  Filesystem vulnerability scan
   ├── security:  Semgrep SAST + Trivy container scan
   └── deploy:    update-image-tags job:
                  ├── sed replaces image tags in k8s/*.yaml with new SHA
                  └── git commit & push the updated manifests
         │
3. User pushes to GitLab triggers pipeline
         │
4. ArgoCD detects new commit in GitLab repo
         │
5. ArgoCD compares k8s/ directory vs cluster state
   ├── Drift detected → new image tag
   ├── Sync started
   └── New pods rolled out with updated images
         │
6. Developer verifies:
   ├── argocd app get cims → Synced, Healthy
   └── kubectl get pods -n cims → new pods running
```

---

## Prerequisites

- Kubernetes cluster (Minikube or any K8s cluster)
- `kubectl` configured
- GitLab repository with CI/CD configured
- GitLab Container Registry active (images already pushed)

---

## Step 1: Install ArgoCD on the Cluster

```bash
# 1. Create the argocd namespace
kubectl create namespace argocd

# 2. Install ArgoCD (official manifests)
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Verify all pods are running
kubectl get pods -n argocd
# Expected: argocd-application-controller, argocd-app-server,
#           argocd-repo-server, argocd-redis, argocd-dex-server

# 4. Expose ArgoCD UI via NodePort
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'

# 5. Get ArgoCD access URL
minikube service argocd-server -n argocd --url
# Or: kubectl get svc argocd-server -n argocd
```

---

## Step 2: Get ArgoCD Admin Password & Login

```bash
# 1. Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# 2. Download ArgoCD CLI
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# 3. Login via CLI (replace URL with your ArgoCD server URL)
argocd login <ARGOCD_SERVER_URL> --username admin

# 4. (Optional) Change default password
argocd account update-password
```

Open the ArgoCD URL in a browser. Login with `admin` and the password above.

---

## Step 3: Connect GitLab Repository to ArgoCD

```bash
# Option A: Using HTTPS + GitLab personal access token (recommended)
argocd repo add https://gitlab.com/cims/microservice.git \
  --username <YOUR_GITLAB_USERNAME> \
  --password <GITLAB_PERSONAL_ACCESS_TOKEN> \
  --name cims-gitlab

# Option B: Using SSH key
argocd repo add https://gitlab.com/cims/microservice.git \
  --ssh-private-key-path ~/.ssh/id_rsa \
  --name cims-gitlab

# Verify the repository was added
argocd repo list
```

### Create a GitLab Personal Access Token

1. Go to GitLab → **Settings** → **Access Tokens**
2. Create a token with scope: `read_repository`, `write_repository`
3. Copy the token — you'll only see it once

---

## Step 4: Verify K8s Manifests Point to Registry

The manifests already reference the GitLab Container Registry. Verify each service uses registry images:

```bash
grep -n "image:" k8s/*-deployment.yaml
```

Expected output:
```
k8s/auth-deployment.yaml:24:        image: registry.gitlab.com/cims/microservice/auth-service:latest
k8s/patient-deployment.yaml:24:     image: registry.gitlab.com/cims/microservice/patient-service:latest
k8s/rdv-deployment.yaml:24:         image: registry.gitlab.com/cims/microservice/rdv-service:latest
k8s/frontend-deployment.yaml:24:    image: registry.gitlab.com/cims/microservice/frontend:latest
```

Each manifest also has:
- `imagePullPolicy: Always` — ensures the latest image is always pulled
- `imagePullSecrets` → `gitlab-registry` — for authentication to the private registry

> **How it works**: The manifest has a `:latest` placeholder tag. When CI runs, it replaces `:latest` with the actual commit SHA (e.g., `:abc1234`), then commits the change. ArgoCD detects the new commit and syncs the update. The `:latest` tag is also updated by CI to ensure the initial deployment (before any CI run) still works.

---

## Step 5: Create the ArgoCD Application Resource

Create a new file `k8s/argocd-app.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cims
  namespace: argocd
  labels:
    app: cims
    environment: development
spec:
  project: default
  source:
    repoURL: https://gitlab.com/cims/microservice.git
    targetRevision: main
    path: k8s
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
    namespace: cims
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
  revisionHistoryLimit: 10
```

> **Note**: If you want ArgoCD to watch the `develop` branch instead (or in addition), change `targetRevision: develop`. For multiple environments, use an **ApplicationSet** (see Advanced section).

Apply the Application:

```bash
kubectl apply -f k8s/argocd-app.yaml
```

---

## Step 5b (Optional but Recommended): Configure GitLab Webhook for Instant Sync

By default, ArgoCD polls GitLab every 3 minutes. For instant sync on every push, set up a webhook:

### Option A: Use ArgoCD's built-in webhook (no token — simpler)

```bash
# 1. Get the ArgoCD webhook URL
echo "http://$(minikube service argocd-server -n argocd --url | head -1 | sed 's|http://||' | sed 's|:[0-9]*$||'):$(kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[0].nodePort}')/api/webhook"

# 2. In GitLab → Settings → Webhooks
#    - URL: the output above
#    - Secret Token: (leave blank for no token)
#    - Trigger: Push events (only)
#    - Enable SSL verification: No (for local/Minikube)
```

### Option B: With a shared secret (production)

```bash
# 1. Generate a random secret
WEBHOOK_SECRET=$(openssl rand -hex 20)

# 2. Patch ArgoCD to use the secret
kubectl patch secret argocd-secret -n argocd \
  -p "{\"stringData\": {\"webhook.gitlab.secret\": \"$WEBHOOK_SECRET\"}}"

# 3. Restart ArgoCD to pick up the secret
kubectl rollout restart deployment argocd-server -n argocd

# 4. In GitLab → Settings → Webhooks
#    - URL: http://<ARGOCD_SERVER>/api/webhook
#    - Secret Token: <WEBHOOK_SECRET>
#    - Trigger: Push events
```

> **Why this matters**: Without webhooks, from push to deployment = 3+ min. With webhooks, ≈ 30 seconds.

---

## Step 6: Update GitLab CI — Replace kubectl Deploy with Image Tag Update

Modify `.gitlab-ci.yml`:

**Remove the old `deploy:minikube` job** (lines 243-284).

**Add this job in its place**:

```yaml
update-image-tags:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache git sed
    - git config user.name "CI Pipeline"
    - git config user.email "ci@cims.tn"
  script:
    # Replace :latest with the actual commit SHA in each manifest
    # The regex matches "image: <anything>/<service-name>:<anything>"
    - sed -i "s|image: .*/auth-service.*|image: ${CI_REGISTRY_IMAGE}/auth-service:${CI_COMMIT_SHORT_SHA}|" k8s/auth-deployment.yaml
    - sed -i "s|image: .*/patient-service.*|image: ${CI_REGISTRY_IMAGE}/patient-service:${CI_COMMIT_SHORT_SHA}|" k8s/patient-deployment.yaml
    - sed -i "s|image: .*/rdv-service.*|image: ${CI_REGISTRY_IMAGE}/rdv-service:${CI_COMMIT_SHORT_SHA}|" k8s/rdv-deployment.yaml
    - sed -i "s|image: .*/frontend.*|image: ${CI_REGISTRY_IMAGE}/frontend:${CI_COMMIT_SHORT_SHA}|" k8s/frontend-deployment.yaml
    # Verify changes
    - git diff k8s/
    # Commit and push only if something changed
    - git add k8s/
    - git diff --cached --exit-code || git commit -m "chore: update image tags to ${CI_COMMIT_SHORT_SHA} [skip ci]"
    - git push https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/${CI_PROJECT_PATH}.git HEAD:${CI_COMMIT_REF_NAME}
  only:
    - develop
    - main
```

---

## Step 7: Deploy CIMS with ArgoCD

```bash
# 1. Apply the ArgoCD Application (this tells ArgoCD to start managing CIMS)
kubectl apply -f k8s/argocd-app.yaml

# 2. Check sync status
argocd app get cims

# 3. Watch the sync in real-time
argocd app sync cims --watch

# 4. Wait for all resources to be healthy
kubectl get pods -n cims -w
```

---

## Step 8: Test the Full GitOps Workflow

### Make a Code Change

```bash
# 1. Edit a file (example: change a response message)
echo "console.log('New version v2');" >> auth-service/src/app.js

# 2. Commit and push
git add auth-service/
git commit -m "feat: add new version log"
git push origin develop
```

### What Happens Automatically

```
1. GitLab CI starts:
   ├── build:auth     → builds & pushes auth-service:abc1234
   ├── test:auth      → runs tests
   ├── trivy-fs:auth  → scans dependencies
   ├── semgrep        → SAST scan
   └── update-image-tags → updates k8s/auth-deployment.yaml → push to GitLab

2. ArgoCD detects new commit on develop branch
   ├── "Sync Status: OutOfSync"
   └── Auto-sync starts (since syncPolicy.automated is enabled)

3. ArgoCD applies the change:
   ├── Rolling update of auth-service deployment
   └── Old pod terminated, new pod created with new image

4. Verify:
   argocd app get cims           → Sync Status: Synced, Health Status: Healthy
   kubectl logs deployment/auth-service -n cims --tail=5
```

---

## Useful ArgoCD Commands

### CLI

```bash
# List all applications
argocd app list

# Get application details
argocd app get cims

# View sync status and resources
argocd app get cims -o wide

# Manual sync
argocd app sync cims

# Rollback to previous revision
argocd app rollback cims --id <REVISION_NUMBER>

# View sync history
argocd app history cims

# Watch events in real-time
argocd app wait cims --health

# Delete application (without deleting cluster resources)
argocd app delete cims --cascade=false
```

### UI

Open the ArgoCD URL → Click on the **cims** application → You'll see:
- **SYNC STATUS**: Synced / OutOfSync
- **HEALTH STATUS**: Healthy / Degraded / Progressing
- **RESOURCE TREE**: Visual map of all K8s resources
- **SYNC HISTORY**: Timeline of all deployments with Git commit references
- **DIFF**: Side-by-side comparison between Git state and cluster state

---

## Troubleshooting

### Application shows "OutOfSync" and won't sync

```bash
# Check if ArgoCD can reach GitLab
argocd repo list

# Check repo connection
argocd repo get cims-gitlab

# View detailed sync error
argocd app get cims -o yaml | grep -A 10 syncStatus

# Force refresh
argocd app sync cims --force --prune
```

### "ImagePullBackOff" — Cannot pull image from registry

```bash
# Check the exact image in the pod
kubectl describe pod <pod-name> -n cims

# The image must exist in GitLab Container Registry at:
# registry.gitlab.com/cims/microservice/<service>:<SHA>

# If using a private registry, you may need an imagePullSecret:
kubectl create secret docker-registry gitlab-registry \
  --docker-server=registry.gitlab.com \
  --docker-username=<GITLAB_USER> \
  --docker-password=<GITLAB_TOKEN> \
  --namespace=cims

# Then reference it in each deployment:
# spec.template.spec.imagePullSecrets:
#   - name: gitlab-registry
```

### Pods not updating after image tag change

```bash
# Force ArgoCD to re-sync
argocd app sync cims

# Check if the manifest in GitLab actually has the new tag
git show HEAD:k8s/auth-deployment.yaml | grep image:

# Check if the ArgoCD Application targets the correct branch
argocd app get cims | grep "Target Revision"
```

### "CreateNamespace=true" permission error

```bash
# Ensure ArgoCD has permissions to create namespaces
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager-ns
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["create", "get", "list", "watch"]
EOF

kubectl create clusterrolebinding argocd-manager-ns-binding \
  --clusterrole=argocd-manager-ns \
  --serviceaccount=argocd:argocd-application-controller
```

---

## Advanced Topics

### Multi-Environment with ApplicationSet

For separate `dev` and `prod` environments, create an ApplicationSet instead of a single Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cims-environments
  namespace: argocd
spec:
  generators:
  - list:
      elements:
        - cluster: dev
          branch: develop
        - cluster: prod
          branch: main
  template:
    metadata:
      name: 'cims-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://gitlab.com/cims/microservice.git
        targetRevision: '{{branch}}'
        path: k8s
        directory:
          recurse: true
      destination:
        server: https://kubernetes.default.svc
        namespace: 'cims-{{cluster}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

### Secrets Management with SealedSecrets

Plain secrets in `secrets.yaml` are not secure for production. Use **SealedSecrets**:

```bash
# 1. Install the SealedSecrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/controller.yaml

# 2. Install kubeseal CLI
curl -sSL -o /usr/local/bin/kubeseal \
  https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/kubeseal-linux-amd64
chmod +x /usr/local/bin/kubeseal

# 3. Create a SealedSecret from your plain secret
kubeseal --format yaml < k8s/secrets.yaml > k8s/sealed-secrets.yaml

# 4. Remove the plain secrets.yaml from kustomization (if using Kustomize)
# or delete it from the directory

# 5. Commit the sealed-secrets.yaml (it's safe to commit — only the controller can decrypt it)
```

### Image Update Strategy Options

| Strategy | How it works | When to use |
|---|---|---|
| **CI commits tag** (this guide) | CI builds image, then sed + git commit the new tag in the manifest | Simple, recommended to start |
| **ArgoCD Image Updater** | Separate tool watching GitLab Container Registry, auto-updates manifests when new images appear | More automated, no extra commits |
| **`:latest` tag** | CI always pushes as `:latest`, no tag update needed in manifests | Simple but no traceability |

---

## File Structure After ArgoCD

```
cims-microservice/
├── .gitlab-ci.yml              # CI/CD with update-image-tags job
├── ARGOCD.md                   # This file
├── k8s/
│   ├── argocd-app.yaml         # ❐ NEW — ArgoCD Application definition
│   ├── auth-deployment.yaml    # ✓ Already using registry image + :latest tag
│   ├── patient-deployment.yaml # ✓ Already using registry image + :latest tag
│   ├── rdv-deployment.yaml     # ✓ Already using registry image + :latest tag
│   ├── frontend-deployment.yaml# ✓ Already using registry image + :latest tag
│   ├── configmap.yaml          # ✓ No change needed
│   ├── secrets.yaml            # ✓ No change needed (or replace with sealed-secrets.yaml)
│   ├── ingress.yaml            # ✓ No change needed
│   ├── hpa.yaml                # ✓ No change needed
│   ├── network-policy.yaml     # ✓ No change needed
│   ├── resource-quota.yaml     # ✓ No change needed
│   ├── namespace.yaml          # ✓ No change needed
│   ├── postgres-deployment.yaml# ✓ No change needed
│   ├── mysql-deployment.yaml   # ✓ No change needed
│   ├── mongodb-deployment.yaml # ✓ No change needed
│   ├── postgres-init-configmap.yaml # ✓ No change needed
│   ├── mysql-init-configmap.yaml    # ✓ No change needed
│   ├── n8n-rbac.yaml           # ✓ No change needed
│   ├── deploy-minikube.sh      # ✎ IMPROVED — now has --argocd and --bootstrap flags
│   └── filebeat/               # ✓ No change needed
├── auth-service/
├── patient-service/
├── rdv-service/
└── frontend/
```

---

## Security Considerations

| Concern | Recommendation |
|---|---|
| **Secrets in Git** | Replace plain `secrets.yaml` with **SealedSecrets** (see Advanced) |
| **GitLab token** | Store as GitLab CI/CD variable, never hardcode |
| **ArgoCD admin password** | Change immediately after first login |
| **Webhook security** | Use a shared secret for GitLab → ArgoCD webhooks |
| **Network policies** | ArgoCD namespace should have restricted access via NetworkPolicy |

---

## Summary

| Before (without ArgoCD) | After (with ArgoCD) |
|---|---|
| `kubectl apply` done by GitLab CI | ArgoCD syncs from Git automatically |
| Manual rollback via re-run CI | One-click rollback from ArgoCD UI |
| Drift possible if someone edits with `kubectl` | Self-healing — ArgoCD reverts to Git state |
| No deployment history in cluster | Full sync history with Git commit references |
| Single environment | Easy multi-env with ApplicationSets |
| CI must have K8s credentials | Only ArgoCD needs K8s access — CI only needs Git |

---

© 2025 CIMS — CIMS
