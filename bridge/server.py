from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
import requests
import base64
from datetime import datetime
from engine import FederatedQueryEngine, CAMS_BASE
from utils import is_safe_path, sanitize_filename

app = FastAPI(title="CAMS Mercure Bridge")
engine = FederatedQueryEngine()

# Configuración de Seguridad
MERCURE_TOKEN = os.environ.get("MERCURE_TOKEN", "cambiame-por-token-seguro")
HOST = os.environ.get("MERCURE_HOST", "0.0.0.0")
PORT = int(os.environ.get("MERCURE_PORT", 8000))
SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8001/search")

RESP_PATH = os.path.join(CAMS_BASE, 'respuestas')
os.makedirs(RESP_PATH, exist_ok=True)


class QueryRequest(BaseModel):
    query: str
    session_mode: bool = False
    agent: str = "bibliotecario" 
    file: Optional[dict] = None
    files: Optional[list] = None
    token: Optional[str] = None

def check_auth(token: str):
    if token != MERCURE_TOKEN:
        raise HTTPException(status_code=401, detail="No autorizado: Token de Mercure inválido.")

def load_profile():
    profile_path = os.path.join(CAMS_BASE, 'perfil')
    context = ""
    if os.path.exists(profile_path):
        for f in os.listdir(profile_path):
            if f.endswith(".md"):
                with open(os.path.join(profile_path, f), "r", encoding="utf-8") as file:
                    context += f"\n--- PERFIL {f}: ---\n{file.read()}\n"
    return context

def web_search(query):
    # Usando SearxNG as requested format
    try:
        response = requests.get(SEARXNG_URL, params={"q": query, "format": "json", "language": "es"}, timeout=7)
        if response.status_code == 200:
            results = response.json().get('results', [])
            return [{"title": r.get('title'), "url": r.get('url'), "body": r.get('content')} for r in results[:5]]
    except Exception as e:
        print(f"[SearxNG Error] {e}")
    return []

@app.post("/query")
async def process_query(request: QueryRequest):
    check_auth(request.token)
    images = []
    
    # Inyectar conciencia temporal
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_context = f"[SISTEMA]: La fecha y hora actual es: {now}\n"
    
    # Procesar archivos adjuntos (Unificado Multi-Archivo)
    all_req_files = request.files or []
    if request.file:
        all_req_files.append(request.file)

    file_contexts = []
    for f in all_req_files:
        f_type = f.get("type", "")
        f_name = f.get("name", "")
        f_data = f.get("data", "")

        if "image" in f_type:
            images.append(f_data)
            file_contexts.append(f"[SISTEMA]: Imagen adjunta ({f_name}).")
        else:
            try:
                # Si tenemos ruta en disco (optimizado), la usamos
                if f.get('path') and os.path.exists(f['path']):
                    with open(f['path'], 'r', encoding='utf-8') as f_in:
                        content = f_in.read()
                elif f_data:
                    raw_data = f_data.split(';base64,').pop()
                    content = base64.b64decode(raw_data).decode('utf-8', errors='ignore')
                else:
                    continue
                file_contexts.append(f"--- CONTENIDO DE ADJUNTO ({f_name}) ---\n{content}")
            except Exception as e:
                print(f"[Bridge] Error procesando archivo {f_name}: {e}")

    file_context = "\n\n".join(file_contexts)

    try:
        if request.agent == "debate":
            # Debate: Bibliotecario, Explorador, Investigador
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            local_context = engine.query(request.query, save_to_file=False)
            
            system_prompt = (
                "Eres el Moderador del Ágora Somática de CAMS.\n\n"
                "PROTOCOLO DE DISENSO:\n"
                "1. No busques una síntesis forzada. Tu objetivo NO es eliminar la contradicción, "
                "sino mapear las diferencias de opinión entre el Bibliotecario (Memoria Local) "
                "y el Investigador (Datos Externos).\n"
                "2. EL CAMINO DEL MEDIO: Si los agentes no están de acuerdo, documenta la tensión. "
                "Acepta que un hecho puede ser 'clínicamente útil' y 'técnicamente inconsistente' al mismo tiempo.\n"
                "3. CIERRE DE ÁGORA: El debate debe durar máximo 2 intervenciones por agente. "
                "Tras esto, genera una 'Cartografía de Perspectivas' en lugar de una conclusión cerrada.\n\n"
                "FORMATO DE SALIDA:\n"
                "1. MAPA DE TENSIONES: (Puntos donde los agentes difieren).\n"
                "2. CONVERGENCIAS: (Puntos donde están de acuerdo).\n"
                "3. ESPACIO PARA EL TERAPEUTA: (Pregunta abierta para que TÚ decantes la balanza).\n\n"
                "REGLA DE CIERRE: Si detectas un loop circular, detén la inferencia y declara la 'Paradoja Somática' actual. "
                "Ajustándome al estado, no al personaje."
            )
            
            prompt = f"{file_context}\n[PERFIL]:\n{profile}\n[WEB]:\n{web_txt}\n[LOCAL CAVEMAN]:\n{local_context['response']}\n\n[QUERY]:\n{request.query}"
            res_obj = engine.llm.chat(system_prompt, prompt, images=images)
            report = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "DEBATE.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🎙️ CAMS Debate: {request.query}\n\n{report}")
            return {"response": report, "agent": "debate", "usage": usage, "duration": duration}

        elif request.agent == "explorador":
            # El Explorador: Web + Perfil + Chat History
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            # Cargar historial (última respuesta) para modo chat
            chat_history = ""
            backup_path = os.path.join(CAMS_BASE, "backups", "explorador.md")
            if os.path.exists(backup_path):
                try:
                    with open(backup_path, "r", encoding="utf-8") as f:
                        chat_history = f.read()
                except: pass
            
            history_prompt = f"\n[NUESTRA CONVERSACIÓN ANTERIOR]:\n{chat_history}" if chat_history else ""
            
            system_prompt = (
                "Eres El Explorador del sistema CAMS Mercure.\n"
                "Eres un agente conversacional ágil, pragmático y observador.\n"
                "Tienes acceso a la información [WEB] en tiempo real y a las carpetas de configuración de perfil del usuario.\n"
                "REGLA DE TONO: Mantén una postura directa y crítica. Usa el Perfil del usuario solo como contexto, NO actúes como un adulador o fanático ('groupie').\n"
                "Debes basarte fuertemente en los resultados de [WEB] para sostener tus argumentos.\n"
                "Trata de dar continuidad a la NUESTRA CONVERSACIÓN ANTERIOR si el usuario hace referencia a ella.\n"
                "No uses conocimiento local indexado a no ser que sea estrictamente mencionado.\n"
            )
            prompt = f"{file_context}{history_prompt}\n[PROFILE]:\n{profile}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}"
            res_obj = engine.llm.chat(system_prompt, prompt, images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "EXPLORER.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🧭 Explorador CAMS\n\n{res}")
            return {"response": res, "agent": "explorador", "usage": usage, "duration": duration}

        elif request.agent == "investigador":
            # El Investigador: Cruza Local Caveman con Internet
            local = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            
            system_prompt = (
                "Eres El Investigador de CAMS Mercure.\n"
                "Tu principal habilidad es cruzar, contrastar y verificar la información local (Caveman) con el conocimiento vasto y actualizado de Internet.\n"
                "Identifica sinergias o contradicciones entre lo que el usuario sabe (LOCAL) y la verdad externa (WEB).\n"
                "Devuelve resúmenes factuales, citando qué viene de las notas locales y qué de la web."
            )
            
            res_obj = engine.llm.chat(system_prompt, f"{file_context}\n[LOCAL CAVEMAN]:\n{local['response']}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "INVESTIGATION.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🔍 Investigador CAMS\n\n{res}")
            return {"response": res, "agent": "investigador", "usage": usage, "duration": duration}

        elif request.agent == "arquitecto":
            local_context = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            # Cargar historial (última respuesta) para modo chat
            chat_history = ""
            backup_path = os.path.join(CAMS_BASE, "backups", "arquitecto.md")
            if os.path.exists(backup_path):
                try:
                    with open(backup_path, "r", encoding="utf-8") as f:
                        chat_history = f.read()
                except: pass

            history_prompt = f"\n[NUESTRA CONVERSACIÓN ANTERIOR]:\n{chat_history}" if chat_history else ""
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
                "RESTRICCIÓN: Ajustándote al estado, no al personaje."
            )
            res_obj = engine.llm.chat(system_prompt, f"{file_context}\n[CONTEXTO LOCAL]:\n[CONTEXTO LOCAL CAVEMAN]:\n{local_context['response']}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            res = res_obj["content"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            target_path = os.path.join(RESP_PATH, "ARQUITECTO.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 💻 Arquitecto IT\n\n{res}")
            return {"response": res, "agent": "arquitecto", "usage": usage, "duration": duration}

        else:
            # Bibliotecario: Estrictamente índice local Caveman + Bóvedas sin web
            res_obj = engine.query(request.query, file_context=file_context, images=images, save_to_file=False)
            res = res_obj["response"]
            usage = res_obj.get("usage", {})
            duration = res_obj.get("duration", 0)
            
            with open(os.path.join(RESP_PATH, "BIBLIOTECARIO.md"), "w", encoding="utf-8") as f:
                f.write(f"# 📚 Bibliotecario CAMS\n\n{res}")
            return {"response": res, "agent": "bibliotecario", "usage": usage, "duration": duration}

    except Exception as e:
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
        res = engine.llm.chat(system_prompt, request.query)
        return {"response": res, "agent": "caveman_encoder"}
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
        res = engine.llm.chat(system_prompt, request.query)
        return {"response": res, "agent": "caveman_decoder"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WikiIndexRequest(BaseModel):
    folder: str
    files: list
    token: Optional[str] = None

def build_caveman_index(folder: str, files: list):
    """Background task to read markdown files, compress them using Caveman protocol, and index them."""
    print(f"[Wiki Scanner] Iniciando compresión Caveman para {len(files)} archivos en {folder}...")
    
    system_prompt = (
        "Eres un Codificador de Compresión Semántica.\n"
        "TU OBJETIVO: Resumir el texto proporcionado reduciendo tokens en un 60% sin perder hechos vitales.\n"
        "REGLAS:\n"
        "1. Quita gramática redundante. Usa formato Caveman (estilo troglodita telegráfico).\n"
        "2. Mantén sustantivos, verbos de acción, números, nombres y conceptos clave.\n"
        "3. Máximo 50 palabras por resumen.\n"
        "4. Solo devuelve el resumen codificado, nada más."
    )
    
    wiki_content = f"# 🦴 Caveman Wiki Index: {os.path.basename(folder)}\n\n"
    
    for fpath in files:
        if not os.path.exists(fpath): continue
        if os.path.basename(fpath) == "_wiki.md": continue # No indexar el índice
        
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()[:2000] # Leer primeros 2000 chars para no saturar contexto
                
            if len(content.strip()) < 50: continue # Ignorar notas vacías
            
            # Pedir resumen Caveman al LLM
            prompt = f"REDUCE ESTO A HECHOS PUROS:\n\n{content}"
            res = engine.llm.chat(system_prompt, prompt)
            
            # Limpiar posible markdown o conversación extra del LLM
            clean_res = res.replace("\n\n", " ").strip()
            
            wiki_content += f"## {os.path.basename(fpath)}\n> {clean_res}\n\n"
            print(f"  └ 🦴 Comprimido: {os.path.basename(fpath)}")
        except Exception as e:
            print(f"  └ ❌ Error en {fpath}: {str(e)}")
            
    # Escribir el _wiki.md final en la carpeta original del usuario
    wiki_path = os.path.join(folder, "_wiki.md")
    try:
        with open(wiki_path, "w", encoding="utf-8") as f:
            f.write(wiki_content)
        print(f"[Wiki Scanner] ✅ Compresión completada. Guardado en {wiki_path}")
    except Exception as e:
        print(f"[Wiki Scanner] ❌ Error guardando _wiki.md: {str(e)}")


@app.post("/wiki/index")
async def wiki_index(request: WikiIndexRequest, background_tasks: BackgroundTasks):
    check_auth(request.token)
    
    # Blindaje contra Path Traversal: Validar que la carpeta esté en el vault
    if not is_safe_path(CAMS_BASE, request.folder):
        raise HTTPException(status_code=403, detail="Acceso denegado: Carpeta fuera de la bóveda de Mercure.")
    
    # Validar cada archivo individualmente
    safe_files = [f for f in request.files if is_safe_path(CAMS_BASE, f)]
    if len(safe_files) < len(request.files):
        print(f"⚠️ Filtrados {len(request.files) - len(safe_files)} archivos por seguridad.")

    print(f"📖 Indexando nueva bóveda: {request.folder} ({len(safe_files)} archivos seguros)")
    background_tasks.add_task(build_caveman_index, request.folder, safe_files)
    return {"status": "indexed", "folder": request.folder, "message": "Proceso Caveman iniciado"}

if __name__ == "__main__":
    print(f"🛡️ Servidor Mercure asegurado levantado en {HOST}:{PORT}")
    print(f"🔑 Token de acceso configurado: {MERCURE_TOKEN[:3]}...{MERCURE_TOKEN[-3:]}")
    uvicorn.run(app, host=HOST, port=PORT)
