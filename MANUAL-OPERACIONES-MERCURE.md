# 🌀 MANUAL DE OPERACIONES: CAMS MERCURE
## Ecosistema de Inteligencia Federada y Soberana

Este documento resume la arquitectura, capacidades y protocolos de operación del sistema **CAMS Mercure** v5.0, diseñado para la orquestación de inteligencia local distribuida.

---

## 🏛️ 1. Arquitectura del Sistema

El ecosistema opera bajo un modelo de **Federación de Nodos**:

1.  **Mainframe (Acer PC):** Nodo de cómputo pesado. Alberga el cerebro principal (DeepSeek 35B) y el motor RAG "Caveman".
2.  **Centro de Mando (Samsung S25):** Orquestador táctico. Actúa como interfaz de control remoto, nodo de captura de sensores y Edge AI (Llama 3.2 3B).
3.  **Nodo Nómada (Pi 500):** Estación creativa especializada (Audio/DJ).
4.  **Capa de Sincronización:** **Syncthing** garantiza que la Bóveda (Wiki Maestro) sea idéntica en todos los dispositivos.

---

## 📱 2. Interfaz de Control Móvil (API v2)

El sistema se gobierna mediante peticiones HTTP seguras desde el móvil (Automate/Tasker).

### Protocolos de Consulta:
-   **Estado (`/api/mobile/status`):** Verifica la salud del LLM y el Bridge.
-   **Recursos (`/api/mobile/system/resources`):** Monitoriza RAM y CPU del Mainframe en tiempo real.
-   **Startup Check (`/api/mobile/startup-check`):** Semáforo de disponibilidad del sistema.

### Protocolos de Acción:
-   **Switch de Modelo (`/api/mobile/control/switch-model`):** Permite cambiar el cerebro activo (ej. de 9B a 35B) desde el bolsillo. El sistema realiza una parada segura y un rearranque automático.
-   **Trigger de Indexación (`/api/mobile/trigger/index`):** Fuerza al sistema a procesar nuevos archivos sincronizados.
-   **Apagado de Emergencia (`/api/mobile/control/stop-all`):** Cese inmediato de todos los procesos de IA.

---

## 🧠 3. Gestión de Modelos (El Balón de Oxígeno)

Para operar modelos de gran escala (35B) en hardware doméstico, se deben seguir estos parámetros de estabilidad:

-   **KV Cache Quantization:** Siempre operar con `-ctk q4_0` y `-ctv q4_0` para desplazar el contexto a la vRAM libre.
-   **Contexto Dinámico:** El "Sweet Spot" se sitúa entre **64k y 128k**. Superar los 260k requiere monitorización constante de la memoria.
-   **Flash Attention:** Mantener `-fa on` para optimizar la velocidad de inferencia.
-   **Anti-Asfixia:** Nunca usar `--mlock` o `--no-mmap` en modelos que superen el 70% de la RAM disponible.

---

## 🏴‍☠️ 4. Identidad y Filosofía (Mercure Brand)

El sistema no es solo software; es un manifiesto de soberanía.
-   **El Logo:** Un alambique (destilación del conocimiento) sobre dos escalpelos cruzados (precisión quirúrgica).
-   **El Heraldo:** La voz del sistema que traduce la complejidad técnica en estrategia humana.
-   **Soberanía Canalla:** El dato nunca sale de tu red. El procesamiento es local. El control es absoluto.

---

## 🔧 5. Mantenimiento y Solución de Problemas

1.  **Bloqueo de Puertos:** Si un servicio no arranca, usa el widget de **Stop-All** o ejecuta `fuser -k 8080/tcp 8000/tcp`.
2.  **Fragmentación Cognitiva:** Si el modelo empieza a alucinar tras muchos cambios, realiza un ciclo de apagado total y deja que el kernel de Linux limpie la RAM (1.5 segundos de pausa).
3.  **Logs:** Los registros de pensamiento del sistema se encuentran en `webapp/logs/`.

---

**"La inteligencia es una herramienta de liberación, no una cadena de dependencia."**
🌀🏛️🚀
