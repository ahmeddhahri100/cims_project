# CIMS Microservices - Kubernetes Deployment

Ce document explique comment déployer l'application CIMS sur Kubernetes avec Minikube et GitLab CI/CD.

## 📋 Prérequis

### 1. Installer Minikube

```bash
# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# macOS
brew install minikube

# Windows
choco install minikube
```

### 2. Installer kubectl

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# macOS
brew install kubectl

# Windows
choco install kubernetes-cli
```

### 3. Démarrer Minikube

```bash
# Démarrer le cluster avec 4GB de RAM et 2 CPUs
minikube start --memory=4096 --cpus=2

# Vérifier le statut
minikube status

# Activer l'addon ingress (optionnel)
minikube addons enable ingress
```

---

## 🚀 Déploiement Manuel (Test Local)

### 1. Créer le namespace

```bash
kubectl apply -f namespace.yaml
```

### 2. Créer les ConfigMaps et Secrets

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-init-configmap.yaml
```

### 3. Déployer PostgreSQL

```bash
kubectl apply -f postgres-deployment.yaml

# Attendre que PostgreSQL soit prêt
kubectl rollout status deployment/postgres -n cims --timeout=300s
```

### 4. Déployer les microservices

```bash
kubectl apply -f auth-deployment.yaml
kubectl apply -f patient-deployment.yaml
kubectl apply -f rdv-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

### 5. Vérifier les déploiements

```bash
# Voir tous les pods
kubectl get pods -n cims

# Voir tous les services
kubectl get services -n cims

# Voir les logs d'un service
kubectl logs -f deployment/auth-service -n cims
```

### 6. Accéder à l'application

```bash
# Obtenir l'URL du frontend
minikube service frontend -n cims --url

# Ou utiliser le port-forwarding
kubectl port-forward service/frontend 3004:80 -n cims
```

Accédez à: http://localhost:3004

---

## 🔄 GitLab CI/CD Pipeline

### Structure du Pipeline

Le pipeline GitLab CI/CD comprend 3 stages:

1. **Build** - Construction des images Docker
2. **Test** - Exécution des tests
3. **Deploy** - Déploiement sur Kubernetes

### Configuration GitLab

#### 1. Variables CI/CD à configurer dans GitLab

Allez dans **Settings > CI/CD > Variables** et ajoutez:

| Variable | Description | Exemple |
|----------|-------------|---------|
| `CI_REGISTRY_USER` | Utilisateur du registry GitLab | votre-username |
| `CI_REGISTRY_PASSWORD` | Mot de passe ou token | your-token |
| `CI_REGISTRY` | URL du registry | registry.gitlab.com |

#### 2. Configuration du Kubernetes context

```bash
# Sur votre machine locale
kubectl config view --raw > kubeconfig

# Dans GitLab, ajoutez le contenu comme variable CI/CD
# KUBECONFIG = <contenu-du-fichier>
```

#### 3. Modifier les images dans les manifests

Remplacez `YOUR_USERNAME` par votre username GitLab dans tous les fichiers de déploiement:

```bash
# Exemple
sed -i 's/YOUR_USERNAME/votre-username/g' k8s/*.yaml
```

### Déclencher le Pipeline

1. **Push sur `develop`** → Déploiement automatique en staging
2. **Push sur `main`** → Build et test automatiques, déploiement manuel en production

### Workflow du Pipeline

```
develop branch → Build → Test → Deploy Staging (auto)
main branch → Build → Test → Deploy Production (manual)
```

---

## 📊 Monitoring et Debugging

### Voir les logs

```bash
# Logs d'un pod
kubectl logs -f <pod-name> -n cims

# Logs d'un déploiement
kubectl logs -f deployment/auth-service -n cims
```

### Décrire un pod

```bash
kubectl describe pod <pod-name> -n cims
```

### Accéder à un pod en shell

```bash
kubectl exec -it <pod-name> -n cims -- /bin/sh
```

### Redémarrer un déploiement

```bash
kubectl rollout restart deployment/auth-service -n cims
```

---

## 🔧 Commandes Utiles

### Minikube

```bash
# Démarrer
minikube start

# Arrêter
minikube stop

# Supprimer le cluster
minikube delete

# Ouvrir le dashboard Kubernetes
minikube dashboard

# SSH dans le noeud Minikube
minikube ssh
```

### kubectl

```bash
# Voir tous les pods
kubectl get pods -n cims

# Voir tous les services
kubectl get services -n cims

# Voir tous les déploiements
kubectl get deployments -n cims

# Supprimer tous les déploiements
kubectl delete all --all -n cims

# Supprimer le namespace (et tout son contenu)
kubectl delete namespace cims
```

---

## 🐛 Dépannage

### Erreur: ImagePullBackOff

```bash
# Vérifier les credentials Docker
kubectl describe pod <pod-name> -n cims

# Créer un secret Docker
kubectl create secret docker-registry gitlab-registry \
  --docker-server=registry.gitlab.com \
  --docker-username=<username> \
  --docker-password=<password> \
  --namespace=cims
```

### Erreur: CrashLoopBackOff

```bash
# Voir les logs
kubectl logs <pod-name> -n cims

# Vérifier les variables d'environnement
kubectl describe pod <pod-name> -n cims
```

### PostgreSQL ne démarre pas

```bash
# Vérifier le PVC
kubectl get pvc -n cims

# Vérifier les logs PostgreSQL
kubectl logs deployment/postgres -n cims
```

---

## 📁 Structure des Fichiers

```
k8s/
├── namespace.yaml              # Namespace Kubernetes
├── configmap.yaml             # Variables de configuration
├── secrets.yaml               # Secrets et mots de passe
├── postgres-init-configmap.yaml  # Script init PostgreSQL
├── postgres-deployment.yaml   # Déploiement PostgreSQL
├── auth-deployment.yaml       # Déploiement Auth Service
├── patient-deployment.yaml    # Déploiement Patient Service
├── rdv-deployment.yaml        # Déploiement RDV Service
└── frontend-deployment.yaml   # Déploiement Frontend
```

---

## 🔐 Sécurité

### Changer les mots de passe par défaut

Avant de déployer en production, modifiez:

1. **secrets.yaml**:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`

2. **Créer des secrets Kubernetes de manière sécurisée**:

```bash
kubectl create secret generic cims-secrets \
  --from-literal=POSTGRES_PASSWORD='votre-mot-de-passe-securise' \
  --from-literal=JWT_SECRET='votre-jwt-secret-securise' \
  --namespace=cims
```

---

## 🎯 Prochaines Étapes

1. ✅ Installer Minikube et kubectl
2. ✅ Configurer GitLab CI/CD variables
3. ✅ Modifier les images avec votre username GitLab
4. ✅ Tester le déploiement manuel
5. ✅ Configurer le pipeline GitLab CI/CD
6. ✅ Déployer en staging/production

---

## 📞 Support

Pour tout problème:
- Vérifiez les logs des pods
- Utilisez `kubectl describe` pour diagnostiquer
- Consultez la documentation Kubernetes: https://kubernetes.io/docs/

---

© 2025 CIMS - CIMS
