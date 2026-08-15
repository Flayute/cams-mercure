#!/bin/bash
# ============================================================
# llama-mercure-debug.sh (Versión de Monitorización Directa)
# Motor único: llama-stable
# ============================================================

HOME_DIR=$(eval echo ~$USER)
CAMS_BASE="${CAMS_BASE_PATH:-$HOME_DIR/Documents/CAMS-Mercure}"
MODELS_DIR="$CAMS_BASE/models"
LLAMA_DIR="$HOME_DIR/llama-stable"
PORT=8080

echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║       DEBUG MODE — CAMS Mercure LLM Monitor      ║"
echo "  ║       Motor: llama-stable                        ║"
echo "  ╚══════════════════════════════════════════════════╝"

mapfile -t MODELS < <(find "$MODELS_DIR" -maxdepth 1 -name "*.gguf" ! -name "*mmproj*" ! -name "*embed*" ! -name "*coder-0.5*")

if [ ${#MODELS[@]} -eq 0 ]; then
    echo "  ✗ No se encontraron modelos .gguf en: $MODELS_DIR"
    exit 1
fi

for i in "${!MODELS[@]}"; do
    NAME=$(basename "${MODELS[$i]}")
    # Marcar los 35B para claridad visual
    if [[ "$NAME" =~ 35[Bb] ]]; then
        printf "  %d) 🏗️  %s [MoE 35B]\n" "$((i+1))" "$NAME"
    else
        printf "  %d) 🎯 %s\n" "$((i+1))" "$NAME"
    fi
done

echo ""
read -rp "  Elige modelo para DEBUG [1-${#MODELS[@]}]: " CHOICE

if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#MODELS[@]}" ]; then
    echo "  Opción no válida."
    exit 1
fi

SELECTED_MODEL="${MODELS[$((CHOICE-1))]}"
SELECTED_NAME=$(basename "$SELECTED_MODEL")
EXEC_PATH="$LLAMA_DIR/build/bin/llama-server"

# Verificar que el binario existe
if [ ! -f "$EXEC_PATH" ]; then
    echo "  ✗ No se encontró llama-server en: $EXEC_PATH"
    echo "  Comprueba que llama-stable está compilado."
    exit 1
fi

# ── CONFIGURACIÓN SEGÚN PERFIL ──────────────────────────────
if [[ "$SELECTED_NAME" =~ 35[Bb] ]]; then
    echo "  🏗️  Perfil 35B MoE activado"
    CONTEXT=128000
    FLAGS="-ncmoe 31 --spec-type ngram-mod -ngl 9999 -t 8 -fa on -np 1 --repeat-penalty 1.1 --presence-penalty 0.0 --mmap --parallel 1 -tb 8  -b 1500 -ub 600 --temperature 1.0 --top_p 0.95 --top_k 64 --cache-type-k q4_0 --cache-type-v q4_0 --spec-draft-n-max 4 --reasoning off"
	else
    echo "  🎯 Perfil estándar activado"
    CONTEXT=128000
    FLAGS="-fa on -ncmoe 31 -np 1 --mmap -t 5   --chat-template-file /home/aorsi/Documents/CAMS-Mercure/models/nex-n2-chat-template.jinja --spec-draft-n-max 12 --parallel 1 -fit on -tb 8 --temperature 1.0 --top_p 0.95 --top_k 64   --cache-type-k q4_0  --cache-type-v q4_0"
fi

echo ""
echo "  ⚡ Liberando puerto $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

echo "  🚀 LANZANDO EN PRIMER PLANO (Presiona Ctrl+C para detener)..."
echo "  Modelo:   $SELECTED_NAME"
echo "  Contexto: $CONTEXT"
echo "  Flags:    $FLAGS"
echo "  -----------------------------------------------------------"

# Ejecución directa para ver logs en tiempo real
$EXEC_PATH -m "$SELECTED_MODEL" $FLAGS -c "$CONTEXT" --host 0.0.0.0 --port "$PORT"
