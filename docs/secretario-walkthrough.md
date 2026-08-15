# Reconstrucción de Estado: Agente "Secretario" & Arquitectura

## 1. El Objetivo
Crear un asistente administrativo ("El Secretario") basado en **Hermes Agent**, independiente del orquestador central (CAMS Mercure) pero con capacidad de puente hacia sus agentes (Bibliotecario/Debate). 
- **Rol:** Gestión administrativa, agenda, recordatorios y respuestas a pacientes. Sin intervención clínica.
- **Identidad:** "Secretaria virtual de una consulta de psicología". Tono profesional/cercano.
- **Límites:** No da diagnósticos ni tratamientos. Si un paciente busca ayuda emocional, redirige al psicólogo (Alex Orsi).

---

## 2. Arquitectura Técnica Actual

### Hardware Base (Acer Desktop)
- **Sistema:** Nobara Linux (Fedora base). 
- **CPU:** Intel i5-12400F.
- **VRAM/RAM:** RTX 3050 OEM 8GB / 16GB RAM + zram swap.
- **Acceso Remoto:** Headless (sin sesión gráfica activa en el desktop actualmente). Acceso vía SSH/Termux/Termius usando Tailscale. NoMachine/Sunshine instalados pero inactivos por falta de GUI local.

### Software & Modelos
- **Modelo "Rey": Qwen 3.6 35B A3B** (local, llama.cpp). Para tareas complejas y agentic.
- **Modelo Flagship Mercure: Nex-N2-mini-Q4_K_M.gguf**.
- **Framework:** Hermes Agent (con perfil independiente `secretario-psicologo` en preparación).
- **Gateway:** Telegram conectado (bot activo, mensajes entrantes/salientes).

---

## 3. Funcionalidades Implementadas y Planificadas

### Fase 1: Operaciones Básicas (Actuales)
1. **Briefing Diario Automático**: Cronjob configurado para las 09:00h (L-V). El agente lee `agenda.md` y `tareas.md`, genera un resumen y lo envía por Telegram ("¿Qué tienes en mente hoy?").
2. **Gestión de Agenda Básica**: Creación de citas vía chat. Uso de pseudónimos (`PACIENTE-0XX`) para privacidad.

### Fase 2: Puente a MERCURE (Roadmap)
- El secretario debe tener capacidad de invocar al `bibliotecario` o `debate` mediante curl hacia el endpoint local (`localhost:8000/api/agent/query`).
- **Uso:** Cuando un paciente reporta algo complejo, el secretario prepara la consulta y pasa el query a los expertos internos.

### Fase 3: Ecosistema Multi-dispositivo (Termux/Automate)
- Control del secretary desde móvil/tablet vía SSH/Tailscale.
- Automatizaciones con Automate para triggers locales (ej: añadir una cita al calendario del PC remotamente).

---

## 4. Seguridad y Privacidad
- **Archivos:** Markdown plano en bóveda compartida (`~/Documents/CAMS-Mercure`). 
- **Datos Clínicos vs. Administrativos:** Separación estricta. El secretario solo ve lo administrativo.
- **Emergencias:** Protocolo claro para crisis (si hay riesgo de suicidio/auto-daño, contactar servicios de emergencia/familiares, no intervenir).

---

## 5. Notas Técnicas Recientes
- Drivers Nvidia: Versión experimental (595.x) debido a búsqueda constante del "último del último".
- zram: Intercambio en RAM comprimida; monitorear rendimiento bajo carga pesada.