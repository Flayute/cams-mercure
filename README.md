# ⚗️ CAMS Mercure: Federated Intelligence Network

> **"Soberanía Cognitiva, Inteligencia Federada y Simbiosis Digital."**

**CAMS Mercure** no es solo un chat con IA. Es una red de inteligencia federada diseñada para funcionar en hardware local (Workstations o Laptops Linux) con total privacidad, integrando búsqueda web en tiempo real, memorias persistentes y un sistema de agentes especializados.

---

## 🧭 Visión y Filosofía
Mercure nace de la necesidad de poseer nuestro propio "cerebro digital". Utilizando el protocolo **Somático**, el sistema no solo procesa datos, sino que los integra en una estructura de conocimiento jerárquica y accesible.

Este ecosistema se inspira y construye sobre los cimientos de arquitecturas de vanguardia:
- **Compressed Reasoning:** Inspirado en el [Gist de Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
- **Quantization & Efficiency:** Basado en el motor de [Turboquant Plus](https://github.com/TheTom/turboquant_plus).
- **Knowledge Synthesis:** Utiliza el protocolo de [Caveman Compression](https://github.com/wilpel/caveman-compression).

## 🚀 Capacidades Principales

### 🧠 Motor RAG Centinela (Watchdog)
Un sistema de vigilancia activa que indexa automáticamente cualquier archivo `.md` o `.txt` que arrojes en tu bóveda. Soporta múltiples directorios simultáneos (Obsidian, Logseq, Antigravity).

### 🏛️ Ágora Cuántica (Fase Experimental)
Protocolo de razonamiento avanzado que permite ciclos de refinamiento mediante debate entre nodos federados.
- **Despliegue Satélite:** Se activa mediante el script `scripts/setup_satellite.sh`.
- **Configuración:** Permite modificar el modelo (GGUF) y parámetros de lanzamiento directamente en el script.
- **Soporte Móvil:** Los satélites pueden correr en Android a través de **Termux**.
- **Gestión de Nodos:** La lista de IPs y puertos de los nodos federados se gestiona en la capa del Orquestador (Node.js).
- **Trigger Activo:** El sistema incluye una tarea cron a las 10:00 AM que lanza una consulta aleatoria ("Deep Probe") a toda la red para mantener los motores calientes y generar síntesis diarias.

### 🌐 Exploración Invisible (SearxNG)
Búsqueda web privada a través de **SearxNG** (Puerto 8001). Los agentes pueden navegar por internet sin dejar rastro en los servidores de las Big Tech.

### 📎 Multiselección de Conocimiento
Adjunta múltiples archivos al instante para que cualquier agente pueda analizarlos como contexto inmediato, indexándolos proactivamente en tu base de conocimientos.

---

## 🏗️ Arquitectura Técnica

### Estandarización de Puertos
| Servicio | Puerto | Descripción |
| :--- | :--- | :--- |
| **LLM Server** | `8080` | Motor de inferencia (Llama.cpp) |
| **Mercure Bridge** | `8000` | Orquestador de agentes y seguridad |
| **Orquestador UI** | `3001` | Interfaz Web y gestión de archivos |
| **SearxNG** | `8001` | Motor de búsqueda web privada |

> [!CAUTION]
> **DIFICULTAD DE INSTALACIÓN: ALTA**
> En su estado actual, CAMS Mercure NO es un sistema de "un solo clic". Requiere configuración manual de servicios federados, compilación de binarios específicos y gestión de procesos en segundo plano. No se recomienda para usuarios sin experiencia en entornos Linux y LLMs locales.

### Dependencias y Servicios Obligatorios
Para que el ecosistema funcione, se deben desplegar e instalar las siguientes instancias:
1.  **llama.cpp (server):** El motor de inferencia debe estar compilado y corriendo (Puerto 8080).
2.  **SearxNG:** Instancia de búsqueda privada local o remota (Puerto 8001).
3.  **Node.js (v18+):** Necesario para el Orquestador UI.
4.  **Python (3.10+):** Necesario para el Bridge y sus dependencias (FastAPI).
5.  **Librerías de Sistema:** `zenity` o `kdialog` para selectores nativos, `curl` y `build-essential`.

### Requisitos de Configuración
La configuración de Mercure tiene una **dificultad media-alta** debido a sus dependencias nativas:
1.  **Entorno Linux:** Optimizado para kernels modernos y soporte de GPU (CUDA/ROCm).
2.  **Dependencias:** Requiere `zenity` o `kdialog` para las funciones nativas de sistema.
3.  **Seguridad:** Necesita configurar un `MERCURE_TOKEN` para blindar el Bridge.
4.  **Hardware:** Recomendado 16GB+ de RAM y VRAM decente para modelos de 7B en adelante.

---

## 🛡️ Revisión de Seguridad (Hardening)
Mercure implementa las siguientes capas de seguridad:
- **X-Token Auth:** Todas las llamadas al Bridge están autenticadas.
- **Path Sanitization:** Protección contra inyecciones de ruta en el guardado de archivos.
- **CORS Restricted:** Solo permite peticiones desde orígenes locales configurados.
- **Base64 Validation:** Validación de tipos MIME para archivos adjuntos.

---

## 🛠️ Cómo Iniciar
```bash
# Otorgar permisos al script maestro
chmod +x mercure_start.sh

# Iniciar todo el ecosistema
./mercure_start.sh
```

## 🌌 Próxima Fase: Integración Externa y Ágora Total
Estamos preparando el despliegue de nodos distribuidos y la apertura de canales hacia APIs externas:
- **Puente NIM:** Integración planificada con NVIDIA NIM para experimentos con modelos de gran escala.
- **Engramas Híbridos:** Compartición de conocimiento cifrado entre nodos de la red local para generar síntesis colaborativas.

---

**Desarrollado por la Unidad de Inteligencia CAMS.**
*"El conocimiento es el único bien que crece cuando se comparte, pero solo si eres tú quien lo posee."*
