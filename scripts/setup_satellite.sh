#!/bin/bash

# CAMS Satellite Setup v3.1 (Hybrid: Android/Termux & Raspberry Pi/Linux)
# Este script prepara tu dispositivo como un nodo del Ágora.

echo "🏛️ Iniciando configuración de Nodo Satélite CAMS..."

# 1. Detección de entorno y actualización
if command -v pkg >/dev/null 2>&1; then
    echo "[CAMS] Entorno detectado: Android/Termux"
    IS_TERMUX=true
    pkg update && pkg upgrade -y
    pkg install llama-cpp curl -y
    BINARY_PATH="llama-server"
else
    echo "[CAMS] Entorno detectado: Linux/Raspberry Pi"
    IS_TERMUX=false
    sudo apt update && sudo apt upgrade -y
    sudo apt install curl build-essential cmake git -y
    
    # Si llama-server no está en el sistema, lo compilamos (RPi 500 es rápida)
    if ! command -v llama-server >/dev/null 2>&1; then
        echo "[CAMS] llama-server no encontrado. Compilando con CMake (estimado 3 min)..."
        cd ~
        [ -d "llama.cpp" ] || git clone https://github.com/ggerganov/llama.cpp
        cd llama.cpp
        mkdir -p build
        cd build
        cmake ..
        cmake --build . --config Release --target llama-server -j$(nproc)
        # El binario suele quedar en bin/ o directamente en la raíz de build
        cp bin/llama-server ~/cams-node/ || cp llama-server ~/cams-node/
    fi
    BINARY_PATH="$HOME/cams-node/llama-server"
fi

# 2. Creación de directorios (asegurar)
mkdir -p ~/cams-node/models

# 3. Descarga de modelo (Qwen 2.5 1.5B)
MODEL_URL="https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q5_K_S.gguf"
if [ ! -f ~/cams-node/models/student.gguf ]; then
    echo "[CAMS] Descargando modelo de estudiante (e2b)..."
    curl -L $MODEL_URL -o ~/cams-node/models/student_2b.gguf
fi

# 4. Generación del Script de Lanzamiento
cat <<EOF > ~/cams-node/start_node.sh
#!/bin/bash
$( [ "$IS_TERMUX" = true ] && echo "termux-wake-lock" )
echo "🚀 Lanzando Nodo Satélite CAMS en puerto 8080..."
# Optimizamos hilos según dispositivo
THREADS=$( [ "$IS_TERMUX" = true ] && echo "6" || echo "4" )
$BINARY_PATH -m ~/cams-node/models/student.gguf \
  --host 0.0.0.0 --port 8080 --ctx-size 12288 --threads $THREADS --batch-size 512 --ubatch-size 512    --cache-type-k q8_0   --cache-type-v q8_0 --mlock --flash-attn --no-mmap \$THREADS
EOF

chmod +x ~/cams-node/start_node.sh

echo "✅ ¡Configuración completada!"
echo "------------------------------------------------"
echo "Para conectar este nodo al maestro:"
echo "1. Asegúrate de que Tailscale esté conectado y la IP sea visible."
echo "2. Ejecuta: ./cams-node/start_node.sh"
echo "3. IP detectada: \$(hostname -I | awk '{print \$1}')"
echo "------------------------------------------------"
