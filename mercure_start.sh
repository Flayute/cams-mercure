#!/bin/bash

# CAMS Mercure: Script de Inicio Unificado ⚗️
# Este script levanta el Bridge, el Watchdog y el Orquestador Node.js.

# Colores para el log
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}    ⚗️  INICIANDO ECOSISTEMA CAMS MERCURE${NC}"
echo -e "${BLUE}==============================================${NC}"

# Detectar rutas
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BRIDGE_DIR="$SCRIPT_DIR/bridge"
WEBAPP_DIR="$SCRIPT_DIR/webapp"
RECURSOS_DIR="/home/aorsi/Documents/CAMS-Mercure/recursos"

# Verificar dependencias
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Error: Python3 no instalado.${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js no instalado.${NC}" >&2; exit 1; }

# 1. Iniciar el Bridge (Python)
echo -e "${YELLOW}[1/3] Levantando Bridge de Agentes (Puerto 8000)...${NC}"
cd "$BRIDGE_DIR"
PYTHONPATH="$BRIDGE_DIR" python3 server.py > bridge.log 2>&1 &
BRIDGE_PID=$!

# 2. Iniciar el Watchdog (Python)
echo -e "${YELLOW}[2/3] Activando Centinela de Indexado (Watchdog)...${NC}"
cd "$SCRIPT_DIR"
python3 "$RECURSOS_DIR/mercure_watchdog.py" > watchdog.log 2>&1 &
WATCHDOG_PID=$!

# 3. Iniciar el Orquestador (Node.js)
echo -e "${YELLOW}[3/3] Arrancando Orquestador y WebApp (Puerto 3001)...${NC}"
cd "$WEBAPP_DIR"
npm start > webapp.log 2>&1 &
WEBAPP_PID=$!

echo -e "${BLUE}----------------------------------------------${NC}"
echo -e "${GREEN}✅ SISTEMA ACTIVO${NC}"
echo -e "Bridge PID: $BRIDGE_PID"
echo -e "Watchdog PID: $WATCHDOG_PID"
echo -e "WebApp PID: $WEBAPP_PID"
echo -e "${BLUE}----------------------------------------------${NC}"
echo -e "Logs disponibles en: "
echo -e " - $BRIDGE_DIR/bridge.log"
echo -e " - $SCRIPT_DIR/watchdog.log"
echo -e " - $WEBAPP_DIR/webapp.log"
echo -e "${YELLOW}Pulsa Ctrl+C para detener todos los servicios.${NC}"

# Función para limpiar al salir
cleanup() {
    echo -e "\n${RED}Apagando CAMS Mercure...${NC}"
    kill $BRIDGE_PID $WATCHDOG_PID $WEBAPP_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Mantener el script vivo para ver la salida (opcional) o esperar
wait
