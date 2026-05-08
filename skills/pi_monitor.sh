#!/bin/bash
# Hermes Skill: Pi Satellite Monitor
# Executed from Acer Hub to audit RPi 500

PI_IP="100.95.137.80"
PI_USER="intrusivethought"
SSH_KEY="$HOME/.ssh/id_mercure"

echo "--- 🛰️ AUDITORÍA DE SATÉLITE MERCURE ---"
echo "Fecha: $(date)"

# 1. Comprobar temperatura
TEMP=$(ssh -i $SSH_KEY $PI_USER@$PI_IP "vcgencmd measure_temp")
echo "Termometría: $TEMP"

# 2. Comprobar Modo (Hardware)
MODE_CHECK=$(ssh -i $SSH_KEY $PI_USER@$PI_IP "lsusb | grep -iE 'Roland|Pioneer|Audio Interface' | wc -l")
if [ $MODE_CHECK -gt 0 ]; then
    echo "Modo: STATIONARY (Controladora detectada)"
else
    echo "Modo: SHADOW (Operación en segundo plano)"
fi

# 3. Comprobar Carga de IA
AI_LOAD=$(ssh -i $SSH_KEY $PI_USER@$PI_IP "ps aux | grep llama-server | grep -v grep | wc -l")
if [ $AI_LOAD -gt 0 ]; then
    echo "Motor IA: ACTIVO"
else
    echo "Motor IA: APAGADO"
fi

echo "--- FIN DE AUDITORÍA ---"
