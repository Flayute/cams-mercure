from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os
import requests
import base64
from engine import FederatedQueryEngine, CAMS_BASE

app = FastAPI(title="CAMS Mercure Bridge")
engine = FederatedQueryEngine()

RESP_PATH = os.path.join(CAMS_BASE, 'respuestas')
os.makedirs(RESP_PATH, exist_ok=True)


class QueryRequest(BaseModel):
    query: str
    session_mode: bool = False
    agent: str = "bibliotecario" 
    file: Optional[dict] = None

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
        url = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8080/search")
        response = requests.get(url, params={"q": query, "format": "json", "language": "es"}, timeout=7)
        if response.status_code == 200:
            results = response.json().get('results', [])
            return [{"title": r.get('title'), "url": r.get('url'), "body": r.get('content')} for r in results[:5]]
    except Exception as e:
        print(f"[SearxNG Error] {e}")
    return []

@app.post("/query")
async def process_query(request: QueryRequest):
    images = []
    file_context = ""
    
    if request.file:
        file_data = request.file.get("data", "")
        if "image" in request.file.get("type", ""):
            images = [file_data]
            file_context = f"\n[SISTEMA]: El usuario ha adjuntado una imagen ({request.file.get('name')}). Analízala si el modelo lo permite.\n"
        elif "text" in request.file.get("type", "") or request.file.get("name", "").endswith((".md", ".txt")):
            try:
                raw_data = file_data.split(';base64,').pop()
                file_context = f"\n[CONTENIDO ADJUNTO ({request.file.get('name')} summaries/text)]:\n{base64.b64decode(raw_data).decode('utf-8')}\n"
            except:
                file_context = f"\n[SISTEMA]: Se adjuntó un archivo ({request.file.get('name')}) pero no se pudo decodificar como texto simple.\n"

    try:
        if request.agent == "debate":
            # Debate: Bibliotecario, Explorador, Investigador
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            local_context = engine.query(request.query, save_to_file=False)
            
            system_prompt = (
                "Eres el Maestro del Ágora, dirigiendo un Debate Socrático sobre el tema consultado.\n"
                "Orquestas a tres agentes con diferentes perspectivas y fuentes de conocimiento:\n"
                "- El BIBLIOTECARIO (Contexto Local Caveman): Basado en los conocimientos indexados. Si no hay contexto local sobre el tema, debe reflexionar analítica o filosóficamente usando filosofía pura.\n"
                "- EL EXPLORADOR (Contexto de Perfil y Web): Aporta una perspectiva pragmática combinando la Web y el perfil del usuario. Es crítico y objetivo; NO es un adulador ni fanático del perfil.\n"
                "- EL INVESTIGADOR (Contexto Web): Aporta evidencia de internet en tiempo real.\n\n"
                "REGLA DE HIERRO: NUNCA te niegues a debatir ni abortes el diálogo por 'falta de información indexada'. Si falta contexto local, el Investigador y el Explorador liderarán el debate basándose en la WEB y el sentido común, y el Bibliotecario aprenderá de ellos.\n\n"
                "PASO 1: Genera un debate entrelazado donde los tres aporten, se contradigan o complementen.\n"
                "LÍMITE DE TIEMPO (RELOJ DE AJEDREZ): Tienen la libertad de realizar entre 6 y 9 turnos de palabra en total, según lo vean necesario."
                "Actúen con la urgencia de un reloj de ajedrez rápido (como si tuvieran 1 minuto por turno). Sean profundamente concisos, directos y pasen a la conclusión final en cuanto cristalicen la idea.\n"
                "PASO 2: Genera una Síntesis Formal conclusiva superando las contradicciones.\n\n"
                "FORMATO DE SALIDA:\n"
                "1. Primero la CONCLUSIÓN SINTETIZADA DE LA MENTE FEDERADA.\n"
                "2. Luego, envuelve el debate dentro de: <details><summary>🎙️ Ver Debate de Agentes</summary> [Diálogo socrático aquí] </details>"
            )
            
            prompt = f"{file_context}\n[PERFIL]:\n{profile}\n[WEB]:\n{web_txt}\n[LOCAL CAVEMAN]:\n{local_context}\n\n[QUERY]:\n{request.query}"
            report = engine.llm.chat(system_prompt, prompt, images=images)
            
            target_path = os.path.join(RESP_PATH, "DEBATE.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🎙️ CAMS Debate: {request.query}\n\n{report}")
            return {"response": report, "agent": "debate"}

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
            res = engine.llm.chat(system_prompt, prompt, images=images)
            
            target_path = os.path.join(RESP_PATH, "EXPLORER.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🧭 Explorador CAMS\n\n{res}")
            return {"response": res, "agent": "explorador"}

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
            
            res = engine.llm.chat(system_prompt, f"{file_context}\n[LOCAL CAVEMAN]:\n{local}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            
            target_path = os.path.join(RESP_PATH, "INVESTIGATION.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🔍 Investigador CAMS\n\n{res}")
            return {"response": res, "agent": "investigador"}

        elif request.agent == "arquitecto":
            local_context = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results]) if results else "Sin resultados web."
            
            system_prompt = (
                "Eres El Arquitecto IT de CAMS Mercure.\n"
                "Eres un Consultor Tecnológico y Desarrollador Senior de élite. Tienes acceso a Internet en tiempo real y al código local.\n"
                "Tono: Profesional, calmado, altamente analítico. NO tienes prisa por generar scripts largos; priorizas el diseño de sistemas, la lógica y la arquitectura limpia.\n"
                "REGLA DE ORO: Eres un consultor estratégico experto. Jamás vomites código innecesario. Pregunta, deduce y diseña. Ofrece scripts solo cuando sea la mejor vía para explicar algo o si el usuario lo solicita explícitamente."
            )
            res = engine.llm.chat(system_prompt, f"{file_context}\n[CONTEXTO LOCAL]:\n{local_context}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}", images=images)
            target_path = os.path.join(RESP_PATH, "ARQUITECTO.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 💻 Arquitecto IT\n\n{res}")
            return {"response": res, "agent": "arquitecto"}

        else:
            # Bibliotecario: Estrictamente índice local Caveman + Bóvedas sin web
            local_context = engine.query(request.query, save_to_file=False)
            
            system_prompt = (
                "Eres El Bibliotecario de CAMS Mercure.\n"
                "Tu única fuente de verdad y conocimiento es la información destilada de la Wiki del usuario.\n"
                "Actúas también como un Intérprete de protocolos Caveman (Decodificador de Engramas trogloditas).\n"
                "NO tienes acceso a internet. NO inventes cosas; limítate a decodificar formalmente el contexto local y responder basado exclusivamente en eso.\n"
                "Crea una respuesta útil y detallada expandiendo los hechos locales proporcionados."
            )
            
            res = engine.llm.chat(system_prompt, f"{file_context}\n[CONTEXTO LOCAL CAVEMAN]:\n{local_context}\n\n[QUERY]:\n{request.query}", images=images)
            
            with open(os.path.join(RESP_PATH, "BIBLIOTECARIO.md"), "w", encoding="utf-8") as f:
                f.write(f"# 📚 Bibliotecario CAMS\n\n{res}")
            return {"response": res, "agent": "bibliotecario"}

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
    print(f"📖 Indexando nueva bóveda interdimensional en background: {request.folder} ({len(request.files)} archivos)")
    background_tasks.add_task(build_caveman_index, request.folder, request.files)
    return {"status": "indexed", "folder": request.folder, "message": "Proceso Caveman iniciado en background"}

if __name__ == "__main__":


    uvicorn.run(app, host="0.0.0.0", port=8000)
