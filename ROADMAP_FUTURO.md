# 🗺️ ROADMAP DE IMPLEMENTACIÓN: CAMS MERCURE

Este documento detalla las líneas estratégicas de desarrollo para las futuras versiones del ecosistema Mercure.

---

## 🏗️ 1. Visualizador de Artefactos (Frontend Dinámico)
- **Objetivo:** Permitir que los agentes generen y rendericen archivos HTML/CSS/JS en tiempo real.
- **Componentes:** 
    - Nuevo agente: **"El Artesano"** (Especializado en visualización estética).
    - Panel de previsualización (Iframe) en el `AgentConsole`.
    - Persistencia de dashboards de identidad y estados del sistema.

## 🔗 2. Automatización de Flujos (Chaining)
- **Objetivo:** Ejecutar secuencias multi-agente con un solo prompt.
- **Flujo Ejemplo:** `Bibliotecario` (Consulta RAG) → `Heraldo` (Destilación Estratégica) → `Cartógrafo` (Mapa Visual).
- **Lógica:** Implementar un "Orquestador" que gestione la salida de un agente como entrada del siguiente.

## 🔍 3. Investigación Académica Especializada
- **Objetivo:** Integrar fuentes de datos científicas y técnicas.
- **Motores:** Implementar conectores para Google Scholar, PubMed y arXiv.
- **Función:** Validar hipótesis clínicas y biomecánicas con literatura peer-reviewed de forma automática.

## 🕵️ 4. Modo Explorador Incógnito (Zero-Trace)
- **Objetivo:** Consultas rápidas y anónimas.
- **Características:** 
    - Sin memoria de sesión.
    - Sin indexación en la Wiki/Caveman.
    - Solo utiliza el `perfil/` básico como ancla de identidad.

## 🖥️ 5. Evolución a Sistema Operativo (Mercure OS)
- **Objetivo:** Integración profunda con el entorno de escritorio.
- **Hitos:**
    - Integración con KDE Plasma (Widgets nativos).
    - Extensión de navegador para captura de contexto directa.
    - Desktop autónomo dedicado exclusivamente a la gestión del conocimiento.

---

*“La revolución puede esperar un par de días, pero el azogue nunca deja de fluir.”*
