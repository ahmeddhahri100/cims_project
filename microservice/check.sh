#!/bin/bash
# =====================================================
# check.sh — Vérifie que les 3 services sont en ligne
# =====================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo -e "${BLUE}   CIMS — Vérification des services   ${NC}"
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo ""

OK=0
FAIL=0

check() {
  local name=$1
  local url=$2
  local response
  response=$(curl -sf --max-time 5 "$url" 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ $name${NC}  →  $url"
    echo -e "     $(echo $response | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"status={d.get(\"status\",\"?\")} service={d.get(\"service\",\"?\")}")' 2>/dev/null || echo "$response")"
    ((OK++))
  else
    echo -e "  ${RED}❌ $name${NC}  →  $url  (ne répond pas)"
    ((FAIL++))
  fi
  echo ""
}

# Vérifier les conteneurs Docker
echo -e "${YELLOW}Conteneurs Docker :${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Health checks HTTP
echo -e "${YELLOW}Health checks HTTP :${NC}"
check "auth-service    " "http://localhost:3001/health"
check "patient-service " "http://localhost:3002/health"
check "rdv-service     " "http://localhost:3003/health"

# Résumé
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo -e "  ${GREEN}✅ En ligne  : $OK${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "  ${RED}❌ Hors ligne: $FAIL${NC}"
  echo ""
  echo -e "${YELLOW}Diagnostic rapide :${NC}"
  echo "  docker compose logs auth-service    | tail -20"
  echo "  docker compose logs patient-service | tail -20"
  echo "  docker compose logs rdv-service     | tail -20"
else
  echo -e "  ${GREEN}Tous les services sont opérationnels !${NC}"
fi
echo -e "${BLUE}══════════════════════════════════════${NC}"
echo ""
