#!/bin/bash

# --- CONFIGURACIÓN DEL NODO SATÉLITE CAMS ---
MODEL_PATH="$HOME/cams-node/models/L3.1-MOE-2X8B-Q3_K_S.gguf"
PORT=8080
THREADS=6        # 6 hilos es el "punto dulce" para el SD 8 Gen 4/5
CONTEXT=2048     # Ajustado para no desbordar los 6.4GB RAM con este MoE
BATCH_SIZE=512

echo "[CAMS] Optimizando entorno para S25..."

# 1. Forzar limpieza de caché antes de cargar (ayuda a asentar el modelo)
# Nota: Esto es opcional, pero libera fragmentación.

# 2. Lanzamiento con Taskset (Afinidad a núcleos de alto rendimiento 4-7)
# 3. Flags de Vanguardia:
# --mlock: Fija el modelo en RAM (evita Swap/ZRAM)
# -fa: Flash Attention (Vital para velocidad de lectura)
# -ctk / -ctv: Comprime el caché del contexto para ahorrar VRAM/RAM
# --cont-batching: Optimiza ráfagas de tokens

taskset -c 4-7 ./llama-server \
    -m "$MODEL_PATH" \
    --port $PORT \
    -t $THREADS \
    -c $CONTEXT \
    -b $BATCH_SIZE \
    --mlock \
    -fa \
    -ctk q8_0 \
    -ctv q8_0 \
    --pin-cores \
    --rpc qnn
    --cont-batching \
    --embedding \
    --host 0.0.0.0 \
    --n-gpu-layers 0 \
    --temp 0.7 \
    --repeat-penalty 1.1

# Si compilaste con soporte QNN, añade '--rpc qnn' al final del comando anterior.
