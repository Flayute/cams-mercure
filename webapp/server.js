import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import mammoth from 'mammoth';
import os from 'os';

const app = express();
const PORT = 3001;
const BLOG_PATH = '/home/aorsi/Obsidian/RAG';
const CAMS_BRIDGE_URL = 'http://localhost:8000/query';

app.use(cors());
app.use(express.json());

// Nueva API unificada para Agentes (Bibliotecario e Investigador)
app.post('/api/agent/query', async (req, res) => {
    try {
        const { query, agent, session_mode } = req.body;
        
        console.log(`[WebApp] Consultando Agente: ${agent} para: ${query}`);
        
        const response = await axios.post(CAMS_BRIDGE_URL, {
            query: query,
            agent: agent || "bibliotecario",
            session_mode: session_mode || false
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error consultando CAMS Bridge:', error.message);
        res.status(500).json({ error: 'No se pudo conectar con el motor de agentes CAMS' });
    }
});

// Endpoint para listar archivos (Mantenemos para la biblioteca visual)
app.get('/api/blog/files', (req, res) => {
    try {
        if (!fs.existsSync(BLOG_PATH)) {
            return res.status(404).json({ error: 'Carpeta de Obsidian no encontrada' });
        }
        const files = fs.readdirSync(BLOG_PATH).filter(f =>
            (f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.docx')) &&
            !f.startsWith('~') && !f.startsWith('.~')
        );

        const fileList = files.map(f => ({
            id: f,
            title: f.replace(/\.(txt|md|docx)$/i, '').replace(/-/g, ' ').toUpperCase(),
            subtitle: `Archivo: ${path.extname(f).substring(1).toUpperCase()}`,
        }));

        res.json({ files: fileList });
    } catch (error) {
        console.error('Error listando archivos:', error.message);
        res.status(500).json({ error: 'Error al obtener la lista de archivos' });
    }
});

// Endpoint para leer un archivo completo
app.get('/api/blog/read/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        // Buscamos en el vault principal de RAG o en la Federación si es necesario
        // Por simplicidad, buscamos en BLOG_PATH
        const filePath = path.join(BLOG_PATH, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error leyendo archivo:', error.message);
        res.status(500).json({ error: 'Error al leer el archivo' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`==========================================`);
    console.log(`CAMS Backend Bridge está activo`);
    console.log(`Puerto local: http://localhost:${PORT}`);
    console.log(`Acceso desde red: http://${os.hostname()}:${PORT}`);
    console.log(`==========================================`);
});
