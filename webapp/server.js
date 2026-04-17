import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import { spawn, exec, execSync } from 'child_process';
import cron from 'node-cron';
import { notifyAllStudents, notifyDevice } from './notifications.js';

const app = express();
const PORT = 3001;

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
const BACKUP_PATH = path.join(BASE_PATH, 'backups'); // Backup silencioso por modo
const WIKI_INDEX_PATH = path.join(BASE_PATH, 'wiki-index.json'); // Carpetas escaneadas
const BENCHMARKS_PATH = path.join(BACKUP_PATH, 'benchmarks.json');
const CAMS_BRIDGE_URL = 'http://localhost:8000';
const MERCURE_TOKEN = process.env.MERCURE_TOKEN || "cambiame-por-token-seguro";

// Asegurar que las carpetas base existen al arrancar
[AGORA_LOGS_PATH, ATTACH_PATH, SAVED_RESP_PATH, BACKUP_PATH].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Registro de controladores de aborto para peticiones activas
const activeAbortControllers = new Map();

const TOPICS = [
    "Actualidad científica y avances en IA",
    "Filosofía, transhumanismo y conciencia digital",
    "Análisis de geopolítica y economía global",
    "Ética en la era de los agentes autónomos",
    "Exploración del Engrama Neuronal y Memoria Digital"
];

// --- PLANIFICACIÓN (CAMS v3) ---

// Ágora Diaria (10:00 AM)
cron.schedule('0 10 * * *', async () => {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    console.log(`[Planificador] Iniciando Ágora sobre: ${topic}`);
    await notifyAllStudents(nodesConfig.nodes, `🏛️ El Ágora comenzará en 5 min. Tema: ${topic}`);
    
    setTimeout(() => {
        startAgora(topic);
    }, 5 * 60 * 1000);
});

// Reporte Semanal (Domingos 23:00)
cron.schedule('0 23 * * 0', async () => {
    console.log("[Planificador] Generando síntesis semanal de aprendizaje...");
    try {
        const files = fs.readdirSync(AGORA_LOGS_PATH).filter(f => f.endsWith('.md'));
        let synthesis = `# 📊 Síntesis Semanal de Aprendizaje Federado\n\n`;
        files.forEach(f => {
            const content = fs.readFileSync(path.join(AGORA_LOGS_PATH, f), 'utf8');
            synthesis += `## Resumen de: ${f}\n${content.substring(0, 500)}...\n\n`;
        });
        fs.writeFileSync(path.join(BLOG_PATH, '03-aprendizaje-federado/reporte-semanal.md'), synthesis);
        await notifyDevice(nodesConfig.nodes[0].kde_id, "✅ Reporte semanal generado en Obsidian.");
    } catch (e) {
        console.error("Error en reporte semanal:", e.message);
    }
});

// Learning Bridge: Destilación Maestro-Alumno (Cada 4 horas)
cron.schedule('0 */4 * * *', async () => {
    const activeNodes = nodesConfig.nodes.filter(n => n.ip && n.ip !== "100.X.Y.Z");
    if (activeNodes.length === 0) return;
    
    const student = activeNodes[Math.floor(Math.random() * activeNodes.length)];
    console.log(`[Learning Bridge] Iniciando sesión proactiva para ${student.name}...`);
    
    try {
        const questResp = await axios.post(`http://${student.ip}:8080/v1/chat/completions`, {
            model: "student",
            messages: [{ role: "user", content: "Genera una duda compleja sobre el Engrama Neuronal para consultarle al Maestro." }]
        });
        
        const question = questResp.data.choices[0].message.content;
        const answer = await axios.post(CAMS_BRIDGE_URL + "/query", { 
            query: question, 
            agent: "bibliotecario",
            token: MERCURE_TOKEN
        });
        
        const log = `### Destilación: ${student.name}\n**Pregunta:** ${question}\n**Respuesta Maestro:** ${answer.data.response}\n\n`;
        fs.appendFileSync(path.join(BLOG_PATH, '03-aprendizaje-federado/distilacion.md'), log);
    } catch (e) {
        console.warn(`[Learning Bridge] Nodo ${student.name} no disponible.`);
    }
});

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
    }, { timeout: 300000 });
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
        }, { timeout: 600000 }).then(r => r.data.response);

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
        }, { timeout: 600000 });
        
        let masterDirection = masterSynthResp.data.response;
        transcript += `---\n## 🔱 Dirección Maestra (Síntesis Fase 2)\n${masterDirection}\n\n`;
        
        // ── FASE 3: BUCLE DE REFINAMIENTO (N CICLOS) ───────────────
        // Encode para los satélites
        const encodedDirection = await axios.post(CAMS_BRIDGE_URL + "/caveman/encode", { 
            query: masterDirection,
            token: MERCURE_TOKEN
        }, { timeout: 600000 });
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
                }, { timeout: 600000 });
                masterDirection = reSynthResp.data.response;
                transcript += `**↳ Nueva Dirección (Maestro):** ${masterDirection}\n\n`;
                
                const rEncoded = await axios.post(CAMS_BRIDGE_URL + "/caveman/encode", { 
                    query: masterDirection,
                    token: MERCURE_TOKEN
                }, { timeout: 600000 });
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
        }, { timeout: 600000 });
        
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

// --- CONFIGURACIÓN DE MODELOS (CAMS v2) ---
const MODELS = {
    "qwen35-9b": {
        name: "Qwen 3.5 9B (Claude Opus Distill)",
        path: "/home/aorsi/.lmstudio/models/Jackrong/Qwen3.5-9B-Claude-4.6-Opus-Reasoning-Distilled-v2-GGUF/Qwen3.5-9B.Q4_K_M.gguf",
        engine: "turboquant",
        context: 33000
    },
    "qwen3-14b": {
        name: "Qwen 3 14B (Opus Distill)",
        path: "/home/aorsi/.lmstudio/models/TeichAI/Qwen3-14B-Claude-4.5-Opus-High-Reasoning-Distill-GGUF/Qwen3-14B-Claude-4.5-Opus-Distill.q3_k_s.gguf",
        engine: "official",
        context: 80000
    },
    "gemma4-e4b": {
        name: "Gemma 4 E4B (Vision/Audio)",
        path: "/home/aorsi/.lmstudio/models/bartowski/google_gemma-4-E4B-it-GGUF/google_gemma-4-E4B-it-Q5_K_M.gguf",
        mmproj: "/home/aorsi/.lmstudio/models/bartowski/mmproj-google_gemma-4-E4B-it-bf16.gguf",
        engine: "official",
        context: 65536
    },
    "gemma4-e2b": {
        name: "Gemma 4 E2B (Ligero - Full Ctx)",
        path: "/home/aorsi/.lmstudio/models/gemma-4-E2B.Q6_K.gguf",
        engine: "official",
        context: 128000
    },
    "llama31-8b": {
        name: "Llama 3.1 8B",
        path: "/home/aorsi/modelos/llama-3.1-8b-instruct-q4_k_m.gguf",
        engine: "turboquant",
        context: 80000
    }
};

let activeProcesses = {
    llm: null,
    bridge: null
};

app.use(cors());
app.use(express.json());

// --- SERVIDO DE WEBAPP (CAMS v2 Master Port) ---
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

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
    res.json(MODELS);
});

app.post('/api/services/start', async (req, res) => {
    const { modelId } = req.body;
    const model = MODELS[modelId];

    if (!model) return res.status(400).json({ error: "Modelo no válido" });

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
        const llmArgs = ["-m", model.path, "-fa", "on", "-ngl", "99", "-c", model.context.toString(), "--host", "0.0.0.0", "--port", "8080"];
        
        // Re-introducidas flags de speculative decoding para motor TurboQuant
        if (model.engine === "turboquant") {
            llmArgs.push("-ctk", "turbo3", "-ctv", "turbo3");
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
            const { query, agent, session_mode, persistence, files } = req.body;
            
            const processedFiles = [];
            if (files && files.length > 0) {
                const ADJUNTOS_PATH = path.join(BASE_PATH, 'respuestas', 'adjuntos');
                if (!fs.existsSync(ADJUNTOS_PATH)) fs.mkdirSync(ADJUNTOS_PATH, { recursive: true });

                for (const file of files) {
                    const filePath = path.join(ADJUNTOS_PATH, file.name);
                    const base64Data = file.data.split(';base64,').pop();
                    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
                    processedFiles.push({
                        name: file.name,
                        data: file.data,
                        type: file.type,
                        path: filePath
                    });
                    console.log(`[Orquestador] Adjunto procesado: ${file.name}`);
                }
            }

        const response = await axios.post(CAMS_BRIDGE_URL + "/query", {
            query: query,
            agent: agent || "bibliotecario",
            session_mode: session_mode || false,
            files: processedFiles,
            token: MERCURE_TOKEN
        }, { 
            signal: controller.signal,
            timeout: 300000 
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

        // —— BACKUP SILENCIOSO...
        try {
            const backupFile = path.join(BACKUP_PATH, `${agent || 'bibliotecario'}.md`);
            const timestamp = new Date().toLocaleString();
            const backupContent = `# Última Respuesta: ${agent}\n_${timestamp}_\n\n**Pregunta:** ${query}\n\n---\n\n${textResponse}\n\n> 📊 Métrica: ${tps} tokens/s | ${duration}s`;
            fs.writeFileSync(backupFile, backupContent);
        } catch (_) { /* Backup no crítico */ }
        
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
    res.json({ content: fs.readFileSync(backupFile, 'utf8') });
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

app.post('/api/agora/trigger', async (req, res) => {
    const { topic, cycles } = req.body;
    const numCycles = Math.min(Math.max(parseInt(cycles) || 1, 1), 5); // Entre 1 y 5 ciclos
    startAgora(topic || "Tema libre", numCycles);
    res.json({ status: `Iniciando Ágora Cuántica (${numCycles} ciclo/s)...` });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`⚗️  CAMS MERCURE v5.0 ONLINE`);
    console.log(`Puerto: http://localhost:${PORT}`);
    console.log(`Base de datos: ${BASE_PATH}`);
    console.log(`==========================================`);
});
