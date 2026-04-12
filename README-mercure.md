# CAMS Mercure 🧠⚡

> *El mensajero entre tu conocimiento y el mundo.*

---

CAMS Mercure no es un chat con tu IA. No es una memoria. Es un espacio de aprendizaje, investigación y potenciación de la mente expandida — un lugar de encuentro entre tus notas, tu filosofía, tu hardware y tu propia soberanía intelectual.

Todo corre en tu dispositivo. Ningún dato sale de él.

---

## Qué es

Un espacio de trabajo donde convergen cuatro elementos:

- **Tus notas** — todo lo que has escrito, investigado y documentado en Obsidian
- **Internet** — fuentes externas consultadas en tiempo real
- **Tu hardware** — inferencia local, privada, sin APIs de pago
- **Tu criterio** — tú decides qué entra en tu base de conocimiento y qué no

La interfaz es un único cuadro de diálogo con cuatro modos. Sin configuración compleja. Sin fricciones.

---

## Los cuatro modos

### 📚 Bibliotecario
Consulta tu conocimiento acumulado. El Bibliotecario conoce todo lo que tienes en tus vaults de Obsidian y sintetiza respuestas desde ahí. Tu memoria personal, accesible en lenguaje natural.

Técnicamente: RAG longitudinal sobre wikis federadas con ingestión incremental por hash MD5. Solo procesa lo que ha cambiado.

### 🔍 Investigador
Cruza tus notas con búsquedas en internet en tiempo real. Ideal para contrastar lo que ya sabes con lo que está pasando ahora, o para enriquecer una idea propia con fuentes externas.

Técnicamente: Combina el contexto comprimido de tus vaults con scraping de búsqueda en tiempo real antes de generar la respuesta.

### 🧭 Explorador
Respuesta rápida, sin cargar la biblioteca. El Explorador carga tu perfil de usuario y contexto de hardware para dar respuestas directas y personalizadas sin el peso del RAG completo.

Técnicamente: Carga solo `perfil-de-usuario.md` y `perfil-de-hardware.md`. Latencia mínima, contexto máximo sobre ti.

### ⚔️ Debate
El modo más avanzado. El Bibliotecario y el Investigador debaten entre sí — tu conocimiento local contra el conocimiento global — y sintetizan una conclusión. Una conversación filosófica entre dos perspectivas para llegar a síntesis que ninguna de las dos habría generado sola.

Técnicamente: Cuatro llamadas paralelas al modelo. Cada agente genera su argumento, luego un árbitro sintetiza. El `thought_ultra` de cada agente queda auditado en comentario HTML dentro del output — visible para el desarrollador, invisible para el usuario.

---

## El Ágora *(experimental)*

¿Tienes un móvil que ya no usas? ¿Una Raspberry Pi? ¿Un ordenador viejo pero potente?

El modo Ágora convierte cualquier dispositivo de tu red en un nodo activo. En lugar de un solo modelo en un solo dispositivo, múltiples modelos de distinto tamaño debaten entre sí a través de Tailscale. El conocimiento circula, se refina y vuelve al centro.

La gracia del sistema está precisamente en la asimetría. Un modelo con todo el contexto y uno sin ninguno no producen la misma respuesta que cualquiera de los dos por separado. A veces la síntesis más útil viene del que menos sabe — porque no ha descartado lo obvio.

*Es un experimento en curso. Los resultados son prometedores.*

---

## Arquitectura

```
WebApp (React) ←→ Orquestador (Node.js)
                        ↓
               Agente Bridge (Python)
               ↙              ↘
    LLM local               Búsqueda web
    (TurboQuant+)           (tiempo real)
               ↘              ↙
            Vaults Obsidian
            (wikis federadas)
```

**Orquestador (Node.js)**: Sistema nervioso central. Gestiona el ciclo de vida de los procesos LLM, la persistencia en Obsidian y la sincronización Tailscale entre nodos.

**Agente Bridge (Python)**: Lógica RAG, scraping de búsqueda y compresión semántica. Aquí vive la inteligencia del sistema.

**TurboQuant+**: Motor de inferencia. Compresión avanzada de caché KV que permite contextos de 100k tokens en hardware consumer.

---

## Protocolo de compresión semántica

Para maximizar la densidad de información en el contexto, Mercure utiliza compresión Caveman en la capa interna de razonamiento.

El modelo razona en telegráfico — nodos, relaciones, operadores lógicos (`→`, `!`, `⊘`). El output que llega al usuario es lenguaje natural. La capa de compresión es invisible, auditable, y reduce el contexto entre un 60-75% sin pérdida de información clínica relevante.

```
<thought_ultra>
[Razonamiento comprimido — solo el desarrollador lo ve]
</thought_ultra>

<output>
[Respuesta en lenguaje natural — lo que llega al usuario]
</output>
```

---

## Rendimiento (servidor maestro)

Benchmarks en RTX 3050 8GB — Qwen 9B:

| Métrica | Valor |
|---|---|
| Prompt evaluation | ~1000 tokens/seg |
| Generación | ~20–42 tokens/seg |
| Contexto activo | 80k tokens |
| Modo Debate (4 agentes paralelos) | ✅ estable |

---

## Setup

```bash
# 1. Motor de inferencia (TurboQuant+, puerto 8081)
bash llama-turbo-server.sh

# 2. Agente bridge
cd bridge && pip install -r requirements.txt && python server.py

# 3. Interfaz
cd webapp && npm install && npm start
```

Para el modo Ágora, conecta los dispositivos satélite a tu red Tailscale:
```bash
./scripts/setup_satellite.sh
```

El script detecta el sistema (Termux/Linux) y configura el nodo automáticamente.

**Outputs generados automáticamente en Obsidian:**
- `RESPONSE.md` — Bibliotecario
- `INVESTIGATION.md` — Investigador  
- `EXPLORER.md` — Explorador
- `DEBATE.md` — Debate socrático

---

## Créditos

- [TheTom/turboquant_plus](https://github.com/TheTom/turboquant_plus) — motor de inferencia
- [Andrej Karpathy — LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — arquitectura de conocimiento acumulativo
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) — protocolo de compresión semántica

---

*CAMS Mercure es un proyecto personal en desarrollo activo.*  
*Licencia: Privada.*
