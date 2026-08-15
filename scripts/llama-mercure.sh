#!/bin/bash
# ============================================================
# llama-mercure.sh (CAMS Native - Selector de Modelos)
# Motor único: llama-stable
# ============================================================

HOME_DIR=$(eval echo ~$USER)
CAMS_BASE="${CAMS_BASE_PATH:-$HOME_DIR/Documents/CAMS-Mercure}"
MODELS_DIR="$CAMS_BASE/models"
LLAMA_DIR="$HOME_DIR/llama-stable"
PORT=8080

# 1. SCAN DE MODELOS
mapfile -t MODELS < <(find "$MODELS_DIR" -maxdepth 1 -name "*.gguf" ! -name "*mmproj*" ! -name "*embed*" ! -name "*coder-0.5*")
if [ ${#MODELS[@]} -eq 0 ]; then echo "No hay modelos en $MODELS_DIR"; exit 1; fi

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║       CAMS Mercure — Selector de Modelos         ║"
echo "  ║       Motor: llama-stable                        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

for i in "${!MODELS[@]}"; do
    NAME=$(basename "${MODELS[$i]}")
    if [[ "$NAME" =~ 35[Bb] ]]; then
        printf "  %d) 🏗️  %s [MoE 35B]\n" "$((i+1))" "$NAME"
    else
        printf "  %d) 🎯 %s\n" "$((i+1))" "$NAME"
    fi
done

echo ""
read -rp "  Elige modelo [1-${#MODELS[@]}]: " CHOICE

if [[ ! "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "${#MODELS[@]}" ]; then
    echo "  Opción no válida. Saliendo."
    exit 1
fi

SELECTED_MODEL="${MODELS[$((CHOICE-1))]}"
SELECTED_NAME=$(basename "$SELECTED_MODEL")
EXEC_PATH="$LLAMA_DIR/build/bin/llama-server"

# Verificar binario
if [ ! -f "$EXEC_PATH" ]; then
    echo "  ✗ No se encontró llama-server en: $EXEC_PATH"
    exit 1
fi

# 2. CONFIGURACIÓN SEGÚN PERFIL
if [[ "$SELECTED_NAME" =~ 35[Bb] ]]; then
    echo "  🏗️  Perfil 35B MoE activado"
    CONTEXT=80000
    FLAGS="-ngl 9999 -ncmoe 27 -fa on -np 1 --spec-type ngram-mod --spec-ngram-mod-n-match 24 --spec-draft-n-min 12 --spec-draft-n-max 48 --no-mmap  --cache-type-k q8_0 --cache-type-v q4_0"
else
    echo "  🎯 Perfil estándar activado"
    CONTEXT=8000
    FLAGS="-fa on -np 1  --jinja --chat-template-file ~/nex-n2-chat-template.jinja --cache-type-k q8_0 --no-mmap --cache-type-v q4_0 --spec-type ngram-mod --spec-ngram-mod-n-match 24 --spec-draft-n-min 12 --spec-draft-n-max 48"
fi

# 3. LANZAR
echo ""
echo "  🧹 Liberando puerto $PORT..."
fuser -k "$PORT/tcp" 2>/dev/null || true
sleep 1

echo "  🔥 Arrancando: $SELECTED_NAME (Contexto: $CONTEXT)"
$EXEC_PATH -m "$SELECTED_MODEL" $FLAGS -c "$CONTEXT" --host 0.0.0.0 --port "$PORT"
