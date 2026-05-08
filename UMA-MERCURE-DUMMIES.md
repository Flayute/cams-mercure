# 📖 UMA-Mercure: Guía para Dummies (y Sabios)

¡Bienvenido al ecosistema **CAMS Mercure**! Esta guía te explica cómo funciona tu nueva red de inteligencia distribuida entre tu **Acer Nitro** (El Maestro) y tu **Raspberry Pi 500** (El Satélite).

---

## 1. La Filosofía del Sistema
Tu sistema ya no es un solo ordenador; es un **organismo**.
*   **El Maestro (Acer):** Donde vives tú. Aquí escribes, analizas con los agentes principales y coordinas el Ágora.
*   **El Satélite (RPi 500):** Tu centro de operaciones musical. Se encarga de "cazar" canciones, procesarlas y analizarlas sin quitarle potencia a tu Acer.

---

## 2. Los Modos de Vuelo (Shadow vs. Stationary)
Hemos programado a la Raspberry para que detecte su entorno y se adapte:

*   **🌑 Shadow Mode (Default):** 
    *   **Cuándo:** Cuando la Pi no tiene monitor ni controladora conectada.
    *   **Qué hace:** Trabaja en segundo plano. Escucha las órdenes que le mandas desde el Acer vía SSH. Es eficiente y invisible.
*   **🎮 Stationary Mode:** 
    *   **Cuándo:** Cuando conectas un cable **HDMI** o tu **Roland DJ 202**.
    *   **Qué hace:** Se activa la interfaz gráfica completa para que puedas usar **Mixxx**, ver pelis o gestionar el **UMA Cockpit** de forma visual.

---

## 3. Tus Nuevos Superpoderes (Comandos)

### A. Encender el Satélite
Para arrancar todos los servicios de una vez (IA + Consola de Música), entra en la Pi y ejecuta:
```bash
./pi-agent.sh
```

### B. El Motor de Análisis (Engine)
Si tienes una carpeta con música nueva y quieres que UMA la analice (BPM, Key, Energía), usa:
```bash
python3 ~/Música/logs_scripts/uma_engine.py --path "/ruta/a/tu/musica"
```
*Este comando limpia los nombres, convierte a MP3 320k, analiza el audio y mete todo en la base de datos de un tirón.*

---

## 4. ¿Cómo veo mi música?
No hace falta que abras el explorador de archivos. Entra en tu navegador (en el Acer o el móvil) a:
👉 **`http://100.95.137.80:8000`**

Ahí verás la consola de **UMA-Mercure** con toda tu biblioteca analizada.

---

## 5. El "Puente" SSH
Gracias a la llave `id_mercure`, tu Acer y tu Pi ahora son "mejores amigos". Pueden hablarse sin pedirse contraseñas constantemente, lo que permite que los agentes de Mercure puedan auditar la Pi de forma autónoma.

---
*Duda de Psicólogo:* Si el sistema empieza a saber demasiado sobre tus gustos musicales... ¡es que el Engrama está funcionando! 😉
