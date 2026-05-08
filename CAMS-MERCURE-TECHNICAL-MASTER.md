# 🏛️ CAMS Mercure: Technical Master Codex

> **Versión:** 1.0 (Hermes Era)  
> **Estado:** Despliegue Federado Activo  
> **Hardware:** Acer Nitro 50 (Hub) + Raspberry Pi 500 (Satellite)

---

## 1. Arquitectura del Sistema (Mercure Nexus)

CAMS Mercure ha evolucionado de una consola aislada a un **Ecosistema Federado**. El sistema se divide en tres capas principales que se comunican de forma transparente para el usuario.

### 🏛️ El Hub (Acer Nitro 50) - Puerto 3001
Es el cerebro central y la interfaz de entrada.
*   **Nexus Hub:** Interfaz de tres pilares (Día/CAMS, Nexus/Control, Noche/UMA).
*   **Mercure Bridge (Python):** El orquestador que gestiona la lógica, los agentes y la comunicación SSH con la Raspberry.
*   **Knowledge Substrate (RAG):** Base de datos local que alimenta a los agentes con información del vault de Obsidian y documentos.

### 🛰️ El Satélite (RPi 500) - Puerto 8000
Es el nodo de ejecución especializada y multimedia.
*   **UMA Engine:** Motor de análisis musical y gestión de biblioteca (14k+ temas).
*   **Agora Node:** Instancia local de LLM (Llama.cpp) para razonamiento satelital.
*   **Hybrid Modes:**
    *   **Shadow Mode:** Operación headless (sin monitor) para análisis y reproducción de fondo.
    *   **Stationary Mode:** Modo DJ/Estudio activado al detectar HDMI o controladoras.

---

## 2. Los Agentes y la Consola de Control

Mercure no utiliza una IA genérica, sino una **Junta de Agentes Especializados** con identidades y herramientas propias:

| Agente | Especialidad | Lógica Interna |
| :--- | :--- | :--- |
| 📚 **Bibliotecario** | RAG / Documentación | Acceso total al Wiki Maestro y Vault. |
| 🎙️ **Junta de Expertos** | Multidisciplinar | Debate entre Psicólogo, Fisio y Neurocientífico. |
| 🧭 **Explorador** | Web / Tendencias | Navegación invisible vía SearxNG. |
| 💻 **Arquitecto IT** | Infraestructura | Experto en Nobara, Docker, Python y control de Nodos. |
| 📣 **Heraldo** | Marketing / Branding | Estrategia de comunicación y engramas de identidad. |

---

## 3. Lógica de Memoria (The Engram Flow)

Para gestionar miles de documentos con baja latencia y alta precisión, CAMS utiliza un sistema de memoria en capas:

### 🦴 Protocolo Caveman (Compresión)
*   **Función:** Reduce los textos en un 70% eliminando gramática redundante.
*   **Resultado:** Permite inyectar contextos masivos en ventanas de contexto limitadas (8GB VRAM).

### 📖 Wiki Maestro vs. Wiki Efímero
*   **Wiki Maestro (`_wiki.md`):** Índice persistente de todo el conocimiento comprimido en el Acer.
*   **Wiki Efímero (`session.md`):** Memoria de corto plazo que dura solo la sesión actual, compartida entre todos los agentes para mantener la coherencia del diálogo.

### 🧬 Knowledge Substrate
El sustrato es la capa más profunda, donde los datos puros se transforman en "Engramas" (unidades de conocimiento listas para ser usadas por la IA).

---

## 4. Sistema de Habilidades (Hermes Skills)

La capa **Hermes** permite que el Acer actúe físicamente sobre los nodos. Ubicada en `/skills/`, cada habilidad es un script ejecutable:

*   **Auditoría:** `pi_monitor.sh` (Inspección remota de hardware).
*   **Reindexación:** `reindex.py` (Actualización del cerebro RAG).
*   **Control Satelital:** Comandos SSH directos para gestionar servicios (MPD, Agora, UMA).

---

## 5. Panel de Control (Nexus Control)

La interfaz unificada permite:
*   **Monitorización:** Ver CPU/RAM/Temp de todos los nodos en tiempo real.
*   **Selector de LLM:** Capacidad de cambiar el motor de razonamiento (9B, 14B, 27B) según la tarea.
*   **Editor Markdown:** Previsualización y formateo de informes en tiempo real (DocumentFormatter).

---
*Documento generado por Antigravity para la Unidad de Inteligencia CAMS.*
