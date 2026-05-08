import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import crypto from 'crypto';
import { spawn, exec, execSync } from 'child_process';
import cron from 'node-cron';
import { notifyAllStudents, notifyDevice } from './notifications.js';

const app = express();
const PORT = 3001;

// --- CONFIGURACIÓN BASE DE EXPRESS ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Utilidad para abrir selector de carpetas nativo (Linux)
const pickDirectory = () => {
    return new Promise((resolve) => {
        // Intentar zenity primero, luego kdialog
        exec('zenity --file-selection --directory --title="Seleccionar Carpeta para Mercure"', (err, stdout) => {
            if (!err && stdout) return resolve(stdout.trim());
            exec('kdialog --getexistingdirectory .', (err2, stdout2) => {
                if (!err2 && stdout2) return resolve(stdout2.trim());
                resolve(null);
            });
        });
    });
};

const pickFile = () => {
    return new Promise((resolve) => {
        exec('zenity --file-selection --title="Seleccionar Archivo para Mercure" --file-filter="*.md *.txt *.docx *.pdf"', (err, stdout) => {
            if (!err && stdout) return resolve(stdout.trim());
            exec('kdialog --getopenfilename .', (err2, stdout2) => {
                if (!err2 && stdout2) return resolve(stdout2.trim());
                resolve(null);
            });
        });
    });
};

// Cargar configuración de nodos (v3)
const nodesConfig = JSON.parse(fs.readFileSync(path.join(path.resolve(), 'nodes.json'), 'utf8'));
// Configuración de Rutas (CAMS Mercure)
const HOME = os.homedir();
const BASE_PATH = process.env.CAMS_BASE_PATH || path.join(HOME, 'Documents', 'CAMS-Mercure');
const BLOG_PATH = BASE_PATH;
const AGORA_LOGS_PATH = path.join(BASE_PATH, 'agoras');
const ATTACH_PATH = path.join(BASE_PATH, 'recursos');
const SAVED_RESP_PATH = path.join(BASE_PATH, 'respuestas');
const CANVAS_PATH = path.join(BASE_PATH, 'canvases');
const BACKUP_PATH = path.join(BASE_PATH, 'backups'); // Backup silencioso por modo
const WIKI_INDEX_PATH = path.join(BASE_PATH, 'wiki-index.json'); // Carpetas escaneadas
const BENCHMARKS_PATH = path.join(BACKUP_PATH, 'benchmarks.json');
const MODELS_PATH = path.join(BASE_PATH, 'models');
const CLIENTES_PATH = path.join(BASE_PATH, 'clientes');
const CAMS_BRIDGE_URL = 'http://localhost:8000';
const MERCURE_TOKEN = process.env.MERCURE_TOKEN || "cambiame-por-token-seguro";

const SUBSTRATE_DIR = path.join(BASE_PATH, 'substrate');

// Asegurar que las carpetas base existen al arrancar
[AGORA_LOGS_PATH, ATTACH_PATH, SAVED_RESP_PATH, BACKUP_PATH, MODELS_PATH, CLIENTES_PATH, SUBSTRATE_DIR, CANVAS_PATH].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Registro de controladores de aborto para peticiones activas
const activeAbortControllers = new Map();
let activeClientSession = null; // ID del cliente activo en la sesión actual

const TOPICS = [
    "Actualidad científica y avances en IA",
    "Filosofía, transhumanismo y conciencia digital",
    "Análisis de geopolítica y economía global",
    "Ética en la era de los agentes autónomos",
    "Exploración del Engrama Neuronal y Memoria Digital"
];

// --- PLANIFICACIÓN (CAMS v3) ---

// Ágora Diaria (10:00 AM)
// cron.schedule('0 10 * * *', async () => {
//     const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
//     console.log(`[Planificador] Iniciando Ágora sobre: ${topic}`);
//     await notifyAllStudents(nodesConfig.nodes, `🏛️ El Ágora comenzará en 5 min. Tema: ${topic}`);
//     
//     setTimeout(() => {
//         startAgora(topic);
//     }, 5 * 60 * 1000);
// });

// Reporte Semanal (Domingos 23:00)
// cron.schedule('0 23 * * 0', async () => {
//     console.log("[Planificador] Generando síntesis semanal de aprendizaje...");
//     try {
//         const files = fs.readdirSync(AGORA_LOGS_PATH).filter(f => f.endsWith('.md'));
//         let synthesis = `# 📊 Síntesis Semanal de Aprendizaje Federado\n\n`;
//         files.forEach(f => {
//             const content = fs.readFileSync(path.join(AGORA_LOGS_PATH, f), 'utf8');
//             synthesis += `## Resumen de: ${f}\n${content.substring(0, 500)}...\n\n`;
//         });
//         fs.writeFileSync(path.join(BLOG_PATH, '03-aprendizaje-federado/reporte-semanal.md'), synthesis);
//         await notifyDevice(nodesConfig.nodes[0].kde_id, "✅ Reporte semanal generado en Obsidian.");
//     } catch (e) {
//         console.error("Error en reporte semanal:", e.message);
//     }
// });

// Learning Bridge: Destilación Maestro-Alumno (Cada 4 horas)
// cron.schedule('0 */4 * * *', async () => {
//     const activeNodes = nodesConfig.nodes.filter(n => n.ip && n.ip !== "100.X.Y.Z");
//     if (activeNodes.length === 0) return;
//     
//     const student = activeNodes[Math.floor(Math.random() * activeNodes.length)];
//     console.log(`[Learning Bridge] Iniciando sesión proactiva para ${student.name}...`);
//     
//     try {
//         const questResp = await axios.post(`http://${student.ip}:8080/v1/chat/completions`, {
//             model: "student",
//             messages: [{ role: "user", content: "Genera una duda compleja sobre el Engrama Neuronal para consultarle al Maestro." }]
//         });
//         
//         const question = questResp.data.choices[0].message.content;
//         const answer = await axios.post(CAMS_BRIDGE_URL + "/query", { 
//             query: question, 
//             agent: "bibliotecario",
//             token: MERCURE_TOKEN
//         });
//         
//         const log = `### Destilación: ${student.name}\n**Pregunta:** ${question}\n**Respuesta Maestro:** ${answer.data.response}\n\n`;
//         fs.appendFileSync(path.join(BLOG_PATH, '03-aprendizaje-federado/distilacion.md'), log);
//     } catch (e) {
//         console.warn(`[Learning Bridge] Nodo ${student.name} no disponible.`);
//     }
// });

app.post('/api/agora/save-note', (req, res) => {
    try {
        const latestFile = fs.readdirSync(AGORA_LOGS_PATH)
            .filter(f => f.startsWith('AGORA_'))
            .sort().reverse()[0];

        if (!latestFile) return res.status(404).json({ error: "No hay sesiones recientes." });

        const content = fs.readFileSync(path.join(AGORA_LOGS_PATH, latestFile), 'utf8');
        const targetPath = path.join(SAVED_RESP_PATH, 'respuesta agora.md');

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content);

        console.log(`[Ágora] Nota guardada: ${targetPath}`);
        res.json({ status: "success", path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/system/pick-directory', async (req, res) => {
    console.log("[Sistema] Solicitando selección de directorio nativo...");
    const selectedPath = await pickDirectory();
    if (selectedPath) {
        res.json({ path: selectedPath });
    } else {
        res.status(400).json({ error: "Selección cancelada o fallida" });
    }
});

app.get('/api/system/pick-file', async (req, res) => {
    console.log("[Sistema] Solicitando selección de archivo nativo...");
    const selectedPath = await pickFile();
    if (selectedPath) {
        res.json({ path: selectedPath });
    } else {
        res.status(400).json({ error: "Selección cancelada o fallida" });
    }
});

app.post('/api/system/read-file', (req, res) => {
    let { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Ruta no válida' });

    // 1. Limpieza extrema: Decodificar, quitar prefijos y carácteres no imprimibles
    let cleanedPath = decodeURIComponent(filePath.trim());
    cleanedPath = cleanedPath.replace(/^file:\/\//, '');
    cleanedPath = cleanedPath.replace(/[\x00-\x1F\x7F-\x9F]/g, ""); // Quitar carácteres de control/ocultos

    // 2. Expandir tilde
    const resolved = cleanedPath.replace(/^~/, HOME);

    console.log(`[Sistema] Ruta Final: "${resolved}"`);

    if (!fs.existsSync(resolved)) {
        console.error(`[Sistema] NO EXISTE: "${resolved}"`);
        return res.status(404).json({ error: `Archivo no encontrado en: ${resolved}` });
    }

    try {
        const content = fs.readFileSync(resolved, 'utf8');
        res.json({ content });
    } catch (e) {
        console.error(`[Sistema] Error de lectura: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/system/write-file', (req, res) => {
    let { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Ruta no válida' });

    let cleanedPath = decodeURIComponent(filePath.trim());
    cleanedPath = cleanedPath.replace(/^file:\/\//, '');
    const resolved = cleanedPath.replace(/^~/, HOME);

    try {
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content, 'utf8');
        res.json({ status: 'success' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/wiki/add-file', (req, res) => {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "Ruta de archivo no proporcionada" });

    try {
        let index = { folders: [], files: [] };
        if (fs.existsSync(WIKI_INDEX_PATH)) {
            index = JSON.parse(fs.readFileSync(WIKI_INDEX_PATH, 'utf8'));
        }
        if (!index.files) index.files = [];

        // Evitar duplicados
        index.files = index.files.filter(f => f.path !== filePath);
        index.files.push({
            path: filePath,
            scanned: new Date().toISOString()
        });

        fs.writeFileSync(WIKI_INDEX_PATH, JSON.stringify(index, null, 2));
        console.log(`[Wiki] Archivo añadido manualmente: ${filePath}`);
        res.json({ status: "success", file: filePath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/benchmarks', (req, res) => {
    try {
        if (!fs.existsSync(BENCHMARKS_PATH)) return res.json([]);
        const data = fs.readFileSync(BENCHMARKS_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.json([]);
    }
});

app.post('/api/agent/cancel', (req, res) => {
    const { sessionId } = req.body;
    const controller = activeAbortControllers.get(sessionId || 'default');
    if (controller) {
        controller.abort();
        activeAbortControllers.delete(sessionId || 'default');
        console.log(`[Agente] Petición cancelada: ${sessionId || 'default'}`);
        res.json({ status: "cancelled" });
    } else {
        res.status(404).json({ error: "No hay peticiones activas para cancelar." });
    }
});

// ============================================================
// ÁGORA CUÁNTICA v5.0 — Razonamiento Paralelo + Ciclos
// Flujo: Pre-razonamiento paralelo → Maestro sintetiza →
//        N ciclos de refinamiento → Síntesis final
// ============================================================
async function queryNode(node, systemPrompt, userPrompt, maxTokens = 256) {
    const nodeUrl = `http://${node.ip}:8080/v1/chat/completions`;
    const resp = await axios.post(nodeUrl, {
        model: "student",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
    }, { timeout: 900000 });
    return resp.data.choices[0].message.content;
}

async function startAgora(topic, cycles = 1) {
    const activeNodes = nodesConfig.nodes.filter(n => n.ip && n.ip !== "100.X.Y.Z");
    let transcript = `# 🏛️ Ágora Mercure v5.0: ${topic}\nFecha: ${new Date().toLocaleDateString()} | Ciclos: ${cycles}\n\n`;

    try {
        // ── FASE 1: PRE-RAZONAMIENTO PARALELO ──────────────────────
        // Maestro + todos los alumnos razonan sobre el tema a la vez
        console.log(`[Ágora] Fase 1: Pre-razonamiento paralelo (${activeNodes.length + 1} nodos)...`);

        const masterPromise = axios.post(CAMS_BRIDGE_URL + "/query", {
            query: `Razona sobre este tema con tu contexto completo (Obsidian + Web): ${topic}. Sé directo y denso.`,
            agent: "explorador",
            token: MERCURE_TOKEN
        }, { timeout: 900000 }).then(r => r.data.response);

        const nodePromises = activeNodes.map(node =>
            queryNode(
                node,
                "RAZONA sin filtros sobre el tema. Aporta tu perspectiva única y conclusiones con una extensión de 75 a 100 palabras. NO SALUDES.",
                `Tema: ${topic}`
            ).then(reply => ({ name: node.name, reasoning: reply }))
                .catch(() => ({ name: node.name, reasoning: "[offline]" }))
        );

        const [masterReasoning, ...nodeReasonings] = await Promise.all([masterPromise, ...nodePromises]);

        transcript += `## 🗣️ Maestro — Razonamiento Inicial\n${masterReasoning}\n\n`;
        nodeReasonings.forEach(n => {
            if (n.reasoning !== "[offline]") {
                transcript += `## 🎓 ${n.name} — Pre-razonamiento\n> ${n.reasoning}\n\n`;
            }
        });

        // ── FASE 2: MAESTRO SINTETIZA Y EMITE DIRECCIÓN ────────────
        console.log(`[Ágora] Fase 2: Maestro sintetizando razonamientos de la flota...`);
        const allNodeReasoning = nodeReasonings
            .filter(n => n.reasoning !== "[offline]")
            .map(n => `[${n.name}]: ${n.reasoning}`)
            .join("\n");

        const masterSynthResp = await axios.post(CAMS_BRIDGE_URL + "/query", {
            query: `Eres el Maestro del Ágora. Los alumnos han razonado:\n${allNodeReasoning}\n\nTu propio razonamiento: ${masterReasoning}\n\nEmite una DIRECCIÓN MAESTRA: el punto clave a profundizar. Sé conciso.`,
            agent: "debate",
            token: MERCURE_TOKEN
        }, { timeout: 900000 });

        let masterDirection = masterSynthResp.data.response;
        transcript += `---\n## 🔱 Dirección Maestra (Síntesis Fase 2)\n${masterDirection}\n\n`;

        // ── FASE 3: BUCLE DE REFINAMIENTO (N CICLOS) ───────────────
        // Encode para los satélites
        const encodedDirection = await axios.post(CAMS_BRIDGE_URL + "/caveman/encode", {
            query: masterDirection,
            token: MERCURE_TOKEN
        }, { timeout: 900000 });
        let cavemanDirection = encodedDirection.data.response;

        for (let cycle = 1; cycle <= cycles; cycle++) {
            console.log(`[Ágora] Ciclo de refinamiento ${cycle}/${cycles}...`);
            transcript += `---\n### 🔄 Ciclo ${cycle}/${cycles}\n\n`;

            const cycleResults = [];
            for (const node of activeNodes) {
                try {
                    const reply = await queryNode(
                        node,
                        "ESTILO ANALÍTICO. Recibiste la dirección del Maestro. Profundiza y añade tu perspectiva única con una extensión de 75 a 100 palabras. NO SALUDES.",
                        `DIRECCIÓN:\n${cavemanDirection}\n\nTu aportación:`,
                        256
                    );
                    transcript += `**${node.name}:** ${reply}\n\n`;
                    cycleResults.push(`[${node.name}]: ${reply}`);
                    console.log(`[Ágora] ✅ ${node.name} completó ciclo ${cycle}.`);
                } catch (err) {
                    console.warn(`[Ágora] ❌ ${node.name} offline en ciclo ${cycle}.`);
                }
            }

            // El Maestro re-sintetiza con las respuestas del ciclo
            if (cycleResults.length > 0 && cycle < cycles) {
                const reSynthResp = await axios.post(CAMS_BRIDGE_URL + "/query", {
                    query: `Los alumnos respondieron en el ciclo ${cycle}:\n${cycleResults.join("\n")}\n\nEmite una nueva DIRECCIÓN MAESTRA más refinada para el ciclo ${cycle + 1}.`,
                    agent: "debate",
                    token: MERCURE_TOKEN
                }, { timeout: 900000 });
                masterDirection = reSynthResp.data.response;
                transcript += `**↳ Nueva Dirección (Maestro):** ${masterDirection}\n\n`;

                const rEncoded = await axios.post(CAMS_BRIDGE_URL + "/caveman/encode", {
                    query: masterDirection,
                    token: MERCURE_TOKEN
                }, { timeout: 900000 });
                cavemanDirection = rEncoded.data.response;
            }
        }

        // ── FASE 4: SÍNTESIS FINAL ──────────────────────────────────
        console.log(`[Ágora] Fase 4: Síntesis final del Maestro...`);
        const fullDebateContext = transcript.substring(0, 4000); // Limitar contexto
        const finalSynthResp = await axios.post(CAMS_BRIDGE_URL + "/query", {
            query: `Eres el Maestro del Ágora. Sin prejuicios sobre el origen de las ideas, genera una CONCLUSIÓN FINAL del debate:\n\n${fullDebateContext}\n\nSíntesis empática, rigurosa y legible:`,
            agent: "debate",
            token: MERCURE_TOKEN
        }, { timeout: 900000 });

        transcript += `\n---\n## 🏛️ Conclusión Final del Maestro\n${finalSynthResp.data.response}\n`;

        // ── GUARDADO ────────────────────────────────────────────────
        if (!fs.existsSync(AGORA_LOGS_PATH)) fs.mkdirSync(AGORA_LOGS_PATH, { recursive: true });
        const fileName = `AGORA_${new Date().toISOString().split('T')[0]}.md`;
        fs.writeFileSync(path.join(AGORA_LOGS_PATH, fileName), transcript);
        console.log(`[Ágora] ✅ Sesión Cuántica v5 guardada: ${fileName}`);

    } catch (e) {
        console.error(`[Ágora] Error Cuántico: ${e.message}`);
    }
}

// ── ESCÁNER DINÁMICO DE MODELOS ───────────────────────────────
function getAvailableModels() {
    if (!fs.existsSync(MODELS_PATH)) return {};
    const files = fs.readdirSync(MODELS_PATH);
    const models = {};

    files.forEach(file => {
        if (file.endsWith('.gguf') && !file.includes('mmproj')) {
            const id = file.replace('.gguf', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const isTurbo = file.match(/qwen|llama/i);
            const isGemma = file.match(/gemma/i);

            // Buscar mmproj relacionado para Gemma
            let mmprojPath = null;
            if (isGemma) {
                const mmprojFile = files.find(f => f.includes('mmproj') && f.includes(file.split('-')[0]));
                if (mmprojFile) mmprojPath = path.join(MODELS_PATH, mmprojFile);
            }

            models[id] = {
                name: file.replace('.gguf', '').split(/[-_.]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                path: path.join(MODELS_PATH, file),
                engine: isTurbo ? "turboquant" : "official",
                context: isTurbo ? 32768 : 65536,
                mmproj: mmprojPath
            };
        }
    });

    // Fallback si no hay modelos para que la UI no rompa
    if (Object.keys(models).length === 0) {
        models["no_model"] = { name: "⚠️ Ningún modelo detectado", path: "", engine: "official", context: 0 };
    }
    return models;
}

let activeProcesses = {
    llm: null,
    bridge: null
};

// --- GESTIÓN DE SERVICIOS ---

let serviceLogs = {
    llm: [],
    bridge: []
};

const addLog = (service, data) => {
    const lines = data.toString().split('\n');
    serviceLogs[service].push(...lines);
    if (serviceLogs[service].length > 100) {
        serviceLogs[service] = serviceLogs[service].slice(-100);
    }
};

const isPortActive = (port) => {
    return new Promise((resolve) => {
        exec(`lsof -i :${port}`, (err, stdout) => {
            resolve(stdout.length > 0);
        });
    });
};

app.get('/api/services/status', async (req, res) => {
    const llmActive = await isPortActive(8080);
    const bridgeActive = await isPortActive(8000);
    res.json({
        llm: llmActive ? "running" : "stopped",
        bridge: bridgeActive ? "running" : "stopped",
        timestamp: new Date().toISOString()
    });
});

app.get('/api/services/logs', (req, res) => {
    res.json(serviceLogs);
});

app.get('/api/services/models', (req, res) => {
    res.json(getAvailableModels());
});

app.post('/api/services/start', async (req, res) => {
    const { modelId, context, useDraft } = req.body;
    const currentModels = getAvailableModels();
    const model = currentModels[modelId];

    if (!model) return res.status(400).json({ error: "Modelo no válido" });

    // Usar contexto del usuario o el del modelo por defecto
    const contextSize = context || model.context;

    try {
        console.log("[Orquestador] Limpiando procesos previos...");
        try {
            execSync("fuser -k 8080/tcp 8000/tcp 2>/dev/null");
        } catch (e) {
            // fuser devuelve error si no encuentra procesos, es normal
        }

        // Pequeña pausa para asegurar la liberación del puerto a nivel del kernel
        await new Promise(resolve => setTimeout(resolve, 1500));

        serviceLogs.llm = [];
        serviceLogs.bridge = [];

        const llmPath = model.engine === "turboquant" ? "/home/aorsi/llama-cpp-turboquant" : "/home/aorsi/llama-cpp-official";
        const llmArgs = ["-m", model.path, "-fa", "on", "-ngl", "99", "-c", contextSize.toString(), "--host", "0.0.0.0", "--port", "8080"];

        // Re-introducidas flags de speculative decoding para motor TurboQuant
        if (model.engine === "turboquant") {
            llmArgs.push("-ctk", "turbo3", "-ctv", "turbo3");

            // Speculative Decoding Dinámico desde UI
            if (useDraft) {
                try {
                    const draftFile = fs.readdirSync(MODELS_PATH).find(f => f.toLowerCase().includes('0.5b') && f.endsWith('.gguf'));
                    if (draftFile) {
                        const draftPath = path.join(MODELS_PATH, draftFile);
                        llmArgs.push("--model-draft", draftPath, "--draft", "16", "-ngld", "99", "-ctkd", "turbo3", "-ctvd", "turbo3");
                        console.log(`[Orquestador] ⚡ Especulación activada con: ${draftFile}`);
                    }
                } catch (e) { }
            }
        }

        if (model.mmproj) llmArgs.push("--mmproj", model.mmproj);

        const llmProcess = spawn(`${llmPath}/build/bin/llama-server`, llmArgs, {
            cwd: llmPath,
            env: { ...process.env, TURBO_LAYER_ADAPTIVE: model.engine === "turboquant" ? "1" : "0" }
        });

        llmProcess.stdout.on('data', (d) => addLog('llm', d));
        llmProcess.stderr.on('data', (d) => addLog('llm', d));

        const bridgeProcess = spawn("python3", ["server.py"], {
            cwd: path.join(path.resolve(), '..', 'bridge')
        });

        bridgeProcess.stdout.on('data', (d) => addLog('bridge', d));
        bridgeProcess.stderr.on('data', (d) => addLog('bridge', d));

        activeProcesses.llm = llmProcess;
        activeProcesses.bridge = bridgeProcess;

        res.json({ status: "success", message: `Iniciando ${model.name}...` });
    } catch (error) {
        console.error("[Orquestador] Error al arrancar servicios:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/services/stop', (req, res) => {
    console.log("[Orquestador] Deteniendo todos los motores...");
    exec("fuser -k 8080/tcp 8000/tcp");
    res.json({ status: "stopped" });
});

// --- AGENTES Y BLOG ---

app.post('/api/blog/save', (req, res) => {
    try {
        const { content, title, agent } = req.body;
        const agentFolder = agent ? agent.toLowerCase() : 'general';
        const targetDir = path.join(SAVED_RESP_PATH, agentFolder);

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const fileName = `${title || 'Respuesta'}_${new Date().getTime()}.md`;
        const filePath = path.join(targetDir, fileName);

        fs.writeFileSync(filePath, content);
        console.log(`[Orquestador] Respuesta guardada manualmente: ${fileName}`);
        res.json({ status: "success", file: fileName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/agent/query', async (req, res) => {
    const { sessionId } = req.body;
    const currentId = sessionId || 'default';
    const controller = new AbortController();
    activeAbortControllers.set(currentId, controller);

    const startTime = Date.now();

    try {
        const { query, agent, session_mode, persistence, files, thinking } = req.body;

        const processedFiles = [];
        if (files && files.length > 0) {
            if (!fs.existsSync(CANVAS_PATH)) fs.mkdirSync(CANVAS_PATH, { recursive: true });

            const ADJUNTOS_PATH = path.join(BASE_PATH, 'respuestas', 'adjuntos');
            if (!fs.existsSync(ADJUNTOS_PATH)) fs.mkdirSync(ADJUNTOS_PATH, { recursive: true });

            for (const file of files) {
                const filePath = path.join(ADJUNTOS_PATH, file.name);
                const base64Data = file.data.split(';base64,').pop();
                fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
                processedFiles.push({
                    name: file.name,
                    type: file.type,
                    path: filePath
                });
                console.log(`[Orquestador] Adjunto procesado y guardado en disco: ${file.name}`);
            }
        }

        const response = await axios.post(CAMS_BRIDGE_URL + "/query", {
            query: query,
            agent: agent || "bibliotecario",
            session_mode: session_mode || false,
            clientId: activeClientSession, // Pasar cliente activo para contexto somático
            files: processedFiles,
            token: MERCURE_TOKEN,
            thinking: thinking || false
        }, {
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            signal: controller.signal,
            timeout: 900000 // 10 Minutos para el Arquitecto y tareas densas
        });

        const textResponse = response.data.response;
        const bridgeUsage = response.data.usage || {};
        const bridgeDuration = response.data.duration || (Date.now() - startTime) / 1000;

        // Usar tokens reales si vienen de llama-server vía bridge, si no estimar
        const realTokens = bridgeUsage.completion_tokens || Math.floor(textResponse.length / 4);
        const tps = (realTokens / bridgeDuration).toFixed(2);

        // Guardar métrica
        const metric = {
            timestamp: new Date().toISOString(),
            agent: agent || "bibliotecario",
            query: query.substring(0, 50),
            duration: bridgeDuration.toFixed(2),
            tokens: realTokens,
            tps: parseFloat(tps)
        };

        try {
            const history = fs.existsSync(BENCHMARKS_PATH) ? JSON.parse(fs.readFileSync(BENCHMARKS_PATH, 'utf8')) : [];
            history.unshift(metric);
            fs.writeFileSync(BENCHMARKS_PATH, JSON.stringify(history.slice(0, 50), null, 2));
        } catch (e) {
            console.error("Error guardando benchmarking:", e);
        }

        // —— BACKUP SILENCIOSO Y MEMORIA EFÍMERA
        try {
            const timestamp = new Date().toLocaleString();

            // 1. Backup individual (Historial continuo general)
            const backupFile = path.join(BACKUP_PATH, `${agent || 'bibliotecario'}.md`);
            const backupContent = `\n---\n# Última Respuesta: ${agent}\n_${timestamp}_\n\n**Pregunta:** ${query}\n\n${textResponse}\n\n> 📊 Métrica: ${tps} tokens/s | ${bridgeDuration}s\n`;
            if (!fs.existsSync(backupFile)) {
                fs.writeFileSync(backupFile, backupContent);
            } else {
                fs.appendFileSync(backupFile, backupContent);
            }

            // 2. Memoria Efímera (Wiki de Sesión) - Se acumula si persistence === 'mem'
            if (persistence === 'mem') {
                const sessionFile = path.join(BACKUP_PATH, 'session.md');
                const sessionEntry = `\n---\n### 🗣️ ${agent.toUpperCase()} (${timestamp})\n**Q:** ${query}\n**A:** ${textResponse}\n`;
                if (!fs.existsSync(sessionFile)) {
                    fs.writeFileSync(sessionFile, `# 🧠 Wiki Efímero de Sesión\nIniciado: ${timestamp}\n${sessionEntry}`);
                } else {
                    fs.appendFileSync(sessionFile, sessionEntry);
                }
            }
        } catch (e) {
            console.error("Error en backup/memoria:", e);
        }

        res.json({ ...response.data, metrics: metric });
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'canceled') {
            console.log(`[Agente] Petición abortada satisfactoriamente.`);
            res.status(499).json({ error: 'Consulta cancelada por el usuario.' });
        } else {
            console.error('Error en consulta de agentes:', error.message);
            res.status(500).json({ error: 'No se pudo conectar con el motor de agentes CAMS' });
        }
    } finally {
        activeAbortControllers.delete(currentId);
    }
});

app.post('/api/render/pdf', async (req, res) => {
    try {
        const response = await axios.post(CAMS_BRIDGE_URL + "/api/render/pdf", req.body, {
            responseType: 'arraybuffer',
            headers: { 'Content-Type': 'application/json' }
        });
        res.set('Content-Type', 'application/pdf');
        res.send(response.data);
    } catch (e) {
        console.error('[Proxy PDF] Error:', e.message);
        res.status(500).json({ error: "Error en el motor de renderizado PDF" });
    }
});

// ── WIKI SCANNER: Indexar carpetas externas para acceso rápido ──────────
app.get('/api/wiki/folders', (req, res) => {
    try {
        const index = fs.existsSync(WIKI_INDEX_PATH)
            ? JSON.parse(fs.readFileSync(WIKI_INDEX_PATH, 'utf8'))
            : { folders: [] };
        res.json(index);
    } catch (e) {
        res.json({ folders: [] });
    }
});

app.post('/api/wiki/scan', async (req, res) => {
    const { folderPath } = req.body;
    if (!folderPath || !fs.existsSync(folderPath)) {
        return res.status(400).json({ error: 'Ruta no válida o no encontrada.' });
    }
    try {
        // Recopilar todos los .md recursivamente
        const getMdFiles = (dir, depth = 0) => {
            if (depth > 6) return []; // Limitar profundidad
            return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
                const full = path.join(dir, entry.name);

                // Ignorar carpetas ruidosas y ocultas para evitar saturar el LLM
                if (entry.isDirectory()) {
                    if (['node_modules', '.git', '.venv', '__pycache__', 'dist', 'build'].includes(entry.name) || entry.name.startsWith('.')) {
                        return [];
                    }
                    return getMdFiles(full, depth + 1);
                } else if (entry.isFile() && entry.name.match(/\.(md|mdx|txt|py|js|jsx|json|sh|html|css)$/i)) {
                    if (entry.name === 'package-lock.json') return [];
                    return [full];
                }
                return [];
            });
        };

        const mdFiles = getMdFiles(folderPath);

        // Enviar al bridge para que los indexe en el contexto RAG
        await axios.post(CAMS_BRIDGE_URL + '/wiki/index', {
            folder: folderPath,
            files: mdFiles,
            token: MERCURE_TOKEN
        }, { timeout: 30000 });

        // Actualizar el index local
        const index = fs.existsSync(WIKI_INDEX_PATH)
            ? JSON.parse(fs.readFileSync(WIKI_INDEX_PATH, 'utf8'))
            : { folders: [] };

        if (!index.folders.find(f => f.path === folderPath)) {
            index.folders.push({ path: folderPath, files: mdFiles.length, scanned: new Date().toISOString() });
            fs.writeFileSync(WIKI_INDEX_PATH, JSON.stringify(index, null, 2));
        }

        res.json({ status: 'success', files: mdFiles.length, folder: folderPath });
    } catch (e) {
        const trueError = e.response ? `HTTP ${e.response.status}` : (e.message || String(e));
        console.error('[Wiki Scanner] Detalles completos del Error:', e.stack || e);
        res.status(500).json({ error: trueError });
    }
});

app.delete('/api/wiki/folders', (req, res) => {
    const { folderPath } = req.body;
    try {
        if (fs.existsSync(WIKI_INDEX_PATH)) {
            const index = JSON.parse(fs.readFileSync(WIKI_INDEX_PATH, 'utf8'));
            index.folders = index.folders.filter(f => f.path !== folderPath);
            fs.writeFileSync(WIKI_INDEX_PATH, JSON.stringify(index, null, 2));
        }
        res.json({ status: 'removed' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/agent/backup/:mode', (req, res) => {
    const { mode } = req.params;
    const backupFile = path.join(BACKUP_PATH, `${mode}.md`);
    if (!fs.existsSync(backupFile)) return res.status(404).json({ error: 'Sin backup para este modo.' });

    try {
        const fullContent = fs.readFileSync(backupFile, 'utf8');
        const parts = fullContent.split('\n---\n');
        // El último elemento (parts.pop()) contiene la última interacción. 
        // Si está vacío (por un newline final), sacamos el anterior.
        let lastPart = parts.pop();
        if (!lastPart.trim() && parts.length > 0) {
            lastPart = parts.pop();
        }
        res.json({ content: lastPart.trim() });
    } catch (e) {
        res.status(500).json({ error: 'Error leyendo backup.' });
    }
});

// --- GESTIÓN DE SESIÓN (WIKI EFÍMERO) ---

app.get('/api/session/status', (req, res) => {
    const sessionFile = path.join(BACKUP_PATH, 'session.md');
    res.json({ active: fs.existsSync(sessionFile) });
});

app.post('/api/session/discard', (req, res) => {
    const sessionFile = path.join(BACKUP_PATH, 'session.md');
    if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
        console.log("[Sesión] Memoria efímera descartada.");
    }
    res.json({ status: "discarded" });
});

app.post('/api/session/index', async (req, res) => {
    const sessionFile = path.join(BACKUP_PATH, 'session.md');
    const MEMORIA_FOLDER = path.join(BASE_PATH, 'memoria-sesiones');

    if (!fs.existsSync(sessionFile)) return res.status(404).json({ error: "No hay sesión activa para indexar." });

    try {
        if (!fs.existsSync(MEMORIA_FOLDER)) fs.mkdirSync(MEMORIA_FOLDER, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const targetName = `session_${timestamp}.md`;
        const targetPath = path.join(MEMORIA_FOLDER, targetName);

        fs.renameSync(sessionFile, targetPath);
        console.log(`[Sesión] Sesión movida a memoria persistente: ${targetPath}`);

        // Trigger bridge indexing for this new file
        try {
            const files = [targetPath];
            await axios.post(CAMS_BRIDGE_URL + '/wiki/index', {
                folder: MEMORIA_FOLDER,
                files: files,
                token: MERCURE_TOKEN
            }, { timeout: 30000 });
            console.log("[Sesión] Bridge notificado para indexado incremental.");
        } catch (bridgeErr) {
            console.warn("[Sesión] No se pudo notificar al bridge, se indexará en el próximo escaneo general.");
        }

        res.json({ status: "indexed", path: targetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/blog/files', (req, res) => {
    try {
        if (!fs.existsSync(BLOG_PATH)) return res.status(404).json({ error: 'Vault no encontrado' });
        const files = fs.readdirSync(BLOG_PATH).filter(f =>
            (f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.docx')) &&
            !f.startsWith('~') && !f.startsWith('.~')
        );
        res.json({ files: files.map(f => ({ id: f, title: f.toUpperCase() })) });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de archivos' });
    }
});

app.get('/api/blog/read/:filename', (req, res) => {
    try {
        const filePath = path.join(BLOG_PATH, req.params.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
        res.json({ content: fs.readFileSync(filePath, 'utf-8') });
    } catch (error) {
        res.status(500).json({ error: 'Error al leer el archivo' });
    }
});

// --- GESTIÓN DE CLIENTES (VERDADERO)
app.post('/api/client/append-history', (req, res) => {
    const { clientId, content } = req.body;
    if (!clientId || !content) return res.status(400).json({ error: "Datos insuficientes." });

    const clientPath = path.join(BASE_PATH, 'clientes', clientId);
    const historyPath = path.join(clientPath, 'history.md');

    try {
        if (!fs.existsSync(clientPath)) fs.mkdirSync(clientPath, { recursive: true });

        const timestamp = new Date().toLocaleString();
        const formattedContent = `\n\n### 🧠 Registro del Sistema (${timestamp})\n${content}\n`;

        fs.appendFileSync(historyPath, formattedContent);
        console.log(`[Historial] Nota integrada en el historial de ${clientId}`);
        res.json({ status: "appended" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Listar clientes/proyectos
app.get('/api/clients', (req, res) => {
    try {
        if (!fs.existsSync(CLIENTES_PATH)) return res.json([]);
        const clients = fs.readdirSync(CLIENTES_PATH, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const profilePath = path.join(CLIENTES_PATH, dirent.name, 'profile.json');
                let info = { name: dirent.name };
                if (fs.existsSync(profilePath)) {
                    info = { ...info, ...JSON.parse(fs.readFileSync(profilePath, 'utf8')) };
                }
                return { id: dirent.name, ...info };
            });
        res.json(clients);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/clients', (req, res) => {
    const { name, metadata } = req.body;
    if (!name) return res.status(400).json({ error: "Nombre requerido" });

    try {
        // Crear hash simple para el ID
        const hashId = crypto.createHash('md5').update(name + Date.now()).digest('hex').substring(0, 8);
        const clientDir = path.join(CLIENTES_PATH, hashId);

        fs.mkdirSync(clientDir, { recursive: true });
        fs.mkdirSync(path.join(clientDir, 'recursos'), { recursive: true });

        const profile = { name, hashId, created: new Date().toISOString(), ...metadata };
        fs.writeFileSync(path.join(clientDir, 'profile.json'), JSON.stringify(profile, null, 2));

        res.json({ status: "success", id: hashId, profile });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/clients/:id/notes', (req, res) => {
    const { id } = req.params;
    const { note, agent } = req.body;
    const clientDir = path.join(CLIENTES_PATH, id);

    if (!fs.existsSync(clientDir)) return res.status(404).json({ error: "Cliente no encontrado" });

    try {
        const historyFile = path.join(clientDir, 'history.md');
        const timestamp = new Date().toLocaleString();
        const content = `\n---\n### 📅 ${timestamp} (${agent || 'Sistema'})\n${note}\n`;

        fs.appendFileSync(historyFile, content);
        res.json({ status: "success" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/clients/:id/history', (req, res) => {
    const { id } = req.params;
    const historyFile = path.join(CLIENTES_PATH, id, 'history.md');
    if (!fs.existsSync(historyFile)) return res.json({ content: "" });
    res.json({ content: fs.readFileSync(historyFile, 'utf8') });
});

app.post('/api/session/active-client', (req, res) => {
    const { clientId } = req.body;
    activeClientSession = clientId;
    console.log(`[Sesión] Cliente activo: ${clientId || 'Ninguno'}`);
    res.json({ status: "success", activeClient: activeClientSession });
});

app.get('/api/session/active-client', (req, res) => {
    res.json({ activeClient: activeClientSession });
});

app.post('/api/agora/trigger', async (req, res) => {
    const { topic, cycles } = req.body;
    const numCycles = Math.min(Math.max(parseInt(cycles) || 1, 1), 5); // Entre 1 y 5 ciclos
    startAgora(topic || "Tema libre", numCycles);
    res.json({ status: `Iniciando Ágora Cuántica (${numCycles} ciclo/s)...` });
});


// ============================================================
// 📱 API MOBILE CONTROL — Fase 1 (Soberanía Distribuida)
// ============================================================

app.get('/api/mobile/status', async (req, res) => {
    try {
        const uptimeSeconds = os.uptime();
        const uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
        const llmActive = activeProcesses.llm ? true : false;
        const bridgeActive = activeProcesses.bridge ? true : false;

        res.json({
            status: "online",
            uptime: uptimeFormatted,
            services: {
                llm: llmActive ? "running" : "stopped",
                bridge: bridgeActive ? "running" : "stopped"
            },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/mobile/system/resources', (req, res) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const loadAvg = os.loadavg();

        res.json({
            ram: {
                total: (totalMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
                used: (usedMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
                percent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
            },
            cpu: {
                load: loadAvg[0].toFixed(2),
                cores: os.cpus().length
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/mobile/control/stop-all', (req, res) => {
    console.log('[API Mobile] Comando STOP-ALL recibido.');
    try {
        execSync('fuser -k 8080/tcp 8000/tcp 2>/dev/null', { stdio: 'ignore' });
        activeProcesses.llm = null;
        activeProcesses.bridge = null;
        res.json({ status: "success", message: "Servicios detenidos" });
    } catch (e) {
        res.status(500).json({ error: "Error al detener: " + e.message });
    }
});

app.post('/api/mobile/trigger/index', async (req, res) => {
    console.log('[API Mobile] Trigger de indexación remota...');
    try {
        const scanRes = await axios.post(`${CAMS_BRIDGE_URL}/wiki/index`, {
            folder: BASE_PATH,
            token: MERCURE_TOKEN
        }, { timeout: 30000 });
        res.json({ status: "success", info: scanRes.data });
    } catch (e) {
        res.status(500).json({ error: "Error en indexación: " + e.message });
    }
});

// ============================================================
// 📱 API MOBILE CONTROL — Fase 2 (Control Avanzado)
// ============================================================

app.get('/api/mobile/models', (req, res) => {
    try {
        const models = getAvailableModels();
        // Devolvemos una versión simplificada para el móvil
        const simplified = Object.keys(models).map(id => ({
            id,
            name: models[id].name,
            engine: models[id].engine,
            context: models[id].context
        }));
        res.json(simplified);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/mobile/control/switch-model', async (req, res) => {
    const { modelId, context } = req.body;
    console.log(`[API Mobile] Solicitud de cambio a modelo: ${modelId}`);

    try {
        // 1. Detener procesos actuales
        execSync('fuser -k 8080/tcp 8000/tcp 2>/dev/null', { stdio: 'ignore' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Disparar el arranque (usamos axios para llamar a nuestra propia API interna de forma segura)
        // O mejor, disparamos la lógica directamente para evitar bucles de red
        const currentModels = getAvailableModels();
        const model = currentModels[modelId];
        if (!model) return res.status(404).json({ error: "Modelo no encontrado" });

        // Esta llamada es asíncrona pero la lanzamos y respondemos al móvil
        // El móvil verá el estado "running" en el próximo poll de /status
        axios.post(`http://localhost:${PORT}/api/services/start`, {
            modelId,
            context: context || model.context,
            useDraft: false
        }).catch(e => console.error("[Mobile] Error interno al rearrancar:", e.message));

        res.json({ status: "switching", message: `Cambiando a ${model.name}...` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/mobile/startup-check', async (req, res) => {
    try {
        const llmActive = await isPortActive(8080);
        const bridgeActive = await isPortActive(8000);
        res.json({
            ready: llmActive && bridgeActive,
            services: { llm: llmActive, bridge: bridgeActive },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/agora/latest', (req, res) => {
    try {
        if (!fs.existsSync(AGORA_LOGS_PATH)) return res.json({ content: "" });
        const files = fs.readdirSync(AGORA_LOGS_PATH)
            .filter(f => f.endsWith('.md'))
            .sort((a, b) => fs.statSync(path.join(AGORA_LOGS_PATH, b)).mtimeMs - fs.statSync(path.join(AGORA_LOGS_PATH, a)).mtimeMs);

        if (files.length === 0) return res.json({ content: "" });
        const latest = fs.readFileSync(path.join(AGORA_LOGS_PATH, files[0]), 'utf8');
        res.json({ content: latest });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/agora/nodes', (req, res) => {
    res.json(nodesConfig);
});

// --- GESTIÓN DE CANVASES (NEURO-CANVAS) ---

app.get('/api/canvases', (req, res) => {
    try {
        if (!fs.existsSync(CANVAS_PATH)) return res.json([]);
        const files = fs.readdirSync(CANVAS_PATH)
            .filter(f => f.endsWith('.canvas') || f.endsWith('.neuro')) // Soporta legacy
            .map(f => ({
                id: f,
                name: f.replace('.canvas', '').replace('.neuro', ''),
                updated: fs.statSync(path.join(CANVAS_PATH, f)).mtime
            }));
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/canvases/:id', (req, res) => {
    try {
        const filePath = path.join(CANVAS_PATH, req.params.id);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "No existe" });
        
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Si es un .canvas de Obsidian, traducirlo al formato React Flow que espera el frontend
        if (req.params.id.endsWith('.canvas')) {
            const isObsidian = raw.nodes && raw.nodes.length > 0 && raw.nodes[0].type !== 'agentNode';
            
            if (isObsidian) {
                const rfNodes = raw.nodes.map(n => {
                    let label = "Nodo Importado";
                    let agent = "bibliotecario";
                    let contentStr = n.text || "";
                    let icon = "🧠";

                    if (n.type === "text" && n.text) {
                        const lines = n.text.split('\n');
                        if (lines[0] && lines[0].startsWith('### ')) {
                            label = lines[0].replace('### ', '').trim();
                            const iconMatch = label.match(/^(\p{Emoji})/u);
                            if (iconMatch) {
                                icon = iconMatch[1];
                                label = label.replace(icon, '').trim();
                            }
                        }
                        if (lines[1] && lines[1].startsWith('**Agente:** ')) {
                            agent = lines[1].replace('**Agente:** ', '').trim();
                        }
                        contentStr = lines.slice(2).join('\n').trim();
                    }

                    return {
                        id: n.id,
                        type: 'agentNode',
                        position: { x: n.x || 0, y: n.y || 0 },
                        data: { label, agent, content: contentStr, icon }
                    };
                });

                const rfEdges = (raw.edges || []).map(e => ({
                    id: e.id,
                    source: e.fromNode,
                    target: e.toNode
                }));

                return res.json({ nodes: rfNodes, edges: rfEdges });
            }
        }
        
        // Si es .neuro o ya está en formato React Flow
        res.json(raw);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/canvases', (req, res) => {
    try {
        const { id, name, content } = req.body;
        const fileName = id || `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.canvas`;
        const filePath = path.join(CANVAS_PATH, fileName);
        
        if (fileName.endsWith('.canvas')) {
            // Traducir formato React Flow a formato nativo Obsidian Canvas
            const obsidianNodes = (content.nodes || []).map(n => ({
                id: n.id,
                type: "text",
                text: `### ${n.data?.icon || ''} ${n.data?.label || ''}\n**Agente:** ${n.data?.agent || 'desconocido'}\n\n${n.data?.content || ''}`,
                x: n.position?.x || 0,
                y: n.position?.y || 0,
                width: 350,
                height: 180
            }));

            const obsidianEdges = (content.edges || []).map(e => ({
                id: e.id,
                fromNode: e.source,
                fromSide: "right",
                toNode: e.target,
                toSide: "left"
            }));

            const obsidianFormat = { nodes: obsidianNodes, edges: obsidianEdges };
            fs.writeFileSync(filePath, JSON.stringify(obsidianFormat, null, 2));
        } else {
            // Formato .neuro original
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        }
        
        res.json({ status: "success", id: fileName });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SERVIDO DE WEBAPP (AL FINAL PARA NO BLOQUEAR LA API) ---
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`⚗️  CAMS MERCURE v5.0 ONLINE`);
    console.log(`Puerto: http://localhost:${PORT}`);
    console.log(`Base de datos: ${BASE_PATH}`);
    console.log(`==========================================`);
});
