# CIMS Project

A hospital information system (CIMS) built as **two independent layers**:

| Layer | Folder | What it is |
|---|---|---|
| **The application** | [`microservice/`](microservice/) | The actual hospital software — patients, doctors, appointments. |
| **The security platform** | [`platform_VOC/`](platform_VOC/) | A SOC dashboard that watches the application, reads its logs and explains attacks with AI. |

The two layers are deliberately decoupled: the hospital system works on its own, and the security platform observes it from the outside without changing any of its code.

---

## 1. The two layers at a glance

### `microservice/` — the hospital system

A polyglot microservices backend. Each service owns its own database and never reads another service's tables.

| Service | Port | Stack | Database |
|---|---|---|---|
| `auth-service` | 3001 | Node.js / Express | PostgreSQL (`cims_auth`) |
| `patient-service` | 3002 | Node.js / Express | MongoDB (`cims_patients`) |
| `rdv-service` | 3003 | Python / FastAPI | MySQL (`cims_rdv`) |
| `frontend` | 3004 | React + Vite (served by Nginx) | — |

**Authentication** is a custom JWT issued by `auth-service` (HS256, 24h). Every other service validates each request by calling `POST /api/auth/verify` on `auth-service`. Roles are `patient`, `doctor` and `admin`.

The frontend is a React SPA that talks to all three services through Nginx, which reverse-proxies `/api/auth`, `/api/patients` and `/api/rdv` to the right container. It supports English and French (i18next).

> A Keycloak container is defined in `docker-compose.yml` but is **not used** — authentication is still the custom JWT flow above.

Full details: [`microservice/README.md`](microservice/README.md) (French) · [K8s guide](microservice/k8s/README.md)

### `platform_VOC/` — the security platform

A monitoring and incident-response console for the hospital system.

| Component | Port | Stack |
|---|---|---|
| `backend-express` | 8000 | Node.js / Express |
| `frontend` | 5173 | React 19 + Vite |
| n8n | 5678 | workflow automation |
| Ollama | 11434 | local LLM (`llama3`, `qwen2.5`) |
| Keycloak | 8080 | SSO — realm `platform-voc` |
| Elasticsearch | 9200 | log storage |
| Kibana | 5601 | log exploration |
| PostgreSQL | 5432 | scan sessions, attack logs, AI analysis |

**Authentication** here *is* Keycloak (realm `platform-voc`, OIDC + JWKS token verification), with optional **TOTP two-factor** on top.

What it does:

- Kicks off Kubernetes scans through an n8n webhook
- Logs detected attacks, then asks Ollama to classify and explain them
- Shows results on a live dashboard, stores them in PostgreSQL, and exports PDF reports
- Includes a chatbot that answers questions by querying the analysis tables with natural language
- Sends email alerts with a threat level when the n8n workflow fires

---

## 2. How the layers connect

The hospital system never calls the security platform. Data flows one way only, through **logs**:

```
microservice/  (running on Kubernetes)
      │
      │  Filebeat ships pod logs
      ▼
Elasticsearch  ──────────────────────────┐
  filebeat-cims-*                        │
                                         │  n8n workflow reads recent logs
                                         ▼
                              n8n  ──►  Ollama  ──►  threat level + AI analysis
                                │                        │
                                │                        ▼
                                └──────────────►  PostgreSQL (voc.*)
                                                         │
                                                         ▼
                                              platform_VOC/  dashboard,
                                              PDF report, chatbot, email alert
```

`platform_VOC` also keeps a small inventory of the microservice endpoints in its `cims_endpoints` table, so scans know what to target.

---

## 3. Running it

### Prerequisites

Docker and Docker Compose. Everything else runs inside containers.

### Layer 1 — the hospital system

```bash
cd microservice
sudo docker compose up --build -d
./check.sh                                          # waits for services to be healthy
```

The app is then on **http://localhost:3004**. Swagger docs for the appointment API: **http://localhost:3003/docs**.

| Port | Service |
|---|---|
| 3004 | Frontend (Nginx) |
| 3001 / 3002 / 3003 | auth / patient / rdv APIs |
| 5433 / 27017 / 3306 | PostgreSQL / MongoDB / MySQL |

Run the tests with `npm test` inside `auth-service` and `patient-service`, and `pytest` inside `rdv-service`.

### Layer 2 — the security platform

Infrastructure first:

```bash
cd platform_VOC
docker compose up -d                                # n8n, Ollama, Keycloak, Elasticsearch, Kibana, PostgreSQL
```

Then the two apps, which run outside Docker:

```bash
cd backend-express
cp .env.example .env        # fill in the Keycloak client secret and admin credentials
npm install
npm run dev                 # → http://localhost:8000

cd ../frontend
cp .env.example .env
npm install
npm run dev                 # → http://localhost:5173
```

> **Note:** both layers map Keycloak to host port `8080`, so they cannot run at the same time. Stop one before starting the other, or change one of the port mappings.

### Kubernetes (hospital system only)

```bash
cd microservice/k8s
./deploy-minikube.sh
```

Applies the namespace, config, databases, all four deployments and the ingress to a local Minikube cluster. Copy `secrets.example.yaml` to `secrets.yaml` and fill it in first — it holds the credentials the deployments need.

---

## 4. Configuration and secrets

**No real credentials belong in this repository.** Every value that must be set is either read from an environment variable or supplied through a template:

| Template | Used by |
|---|---|
| `microservice/k8s/secrets.example.yaml` | Kubernetes secrets for the hospital system |
| `platform_VOC/backend-express/.env.example` | Backend, Keycloak, PostgreSQL, Ollama, n8n |
| `platform_VOC/frontend/.env.example` | Frontend Keycloak settings |

The real files (`secrets.yaml`, `.env`, `realm-export.json`) are gitignored and were never committed.

Values still visible in tracked files are **local-development placeholders** (`devpassword`, `n8npassword`, `CHANGE_ME`) that exist only to make `docker compose up` work out of the box. They are not safe for anything but a laptop.

---

## 5. DevSecOps

The `microservice` layer ships a full pipeline in [`.gitlab-ci.yml`](microservice/.gitlab-ci.yml):

- **Build** — four images tagged with the commit SHA
- **Test** — Jest for the Node services, pytest for the FastAPI service, frontend build
- **Scan** — Trivy (filesystem and image), Semgrep SAST with custom rules in `.semgrep.yml`, OWASP ZAP on a schedule
- **Deploy** — `main` only: retags the Kubernetes manifests and pushes, which ArgoCD syncs automatically

Kubernetes manifests live in [`microservice/k8s/`](microservice/k8s/) and include namespace and resource quotas, network policies, four horizontal pod autoscalers, Filebeat log shipping and an ArgoCD `Application`.

The `platform_VOC` layer has no CI yet.

---

## 6. Known limitations

Worth knowing before you build on this:

- The two layers are wired together only through Elasticsearch logs. Run the hospital system on Minikube and the platform on the host for the end-to-end flow to work.
- `platform_VOC` needs a `voc` database schema and a `voc.totp_secrets` table created by hand — nothing creates them automatically, and the backend otherwise writes to the default `public` schema.
- The Ollama model differs per workflow (`llama3`, `llama3.1`, `qwen2.5`, `deepseek-coder`). Pull the ones you actually need.
- `n8n-workflows/CIMS K8s Monitor.json` is not importable as-is (unescaped newlines in its JSON). Use the working copy in `platform_VOC/backend-express/workflows/`.
- The Keycloak client in the frontend should use PKCE rather than a client secret — anything in a `VITE_*` variable is readable by anyone who opens the browser.

---

## License

Released for academic and demonstration purposes as a final-year project (PFE).