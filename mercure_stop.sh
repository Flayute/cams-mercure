#!/bin/bash

# 🛑 CAMS Mercure: Script de Parada Segura

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}Apagando Ecosistema CAMS Mercure...${NC}"

# Leer PIDs guardados
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ -f "$SCRIPT_DIR/.bridge.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.bridge.pid") 2>/dev/null
    rm "$SCRIPT_DIR/.bridge.pid"
    echo -e "${YELLOW} - Bridge detenido.${NC}"
fi

if [ -f "$SCRIPT_DIR/.node.pid" ]; then
    kill $(cat "$SCRIPT_DIR/.node.pid") 2>/dev/null
    rm "$SCRIPT_DIR/.node.pid"
    echo -e "${YELLOW} - Orquestador detenido.${NC}"
fi

# Limpieza forzosa de seguridad
fuser -k 3001/tcp 8000/tcp 2>/dev/null

# SearxNG (Opcional)
if command -v podman >/dev/null 2>&1; then
    podman stop searxng >/dev/null 2>&1
    echo -e "${YELLOW} - SearxNG detenido (Podman).${NC}"
fi

echo -e "${GREEN}✅ Todo el sistema ha sido apagado.${NC}"
