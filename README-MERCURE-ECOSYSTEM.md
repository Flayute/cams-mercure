# 🏛️ CAMS Mercure Ecosystem: The Transversal Hub

> "Mercure is no longer just a console; it is the nervous system of the CAMS network."

## 1. Vision & Philosophy (Inspired by Hermes)
The **Mercure Ecosystem** transforms from a reactive query system into a **Proactive Agentic Hub**. Taking inspiration from the **Hermes** framework, Mercure acts as the "Messenger and Orchestrator" between all local workflows.

### Core Principles:
*   **Transversality:** Mercure sits at the center, connecting Pipelines, Monitors, and UMA modules.
*   **Background Autonomy:** Agents monitor the ecosystem and suggest actions.
*   **Shared Memory (The Engram):** A single source of truth (Caveman RAG) that spans across all `/home/aorsi/CAMS/` projects.

---

## 2. The Ecosystem Map
| Component | Hardware | Role | Integration Goal |
| :--- | :--- | :--- | :--- |
| **CAMS Nexus Hub** | **Acer Nitro 50** | **The Entry** | Modern "Trio" interface for ecosystem entry. |
| **Cams-Mercure** | **Acer Nitro 50** | **The Hub** | Central logic (Día), Agent Bridge, and RAG. |
| **Nexus Control** | **Acer / RPi** | **The Eye** | Real-time monitor of nodes and hardware modes. |
| **UMA-Mercure** | **RPi 500** | **The Core** | Music-specialist logic and library (Noche). |
| **Hermes Skills** | **Acer Hub** | **The Muscle** | Executable capabilities for agents and user. |

---

## 3. Architecture of the "Nerve Center"

### A. The Presentation Layer (Nexus Hub)
*   **Modo Día:** Access to CAMS therapy and reasoning.
*   **Nexus:** Real-time dashboard for ecosystem health and remote SSH execution.
*   **Modo Noche:** Direct link to the UMA-Mercure music satellite.

### B. The Skill Layer (Hermes)
Located in `/home/aorsi/CAMS/cams-mercure/skills/`.
Each skill is a modular script defined in `skills.json`.
*   **pi_monitor:** Remote audit of RPi 500 (Temp, Mode, IA status).
*   **caveman_reindex:** Transversal re-indexing of the RAG brain.
*   **system_audit:** Local health check for the Acer Hub.

---

## 4. Roadmap: The "Hermes" Phase

### Phase 1: Context Consolidation (COMPLETED)
*   [x] **Nexus Hub:** Deploy the three-pillar landing page.
*   [x] **Satellite Sync:** Implement real-time ping and monitor for RPi 500.
*   [x] **Hybrid Node Detection:** Automatic Shadow/Stationary status reporting.

### Phase 2: Proactive Autonomy (The Messenger)
*   [ ] **Skill Expansion:** Create sync skills for Obsidian <-> RPi notes.
*   [ ] **Automated Reporting:** Generate "Daily Ingest Reports" from RPi findings.
*   [ ] **Agentic Tool-Use:** Enable agents to suggest and run skills from the console.

---

## 5. Control & Security
*   **Port 3001:** The official Mercure Bridge (Python) on Acer.
*   **Port 8000:** The UMA-Mercure API on Raspberry Pi.
*   **SSH Tunnel:** Passwordless link via `id_mercure` for autonomous orchestration.

---
*Last Updated: 2026-05-01*  
*Status: Hermes Foundations Deployed*
