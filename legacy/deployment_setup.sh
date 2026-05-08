#!/bin/bash
# ============================================================
# CAMS Mercure — Script de Despliegue Automático
# ============================================================
# Detecta el sistema, instala dependencias y lanza el motor.
# Compatible con: Linux (Ubuntu/Fedora/Arch), macOS, Termux (Android)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "  ⚗️  CAMS MERCURE — DESPLIEGUE AUTOMÁTICO"
echo "  ─────────────────────────────────────────"
echo ""

# ── 1. DETECTAR ENTORNO ─────────────────────────────────────
if [ -d "/data/data/com.termux" ]; then
    ENV="termux"
    PKG_INSTALL="pkg install -y"
    echo -e "${YELLOW}[CAMS] Entorno: Termux (Android)${NC}"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    ENV="macos"
    PKG_INSTALL="brew install"
    echo -e "${YELLOW}[CAMS] Entorno: macOS${NC}"
else
    ENV="linux"
    PKG_INSTALL="sudo apt-get install -y"
    echo -e "${YELLOW}[CAMS] Entorno: Linux${NC}"
fi

# ── 2. DEPENDENCIAS DEL SISTEMA ─────────────────────────────
echo -e "${GREEN}[CAMS] Verificando dependencias del sistema...${NC}"

if ! command -v node &> /dev/null; then
    echo "[CAMS] Node.js no encontrado. Instalando..."
    if [ "$ENV" == "termux" ]; then
        pkg install -y nodejs
    elif [ "$ENV" == "macos" ]; then
        brew install node
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi

if ! command -v python3 &> /dev/null; then
    echo "[CAMS] Python3 no encontrado. Instalando..."
    $PKG_INSTALL python3
fi

if ! command -v pip3 &> /dev/null; then
    $PKG_INSTALL python3-pip
fi

echo -e "${GREEN}[CAMS] Node: $(node -v) | Python: $(python3 --version)${NC}"

# ── 3. CREAR ESTRUCTURA DE CARPETAS ─────────────────────────
CAMS_BASE="$HOME/Documents/CAMS-Mercure"
echo -e "${GREEN}[CAMS] Creando estructura de datos en: ${CAMS_BASE}${NC}"
mkdir -p "$CAMS_BASE/agoras"
mkdir -p "$CAMS_BASE/respuestas"
mkdir -p "$CAMS_BASE/recursos"

# Crear README para que el usuario sepa qué es cada carpeta
cat > "$CAMS_BASE/README.md" << 'EOF'
# CAMS Mercure — Tu Bóveda de Conocimiento

Esta carpeta es el almacén de tu red de IA federada CAMS Mercure.
Puedes abrirla con cualquier editor de Markdown:
- **Obsidian** (recomendado): Abre esta carpeta como vault.
- **VS Code**: Instala la extensión "Markdown All in One".
- **Typora**, **Logseq**, o cualquier editor .md.

## Estructura
- `agoras/` — Debates federados entre dispositivos (Ágora Cuántica)
- `respuestas/` — Respuestas guardadas manualmente desde la consola
- `recursos/` — Archivos adjuntos e imágenes de contexto
EOF

echo -e "${GREEN}[CAMS] Bóveda creada en ${CAMS_BASE}${NC}"

# ── 4. DEPENDENCIAS DEL BRIDGE (PYTHON) ─────────────────────
echo -e "${GREEN}[CAMS] Instalando dependencias Python del Bridge...${NC}"
cd bridge
pip3 install fastapi uvicorn requests duckduckgo_search --quiet
cd ..

# ── 5. DEPENDENCIAS DE LA WEBAPP (NODE.JS) ──────────────────
echo -e "${GREEN}[CAMS] Instalando dependencias Node.js de la WebApp...${NC}"
cd webapp
npm install --silent
cd ..

# ── 6. CREAR nodes.json SI NO EXISTE ────────────────────────
if [ ! -f "webapp/nodes.json" ]; then
    echo -e "${YELLOW}[CAMS] Creando nodes.json de ejemplo...${NC}"
    cat > "webapp/nodes.json" << 'EOF'
{
    "nodes": [
        {
            "id": "master",
            "name": "PC Maestro",
            "ip": "localhost",
            "role": "master",
            "kde_id": ""
        },
        {
            "id": "node1",
            "name": "Dispositivo Satélite 1",
            "ip": "100.X.Y.Z",
            "role": "student"
        }
    ]
}
EOF
    echo -e "${YELLOW}[CAMS] Edita webapp/nodes.json con las IPs reales de tu red Tailscale.${NC}"
fi

# ── 7. LAUNCH ────────────────────────────────────────────────
echo ""
echo "  ✅ CAMS Mercure listo para el vuelo."
echo ""
echo "  Para lanzar el sistema:"
echo "  1. Terminal A: cd bridge && python3 server.py"
echo "  2. Terminal B: cd webapp && npm start"
echo ""
echo "  Accede a la consola en: http://localhost:3001"
echo "  Tu bóveda de conocimiento: $CAMS_BASE"
echo ""
echo "  ⚗️  El azogue fluye. Bienvenido a CAMS Mercure."
echo ""
