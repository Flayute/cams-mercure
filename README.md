# CAMS Neuro-Engram 🧠🦾

CAMS Neuro-Engram es un ecosistema RAG (Retrieval-Augmented Generation) de alto rendimiento diseñado para ejecutarse localmente. Utiliza una arquitectura federada para conectar su memoria personal en Obsidian con la potencia de los modelos de lenguaje modernos y la web en tiempo real.

## 🚀 La Tríada de Agentes (v1)

- **📚 El Bibliotecario:** Motor RAG orientado a la memoria longitudinal. Recupera y sintetiza conocimiento de múltiples vaults de Obsidian.
- **🔍 El Investigador:** Puente entre lo local y lo global. Realiza búsquedas proactivas en la web para complementar sus notas personales.
- **🧭 El Explorador:** Asistente ágil y "perfilado". Utiliza sus datos de usuario/hardware para dar respuestas rápidas sin cargar toda la biblioteca.
- **🎙️ Debate Socrático:** El modo más avanzado. Enfrenta a los agentes en un diálogo dialéctico (Web vs. Obsidian) para obtener la síntesis más refinada.

## 💻 Requisitos Técnicos (Benchmarked)

Este sistema ha sido optimizado para el siguiente stack "mínimo recomendado" con resultados fluidos:

- **GPU:** RTX 3060 (8GB VRAM) o superior.
- **Modelo Sugerido:** Qwen 3.5 9B (Quantization 1.4bpw ~7GB VRAM).
- **Rendimiento Esperado:** 
  - Prompt Eval: ~770 tokens/seg.
  - Generation: ~20 tokens/seg.

## 🛠️ Instalación y Setup

### 0. Motor de Inferencia (Core Engine)
El alma del sistema es **TurboQuant Plus**. Sin este motor de inferencia optimizado, no es posible alcanzar los tiempos de respuesta de milisegundos requeridos para el modo Debate.
- **Repositorio:** [TurboQuant Plus (TheTom)](https://github.com/TheTom/turboquant_plus)
- **Configuración:** Debe estar corriendo en el puerto **8081** con una API compatible con OpenAI.

### 1. El Puente (Bridge)
Requiere Python 3.10+ y las librerías de conexión.

```bash
cd bridge
pip install fastapi uvicorn requests ddgs
python server.py
```

### 2. La Webapp (Console)
Requiere Node.js y npm.

```bash
cd webapp
npm install
npm start
```

### 3. Integración con Obsidian
Para el **Mirror Mode**, asegúrese de que la ruta de su vault apunte a:
`/home/aorsi/Obsidian/RAG/`

El sistema generará automáticamente:
- `RESPONSE.md` (Bibliotecario)
- `INVESTIGATION.md` (Investigador)
- `EXPLORER.md` (Explorador)
- `DEBATE.md` (Socrático)

---
> [!TIP]
> **Modo Sesión:** Active el toggle en la consola para priorizar la "Espiral de Erikson" y el enfoque somático en sus consultas.

## 📄 Licencia
Privado / Personal. Readecuado para v1 por Alex Orsi.
