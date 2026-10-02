#!/bin/bash

# ==============================================================================
# CIMS - Minikube Deployment Script
# ------------------------------------------------------------------------------
# This script automates the process of building images and deploying to Minikube.
# It teaches you each step of a professional Kubernetes deployment.
# ==============================================================================

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   CIMS - Deployment to Minikube (Local Dev)      ${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

# 1. Configuration
export IMAGE_PREFIX="cims"
export IMAGE_TAG="local"
NAMESPACE="cims"
K8S_DIR="$(dirname "$0")"
PROJECT_ROOT="$K8S_DIR/.."

echo -e "\n${YELLOW}1. checking Minikube status...${NC}"
if ! minikube status > /dev/null 2>&1; then
    echo -e "${RED}❌ Minikube is not running. Please start it with: minikube start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Minikube is ready.${NC}"

# 2. Point Docker to Minikube
echo -e "\n${YELLOW}2. Connecting to Minikube Docker daemon...${NC}"
# This tells your local docker command to use the docker engine inside Minikube
eval $(minikube docker-env)
echo -e "${GREEN}✅ Connected to Minikube Docker.${NC}"

# 3. Build Images (inside Minikube)
echo -e "\n${YELLOW}3. Building Docker images directly in Minikube...${NC}"
echo -e "   (This might take a moment the first time)${NC}"

services=("auth-service" "patient-service" "rdv-service" "frontend")
for service in "${services[@]}"; do
    echo -e "   🔨 Building ${BLUE}$service${NC}..."
    
    # Map service name to directory name
    if [[ "$service" == "frontend" ]]; then
        dir="frontend"
    else
        dir="$service"
    fi
    
    # Perform build and capture output to a temp file in case of error
    build_log=$(mktemp)
    if docker build -t "$IMAGE_PREFIX/$service:$IMAGE_TAG" "$PROJECT_ROOT/$dir" > "$build_log" 2>&1; then
        echo -e "      ${GREEN}✅ $service built successfully.${NC}"
        rm "$build_log"
    else
        echo -e "      ${RED}❌ Failed to build $service.${NC}"
        echo -e "${YELLOW}Build Error Output:${NC}"
        cat "$build_log"
        rm "$build_log"
        exit 1
    fi
done

# 4. Prepare and Apply Manifests
echo -e "\n${YELLOW}4. Applying Kubernetes manifests...${NC}"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Function to apply a manifest with variable substitution
apply_manifest() {
    local file=$1
    echo -e "   🚀 Applying ${BLUE}$(basename "$file")${NC}..."
    envsubst < "$file" | kubectl apply -f - > /dev/null
}

# Apply in order
apply_manifest "$K8S_DIR/configmap.yaml"
apply_manifest "$K8S_DIR/secrets.yaml"
apply_manifest "$K8S_DIR/postgres-init-configmap.yaml"
apply_manifest "$K8S_DIR/mysql-init-configmap.yaml"
apply_manifest "$K8S_DIR/postgres-deployment.yaml"
apply_manifest "$K8S_DIR/mysql-deployment.yaml"
apply_manifest "$K8S_DIR/mongodb-deployment.yaml"

echo -e "   ⏳ Waiting for databases to be ready..."
kubectl rollout status deployment/postgres -n $NAMESPACE --timeout=60s > /dev/null 2>&1
kubectl rollout status deployment/mysql -n $NAMESPACE --timeout=60s > /dev/null 2>&1

apply_manifest "$K8S_DIR/auth-deployment.yaml"
apply_manifest "$K8S_DIR/patient-deployment.yaml"
apply_manifest "$K8S_DIR/rdv-deployment.yaml"
apply_manifest "$K8S_DIR/frontend-deployment.yaml"

# 5. Summary
echo -e "\n${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Check your pods:${NC}"
echo "kubectl get pods -n $NAMESPACE"

echo -e "\n${YELLOW}Access the application:${NC}"
echo -e "Frontend: ${GREEN}$(minikube service frontend -n $NAMESPACE --url)${NC}"

echo -e "\n${YELLOW}Note:${NC} If you are on Linux without a browser, use: "
echo "kubectl port-forward service/frontend 3004:80 -n $NAMESPACE"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}\n"
