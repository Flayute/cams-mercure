# Propuesta: Agente "Secretario" (Hermes Agent) - Fase 1

## Visión General
Un asistente administrativo basado en **Hermes Agent**, diseñado para soportar la gestión de una consulta de psicología.
- **Independiente** del orquestador interno de CAMS Mercure, pero con puente hacia sus agentes (Bibliotecario/Debate).
- **Portátil**: Ejecutado vía Hermes + Termux en dispositivos móviles (Samsung S25/Tablet) conectados SSH/Tailscale al PC principal.
- **Comunicación**: A través de Telegram y Terminal remota.

---

## Arquitectura Técnica (Fase 1)
- **Backend**: Hermes Agent (Perfil independiente `secretario-psicologo`).
- **Modelo Local**: Nex-N2-mini-Q4_K_M.gguf o Qwen3.5-9B vía Custom Provider (llama.cpp).
- **Frontend/Comms**: Telegram Bot (Gateway configurado y conectado) + SSH/Termux.
- **Almacenamiento**: Markdown plano (`agenda.md`, `tareas.md`) en bóveda compartida (`~/Documents/CAMS-Mercure`).

---

## Funcionalidades Configuradas
1. **Briefing Diario Automático**: Cronjob diario (09:00h) que lee agenda + tareas y envía resumen por Telegram.
2. **Gestión de Agenda Básica**: Creación de citas y recordatorios vía chat.
3. **Mensajería**: Borradores automáticos de confirmación para pacientes.

---

## Integraciones Futuras (Roadmap)
- **Puente MERCURE**: Envío de queries al Bibliotecario/Debate mediante curl (`localhost:8000`).
- **Ecosistema Multi-dispositivo**: Control vía Automate + Termux (SSH reverso).
- **Agente "Cuerpo" (Somático)**: Diario diario de tensión corporal y posturas (sincronizado con el enfoque somático).

---

## Privacidad y Seguridad
- Pseudónimos por defecto (`PACIENTE-023`).
- Separación explícita entre datos administrativos y clínicos.
- Revisión humana obligatoria antes de envíos.
