# 🧪 CAMS Mercure — Marketing Lab

> Módulo de diseño estratégico visual para campañas y comunicación.  
> Acceso: `/marketing` desde el Nexus Hub.

---

## ¿Qué es el Marketing Lab?

El **Marketing Lab** es una estación de trabajo de pantalla dividida (split-screen) diseñada para crear, refinar y visualizar estrategias de marketing en tiempo real, sin fricciones técnicas.

Combina tres piezas clave del ecosistema Mercure en una sola vista:

| Componente | Ubicación | Función |
|---|---|---|
| **Consola de Agentes** (modo limpio) | Panel izquierdo | Chat directo con los agentes especializados |
| **Neuro-Canvas** (ReactFlow) | Panel derecho | Lienzo visual de nodos y conexiones |
| **Motor de Proyección** | Bridge interno | Convierte texto en estructura visual JSON |

---

## Los Agentes del Lab

El Lab tiene acceso a todos los agentes de Mercure, pero los más relevantes para el flujo de marketing son:

### 📣 El Heraldo (`heraldo`)
**Especialidad:** Marketing Psicológico, Branding Personal y Comunicación Ética.

Su función es generar estrategias, copies, "ganchos" narrativos y campañas. **No escribe código.** Es un creativo puro.

> ⚠️ **Importante:** No pedirle JSON ni configuraciones técnicas. Para eso existe el Cartógrafo.

### 🗺️ El Cartógrafo Visual (`cartografo`) — _NUEVO_
**Especialidad:** Traducción de estrategia a estructura visual JSON para el Neuro-Canvas.

Su `system prompt` está diseñado para devolver **únicamente** un bloque JSON válido con la estructura de nodos y conexiones para ReactFlow. No hace saludos, no da explicaciones.

**Estructura de respuesta esperada:**
```json
{
  "nodes": [
    {
      "id": "1",
      "type": "agentNode",
      "data": {
        "label": "Título del paso",
        "agent": "heraldo",
        "content": "Descripción del nodo",
        "icon": "📣"
      },
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}
```

**Agentes permitidos en nodos:** `heraldo`, `arquitecto`, `investigador`, `bibliotecario`, `debate`.

### 💻 El Arquitecto IT (`arquitecto`)
**Especialidad:** Implementación técnica. Útil si en el Lab quieres ir directo de la estrategia al código de automatización, scripts o sistemas.

### 🎙️ Junta de Expertos (`debate`)
**Especialidad:** Razonamiento colaborativo multi-agente. El agente por defecto al abrir el Lab.

---

## Flujo de Trabajo Recomendado

```
1. Abre el Marketing Lab desde el Nexus Hub (botón ámbar)

2. [Heraldo] → Selecciona "📣 HER" y pídele que diseñe la estrategia:
   "Diseña una estrategia de lanzamiento para [producto/servicio]"

3. [Cartógrafo] → Cambia a "🗺️ CAR" y pégale la estrategia del Heraldo:
   "Convierte esta estrategia en un flujo React Flow: [pega aquí]"
   → Devolverá un JSON puro.

4. Copia el JSON y úsalo en el botón "Proyectar al Canvas" (📡)
   → Aparecerá el diagrama en el Neuro-Canvas derecho.

5. [Opcional] En el Canvas puedes editar los nodos, moverlos y añadir conexiones
   manualmente con el editor visual.
```

---

## Interfaz: Modo Limpio (`hideSidebar`)

Cuando se abre el Lab, la consola de agentes entra en **modo limpio** (`hideSidebar={true}`).

Esto significa que desaparecen todos los controles técnicos:
- ❌ Estado del servidor LLM/Bridge
- ❌ Selector de modelo (Llama 3, etc.)
- ❌ Tamaño de contexto (tokens)
- ❌ Botones de Encender/Apagar, Wiki, DFlash

Solo quedan:
- ✅ Selector de Agente (🗺️ CAR, 📣 HER, etc.)
- ✅ Selector de Caso Clínico
- ✅ El chat principal

---

## Gestión de Estado Multi-Agente

Cada agente mantiene su propia memoria de conversación independiente durante la sesión. Cambiar del Heraldo al Cartógrafo **no borra lo que dijo el Heraldo**. Al volver, la respuesta anterior sigue ahí.

```javascript
// Estado en MarketingLab.jsx
const [agentStates, setAgentStates] = useState({
    heraldo:    { response: "", lastQuery: "", metrics: null },
    cartografo: { response: "", lastQuery: "", metrics: null },
    debate:     { response: "", lastQuery: "", metrics: null },
    // ...resto de agentes
});
```

---

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `bridge/server.py` | Añadido agente `cartografo` con system prompt de JSON estricto |
| `bridge/llm_client.py` | Timeout elevado de 5 → 15 minutos |
| `webapp/server.js` | Timeouts elevados de 5-10 → 15 minutos |
| `webapp/src/components/apps/MarketingLab.jsx` | Estado multi-agente, `setAgent` conectado |
| `webapp/src/components/MercureConsole.jsx` | Casillero de memoria para `cartografo` añadido |
| `webapp/src/components/apps/AgentConsole.jsx` | Modo `hideSidebar` condicional, selector en 2 filas |
| `webapp/src/index.css` | `flex-wrap` en `.console-controls` |

---

## Consideraciones Técnicas

- **Timeout general:** 15 minutos (900s) en toda la cadena.
- **Timeout de búsqueda web:** Sigue en 7 segundos (intencional, para no bloquear si SearXNG no responde).
- **Persistencia del Canvas:** Los flujos se guardan como archivos `.neuro` en `~/Documents/CAMS-Mercure/canvases/`.
- **El Cartógrafo no usa perfil de usuario** (a diferencia del resto de agentes), ya que su respuesta debe ser JSON puro sin contaminación contextual.
