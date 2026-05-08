#!/bin/bash
# ============================================================
# llama-mercure.sh (CAMS Native - Master Intelligent Selector)
# ============================================================

HOME_DIR=$(eval echo ~$USER)
CAMS_BASE="${CAMS_BASE_PATH:-$HOME_DIR/Documents/CAMS-Mercure}"
MODELS_DIR="$CAMS_BASE/models"
TURBO_DIR="/home/aorsi/llama-cpp-turboquant"
OFFICIAL_DIR="/home/aorsi/llama-cpp-official"
PORT=8080

# 1. SCAN DE MODELOS
mapfile -t MODELS < <(find "$MODELS_DIR" -maxdepth 1 -name "*.gguf" ! -name "*mmproj*")
if [ ${#MODELS[@]} -eq 0 ]; then echo "No hay modelos en $MODELS_DIR"; exit 1; fi

for i in "${!MODELS[@]}"; do printf "%d) %s\n" "$((i+1))" "$(basename "${MODELS[$i]}")"; done
read -rp "Elige modelo: " CHOICE
SELECTED_MODEL="${MODELS[$((CHOICE-1))]}"
SELECTED_NAME=$(basename "$SELECTED_MODEL")

# 2. CONFIGURACIÓN BASE
CONTEXT=32768
LLAMA_DIR="$TURBO_DIR"
FLAGS="--flash-attn on --split-mode row -ngl 99 --no-mmap --mlock --threads 6"

# 3. DETECCIÓN DE "BESTIA" (35B MoE) Y SELECCIÓN DE DRAFTER
if [[ "$SELECTED_NAME" =~ "35B" ]]; then
    echo "🏎️  MODO COMPETICIÓN ACTIVADO: Qwen 35B MoE Detectado"
    CONTEXT=128000
    FLAGS="$FLAGS --numa distribute --cpu-moe --cache-type-k q4_0 --cache-type-v q4_0"
    DRAFT_MODEL=$(find "$MODELS_DIR" -maxdepth 1 -name "gemma-4-e2b-q2_k.gguf" | head -n 1)
else
    echo "🎯 Modo Estándar Detectado (9B o inferior)"
    DRAFT_MODEL=$(find "$MODELS_DIR" -maxdepth 1 -name "qwen2.5-coder-0.5b-q8_0.gguf" | head -n 1)
fi

# 4. MOTOR Y LANZAMIENTO DE DFLASH
if [[ "$SELECTED_NAME" =~ qwen|llama|mistral ]]; then
    echo "🚀 Usando Motor TurboQuant"
    FLAGS="$FLAGS -ctk turbo3 -ctv turbo3"
    export TURBO_LAYER_ADAPTIVE=1
else
    echo "🏛️ Usando Motor Oficial"
    LLAMA_DIR="$OFFICIAL_DIR"
fi

if [ -n "$DRAFT_MODEL" ]; then
    echo "⚡ Escolta detectada: $(basename "$DRAFT_MODEL")"
    FLAGS="$FLAGS --model-draft $DRAFT_MODEL --draft 4 -ngld 99"
else
    echo "⚠️ No se encontró una escolta (Draft Model) compatible. Velocidad estándar."
fi

# 5. VÁLVULA DE SEGURIDAD (Para otros modelos grandes no-MoE)
FILESIZE=$(stat -c%s "$SELECTED_MODEL")
if [ "$FILESIZE" -gt 8500000000 ] && [[ ! "$SELECTED_NAME" =~ "35B" ]]; then
    echo "⚠️ Modelo GRANDE detectado. Ajustando Offloading..."
    FLAGS=$(echo "$FLAGS" | sed 's/-ngl 99/-ngl 24/')
    CONTEXT=16384
fi

# 6. LANZAR
echo "🧹 Liberando puerto $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

cd "$LLAMA_DIR" || exit 1
echo "🔥 Arrancando cerebro: $SELECTED_NAME (Contexto: $CONTEXT)"
./build/bin/llama-server -m "$SELECTED_MODEL" $FLAGS -c "$CONTEXT" --host 0.0.0.0 --port "$PORT"
