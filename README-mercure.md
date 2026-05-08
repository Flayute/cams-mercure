# 🌊 CAMS Mercure - Guía Completa

> **Mercure** es el sistema de comunicación en tiempo real que une al usuario con los agentes de IA de CAMS. Es el "sistema nervioso" que permite la interacción fluida, persistente y contextualizada con múltiples agentes especializados.

---

## 📌 ¿Qué es CAMS Mercure?

**CAMS Mercure** es un ecosistema de inteligencia artificial local diseñado para profesionales que requieren **soberanía absoluta sobre sus datos**. No es solo un chat con IA; es una herramienta de gestión de conocimiento y casos clínicos/legales que integra:

- **Búsqueda web en tiempo real** a través de motores de búsqueda privados
- **Memorias persistentes compartidas** entre sesiones
- **Junta de Expertos** multidisciplinar (Psicosomática, Fisioterapia Somática, Neurociencia)
- **Gestión de casos** con identidad única y contexto automático
- **Protocolo Caveman 2.0** para compresión semántica de alta fidelidad

---

## 🌊 ¿Qué es Mercure?

### El Concepto

**Mercure** (pronunciado "me-rk-er" o "mer-cure") es un protocolo de publicación-suscripción (PubSub) en tiempo real diseñado por la [European Space Agency (ESA)](https://mercuryspecifications.github.io/) para aplicaciones críticas de alto rendimiento. 

En el contexto de CAMS, **Mercure actúa como el sistema nervioso central** que:

1. **Difunde actualizaciones en tiempo real** desde el servidor a todos los clientes conectados
2. **Mantiene el contexto de la conversación** persistente entre agentes
3. **Sincroniza el estado del caso** entre diferentes componentes del sistema
4. **Permite la interacción fluida** entre el usuario y múltiples agentes simultáneamente

### Por qué Mercure es Crucial para CAMS

| Necesidad de CAMS | ¿Cómo lo resuelve Mercure? |
|---|---|
| Comunicación en tiempo real entre usuario y agentes | El servidor emite actualizaciones que llegan instantáneamente al frontend |
| Contexto persistente de sesiones | Los mensajes de Mercure mantienen el historial accesible |
| Múltiples agentes conectados | Un solo endpoint `/query` atiende peticiones concurrentes |
| Actualización dinámica del estado del caso | El servidor emite eventos cuando cambia el contexto |

---

## 🏗️ Arquitectura de CAMS Mercure

### Diagrama de Flujos

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │Mercure      │  │Mercure      │  │Mercure                   │ │
│  │ Console     │  │ Console    │  │ Console                  │ │
│  │(Agentes)    │  │(Explorador)│  │(Arquitecto)              │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│           \        |        /         \        /                 │
│            \       |       /           \      /                  │
│             \      |      /             \    /                   │
│              \     |      /               \  /                   │
│               \    |     /                  \/                   │
│                \   |     /                                       │
│                 \  |    /                                       │
│                  \ |   /                                        │
│                   \|  /                                         │
│                    \/                                          │
│              ┌─────────────────┐                               │
│              │Mercure Bridge   │  ←→  ⚡ LLM Server (8080)     │
│              │  (FastAPI)      │      │  Llama.cpp              │
│              │  :8000          │      │                          │
│              └────────┬────────┘      │                          │
│                       │              │                           │
│                       │              │                           │
│              ┌────────┴────────┐     │                          │
│              │ SearxNG         │     │                          │
│              │  :8001          │     │                          │
│              └─────────────────┘     │                          │
│                                     │                          │
│                          ┌──────────┴──────────┐               │
│                          │  Document Vault      │               │
│                          │  (Clientes, Backups) │               │
│                          └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes del Bridge (FastAPI)

El **Mercure Bridge** (`bridge/server.py`) es el corazón de la comunicación:

| Endpoint | Descripción |
|---|---|
| `POST /query` | Punto de entrada principal para consultas a los agentes |
| `POST /caveman/encode` | Compresión semántica de datos |
| `POST /caveman/decode` | Expansión de datos comprimidos |
| `POST /wiki/index` | Indexación de documentos del vault |

---

## 🎭 Los Agentes de CAMS Mercure

El sistema incluye **agentes especializados** que se activan según el contexto de la consulta:

### 🔬 Agentes Principales

| Agente | Rol | Descripción |
|---|---|---|
| 📚 **Bibliotecario** | Default | Responde consultas generales usando la Wiki Caveman local |
| 🎙️ **Junta de Expertos** | Análisis multidisciplinar | Psicosomática + Fisioterapia + Neurociencia |
| 🧭 **Explorador** | Navegación web | Busca en SearxNG con tono conversacional |
| 🔍 **Investigador** | Verificación | Contrasta conocimiento local con fuentes externas |
| 💻 **Arquitecto** | Diseño técnico | Resuelve problemas técnicos con "fricción cero" |
| 📣 **Heraldo** | Marketing | Estrategias de marca personal y promoción ética |

### 🔧 Agentes Especializados

| Agente | Rol | Descripción |
|---|---|---|
| 🧬 **Somatic Session Master** | Gestión de casos | Identidad única y contexto automático |
| 🧠 **Motor RAG** | Búsqueda aumentada | Contexto de documentos + LLM |
| 🦴 **Protocolo Caveman** | Compresión | Reduce tokens en 70% preservando hechos |

---

## 📂 Estructura del Vault

```
CAMS-Mercure/
├── /clientes/              # Historiales y perfiles de casos
│   ├── {client_id}/
│   │   ├── history.md     # Cronología del caso
│   │   ├── profile.json   # Perfil del paciente/cliente
│   │   └── ...
│   └── ...
├── /backups/               # Sesiones efímeras y copias de agentes
│   ├── session.md         # Wiki efímero de sesión
│   ├── debate.md          # Sesión de Junta de Expertos
│   └── ...
├── /models/                # LLMs locales (.gguf, .mmproj)
├── /substrate/             # Base de conocimiento profundo
├── /respuestas/            # Informes generados por agentes
├── /profile/               # Engramas de identidad del usuario
├── /respuestas/            # Informes de los agentes
├── /perfil/                # Engramas de identidad
├── /caveman/               # Índice comprimido de documentos
│   └── _wiki.md
└── /backups/
    └── session.md
```

---

## 🚀 Cómo Usar CAMS Mercure

### Paso 1: Iniciar el Sistema

```bash
# Otorgar permisos
chmod +x mercure_start.sh

# Iniciar todo el ecosistema
./mercure_start.sh
```

El sistema iniciará los siguientes servicios:

| Servicio | Puerto | Estado |
|---|---|---|
| LLM Server | 8080 | ⚡ Motor de inferencia |
| Mercure Bridge | 8000 | 🌊 Orquestador de agentes |
| Orquestador UI | 3001 | 🖥️ Interfaz Web |
| SearxNG | 8001 | 🔍 Motor de búsqueda |

### Paso 2: Acceder a la Interfaz

Navega a `http://localhost:3001` en tu navegador. La interfaz te permitirá:

- Crear nuevos casos (clientes)
- Activar casos existentes
- Interactuar con los agentes
- Gestionar el vault de documentos

### Paso 3: Realizar Consultas

#### Consulta Básica

```
En el cuadro de diálogo, escribe tu consulta y presiona Enter.
```

El sistema procesará la consulta según el agente predeterminado (**Bibliotecario**).

#### Consulta con Agente Específico

```
1. Selecciona el agente deseado en el menú desplegable
2. Ingresa tu consulta
3. El agente procesará y responderá
```

### Paso 4: Activar un Caso (Cliente)

```
1. Haz clic en "Crear Caso" o "Seleccionar Caso"
2. Proporciona un nombre identificativo único
3. El sistema genera un hash único y estructura de carpetas
4. Todos los mensajes del caso se guardan automáticamente
```

---

## 🔑 Conceptos Fundamentales de Mercure

### 1. **Somatic Session Master (Gestor de Casos)**

Cada caso tiene una **identidad única** basada en un hash criptográfico de su estado. Esto permite:

- **Contexto automático**: Al activar un caso, el LLM "absorbe" todo el historial
- **Persistencia**: Los datos sobreviven reinicios del sistema
- **Aislamiento**: Cada caso es completamente independiente

### 2. **Junta de Expertos**

Trés perspectivas analizan simultáneamente:

1. **Psicología Psicosomática**: Patrones emocionales, trauma, "Espiral de Erikson"
2. **Fisioterapia Somática**: Estructura, tejido, manifestación física
3. **Neurociencia**: Neuroquímica, plasticidad, sistema nervioso autónomo

```
🧠 ANÁLISIS PSICOSOMÁTICO
🦴 EVALUACIÓN SOMÁTICA  
🔬 SOPORTE NEUROCIENTÍFICO
🏛️ SÍNTESIS TRANSVERSAL
```

### 3. **Wiki Efímero de Sesión**

Memoria de corto plazo compartida entre agentes:

- **Duración limitada**: Se resetea entre sesiones para evitar contaminación cruzada
- **Contexto relevante**: Mantiene las últimas 5 interacciones
- **Difusión instantánea**: Todos los agentes tienen acceso inmediato

### 4. **Protocolo Caveman 2.0**

Compresión semántica de alta fidelidad:

```
REGLAS:
1. Quita gramática (artículos, preposiciones, conectores)
2. Pensamientos ATÓMICOS: 2-5 palabras por frase
3. Voz ACTIVA siempre
4. PRESERVAR: Números, fechas, nombres propios
5. NO cortesía ni relleno. Solo hechos.
```

**Reducción de tokens: 70%** sin perder información esencial.

### 5. **Exploración Invisible**

Búsqueda web privada a través de **SearxNG**:

- **Privacidad**: Ningún dato sale del entorno local
- **Contraste crítico**: "New Age" vs. ciencia rigurosa
- **Tono conversacional**: Respuestas elocuentes, no robóticas

---

## 🛠️ Configuración Avanzada

### Variables de Entorno del Bridge

```bash
export MERCURE_TOKEN="cambiame-por-token-seguro"
export MERCURE_HOST="0.0.0.0"
export MERCURE_PORT=8000
export SEARXNG_URL="http://127.0.0.1:8001/search"
export CAMS_BASE="/home/usuario/CAMS-Mercure"
```

### Seguridad

| Configuración | Valor Recomendado |
|---|---|
| Token de Acceso | Cambiar en `bridge/server.py` línea 16 |
| Puerto | `8000` (o cualquier disponible) |
| Host Binding | `0.0.0.0` para red local / `127.0.0.1` para localhost |

---

## 📊 Flujo de Una Consulta Típica

```
┌─────────────────┐
│  Usuario envía  │
│  consulta       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Bridge recibe  │
│  (FastAPI)      │
└────┬────────────┘
     │
     ├───────────► [Token Check] ──┐
     │                            │
     ▼                            ▼
┌─────────────────┐       ┌─────────────────┐
│  Cargar Contexto │◄─────│  Validar Token  │
│  (Caso/Perfil)  │       │                 │
└────┬────────────┘       └─────────────────┘
     │
     ▼
┌─────────────────┐
│  Generar Prompt │
│  con Agentes    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  LLM Server     │
│  (8080) procesa │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Emitir respuesta│
│  (Mercure)      │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Renderizar en  │
│  UI del usuario │
└─────────────────┘
```

---

## 🧪 Agentes Personalizados

El sistema permite crear agentes personalizados añadiendo handlers en `bridge/server.py`:

```python
elif request.agent == "mi_agente_personalizado":
    # Lógica personalizada
    ...
```

---

## 🔍 Agentes del Sistema

El sistema incluye agentes especializados para diferentes contextos:

### 🔬 Agentes de Consulta

| Agente | Descripción |
|---|---|
| 📚 Bibliotecario | Default, usa Wiki Caveman local |
| 🎙️ Junta de Expertos | Análisis multidisciplinar |
| 🧭 Explorador | Búsqueda web conversacional |
| 🔍 Investigador | Verificación cruzada |
| 💻 Arquitecto | Solución técnica |
| 📣 Heraldo | Estrategia de marca |

### 🧬 Agentes Especiales

| Agente | Descripción |
|---|---|
| 🧬 Somatic Session Master | Gestión de casos |
| 🧠 Motor RAG | Búsqueda aumentada |
| 🦴 Protocolo Caveman | Compresión semántica |

---

## 📚 Referencias Externas

- [Mercure Protocol Specification](https://mercuryspecifications.github.io/) - La especificación original de la ESA
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Framework del bridge
- [SearxNG](https://github.com/searxng/searxng) - Motor de búsqueda privado

---

## 🤝 Contribución

CAMS Mercure es un proyecto de la **Unidad de Inteligencia CAMS**.

> *"El conocimiento es el único bien que crece cuando se comparte, siempre que mantengas el control sobre el engrama."*

---

**Desarrollado por la Unidad de Inteligencia CAMS**

**CAMS** = **C**ognitiva | **A**utónoma | **M**ercure | **S**omática

---

## 📦 Requisitos del Sistema

| Componente | Requisito |
|---|---|
| CPU | 4+ núcleos |
| RAM | 16GB+ |
| GPU | 8GB VRAM recomendado (Llama.cpp) |
| Almacenamiento | 50GB+ para modelos y vault |
| SO | Linux recomendado (Nobara Linux) |

---

## 🔄 Actualizaciones

Para actualizar los modelos:

```bash
# Descargar nuevos modelos
./scripts/model_auditor.py download

# Actualizar la base de conocimiento
./scripts/update_knowledge_base.sh
```

---

## 📝 Changelog

### v2.0.0 (Actual)
- 🔥 Protocolo Caveman 2.0 con reducción 70% de tokens
- 🎭 Agentes especializados con identidad única
- 🧠 Wiki Efímero de Sesión compartido
- 🌐 Exploración invisible vía SearxNG
- 🔐 Soberanía de datos absoluta (100% local)

### v1.0.0
- 🎉 Lanzamiento inicial de CAMS Mercure

---

*Última actualización: 2026-04-28*