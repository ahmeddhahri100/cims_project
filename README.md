# CIMS - Clinical Information Management System

Système d'information de santé basé sur une architecture microservices.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│                     (React Frontend)                            │
│                       Port: 3004                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   AUTH      │  │  PATIENT    │  │    RDV      │             │
│  │  SERVICE    │  │  SERVICE    │  │  SERVICE    │             │
│  │   :3001     │  │   :3002     │  │   :3003     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                          ▼                                       │
│                  ┌──────────────┐                               │
│                  │   POSTGRES   │                               │
│                  │    :5432     │                               │
│                  │              │                               │
│                  │ • cims_auth  │                               │
│                  │ • cims_patients│                              │
│                  │ • cims_rdv   │                               │
│                  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 Services

### 1. Auth Service (Port 3001)
- **Technologie**: Node.js + Express
- **Base de données**: PostgreSQL (cims_auth)
- **Responsabilités**:
  - Authentification (login/register)
  - Génération et vérification JWT
  - Gestion des utilisateurs (patient, doctor, admin)

**Endpoints**:
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `POST /api/auth/verify` - Vérification token (utilisé par les autres services)
- `GET /api/auth/me` - Profil utilisateur

### 2. Patient Service (Port 3002)
- **Technologie**: Node.js + Express
- **Base de données**: PostgreSQL (cims_patients)
- **Responsabilités**:
  - Gestion des dossiers patients
  - CRUD patients (réservé aux doctors/admins)

**Endpoints**:
- `GET /api/patients` - Liste des patients (doctor/admin)
- `GET /api/patients/:id` - Détail patient
- `POST /api/patients` - Créer patient (doctor/admin)
- `PUT /api/patients/:id` - Modifier patient (doctor/admin)
- `DELETE /api/patients/:id` - Supprimer patient (admin)

### 3. RDV Service (Port 3003)
- **Technologie**: Python + FastAPI
- **Base de données**: PostgreSQL (cims_rdv)
- **Responsabilités**:
  - Gestion des rendez-vous
  - Gestion des médecins

**Endpoints**:
- `GET /api/rdv` - Tous les rendez-vous (doctor/admin)
- `GET /api/rdv/my` - Mes rendez-vous (patient)
- `POST /api/rdv` - Créer rendez-vous
- `POST /api/rdv/:id/cancel` - Annuler rendez-vous
- `GET /api/rdv/doctors` - Liste des médecins

### 4. Frontend (Port 3004)
- **Technologie**: React + Vite
- **Style**: CIMS Theme (bleu professionnel)
- **Pages**:
  - Login/Register
  - Profil utilisateur
  - Gestion rendez-vous

## 🔐 Architecture de Sécurité

### Authentification
1. **Auth Service** génère les tokens JWT
2. **Patient Service** et **RDV Service** vérifient les tokens via l'endpoint `/api/auth/verify`
3. Chaque service gère ses propres autorisations basées sur les rôles

### Flux d'authentification
```
Client → Auth Service (login) → Token JWT
Client → [Autres Services] + Token dans Header Authorization
[Autres Services] → Auth Service (verify) → Validation
```

## 🚀 Démarrage

### Prérequis
- Docker & Docker Compose
- Node.js (pour développement local)
- Python 3.11+ (pour rdv-service)

### Lancement complet

```bash
# Cloner le projet
cd /data/project_PFE/cims-microservice

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
- **PostgreSQL**: localhost:5432

## 🗄️ Structure de la Base de Données

### cims_auth (Auth Service)
```sql
users:
  - id (PK)
  - email (unique)
  - password (hash)
  - first_name
  - last_name
  - role (patient/doctor/admin)
  - created_at
  - last_login
```

### cims_patients (Patient Service)
```sql
patients:
  - id (PK)
  - first_name
  - last_name
  - email
  - phone
  - date_of_birth
  - blood_type
  - address
  - created_at
```

### cims_rdv (RDV Service)
```sql
appointments:
  - id (PK)
  - patient_id
  - doctor_id
  - appointment_date
  - reason
  - notes
  - status (pending/confirmed/cancelled/completed)
  - created_at

doctors:
  - id (PK)
  - name
  - speciality
  - email
  - phone
  - created_at
```

## 📝 Commandes utiles

```bash
# Rebuild tous les services
sudo docker compose down
sudo docker compose up --build -d

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

## 🔧 Configuration

### Variables d'environnement

Chaque service a son fichier `.env`:

**auth-service/.env**:
```
PORT=3001
JWT_SECRET=votre_secret_jwt
```

**patient-service/.env**:
```
PORT=3002
AUTH_SERVICE_URL=http://auth-service:3001
```

**rdv-service/.env**:
```
PORT=3003
AUTH_SERVICE_URL=http://auth-service:3001
```

## 🎨 Design System

Le frontend utilise le **thème CIMS**:
- **Couleur primaire**: `#1e5f8e` (bleu professionnel)
- **Couleur secondaire**: `#0d9488` (teal)
- **Police**: Segoe UI, system fonts
- **Style**: Moderne, professionnel, inspiré de www.cims.tn

## 🧪 Test de l'intégration

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
    "doctor_id": "dr-001",
    "appointment_date": "2025-02-20T10:00:00",
    "reason": "Consultation générale"
  }'
```

## 📚 Documentation API

### Auth Service
- Swagger: Non disponible (Express)
- Documentation: Voir `auth-service/auth.js`

### RDV Service
- Swagger: http://localhost:3003/docs (FastAPI auto-généré)
- OpenAPI: http://localhost:3003/openapi.json

## 🐛 Dépannage

### Problème: "Cannot find module"
**Solution**: Rebuild le service concerné
```bash
sudo docker compose build --no-cache [service-name]
sudo docker compose up -d [service-name]
```

### Problème: "Service auth indisponible"
**Solution**: Vérifier que auth-service est démarré
```bash
sudo docker compose ps
sudo docker compose logs auth-service
```

### Problème: Erreur 403 sur les routes protégées
**Solution**: Vérifier le token JWT et les rôles
```bash
# Vérifier le token
curl -X POST http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer <token>"
```

## 👥 Rôles et Permissions

| Rôle | Permissions |
|------|-------------|
| **patient** | Voir son profil, créer/annuler ses RDV |
| **doctor** | Voir tous les patients, tous les RDV, confirmer/modifier RDV |
| **admin** | Toutes les permissions doctor + supprimer patients/modifier statuts |

## 📞 Support

Pour toute question ou problème:
- Email: contact@cims.example
- Tél: REDACTED_PHONE

## 📄 Licence

© 2025 CIMS - CIMS
Tous droits réservés.
