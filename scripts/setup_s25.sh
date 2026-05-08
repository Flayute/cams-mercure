#!/bin/bash

# CAMS Satellite Setup v3.2 (Optimizado para Samsung S25 - 12GB RAM)
# Nodo: S25 "Mercure-Mobile" | Core: Qwen 3.5 9B (Claude Distilled)

echo "🏛️ Iniciando configuración de Nodo Satélite CAMS en S25..."

# 1. Detección de entorno y preparación
if command -v pkg >/dev/null 2>&1; then
    echo "[CAMS] Entorno detectado: Android/Termux (S25 Optimized)"
    IS_TERMUX=true
    # Instalamos dependencias necesarias para QNN/NPU si estuvieran disponibles
    pkg update && pkg upgrade -y
    pkg install llama-cpp curl wget -y
    BINARY_PATH="llama-server"
else
    # Mantenemos compatibilidad con tu RPi 500 por si reutilizas el script
    echo "[CAMS] Entorno detectado: Linux/Raspberry Pi"
    IS_TERMUX=false
    sudo apt update && sudo apt upgrade -y
    sudo apt install curl build-essential cmake git -y
    BINARY_PATH="$HOME/cams-node/llama-server"
fi

# 2. Estructura de directorios
mkdir -p ~/cams-node/models

# 3. Descarga del modelo Qwen 3.5 9B (Claude-Reasoning)
# Este modelo pesa aprox 5.3GB, encaja perfecto en tus 6.4GB libres.
MODEL_URL="https://huggingface.co/Jackrong/Qwen3.5-9B-Claude-4.6-Opus-Reasoning-Distilled-GGUF/resolve/main/Qwen3.5-9B.Q4_K_M.gguf"
MODEL_FILE="~/storage/downloads/L3.1-MOE-2X8B-Deepseek-DeepHermes-e32-13.7B.Q3_K_S.gguf"

if [ ! -f $MODEL_FILE ]; then
    echo "[CAMS] Descargando Qwen 3.5 9B (Reasoning Distilled)..."
    wget --show-progress $MODEL_URL -O $MODEL_FILE
fi

# 4. Generación del Script de Lanzamiento Optimizado
cat <<EOF > ~/cams-node/start_node.sh
#!/bin/bash
$( [ "$IS_TERMUX" = true ] && echo "termux-wake-lock" )

echo "🚀 Lanzando Nodo Satélite CAMS en S25 (Puerto 8080)..."

# FLAGS EXPLICADOS PARA TU S25:
# --threads 8: Usamos los 8 núcleos del Snapdragon.
# --mlock: Bloquea el modelo en RAM para que One UI no lo mande a la Swap lenta.
# --ctx-size 8192: Un contexto equilibrado para 9B en 12GB de RAM total.
# --n-gpu-layers 0: Por defecto en Termux usamos CPU/NPU (QNN si el binario lo soporta).

$BINARY_PATH \\
    -m $MODEL_FILE \\
    --host 0.0.0.0 \\
    --port 8080 \\
    --threads 6 \\
    --ctx-size 8192 \\
    --mlock \\
    --rpc qnn \\
    -ctk q8_0 \\
    --temp 0.7 \\
    --cont-batching \\
    --log-disable
EOF

chmod +x ~/cams-node/start_node.sh

echo "✅ ¡Configuración completada para S25!"
echo "------------------------------------------------"
echo "Nodo listo para integrarse en CAMS Mercure."
echo "1. Ejecuta: ./cams-node/start_node.sh"
echo "2. IP Local: \$(hostname -I | awk '{print \$1}')"
echo "3. RAM Libre actual: \$(free -h | grep Mem | awk '{print \$4}')"
echo "------------------------------------------------"
