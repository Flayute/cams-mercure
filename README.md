# CAMS Mercure — System Documentation

> **Versión:** 2.0 (Era Semántica)
> **Estado:** Producción Activa · Local-First · Federado
> **Hardware Referencia:** Acer Nitro 50 (Hub) · RTX 3050 OEM (8GB VRAM) · Raspberry Pi 500 (Satélite)

---

## ¿Qué es CAMS Mercure?

CAMS Mercure es un **sistema de inteligencia federada local** diseñado para operar sin depender de servicios en la nube. Funciona como un segundo cerebro digital: indexa conocimiento propio, consulta la web de forma privada, razona con modelos de lenguaje de última generación y produce documentos, estrategias y visualizaciones directamente en el entorno del usuario.

No es un chatbot. Es una **junta de agentes especializados** que comparten memoria, conocimiento y contexto para resolver problemas complejos con profundidad real.

> **Filosofía central:** Todo el procesamiento de IA ocurre en la máquina del usuario. Ningún dato sale a servidores externos. Privacidad por diseño, rendimiento por ingeniería.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        USUARIO                                  │
│                    (Interfaz React)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP (Puerto 3001)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND NODE.JS                               │
│          Proxy · Orquestador de UI · Logging                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP (Puerto 8000)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BRIDGE PYTHON (FastAPI)                            │
│   Agentes · RAG Semántico · Caveman · Sesión · Clientes         │
└─────────────┬───────────────────────────────┬───────────────────┘
              │  HTTP (Puerto 8080)            │  SSH (Tailscale)
              ▼                               ▼
┌─────────────────────────┐    ┌──────────────────────────────────┐
│   MOTOR LLM LOCAL       │    │   SATÉLITE (Raspberry Pi 500)    │
│   Llama.cpp / AtomicBot │    │   Agora Node · UMA Engine        │
│   Gemma 4 26B · Qwen 35B│    │   Shadow / Stationary Mode       │
└─────────────────────────┘    └──────────────────────────────────┘
```

### Componentes Tecnológicos

| Capa | Tecnología | Función |
|:-----|:-----------|:--------|
| **Interfaz** | React + Vite | Consola de Agentes, Neuro-Canvas, Marketing Lab |
| **Servidor** | Node.js + Express | API REST, Proxy, Gestión de Logs |
| **Bridge** | Python + FastAPI | Orquestación de agentes, RAG, Sesión |
| **LLM Engine** | Llama.cpp (fork AtomicBot) | Inferencia local con CUDA |
| **Motor RAG** | sentence-transformers + SQLite | Embeddings semánticos y búsqueda vectorial |
| **Búsqueda Web** | SearXNG (auto-hospedado) | Contexto web privado y sin rastreo |
| **Ecosistema** | Obsidian + Tailscale | Bóveda de conocimiento + red federada segura |

---

## El Motor LLM: Rendimiento de Producción

Mercure utiliza el fork **AtomicBot TurboQuant** (`atomic-llama-cpp-turboquant`) de Llama.cpp, específicamente parcheado para soportar la arquitectura **Gemma 4 con MTP (Multi-Token Prediction)**.

### Modelos en Producción

| Modelo | Parámetros | Motor | MTP | Velocidad (gen.) |
|:-------|:-----------|:------|:----|:----------------|
| **Gemma 4 26B-A4B-it MXFP4** | 25.2B | AtomicBot | ✅ | ~25 tokens/s |
| **Qwen 3 235B-A22B (MoE)** | 235B activos: 22B | TurboQuant | - | ~22 tokens/s |

### Configuración Óptima (RTX 3050 OEM, 8GB VRAM)

```bash
# Gemma 4 26B — Configuración validada
-fa on -ngl 99 --numa distribute -ncmoe 24 \
--cache-type-k q4_0 --cache-type-v q4_0 \
--threads 8 --ctx-size 128000 \
--spec-type mtp --draft 4

# Qwen 3 235B — Configuración validada
-fa on -ngl 99 --numa distribute -ncmoe 30 \
--cache-type-k q4_0 --cache-type-v q4_0 \
--threads 8 --ctx-size 128000 --draft 4
```

> **Nota técnica sobre ncmoe:** El flag `-ncmoe N` mantiene los expertos de las primeras N capas en la CPU. Esto permite ejecutar modelos MoE masivos en GPUs consumer sin OOM, distribuyendo la carga entre VRAM y RAM del sistema.

### Selector Inteligente de Motor (`llama-mercure-35b.sh`)

El script de arranque detecta automáticamente el modelo seleccionado y aplica la configuración óptima:

```
Gemma 4 / MTP  →  Motor AtomicBot  (ncmoe 24, spec-type mtp)
Qwen / LLaMA   →  Motor TurboQuant (ncmoe 30, draft clásico)
Otros          →  Motor Oficial     (configuración estándar)
```

---

## El Panteón de Agentes

Mercure no utiliza una IA genérica. Cada agente tiene una identidad, acceso a herramientas específicas y un rol dentro del ecosistema.

| ID | Agente | Especialidad | Herramientas |
|:---|:-------|:-------------|:-------------|
| `bibliotecario` | 📚 El Bibliotecario | RAG · Documentación · Síntesis | Wiki Semántica, Caveman, Substrato |
| `investigador` | 🔍 El Investigador | Análisis profundo · Verificación | RAG + SearXNG, contraste de fuentes |
| `explorador` | 🧭 El Explorador | Tendencias · Ideas · Discurso | SearXNG, razonamiento lateral |
| `arquitecto` | 💻 Arquitecto IT | Infraestructura · Código · Sistemas | RAG técnico, web, perfil del sistema |
| `heraldo` | 📣 El Heraldo | Marketing · Branding · Copy | Perfil de identidad, RAG estratégico |
| `cartografo` | 🗺️ El Cartógrafo | Visualización · Flujos JSON | Generación estructurada de grafos |
| `debate` | 🎙️ Junta de Expertos | Razonamiento multidisciplinar | Psicólogo + Fisio + Neurocientífico |

### Flujo de una Consulta

```
Usuario → POST /api/agent/query
           ↓
        Bridge Python (server.py)
           ↓
        1. Verificación de token
        2. Procesamiento de adjuntos (PDF, imágenes, código)
        3. Carga del perfil de usuario y contexto del cliente activo
        4. Búsqueda web (SearXNG) si el agente lo requiere
        5. RAG Semántico → Fragmentos Caveman relevantes
        6. Construcción del prompt final
        7. POST → llama-server (Puerto 8080)
        8. Guardado en disco + backup + benchmarks
           ↓
        Respuesta con métricas (tokens/s, duración)
```

---

## Sistema de Memoria: El Flujo del Engrama

Mercure implementa un sistema de memoria en cuatro capas que permite gestionar grandes volúmenes de conocimiento con mínima latencia.

### Capa 1: Protocolo Caveman (Compresión Semántica)

Comprime textos en un **70% de sus tokens originales** eliminando la gramática redundante y preservando únicamente hechos, relaciones y marcadores semánticos.

```
Original (38 tokens): "El paciente reporta que desde hace dos semanas 
experimenta una tensión severa en la zona lumbar que se irradia hacia 
la pierna derecha cuando permanece de pie durante largos períodos."

Caveman (12 tokens): "Px: tensión lumbar severa 2sem → irradiación 
pierna-D↑ bipedestación prolongada"
```

### Capa 2: Wiki Maestro (Índice Persistente)

Cada carpeta indexada genera un archivo `_wiki.md` con los resúmenes Caveman de todos sus documentos. Persiste entre sesiones; solo se actualiza cuando un archivo cambia (mtime tracking en SQLite).

### Capa 3: RAG Semántico (Búsqueda Vectorial)

El componente central de la v2.0. Usa `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers) para:

1. **Indexación**: Al escanear carpetas, genera embeddings para cada resumen Caveman → almacenados en `substrato.db`
2. **Búsqueda**: La pregunta del usuario se codifica en el mismo espacio vectorial → se recuperan los **8 fragmentos más relevantes** por similitud coseno
3. **Inyección quirúrgica**: Solo esos ~2000 tokens entran al prompt, en lugar de volcar toda la Wiki

**Impacto medido en producción:**

| Métrica | Antes del RAG | Con RAG Semántico |
|:--------|:--------------|:------------------|
| Tokens en prompt | 21,445 | ~2,000 |
| Tiempo de prefill | 64 segundos | 16 segundos |
| Reducción | — | **90% menos tokens · 75% menos espera** |

### Capa 4: Wiki Efímero (Memoria de Sesión)

Archivo `session.md` acumulado durante la sesión activa, compartido entre todos los agentes. Se trunca automáticamente a las últimas 5 interacciones para no saturar el contexto.

### Knowledge Substrate (`substrato.db`)

```sql
CREATE TABLE caveman_cache (
    file_path TEXT PRIMARY KEY,
    mtime     REAL,   -- Invalidación incremental por timestamp
    summary   TEXT,   -- Resumen Caveman comprimido
    embedding BLOB    -- Vector float32 para búsqueda semántica
);
```

---

## La Interfaz: Módulos

### 🌐 Nexus Hub
Pantalla de inicio con estado en tiempo real de todos los servicios del ecosistema.

### 🤖 Consola de Agentes
El centro de mando principal:
- Selección dinámica de agente con cambio en tiempo real
- Adjuntos: PDF (extracción automática), imágenes (multimodal), código
- Modo Sesión: memoria efímera compartida entre agentes
- Wiki LLM: gestión de carpetas indexadas
- Thinking Mode: razonamiento interno extendido
- Cancelación de generación en vuelo
- Métricas: tokens/s, duración, tokens totales

### 🎨 Neuro-Canvas
Lienzo visual (ReactFlow) con integración bidireccional con Obsidian. Los diagramas se guardan como `.canvas` nativos. El Cartógrafo puede convertir cualquier texto en un mapa de nodos.

### 🧪 Marketing Lab
Estación de trabajo de pantalla dividida: Consola (izquierda) + Neuro-Canvas (derecha).
Flujo óptimo: `Heraldo` → `Cartógrafo` → `Canvas`.

### 📄 Document Formatter
Renderizado GFM con soporte de tablas, exportación a PDF editorial y generación de artefactos HTML.

### 👥 Client Manager
Gestión de perfiles de cliente con historial de interacciones e inyección de contexto activo en todos los agentes.

### 📊 Benchmarks
Historial de rendimiento: tokens/s, duración y trazabilidad de consultas por agente y modelo.

---

## Despliegue

### Requisitos

| Componente | Mínimo | Recomendado |
|:-----------|:-------|:------------|
| **OS** | Linux | Nobara Linux |
| **RAM** | 16 GB | 32 GB |
| **VRAM** | 6 GB | 8 GB (RTX 3050+) |
| **Node.js** | v18+ | v20+ |
| **Python** | 3.10+ | 3.11+ |
| **CUDA** | 11.8 | 12.4+ |

### Inicio

```bash
# 1. Motor LLM (selección interactiva de modelo)
./scripts/llama-mercure-35b.sh

# 2. Ecosistema completo
./mercure_start.sh
```

### Variables de Entorno

```bash
MERCURE_TOKEN="tu_token_secreto"           # Autenticación interna
CAMS_BASE_PATH="/home/usuario/Documents/CAMS-Mercure"  # Bóveda de datos
SEARXNG_URL="http://127.0.0.1:8001/search" # Motor de búsqueda web
```

---

## Estructura del Proyecto

```
cams-mercure/
├── bridge/
│   ├── server.py          # Orquestador: agentes, endpoints, Ágora
│   ├── engine.py          # FederatedQueryEngine: RAG semántico v2
│   ├── llm_client.py      # Cliente HTTP para Llama.cpp
│   └── utils.py           # Seguridad de rutas
├── webapp/
│   ├── server.js          # API REST, Proxy, Orquestador UI
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── NexusHub.jsx
│           ├── MercureConsole.jsx
│           └── apps/
│               ├── AgentConsole.jsx
│               ├── VisualCanvas.jsx
│               ├── MarketingLab.jsx
│               ├── DocumentFormatter.jsx
│               ├── ClientManager.jsx
│               └── Benchmarks.jsx
├── scripts/
│   └── llama-mercure-35b.sh
├── mercure_start.sh
└── mercure_stop.sh
```

---

## Ecosistema Federado

### El Ágora Cuántica (v5.0)

Sistema de debate multi-agente con razonamiento en paralelo:

```
Fase 1: Pre-razonamiento paralelo (Hub + Satélites)
Fase 2: Maestro sintetiza → emite Dirección Maestra
Fase 3: N ciclos de refinamiento entre nodos
Fase 4: Síntesis final
```

### El Satélite (Raspberry Pi 500)
- **UMA Engine**: Análisis musical (14k+ temas indexados)
- **Agora Node**: LLM local para razonamiento satelital
- **Shadow / Stationary Mode**: Headless o modo DJ/Estudio

---

## Hoja de Ruta

### ✅ v2.0 — Era Semántica (Actual)
- Motor AtomicBot con soporte Gemma 4 + MTP
- RAG Semántico con embeddings vectoriales
- Reducción del 90% de tokens en el Bibliotecario
- Selector automático de motor por arquitectura
- Soporte multimodal (imágenes + PDF + código)
- Neuro-Canvas con exportación nativa a Obsidian

### 🚧 En Desarrollo
- **Caché de Prompt Persistente**: Eliminar tiempos de prefill
- **Chaining de Agentes**: Flujos multi-agente automáticos
- **Artesano**: Agente generador de dashboards HTML en tiempo real

### 🔭 Largo Plazo
- Conectores académicos (Google Scholar, PubMed, arXiv)
- Modo Incógnito (Zero-Trace)
- Widgets nativos KDE Plasma
- Extensión de navegador para captura de contexto
- Destilación Maestro-Alumno entre Hub y Satélites

---

## Filosofía de Diseño

**Local-First.** El dato nunca sale del hardware del usuario.

**Eficiencia sobre escala.** Un modelo de 26B bien configurado (MTP + MoE offloading + RAG quirúrgico) supera en utilidad práctica a un modelo de 70B mal orquestado.

**Modularidad radical.** Cada agente, protocolo y motor es independiente y extensible.

**La memoria como arquitectura.** Caveman + RAG Semántico permiten que un sistema de 8GB VRAM razone sobre gigabytes de conocimiento acumulado con latencia mínima.

---

*CAMS Mercure — Federated Agent System · Era Semántica · v2.0*
*"La inteligencia no está en el modelo. Está en cómo organizas lo que sabes."*
