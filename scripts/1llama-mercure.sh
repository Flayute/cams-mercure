#!/bin/bash
# ============================================================
# llama-mercure.sh (CAMS Native)
# Selector DINÁMICO de modelos GGUF
# Escucha en localhost + Tailscale
# ============================================================

# ── DIRECTORIOS ─────────────────────────────────────────────
HOME_DIR=$(eval echo ~$USER)
CAMS_BASE="${CAMS_BASE_PATH:-$HOME_DIR/Documents/CAMS-Mercure}"
MODELS_DIR="$CAMS_BASE/models"
TURBO_DIR="/home/aorsi/llama-cpp-turboquant"
OFFICIAL_DIR="/home/aorsi/llama-cpp-official"
PORT=8080

# Asegurar carpeta de modelos
mkdir -p "$MODELS_DIR"

# ── SCAN DE MODELOS ─────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║           CAMS Mercure — Selector de GGUF        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

mapfile -t MODELS < <(find "$MODELS_DIR" -maxdepth 1 -name "*.gguf" ! -name "*mmproj*")

if [ ${#MODELS[@]} -eq 0 ]; then
    echo "  ✗ No se encontraron modelos .gguf en:"
    echo "    $MODELS_DIR"
    echo ""
    echo "  Pista: Copia tus modelos allí para que aparezcan aquí."
    exit 1
fi

for i in "${!MODELS[@]}"; do
    printf "  %d) %s\n" "$((i+1))" "$(basename "${MODELS[$i]}")"
done

echo ""
read -rp "  Elige modelo [1-${#MODELS[@]}]: " CHOICE

if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#MODELS[@]}" ]; then
    echo "  Opción no válida. Saliendo."
    exit 1
fi

SELECTED_MODEL="${MODELS[$((CHOICE-1))]}"
SELECTED_NAME=$(basename "$SELECTED_MODEL")

# ── CONFIGURACIÓN INTELIGENTE ────────────────────────────────
CONTEXT=32000
LLAMA_DIR="$TURBO_DIR"
FLAGS="--flash-attn --split-mode row -ngl 99 --no-mmap --mlock --threads 6"

if [[ "$SELECTED_NAME" =~ qwen|llama ]]; then
    echo "  → Detectado motor TurboQuant (Optimizado)"
    USE_TURBO=1
    FLAGS="$FLAGS -ctk turbo3 -ctv turbo3"
    export TURBO_LAYER_ADAPTIVE=1
else
    echo "  → Detectado motor Oficial"
    USE_TURBO=0
    LLAMA_DIR="$OFFICIAL_DIR"
    export TURBO_LAYER_ADAPTIVE=0
fi

# Detectar Vision (Gemma 4)
if [[ "$SELECTED_NAME" =~ gemma ]]; then
    MMPROJ=$(find "$MODELS_DIR" -maxdepth 1 -name "*mmproj*${SELECTED_NAME%%-*}*" | head -n 1)
    if [ -n "$MMPROJ" ]; then
        echo "  🎥 Proyector Vision detectado: $(basename "$MMPROJ")"
        FLAGS="$FLAGS --mmproj $MMPROJ"
    fi
fi

# ── SPECULATIVE DECODING (Corrección de Compatibilidad) ──────
DRAFT_MODEL=$(find "$MODELS_DIR" -maxdepth 1 -name "qwen2.5-coder-0.5b-q8_0.gguf" | head -n 1)
if [ -n "$DRAFT_MODEL" ] && [ "$USE_TURBO" -eq 1 ]; then
    echo "  ⚡ Draft Model detectado: $(basename "$DRAFT_MODEL")"
    # Quitamos los flags turbo del draft para asegurar "partial sequence removal"
    FLAGS="$FLAGS --model-draft $DRAFT_MODEL --draft 4 -ngld 99 -np 1"
fi

# ── LANZAR ──────────────────────────────────────────────────
echo ""
echo "  ⚡ Limpiando puertos y liberando VRAM..."
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

echo "  ⚡ Iniciando llama-server en puerto $PORT..."
cd "$LLAMA_DIR" || exit 1

./build/bin/llama-server -m "$SELECTED_MODEL" $FLAGS -c "$CONTEXT" --host 0.0.0.0 --port "$PORT" -np 1
