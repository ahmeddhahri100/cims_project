# CIMS - Clinical Information Management System

Système d'information de santé basé sur une architecture microservices polyglotte.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT                                       │
│                       (React Frontend)                                  │
│                         Port: 3004                                      │
│                    Servi par Nginx (reverse proxy)                       │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          MICROSERVICES                                   │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │    AUTH      │  │   PATIENT    │  │     RDV      │                  │
│  │   SERVICE    │  │   SERVICE    │  │   SERVICE    │                  │
│  │   Node.js    │  │   Node.js    │  │  Python/FastAPI│                 │
│  │    :3001     │  │    :3002     │  │    :3003     │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                  │                           │
│         └─────────────────┼──────────────────┘                           │
│                           │                                              │
│                           ▼                                              │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐                     │
│  │  PostgreSQL  │ │  MongoDB   │ │    MySQL     │                     │
│  │  cims_auth   │ │cims_patients│ │  cims_rdv    │                     │
│  │    :5433     │ │  :27017    │ │    :3306     │                     │
│  └──────────────┘ └────────────┘ └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principe**: Chaque microservice possède sa propre base de dédiée (database-per-service pattern).

## Services

### 1. Auth Service (Port 3001)
- **Technologie**: Node.js 18 + Express
- **Base de données**: PostgreSQL 16 (cims_auth)
- **Responsabilités**:
  - Authentification (login/register)
  - Génération et vérification JWT (expiration 24h)
  - Gestion des utilisateurs (patient, doctor, admin)

**Endpoints**:
| Méthode | Path | Description |
|---------|------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| POST | `/api/auth/verify` | Vérification token (inter-services) |
| GET | `/api/auth/me` | Profil utilisateur courant |

**Dépendances**: `express`, `bcryptjs` (10 rounds), `jsonwebtoken`, `pg`, `cors`

### 2. Patient Service (Port 3002)
- **Technologie**: Node.js 18 + Express
- **Base de données**: MongoDB 6.0 (cims_patients)
- **Responsabilités**:
  - Gestion des dossiers patients
  - CRUD patients (réservé aux doctors/admins)
  - Synchronisation automatique des profils après inscription

**Endpoints**:
| Méthode | Path | Accès |
|---------|------|-------|
| GET | `/api/patients` | Liste des patients (doctor/admin) |
| GET | `/api/patients/profile` | Profil du patient connecté |
| GET | `/api/patients/:id` | Détail patient |
| POST | `/api/patients` | Créer patient (doctor/admin) |
| POST | `/api/patients/sync-profile` | Création automatique post-inscription |
| PUT | `/api/patients/:id` | Modifier patient (doctor/admin) |
| DELETE | `/api/patients/:id` | Supprimer patient (admin) |

**Auth**: Middleware appelant `/api/auth/verify` sur l'Auth Service.

### 3. RDV Service (Port 3003)
- **Technologie**: Python 3.11 + FastAPI + SQLAlchemy
- **Base de données**: MySQL 8.0 (cims_rdv)
- **Responsabilités**:
  - Gestion des rendez-vous
  - Gestion des médecins
  - Documentation Swagger auto-générée sur `/docs`

**Endpoints**:
| Méthode | Path | Description |
|---------|------|-------------|
| GET | `/api/rdv/doctors` | Liste des médecins |
| POST | `/api/rdv/doctors/seed` | Initialiser docteurs (admin) |
| POST | `/api/rdv` | Créer rendez-vous |
| GET | `/api/rdv/my` | Mes rendez-vous (patient) |
| GET | `/api/rdv` | Tous les RDV (doctor/admin) |
| GET | `/api/rdv/:id` | Détail rendez-vous |
| POST | `/api/rdv/:id/cancel` | Annuler rendez-vous |
| PATCH | `/api/rdv/:id/status` | Mettre à jour statut (doctor/admin) |
| GET | `/api/rdv/patients` | Recherche patients (proxy patient-service) |
| GET | `/api/rdv/patients/:id` | Détail patient (proxy patient-service) |

**Auth**: HTTPBearer + vérification via `httpx.AsyncClient` vers Auth Service.

### 4. Frontend (Port 3004)
- **Technologie**: React 18 + Vite 5 + React Router 6
- **Serveur de prod**: Nginx (reverse proxy vers les APIs)
- **Style**: CIMS Theme (bleu professionnel `#1e5f8e`, teal `#0d9488`)
- **State**: localStorage (clés `cims_token`, `cims_user`)
- **Pages**:
  - `/` — Page de connexion
  - `/register` — Inscription
  - `/profile` — Profil utilisateur (protégé)
  - `/appointments` — Gestion des rendez-vous (protégé)
  - `/calendar` — Vue calendrier (protégé)

**Proxy Nginx**:
| Path | Cible |
|------|-------|
| `/api/auth` | `http://auth-service:3001` |
| `/api/patients` | `http://patient-service:3002` |
| `/api/rdv` | `http://rdv-service:3003` |

## Tech Stack

| Composant | Technologie |
|-----------|-------------|
| Auth Service | Node.js 18, Express, JWT, bcrypt |
| Patient Service | Node.js 18, Express |
| RDV Service | Python 3.11, FastAPI, SQLAlchemy |
| Frontend | React 18, Vite 5, React Router 6 |
| Auth DB | PostgreSQL 16 (Alpine) |
| Patient DB | MongoDB 6.0 |
| RDV DB | MySQL 8.0 |
| Conteneurisation | Docker, Docker Compose |
| Orquestration | Kubernetes (Minikube) |
| CI/CD | GitLab CI |
| SAST | Semgrep |
| SCA | Trivy |
| DAST | OWASP ZAP |
| Logging | Filebeat → Elasticsearch |
| SSO (optionnel) | Keycloak 24.0 |

## Sécurité

1. **Auth Service** génère les tokens JWT
2. **Patient Service** et **RDV Service** vérifient les tokens via l'endpoint `/api/auth/verify`
3. Chaque service gère ses propres autorisations basées sur les rôles

### Flux d'authentification
```
Client → Auth Service (login) → Token JWT
Client → [Autres Services] + Token dans Header Authorization
[Autres Services] → Auth Service (verify) → Validation
```

### Rôles et Permissions

| Rôle | Permissions |
|------|-------------|
| **patient** | Voir son profil, créer/annuler ses RDV |
| **doctor** | Voir tous les patients, tous les RDV, confirmer/modifier RDV |
| **admin** | Toutes les permissions doctor + supprimer patients/modifier statuts |

### Network Policies (K8s)
- PostgreSQL accessible uniquement depuis auth/patient/rdv pods
- Auth Service accessible uniquement depuis frontend/patient/rdv
- Audit logging au niveau RequestResponse

## Démarrage

### Prérequis
- Docker & Docker Compose
- Node.js 18+ (pour développement local)
- Python 3.11+ (pour rdv-service)
- Minikube (pour déploiement K8s)

### Lancement complet (Docker Compose)

```bash
# Lancer tous les services
sudo docker compose up --build -d

# Vérifier le statut
./check.sh

# Voir les logs
sudo docker compose logs -f [service-name]
```

### URLs d'accès
- **Frontend**: http://localhost:3004
- **Auth API**: http://localhost:3001
- **Patient API**: http://localhost:3002
- **RDV API**: http://localhost:3003
- **Swagger (RDV)**: http://localhost:3003/docs
- **PostgreSQL**: localhost:5433
- **MongoDB**: localhost:27017
- **MySQL**: localhost:3306

### Commandes utiles

```bash
# Rebuild tous les services
sudo docker compose down && sudo docker compose up --build -d

# Logs d'un service spécifique
sudo docker compose logs -f auth-service
sudo docker compose logs -f patient-service
sudo docker compose logs -f rdv-service
sudo docker compose logs -f frontend

# Redémarrer un service
sudo docker compose restart [service-name]

# Entrer dans un conteneur
sudo docker exec -it cims-auth sh
sudo docker exec -it cims-patient sh
sudo docker exec -it cims-rdv sh
sudo docker exec -it cims-postgres psql -U postgres

# Vérifier la santé des services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Déploiement Kubernetes

```bash
# Déploiement automatisé (Minikube)
cd k8s && ./deploy-minikube.sh
```

24 manifests K8s organisés en:
- **Infrastructure**: Namespace, ConfigMap, Secrets, ResourceQuota
- **Bases de données**: PostgreSQL, MySQL, MongoDB (StatefulSets + PVC)
- **Microservices**: auth, patient, rdv, frontend (Deployment + NodePort Service)
- **Réseau**: Ingress (Nginx), NetworkPolicy
- **Scaling**: HPA (auto-scaling 1-5 pods selon CPU/mémoire)
- **Monitoring**: Filebeat DaemonSet (logs → Elasticsearch)
- **Sécurité**: Audit logging, RBAC (n8n read-only)

### NodePorts

| Service | Port | NodePort |
|---------|------|----------|
| auth-service | 3001 | 30081 |
| patient-service | 3002 | 30082 |
| rdv-service | 3003 | 30083 |
| frontend | 80 | 30080 |

## Base de Données

### Initialisation
Le script `docker/postgres/init.sql` initialise les 3 bases avec leurs schémas et insère 5 médecins par défaut:

| Médecin | Spécialité |
|---------|------------|
| Dr. Sana Mansour | Cardiologie |
| Dr. Karim Trabelsi | Pédiatrie |
| Dr. Leila Gharbi | Neurologie |
| Dr. Mounir Belhaj | Dermatologie |
| Dr. Ines Sfar | Gynécologie |

### Schémas

**cims_auth** (PostgreSQL — Auth Service)
```sql
users (id, email, password, first_name, last_name, role, created_at, last_login)
```

**cims_patients** (MongoDB — Patient Service)
```
patients (id, first_name, last_name, email, phone, date_of_birth, blood_type, address, created_at)
```

**cims_rdv** (MySQL — RDV Service)
```sql
appointments (id, patient_id, doctor_id, appointment_date, reason, notes, status)
doctors (id, name, speciality, email, phone, created_at)
```

## Configuration

### Variables d'environnement

**auth-service/.env**:
```
PORT=3001
JWT_SECRET=votre_secret_jwt
DB_HOST=postgres-auth
DB_USER=postgres
DB_PASSWORD=devpassword
DB_NAME=cims_auth
```

**patient-service/.env**:
```
PORT=3002
AUTH_SERVICE_URL=http://auth-service:3001
MONGO_URI=mongodb://mongodb-patient:27017/cims_patients
```

**rdv-service/.env**:
```
PORT=3003
AUTH_SERVICE_URL=http://auth-service:3001
DATABASE_URL=mysql://user:password@mysql-rdv:3306/cims_rdv
```

**K8s**: ConfigMap + Secrets centralisés dans `k8s/configmap.yaml` et `k8s/secrets.yaml`.

## CI/CD Pipeline

Le pipeline GitLab CI (`.gitlab-ci.yml`) comprend 5 étages:

| Stage | Description |
|-------|-------------|
| **build** | Docker build + push des 4 services (multi-stage) |
| **test** | Tests unitaires (npm test, pytest) + build frontend |
| **trivy-fs** | Scan SCA des vulnérabilités (HIGH/CRITICAL) |
| **security** | Semgrep (SAST), Trivy (image scan), OWASP ZAP (DAST planifié) |
| **deploy** | Déploiement automatique sur Minikube via kubectl |

## Security Scanning

### SAST (Semgrep)
```bash
./pipeline/scan-sast.sh
```
- Règles personnalisées (Python + JavaScript): SQL injection, secrets, exec/eval
- Sortie SARIF consultable dans VS Code (SARIF Viewer) ou GitHub Code Scanning

### SCA (Trivy)
- Scan des images Docker et du filesystem
- Seuil: HIGH et CRITICAL

### DAST (OWASP ZAP)
- Scan baseline planifié (GitLab schedules)

## Test de l'intégration

### 1. Créer un compte
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient"
  }'
```

### 2. Se connecter
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Créer un rendez-vous
```bash
curl -X POST http://localhost:3003/api/rdv \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "doctor_id": 1,
    "appointment_date": "2025-02-20T10:00:00",
    "reason": "Consultation générale"
  }'
```

## Dépannage

### "Cannot find module"
```bash
sudo docker compose build --no-cache [service-name]
sudo docker compose up -d [service-name]
```

### "Service auth indisponible"
```bash
sudo docker compose ps
sudo docker compose logs auth-service
```

### Erreur 403 sur les routes protégées
```bash
curl -X POST http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer <token>"
```

## Fonctionnalités planifiées (commentées dans docker-compose)
- **Keycloak 24.0**: SSO/Identity Management (intégré à postgres-auth)
- **Ollama**: LLM local pour fonctionnalités IA
- **n8n**: Workflow automation

## Support

- Email: contact@cims.example
- Tél: +000 000 000

## Licence

© 2025 CIMS
Tous droits réservés.
