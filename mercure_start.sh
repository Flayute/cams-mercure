#!/bin/bash

# 🌀 CAMS Mercure: Lanzador Maestro (Modo Producción)
# Soberanía Digital y Orquestación de Agentes

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}    🌀 INICIANDO CAMS MERCURE MASTER${NC}"
echo -e "${BLUE}==============================================${NC}"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
mkdir -p "$SCRIPT_DIR/logs"

# 1. Encender el Cerebro (LLM)
echo -e "${YELLOW}[1/6] Seleccionando y encendiendo el Cerebro (LLM)...${NC}"
bash "$SCRIPT_DIR/scripts/llama-mercure-35b.sh"

# 2. Limpieza de Puertos
echo -e "${YELLOW}[2/6] Limpiando procesos de red antiguos...${NC}"
fuser -k 3001/tcp 8000/tcp 2>/dev/null

# 2. Verificación de SearxNG (Buscador Crítico)
echo -e "${YELLOW}[2/5] Verificando SearxNG...${NC}"
if command -v podman >/dev/null 2>&1; then
    if podman ps -a --format '{{.Names}}' | grep -q "searxng"; then
        podman start searxng >/dev/null 2>&1
        echo -e "${GREEN}    ✅ SearxNG iniciado (Podman)${NC}"
    else
        echo -e "${RED}    ⚠️ SearxNG no encontrado en Podman. La búsqueda web podría fallar.${NC}"
    fi
else
    echo -e "${RED}    ⚠️ Podman no instalado. Saltando SearxNG.${NC}"
fi

# 3. Compilación del Frontend (Si es necesario)
echo -e "${YELLOW}[3/5] Verificando construcción del Frontend...${NC}"
if [ ! -d "$SCRIPT_DIR/webapp/dist" ]; then
    echo -e "${BLUE}    📦 No se detectó carpeta 'dist'. Compilando...${NC}"
    cd "$SCRIPT_DIR/webapp"
    npm run build > "$SCRIPT_DIR/logs/build.log" 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}    ✅ Compilación completada.${NC}"
    else
        echo -e "${RED}    ❌ Error en la compilación. Revisa logs/build.log${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}    ✅ Build detectada. Saltando compilación.${NC}"
fi

# 4. Iniciar el Puente de Inteligencia (Python)
echo -e "${YELLOW}[4/5] Levantando Bridge de Agentes (Puerto 8000)...${NC}"
cd "$SCRIPT_DIR/bridge"
nohup python3 server.py > "$SCRIPT_DIR/logs/bridge.log" 2>&1 &
BRIDGE_PID=$!

# 5. Iniciar el Orquestador Maestro (Node.js)
echo -e "${YELLOW}[5/5] Arrancando Orquestador en Puerto 3001...${NC}"
cd "$SCRIPT_DIR/webapp"
nohup node server.js > "$SCRIPT_DIR/logs/orchestrator.log" 2>&1 &
NODE_PID=$!

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}🚀 CAMS MERCURE ESTÁ EN ÓRBITA${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "🔗 URL: ${YELLOW}http://localhost:3001${NC}"
echo -e "📂 Logs: ${BLUE}$SCRIPT_DIR/logs/${NC}"
echo -e "🛠️  Para apagar el sistema usa: ${RED}./mercure_stop.sh${NC}"
echo -e "${BLUE}==============================================${NC}"

# Guardar PIDs para el script de parada
echo "$BRIDGE_PID" > "$SCRIPT_DIR/.bridge.pid"
echo "$NODE_PID" > "$SCRIPT_DIR/.node.pid"
