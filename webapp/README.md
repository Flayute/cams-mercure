# CAMS (Cognitive-Adaptive Modular System)
## Preview v1.0

**CAMS** (Cognitive-Adaptive Modular System) es una infraestructura modular diseñada para Alejandro Orsi. Es el centro neurálgico que une la cognición humana con la asistencia digital, permitiendo que el sistema se adapte y evolucione modularmente para tareas de terapia, creación y performance musical.

## 🎯 El Objetivo
El objetivo de CAMS es convertir tu masa de datos local en conocimiento accionable y bienestar. CAMS no es solo una herramienta, es un **compañero digital** que vive en tu red local, respeta tu privacidad y te ayuda a crear, leer y desconectar.

## 💻 Ecosistema del Proyecto (Hardware)
CAMS está diseñado para operar en un entorno distribuido y heterogéneo:
- **Servidor de IA (Acer Nitro 50)**: PC de **Sobremesa** con **RTX 3050**, el núcleo de potencia para Ollama (`psicosomatica`) y el backend.
- **Terminal Remoto (iMac 2009 - Debian 13)**: Estación de trabajo remota conectada vía **NoMachine** para control y desarrollo.
- **Módulo de Performance (Raspberry Pi 500)**: Ejecuta el cockpit de **UMA** y la interfaz de "Modo Noche" para DJing.
- **Conectividad**: Todo el ecosistema está unificado mediante **Tailscale**, permitiendo acceso transparente entre dispositivos.

## 🏛️ Cómo está creado (Tech Stack)
CAMS se apoya en una arquitectura robusta de tres niveles:

1.  **Cerebro IA (Local)**:
    - **Ollama**: Motor principal ejecutando `psicosomatica` (basado en Llama 3.2 3B), optimizado para rendimiento en GPU local.
    - **Open WebUI**: Gestión de memoria a largo plazo y puente para búsquedas web en tiempo real.
    - **Documentación Técnica**: Consulta [README_AI_INTEGRATION.md](file:///C:/Users/makut/.gemini/antigravity/scratch/cams-preview/README_AI_INTEGRATION.md) para detalles de implementación.
    - **n8n**: Automatización del flujo de memoria (RAG) entre tus notas de Obsidian y la IA.

2.  **Puente de Datos (Backend)**:
    - **Node.js + Express**: Un servidor local (`server.js`) que actúa como API privada, permitiendo que la web "vea" tus archivos sin subirlos a ninguna nube.
    - **Mammoth**: Capacidad de leer y procesar documentos `.docx` tan fácilmente como un archivo de texto.

3.  **Interfaz de Usuario (Frontend)**:
    - **Vite + React**: El motor de la WebApp, garantizando velocidad y reactividad.
    - **Vanilla CSS (Custom)**: Un sistema de diseño "Glassmorphism" con dos almas: un **Modo Noche** (Cyberpunk/DJ) y un **Modo Día** (Zen/Terapia).

## ✨ Qué hace (Funcionalidades)

### 1. Sistema de WebApps Modulares
La interfaz está dividida en submódulos independientes para evitar la sobrecarga cognitiva:
- **Ana IA**: Tu asistente creativo que analiza tus notas para darte ideas de contenido.
- **Biblioteca Dinámica**: Escaneo automático de tu carpeta `Obsidian Records/Ollama`.
- **Lector Inmersivo**: Modo de lectura sin distracciones para archivos `.md`, `.txt` y `.docx`.

### 2. Monitorización y Análisis Musical (ACTIVO)
- **UMA (Universal Music Analyser)**: El motor de análisis musical que potencia el **Modo Noche**. 
- **Memoria Curada**: Base de datos de +13,000 canciones con metadatos de energía y armónicos.
- **Cockpit Independiente**: WebApp servida en el puerto `8085` para ejecución autónoma en Raspberry Pi.

---

### Setup Rápido (RPi 500)
1. **UMA**: `cd UMA_DJ_Assistant && ./install_rpi.sh`
2. **Launch**: `./venv/bin/python app.py`
3. **Link**: Abre `http://localhost:8085` (o tu IP de Tailscale).

### 2. Inspiración Híbrida (Local + Global)
Ana no solo conoce tus notas. Gracias a la integración con Open WebUI, puede:
- Consultar tus archivos locales para ser coherente con tu estilo.
- Buscar tendencias en el mundo real para que tu contenido sea siempre actual.

### 3. Memoria Persistente
CAMS utiliza un sistema de memoria dual:
- **Conversacional**: Recuerda tus charlas previas vía Open WebUI.
- **De Conocimiento**: Utiliza RAG para inyectar fragmentos relevantes de tus notas de Obsidian en cada respuesta.

## 🚀 Cómo ponerlo en marcha
1.  Asegúrate de que **Ollama** y **Open WebUI** estén encendidos.
2.  Ejecuta `start_cams.bat` en la carpeta raíz.
3.  Entra en `http://localhost:5173`.
4.  *Opcional*: Accede desde cualquier dispositivo de tu casa a través de tu IP de **Tailscale**.

---
> [!NOTE]
> CAMS es un proyecto vivo. Cada nota que escribes en Obsidian lo hace más inteligente.
