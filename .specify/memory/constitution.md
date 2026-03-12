<!--
Sync Impact Report:
- Version change: [CONSTITUTION_VERSION] → 1.0.0
- List of modified principles:
    - [PRINCIPLE_1_NAME] → I. Microservices Polyglottes
    - [PRINCIPLE_2_NAME] → II. Sécurité Centralisée (JWT)
    - [PRINCIPLE_3_NAME] → III. Conteneurisation et Orchestration (K8s)
    - [PRINCIPLE_4_NAME] → IV. Communication RESTful et Indépendance
    - [PRINCIPLE_5_NAME] → V. Design System (Thème CIMS)
- Added sections:
    - Infrastructure et Scalabilité (Section 2)
    - Workflow de Développement (Section 3)
- Templates requiring updates:
    - .specify/templates/plan-template.md (✅ aligned)
    - .specify/templates/spec-template.md (✅ aligned)
    - .specify/templates/tasks-template.md (✅ aligned)
-->

# CIMS Constitution

## Core Principles

### I. Microservices Polyglottes
Le projet utilise une architecture microservices où chaque service est développé avec le langage le plus adapté (Node.js/Express pour Auth et Patient, Python/FastAPI pour RDV). Chaque composant MUST être indépendant, posséder son propre cycle de vie et sa propre base de données pour faciliter la maintenance et le déploiement.

### II. Sécurité Centralisée (JWT)
L'authentification est centralisée via le `Auth-Service`. Tous les microservices MUST valider les tokens JWT via l'endpoint de vérification centralisé (`/api/auth/verify`) avant de traiter une requête protégée. Le Frontend MUST propager systématiquement le token dans le header `Authorization`.

### III. Conteneurisation et Orchestration (K8s)
Le déploiement MUST être standardisé via Docker. En production, l'orchestration Kubernetes (K8s) est obligatoire, incluant l'utilisation de `Ingress` pour le trafic, `HPA` pour le passage à l'échelle automatique, et `NetworkPolicies` pour l'isolation réseau.

### IV. Communication RESTful et Indépendance
La communication inter-services MUST passer par des API REST. Les services MUST être faiblement couplés et configurés exclusivement via des variables d'environnement. Un service ne doit jamais bloquer le démarrage d'un autre (gestion de la résilience).

### V. Design System (Thème CIMS)
Le Frontend MUST respecter l'identité visuelle "CIMS Blue" (#1e5f8e) et Teal (#0d9488). L'interface utilisateur MUST être moderne, professionnelle et responsive, s'inspirant des standards du secteur de la santé (ex: cims.tn).

## Infrastructure et Scalabilité
Le projet repose sur une infrastructure scalable. Chaque microservice possède des limites de ressources définies (`ResourceQuotas`) et des politiques de mise à l'échelle (`HPA`). La base de données PostgreSQL est partagée physiquement mais isolée logiquement par des schémas/bases distincts par service.

## Workflow de Développement
Le développement local s'effectue obligatoirement via Docker Compose pour garantir la parité avec la production. Chaque service MUST inclure des healthchecks automatisés. Le code est déployé via un pipeline CI/CD (GitLab CI) validant la build de chaque image.

## Governance
Cette constitution prévaut sur toute autre pratique de développement. Toute modification majeure des contrats d'API ou de l'architecture de sécurité MUST être validée par une mise à jour de ce document. Les revues de code (PR) MUST vérifier la conformité aux principes (ex: validation JWT systématique).

**Version**: 1.0.0 | **Ratified**: 2026-03-11 | **Last Amended**: 2026-03-11
