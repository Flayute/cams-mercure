import os
import uvicorn
import requests
import base64
import subprocess
import json
import asyncio
import markdown
import sys
import pypdf
import io
import base64
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from engine import FederatedQueryEngine, CAMS_BASE
from utils import is_safe_path, sanitize_filename

app = FastAPI(title="CAMS Mercure Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
engine = FederatedQueryEngine()

# Configuración de Seguridad
MERCURE_TOKEN = os.environ.get("MERCURE_TOKEN", "cambiame-por-token-seguro")
HOST = os.environ.get("MERCURE_HOST", "0.0.0.0")
PORT = int(os.environ.get("MERCURE_PORT", 8000))
SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8001/search")

RESP_PATH = os.path.join(CAMS_BASE, 'respuestas')
os.makedirs(RESP_PATH, exist_ok=True)


class PDFRequest(BaseModel):
    html: str
    title: Optional[str] = "Documento CAMS"
    font_size: Optional[str] = "12pt"

@app.post("/api/render/pdf")
async def render_pdf(request: PDFRequest):
    try:
        # Usamos el HTML ya renderizado que viene del frontend (incluye Mermaid SVGs)
        html_content = request.html
        
        # 2. Plantilla Pro CSS (Maquetación Editorial)
        font_config = FontConfiguration()
        css = CSS(string=f"""
            @page {{
                size: A4;
                margin: 25mm 20mm 25mm 20mm;
                @bottom-right {{
                    content: counter(page);
                    font-family: 'serif';
                    font-size: 10pt;
                }}
                @bottom-left {{
                    content: "{request.title}";
                    font-family: 'serif';
                    font-size: 9pt;
                    color: #666;
                }}
            }}
            body {{
                font-family: 'serif', 'Times New Roman', serif;
                font-size: {request.font_size};
                line-height: 1.6;
                text-align: justify;
                color: #333;
            }}
            h1 {{ text-align: center; color: #1a1a1a; margin-bottom: 30pt; border-bottom: 2px solid #333; padding-bottom: 10pt; }}
            h2 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5pt; margin-top: 25pt; }}
            h3 {{ color: #34495e; }}
            blockquote {{
                margin: 20pt 0;
                padding: 10pt 20pt;
                background: #f9f9f9;
                border-left: 5pt solid #ddd;
                font-style: italic;
            }}
            code {{ background: #f4f4f4; padding: 2pt 4pt; border-radius: 3pt; font-family: monospace; }}
            pre {{ background: #f4f4f4; padding: 10pt; border-radius: 5pt; white-space: pre-wrap; }}
            img {{ max-width: 100%; height: auto; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20pt 0; }}
            th, td {{ border: 1px solid #ddd; padding: 8pt; text-align: left; }}
            th {{ background: #f2f2f2; }}
            /* Soporte para contenedores de Mermaid en PDF */
            .mermaid-container {{ text-align: center; margin: 20px 0; }}
            svg {{ max-width: 100%; height: auto; }}
        """)

        # 3. Generar PDF
        full_html = f"<html><head><meta charset='UTF-8'></head><body>{html_content}</body></html>"
        pdf_bytes = HTML(string=full_html).write_pdf(stylesheets=[css], font_config=font_config)
        
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        print(f"[PDF Error] {e}")
        raise HTTPException(status_code=500, detail=str(e))

class QueryRequest(BaseModel):
    query: str
    session_mode: bool = False
    agent: str = "bibliotecario" 
    file: Optional[dict] = None
    files: Optional[list] = None
    clientId: Optional[str] = None
    token: Optional[str] = None
    thinking: bool = False

def check_auth(token: str):
    if token != MERCURE_TOKEN:
        raise HTTPException(status_code=401, detail="No autorizado: Token de Mercure inválido.")

def load_session_memory():
    session_path = os.path.join(CAMS_BASE, 'backups', 'session.md')
    if os.path.exists(session_path):
        try:
            with open(session_path, "r", encoding="utf-8") as f:
                content = f.read()
                parts = content.split('\n---\n')
                if len(parts) > 6:
                    content = parts[0] + '\n---\n' + '\n---\n'.join(parts[-5:])
                return f"\n[WIKI EFÍMERO DE SESIÓN (Últimas 5 interacciones)]:\n{content}\n"
        except: pass
    return ""

def load_profile():
    # Carga el perfil del usuario (engrama de identidad)
    profile_path = os.path.join(CAMS_BASE, 'profile.json')
    if os.path.exists(profile_path):
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                return f.read()
        except: pass
    return "Perfil no configurado."

def web_search(query):
    # Usando SearxNG
    try:
        response = requests.get(SEARXNG_URL, params={"q": query, "format": "json", "language": "es"}, timeout=7)
        if response.status_code == 200:
            results = response.json().get('results', [])
            return [{"title": r.get('title'), "url": r.get('url'), "body": r.get('content')} for r in results[:5]]
    except Exception as e:
        print(f"[SearxNG Error] {e}")
    return []

def load_client_history(client_id):
    if not client_id:
        return ""
    history_path = os.path.join(CAMS_BASE, 'clientes', client_id, 'history.md')
    profile_path = os.path.join(CAMS_BASE, 'clientes', client_id, 'profile.json')
    
    context = "\n[CONTEXTO DEL CASO SOMÁTICO/CLIENTE]:\n"
    if os.path.exists(profile_path):
        with open(profile_path, "r", encoding="utf-8") as f:
            context += f"PERFIL: {f.read()}\n"
    
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            content = f.read()
            parts = content.split('\n### 🧠 Registro del Sistema')
            if len(parts) > 6:
                content = parts[0] + '\n### 🧠 Registro del Sistema' + '\n### 🧠 Registro del Sistema'.join(parts[-5:])
            context += f"HISTORIAL (Últimos 5 registros):\n{content}\n"
    
    return context if len(context) > 40 else ""

def load_agent_history(agent_name):
    backup_path = os.path.join(CAMS_BASE, "backups", f"{agent_name}.md")
    if os.path.exists(backup_path):
        try:
            with open(backup_path, "r", encoding="utf-8") as f:
                content = f.read()
                parts = content.split('\n---\n')
                if len(parts) > 6:
                    content = parts[0] + '\n---\n' + '\n---\n'.join(parts[-5:])
                return f"\n[NUESTRA CONVERSACIÓN ANTERIOR]:\n{content}"
        except: pass
    return ""

@app.get("/api/services/status")
async def get_services_status():
    # Comprobar si llama-server está en ejecución
    import subprocess
    is_running = subprocess.run("pgrep -f llama-server", shell=True).returncode == 0
    return {
        "llm": "running" if is_running else "stopped",
        "bridge": "running"
    }

@app.post("/api/services/start")
async def start_llm(request: dict):
    try:
        # Lanzar el script inteligente que acabamos de arreglar
        cmd = "bash ../scripts/llama-mercure.sh <<EOF\n1\nEOF" # Automatiza la selección del primer modelo
        subprocess.Popen(cmd, shell=True, start_new_session=True)
        return {"status": "starting"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/services/stop")
async def stop_llm():
    subprocess.run("fuser -k 8080/tcp", shell=True)
    return {"status": "stopped"}

@app.get("/api/agent/backup/{agent_name}")
async def get_backup(agent_name: str):
    content = load_agent_history(agent_name)
    return {"content": content}

@app.get("/api/services/models")
async def get_models():
    # Escaneo dinámico de la carpeta de modelos
    models_path = os.path.join(CAMS_BASE, "models")
    models = {}
    if os.path.exists(models_path):
        for f in os.listdir(models_path):
            if f.endswith(".gguf"):
                models[f] = {"name": f.replace(".gguf", "")}
    return models

@app.post("/query")
@app.post("/api/agent/query")
async def process_query(request: QueryRequest):
    try:
        check_auth(request.token)
        images = []
        
        # Inyectar conciencia temporal
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file_context = f"[SISTEMA]: La fecha y hora actual es: {now}\n"
        
        # Instrucción de razonamiento profundo (Thinking Mode)
        thinking_instruction = ""
        if request.thinking:
            thinking_instruction = (
                "\n\n[MODO RAZONAMIENTO ACTIVADO]:\n"
                "Antes de responder, debes realizar un razonamiento interno profundo. "
                "Analiza las contradicciones, evalúa la evidencia del contexto Caveman y planifica tu respuesta paso a paso. "
                "Muestra este razonamiento de forma clara antes de la conclusión final."
            )
        
        # Procesar archivos adjuntos (Unificado Multi-Archivo)
        all_req_files = request.files or []
        if request.file:
            all_req_files.append(request.file)

        for f in all_req_files:
            f_type = f.get("type", "")
            f_name = f.get("name", "")
            f_data = f.get("data", "")

            if "image" in f_type:
                images.append(f_data)
                file_context += f"\n[SISTEMA]: Imagen adjunta recibida: '{f_name}'.\n"
            else:
                try:
                    import subprocess
                    content = ""
                    if f.get('path') and os.path.exists(f['path']):
                        file_path = f['path']
                        if file_path.lower().endswith('.pdf'):
                            content = extract_text_from_pdf(file_path)
                        else:
                            try:
                                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f_in:
                                    content = f_in.read()[:5000] # Límite para no saturar
                            except Exception as e:
                                print(f"[Bridge] Error leyendo archivo: {e}")
                    elif f_data:
                        try:
                            raw_data = f_data.split(';base64,').pop()
                            file_bytes = base64.b64decode(raw_data)
                            
                            if f_type == "application/pdf" or f_name.lower().endswith('.pdf'):
                                # Extraer texto de PDF en memoria
                                pdf_stream = io.BytesIO(file_bytes)
                                reader = pypdf.PdfReader(pdf_stream)
                                pdf_text = ""
                                for i in range(min(10, len(reader.pages))):
                                    pdf_text += reader.pages[i].extract_text() + "\n"
                                content = pdf_text[:5000]
                            else:
                                # Asumir texto plano
                                content = file_bytes.decode('utf-8', errors='ignore')[:5000]
                        except Exception as e:
                            print(f"[Bridge] Error procesando base64: {e}")
                    
                    if content:
                        file_context += f"\n--- CONTENIDO DE ADJUNTO ({f_name}) ---\n{content}\n"
                except Exception as e:
                    print(f"[Bridge] Error procesando archivo {f_name}: {e}")

        # Lógica de Agentes
        if request.agent == "debate":
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            local_context = engine.query(request.query, save_to_file=False)
            
            system_prompt = (
                "Eres la JUNTA DE EXPERTOS de CAMS Mercure. Tu objetivo es realizar una CONSULTA MULTIDISCIPLINAR sobre el caso.\n\n"
                "PERSONAJES DE LA JUNTA:\n"
                "1. EL PSICÓLOGO (Perspectiva Psicosomática): Analiza patrones emocionales, trauma y la 'Espiral de Erikson'. Busca el 'Para qué' del síntoma.\n"
                "2. EL FISIOTERAPEUTA (Perspectiva Somática): Analiza la estructura, el tejido y la manifestación física. Riguroso y biomecánico.\n"
                "3. EL NEUROCIENTÍFICO (Base Científica): Traduce las tensiones a neuroquímica, plasticidad y sistema nervioso autónomo. Da soporte empírico.\n\n"
                "PROTOCOLO DE OPERACIÓN:\n"
                "- No busques consenso rápido. Permite que las disciplinas dialoguen y contrasten.\n"
                "- Integra el [CONTEXTO DEL CASO] y el [WIKI EFÍMERO] si están presentes.\n"
                "- Formato de Salida: \n"
                "  - 🧠 ANÁLISIS PSICOSOMÁTICO\n"
                "  - 🦴 EVALUACIÓN SOMÁTICA\n"
                "  - 🔬 SOPORTE NEUROCIENTÍFICO\n"
                "  - 🏛️ SÍNTESIS TRANSVERSAL (Cartografía de Perspectivas)."
            ) + thinking_instruction
            
            session_ctx = load_session_memory() if request.session_mode else ""
            client_ctx = load_client_history(request.clientId)
            history_prompt = load_agent_history("debate")
            prompt = f"{file_context}\n[PERFIL]:\n{profile}\n[WEB]:\n{web_txt}\n[LOCAL CAVEMAN]:\n{local_context['response']}\n{session_ctx}\n{client_ctx}{history_prompt}\n\n[QUERY]:\n{request.query}"
            res_obj = engine.llm.chat(system_prompt, prompt, images=images)
            report = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "DEBATE.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🎙️ CAMS Debate: {request.query}\n\n{report}")
            return {"response": report, "agent": "debate", "usage": usage, "duration": duration}

        elif request.agent == "explorador":
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            history_prompt = load_agent_history("explorador")
            
            system_prompt = (
                "Eres El Explorador de CAMS Mercure. Eres un agente conversacional ágil, curioso y elocuente.\n"
                "TU ESTILO: Conversacional, fluido y 'charlatán' (al estilo Gemini). No te limites a escupir fuentes; analiza la información, genera 'factos' interesantes y charla con el usuario sobre lo que encuentras.\n"
                "REGLA DE TONO: Directo y crítico, pero amable. No eres un robot, eres un observador de la realidad digital.\n"
                "BASES: Usa fuertemente los resultados de [WEB] para sostener el diálogo, pero aporta tu propia 'chispa' analítica.\n"
                "MEMORIA: Conecta los hitos del [WIKI EFÍMERO] o [HISTORIAL DEL CASO] con el mundo exterior de forma narrativa.\n"
            ) + thinking_instruction
            session_ctx = load_session_memory() if request.session_mode else ""
            client_ctx = load_client_history(request.clientId)
            prompt = f"{file_context}{history_prompt}{session_ctx}{client_ctx}\n[PROFILE]:\n{profile}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}"
            res_obj = engine.llm.chat(system_prompt, prompt, images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "EXPLORER.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🧭 Explorador CAMS\n\n{res}")
            return {"response": res, "agent": "explorador", "usage": usage, "duration": duration}

        elif request.agent == "investigador":
            local = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            
            system_prompt = (
                "Eres El Investigador de CAMS Mercure. Eres un puente entre el conocimiento local y la inmensidad de la red.\n"
                "TU OBJETIVO: Contrastar y verificar la información local (Caveman) con el conocimiento externo.\n"
                "FLEXIBILIDAD CONCEPTUAL: Sé abierto de mente. No descartes conceptos 'new age', esotéricos o alternativos solo porque no tengan una base científica evidente. "
                "Explóralos, contrástalos y busca sinergias o puntos de fricción sin ponerte a la defensiva.\n"
                "SALIDA: Resúmenes factuales, citando fuentes locales y web, permitiendo que el usuario decante su propia verdad."
            ) + thinking_instruction
            
            session_ctx = load_session_memory() if request.session_mode else ""
            client_ctx = load_client_history(request.clientId)
            history_prompt = load_agent_history("investigador")
            res_obj = engine.llm.chat(system_prompt, f"{file_context}{session_ctx}{client_ctx}{history_prompt}\n[LOCAL CAVEMAN]:\n{local['response']}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "INVESTIGATION.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🔍 Investigador CAMS\n\n{res}")
            return {"response": res, "agent": "investigador", "usage": usage, "duration": duration}

        elif request.agent == "arquitecto":
            profile = load_profile()
            local_context = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            history_prompt = load_agent_history("arquitecto")

            system_prompt = (
                "Eres el Arquitecto de Engramas de CAMS Mercure.\n\n"
                "NATURALEZA DEL CONTEXTO:\n"
                "Tienes acceso a una Wiki Caveman que es una librería INCOMPLETA y EN CONSTRUCCIÓN. "
                "No la consideres una verdad total; es un registro de hechos puros y tokens minimizados "
                "que tú debes interpretar, decodificar y expandir con tu criterio técnico.\n\n"
                "INSTRUCCIONES DE OPERACIÓN:\n"
                "1. DECODIFICACIÓN CAVEMAN: Al consultar la Wiki, actúa como un intérprete. Reconstruye el "
                "flujo lógico de los hechos comprimidos (ej: Px, TE, LC) sin inventar datos, usando tu "
                "experiencia para llenar los huecos de infraestructura.\n"
                "2. DISEÑO ADAPTATIVO: Prioriza soluciones de 'fricción cero' y 'soberanía canalla'. "
                "Evita la burocracia corporativa (OAuth2 complejo, mTLS) a menos que la seguridad del "
                "dato clínico sea el único camino. CAMS debe ser una extensión del sistema nervioso, no un estorbo.\n"
                "3. TONO: Profesional, colaborativo y directo. Eres parte del sistema, no un consultor externo. "
                "Tu análisis debe servir siempre para la acción somática y la eficiencia en hardware local (8GB VRAM).\n"
                "4. REGLA DE ORO: Pregunta, deduce y diseña. Si la Wiki no tiene la respuesta, razona desde los "
                "pilares de CAMS (Privacidad, Nobara Linux, Local-First). Jamás vomites código innecesario; "
                "ofrece scripts solo como 'andamios' o si se te pide explícitamente.\n\n"
                "PENSAMIENTO PROFUNDO: Tienes permiso para tomarte tu tiempo (hasta 10 minutos). Genera informes extensos, detallados y estructurados. No escatimes en profundidad.\n"
                "RESTRICCIÓN: Ajustándote al estado, no al personaje."
            ) + thinking_instruction
            session_ctx = load_session_memory() if request.session_mode else ""
            client_ctx = load_client_history(request.clientId)
            res_obj = engine.llm.chat(system_prompt, f"{file_context}{session_ctx}{client_ctx}{history_prompt}\n[PERFIL]:\n{profile}\n[CONTEXTO LOCAL]:\n[CONTEXTO LOCAL CAVEMAN]:\n{local_context['response']}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "ARQUITECTO.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 💻 Arquitecto IT\n\n{res}")
            return {"response": res, "agent": "arquitecto", "usage": usage, "duration": duration}

        elif request.agent == "heraldo":
            profile = load_profile()
            local_context = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            history_prompt = load_agent_history("heraldo")

            system_prompt = (
                "Eres El Heraldo de CAMS Mercure, experto en Marketing Psicológico, Branding Personal y Promoción Ética.\n"
                "Considera los engramas de identidad en la carpeta 'perfil' como tu base existencial y soberana.\n"
                "TU OBJETIVO: Transformar la excelencia técnica y profesional del usuario en un mensaje magnético, persuasivo y ético.\n"
                "TONO: Motivador, astuto, creativo, enfocado en el valor percibido y el 'storytelling'. Sabes cómo vender sin que parezca que estás vendiendo.\n"
                "TAREAS COMUNES: Redactar posts, diseñar campañas, crear estrategias de marca personal, encontrar el 'gancho' en proyectos para audiencias.\n"
                "REGLA ESTRICTA: Eres un experto en comunicación, NO un programador. BAJO NINGUNA CIRCUNSTANCIA debes escribir código, scripts o configuraciones técnicas. Limítate exclusivamente a la estrategia de marketing y al copy.\n"
                "Usa el contexto para inspirarte y dar respuestas aplicables y directas."
            ) + thinking_instruction
            session_ctx = load_session_memory() if request.session_mode else ""
            client_ctx = load_client_history(request.clientId)
            res_obj = engine.llm.chat(system_prompt, f"{file_context}{session_ctx}{client_ctx}{history_prompt}\n[PERFIL]:\n{profile}\n[CONTEXTO LOCAL]:\n{local_context['response']}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "HERALDO.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 📣 El Heraldo (Marketing)\n\n{res}")
            return {"response": res, "agent": "heraldo", "usage": usage, "duration": duration}

        elif request.agent == "cartografo":
            # El Cart\u00f3grafo NO necesita RAG ni b\u00fasqueda web.
            # Va DIRECTO al LLM con el texto de entrada para m\u00e1xima velocidad.
            system_prompt = (
                "Eres El Cart\u00f3grafo de CAMS Mercure, un ingeniero de sistemas visuales y experto en React Flow.\\n"
                "TU \u00danica MISI\u00d3N: Transformar estrategias, textos o ideas complejas en estructuras de datos JSON estrictas para nuestro Neuro-Canvas.\\n"
                "REGLA DE ORO ABSOLUTA: Responde \u00danica y EXCLUSIVAMENTE con un bloque JSON v\u00e1lido. Sin saludos, sin explicaciones, sin markdown extra. Solo el JSON puro.\\n"
                "El JSON debe tener esta estructura exacta:\\n"
                "{\\n"
                "  \"nodes\": [\\n"
                "    { \"id\": \"1\", \"type\": \"agentNode\", \"data\": { \"label\": \"T\u00edtulo corto\", \"agent\": \"heraldo\", \"content\": \"Resumen del paso\", \"icon\": \"\ud83d\udce3\" }, \"position\": { \"x\": 100, \"y\": 100 } }\\n"
                "  ],\\n"
                "  \"edges\": [\\n"
                "    { \"id\": \"e1-2\", \"source\": \"1\", \"target\": \"2\" }\\n"
                "  ]\\n"
                "}\\n"
                "Agentes permitidos en el campo 'agent': heraldo, arquitecto, investigador, bibliotecario, debate, cartografo.\\n"
                "Distribuye las posiciones X e Y de forma l\u00f3gica (flujo de izquierda a derecha o arriba a abajo, con separaci\u00f3n de 250px entre nodos).\\n"
                "Si el texto tiene fases o etapas, cada una se convierte en un nodo. Conecta los nodos en orden con edges."
            )
            # Añadimos /no_think para obligar al modelo (ej. Qwen3) a no usar tokens de razonamiento
            res_obj = engine.llm.chat(
                system_prompt, 
                f"/no_think\n[TEXTO A CONVERTIR EN JSON]:\n{request.query}", 
                images=images
            )
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)

            # --- NORMALIZADOR DE FORMATO ---
            # El modelo puede devolver diferentes formatos. Lo normalizamos aquí.
            import re as _re
            def normalize_cartografo_json(raw):
                # Extraer bloque JSON de dentro de ```json ... ``` si existe
                match = _re.search(r"```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```", raw)
                if match:
                    raw = match.group(1)
                else:
                    # Buscar el primer { o [ en el texto
                    start = min(
                        raw.find("{") if raw.find("{") != -1 else len(raw),
                        raw.find("[") if raw.find("[") != -1 else len(raw)
                    )
                    if start < len(raw):
                        raw = raw[start:]

                try:
                    parsed = json.loads(raw)
                    # Si es una lista, asumir que son nodos y generar edges automáticamente
                    if isinstance(parsed, list):
                        nodes = parsed
                        # Asegurar que cada nodo tiene el campo 'type' y 'data'
                        for i, n in enumerate(nodes):
                            if "id" not in n:
                                n["id"] = str(i + 1)
                            if "type" not in n:
                                n["type"] = "agentNode"
                            if "position" not in n:
                                n["position"] = {"x": 100 + (i % 3) * 300, "y": 100 + (i // 3) * 200}
                        edges = [
                            {"id": f"e{i+1}-{i+2}", "source": str(nodes[i]["id"]), "target": str(nodes[i+1]["id"])}
                            for i in range(len(nodes) - 1)
                        ]
                        return json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)
                    # Si ya tiene la estructura correcta, devolverlo tal cual
                    if "nodes" in parsed:
                        return json.dumps(parsed, ensure_ascii=False)
                except Exception:
                    pass
                # Si todo falla, devolver el texto original para que el frontend lo maneje
                return raw

            res = normalize_cartografo_json(res)

            target_path = os.path.join(RESP_PATH, "CARTOGRAFO.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🗺️ Cartógrafo Visual\n\n{res}")
            return {"response": res, "agent": "cartografo", "usage": usage, "duration": duration}


        else:
            # Bibliotecario
            history_prompt = load_agent_history("bibliotecario")
            res_obj = engine.query(request.query, file_context=file_context + thinking_instruction, images=images, save_to_file=False, agent_history=history_prompt)
            res = res_obj["response"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            with open(os.path.join(RESP_PATH, "BIBLIOTECARIO.md"), "w", encoding="utf-8") as f:
                f.write(f"# 📚 Bibliotecario CAMS\n\n{res}")
            return {"response": res, "agent": "bibliotecario", "usage": usage, "duration": duration}

    except Exception as e:
        print(f"[Bridge Error] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/caveman/encode")
async def caveman_encode(request: QueryRequest):
    try:
        system_prompt = (
            "Eres un Codificador de Compresión Semántica (Caveman Standard).\n"
            "TU OBJETIVO: Reducir tokens en un 50-60% sin perder hechos.\n"
            "REGLAS CRÍTICAS:\n"
            "1. Quita gramática (artículos, preposiciones, conectores).\n"
            "2. Pensamientos ATÓMICOS: 2-5 palabras por frase.\n"
            "3. Voz ACTIVA siempre: 'Fijar motor' en lugar de 'El motor debe ser fijado'.\n"
            "4. PRESERVAR: Números, fechas, nombres propios e identificadores técnicos.\n"
            "5. NO cortesía ni relleno. Solo hechos puros."
        )
        res_obj = engine.llm.chat(system_prompt, request.query)
        return {"response": res_obj["content"], "agent": "caveman_encoder"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/caveman/decode")
async def caveman_decode(request: QueryRequest):
    try:
        system_prompt = (
            "Eres un Descodificador de Engrama Neuro-Troglodita.\n"
            "Recibes un debate comprimido en formato 'Caveman' (hechos puros).\n"
            "TU TAREA: Reconstruir la gramática y el flujo narrativo.\n"
            "SALIDA: Un informe formal, técnico y empático para el Obsidian del usuario.\n"
            "IMPORTANTE: No inventes hechos, expande los conceptos comprimidos."
        )
        res_obj = engine.llm.chat(system_prompt, request.query)
        return {"response": res_obj["content"], "agent": "caveman_decoder"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WikiIndexRequest(BaseModel):
    folder: str
    files: list
    token: Optional[str] = None

def extract_text_from_pdf(pdf_path: str, max_chars: int = 5000) -> str:
    """Extrae texto de un archivo PDF de forma segura."""
    try:
        text = ""
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            # Solo procesamos las primeras 10 páginas por rendimiento/tokens
            for i in range(min(10, len(reader.pages))):
                text += reader.pages[i].extract_text() + "\n"
        return text[:max_chars]
    except Exception as e:
        print(f"[PDF Error] No se pudo leer {pdf_path}: {e}")
        return ""

def build_caveman_index(folder: str, files: list):
    """Background task to read markdown files, compress them using Caveman protocol, and index them."""
    print(f"[Wiki Scanner] Iniciando compresión Caveman para {len(files)} archivos en {folder}...")
    
    system_prompt = (
        "Eres un Codificador de Compresión Semántica (Caveman Standard).\n"
        "TU OBJETIVO: Resumir el texto reduciendo tokens en un 70% sin perder HECHOS, PATRONES o SÍNTOMAS.\n"
        "REGLAS:\n"
        "1. Quita gramática redundante. Usa formato telegráfico.\n"
        "2. Identifica 'Marcadores Somáticos' (emociones ligadas a sensaciones físicas).\n"
        "3. Mantén nombres, fechas y diagnósticos.\n"
        "4. Máximo 40 palabras por resumen.\n"
        "5. Solo devuelve el resumen codificado."
    )
    
    wiki_content = f"# 🦴 Caveman Wiki Index: {os.path.basename(folder)}\n\n"
    
    for fpath in files:
        if not os.path.exists(fpath): continue
        if os.path.basename(fpath) == "_wiki.md": continue 
        
        try:
            mtime = os.path.getmtime(fpath)
            # Intentar recuperar de la caché incremental
            cached_res = engine.get_cached_caveman(fpath, mtime)
            
            if cached_res and cached_res[1] is not None:
                res, emb_blob = cached_res
                print(f"  └ ⚡ Caché: {os.path.basename(fpath)}")
            else:
                content = ""
                if fpath.lower().endswith('.pdf'):
                    content = extract_text_from_pdf(fpath)
                else:
                    # Asumir texto/markdown
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            content = f.read()[:3000]
                    except:
                        pass
                    
                if len(content.strip()) < 50: continue 
                
                prompt = f"REDUCE ESTO A HECHOS PUROS:\n\n{content}"
                res_obj = engine.llm.chat(system_prompt, prompt)
                res = res_obj.get("content", "")
                
                # Generar embedding para búsqueda semántica
                emb = engine.embed_text(res)
                # Guardar en caché para la próxima vez
                engine.save_cached_caveman(fpath, mtime, res, embedding=emb)
                print(f"  └ 🦴 Comprimido: {os.path.basename(fpath)}")
            
            clean_res = res.replace("\n\n", " ").strip()
            wiki_content += f"## {os.path.basename(fpath)}\n> {clean_res}\n\n"
        except Exception as e:
            print(f"  └ ❌ Error en {fpath}: {str(e)}")
            
    wiki_path = os.path.join(folder, "_wiki.md")
    try:
        with open(wiki_path, "w", encoding="utf-8") as f:
            f.write(wiki_content)
        print(f"[Wiki Scanner] ✅ Compresión completada. Guardado en {wiki_path}")
    except Exception as e:
        print(f"[Wiki Scanner] ❌ Error guardando _wiki.md: {str(e)}")


@app.post("/wiki/index")
async def wiki_index(request: WikiIndexRequest, background_tasks: BackgroundTasks):
    try:
        check_auth(request.token)
        
        home_dir = os.path.expanduser('~')
        if not is_safe_path(home_dir, request.folder):
            raise HTTPException(status_code=403, detail="Acceso denegado: Carpeta fuera del directorio de usuario.")
        
        safe_files = [f for f in request.files if is_safe_path(home_dir, f)]
        if len(safe_files) < len(request.files):
            print(f"⚠️ Filtrados {len(request.files) - len(safe_files)} archivos por seguridad.")

        print(f"📖 Indexando nueva bóveda: {request.folder} ({len(safe_files)} archivos seguros)")
        background_tasks.add_task(build_caveman_index, request.folder, safe_files)
        return {"status": "indexed", "folder": request.folder, "message": "Proceso Caveman iniciado"}
    except Exception as e:
        print(f"[Bridge Error] Error en /wiki/index: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

# ── ECOSYSTEM & SATELLITE CONTROL ──────────

PI_IP = "100.95.137.80"
PI_USER = "intrusivethought"
SSH_KEY = os.path.expanduser("~/.ssh/id_mercure")

async def get_remote_stats():
    try:
        # Comando para obtener CPU, RAM y Modo
        cmd = f"ssh -i {SSH_KEY} {PI_USER}@{PI_IP} \"top -bn1 | grep 'Cpu(s)' | awk '{{print \\$2}}'; free -m | grep Mem | awk '{{print \\$3/\\$2 * 100}}'; [ -f /tmp/stationary_mode ] && echo 'STATIONARY' || echo 'SHADOW'\""
        process = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if process.returncode == 0:
            lines = stdout.decode().strip().split('\n')
            cpu_val = lines[0].replace(',', '.')
            ram_val = lines[1].replace(',', '.')
            return {
                "status": "online",
                "cpu": f"{cpu_val}%",
                "ram": f"{int(float(ram_val))}%",
                "mode": lines[2] if len(lines) > 2 else "SHADOW"
            }
    except Exception as e:
        print(f"Error satélite: {e}")
    return {"status": "offline", "cpu": "0%", "ram": "0%", "mode": "UNKNOWN"}

@app.get("/ecosystem/status")
async def ecosystem_status():
    # Stats Locales (Acer)
    import psutil
    local_stats = {
        "name": "ACER-HUB",
        "cpu": f"{psutil.cpu_percent()}%",
        "ram": f"{psutil.virtual_memory().percent}%",
        "status": "online"
    }
    
    # Stats Remotos (Pi 500)
    remote_stats = await get_remote_stats()
    remote_stats["name"] = "PI-500-SATELLITE"
    
    return {
        "nodes": [local_stats, remote_stats],
        "timestamp": datetime.now().isoformat()
    }

@app.post("/ecosystem/command")
async def ecosystem_command(cmd_request: dict):
    target = cmd_request.get("target", "pi")
    command = cmd_request.get("command", "")
    
    if target == "pi":
        full_cmd = f"ssh -i {SSH_KEY} {PI_USER}@{PI_IP} \"{command}\""
        try:
            result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=15)
            return {
                "status": "success" if result.returncode == 0 else "error",
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    elif target == "acer":
        try:
            # Ejecución local segura (dentro de la carpeta del proyecto)
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=15, cwd=os.path.dirname(os.path.dirname(__file__)))
            return {
                "status": "success" if result.returncode == 0 else "error",
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    return {"status": "error", "message": "Target no soportado"}

if __name__ == "__main__":
    print(f"🛡️ Servidor Mercure asegurado levantado en {HOST}:{PORT}")
    print(f"🔑 Token de acceso configurado: {MERCURE_TOKEN[:3]}...{MERCURE_TOKEN[-3:]}")
    uvicorn.run(app, host=HOST, port=PORT)
