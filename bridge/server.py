from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import os
import requests
from ddgs import DDGS
from engine import FederatedQueryEngine

app = FastAPI(title="CAMS Neuro-Engram Bridge Server")
engine = FederatedQueryEngine()

class QueryRequest(BaseModel):
    query: str
    session_mode: bool = False
    agent: str = "bibliotecario" 

def load_profile():
    profile_path = "/home/aorsi/Obsidian/RAG/00-perfil"
    context = ""
    if os.path.exists(profile_path):
        for f in os.listdir(profile_path):
            if f.endswith(".md"):
                with open(os.path.join(profile_path, f), "r", encoding="utf-8") as file:
                    context += f"\n--- PERFIL {f}: ---\n{file.read()}\n"
    return context

def web_search(query):
    try:
        with DDGS() as ddgs:
            return [{"title": r['title'], "url": r['href'], "body": r['body']} for r in ddgs.text(query, max_results=5)]
    except: return []

@app.post("/query")
async def process_query(request: QueryRequest):
    try:
        if request.agent == "debate":
            # 1. Exploración Proactiva
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            
            # 2. Bibliotecario Contexto
            local_context = engine.query(request.query, save_to_file=False)
            
            # 3. El Debate Socrático
            system_prompt = (
                "Eres un orquestador de IA para CAMS Neuro-Engram.\n"
                "PASO 1: Genera un debate socrático entre 'El Investigador' (Web/Global) y 'El Bibliotecario' (Obsidian/Local).\n"
                "PASO 2: Genera una Síntesis Formal conclusiva.\n\n"
                "FORMATO DE SALIDA:\n"
                "1. Primero el INFORME DE SÍNTESIS.\n"
                "2. Luego el debate dentro de: <details><summary>🎙️ Ver Debate de Agentes</summary> [Diálogo aquí] </details>"
            )
            report = engine.llm.chat(system_prompt, f"[WEB]:\n{web_txt}\n\n[LOCAL]:\n{local_context}\n\n[QUERY]:\n{request.query}")
            
            target_path = os.path.join(os.path.dirname(engine.response_path), "DEBATE.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🎙️ CAMS Debate: {request.query}\n\n{report}")
            return {"response": report, "agent": "debate"}

        elif request.agent == "explorador":
            profile = load_profile()
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            prompt = f"Eres El Explorador. Usa el perfil si es relevante, si no sé libre.\n[PROFILE]:\n{profile}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}"
            res = engine.llm.chat("Responde de forma ágil y directa (Tono informal/inteligente).", prompt)
            
            target_path = os.path.join(os.path.dirname(engine.response_path), "EXPLORER.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🧭 Explorador CAMS\n\n{res}")
            return {"response": res, "agent": "explorador"}

        elif request.agent == "investigador":
            local = engine.query(request.query, save_to_file=False)
            results = web_search(request.query)
            web_txt = "\n".join([f"- {r['title']}: {r['body']}" for r in results])
            res = engine.llm.chat("Eres El Investigador. Une Obsidian con la Web.", f"[LOCAL]:\n{local}\n[WEB]:\n{web_txt}\n[QUERY]:\n{request.query}")
            
            target_path = os.path.join(os.path.dirname(engine.response_path), "INVESTIGATION.md")
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# 🔍 Investigador CAMS\n\n{res}")
            return {"response": res, "agent": "investigador"}

        else:
            res = engine.query(request.query, session_mode=request.session_mode)
            return {"response": res, "agent": "bibliotecario"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
