"""
Módulo del Coach Personal de CAMS Mercure

Endpoints para interactuar con el coach (Estratega + Reactivo)
"""

import os
import sys
import json
import time
import uuid
import sqlite3
from fastapi import FastAPI, HTTPException

# Importar LLMClient del proyecto
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from llm_client import LLMClient

# Importar prompts
from coach_prompts import (
    STRATEGA_SYSTEM_PROMPT,
    REACTIVA_SYSTEM_PROMPT,
    MORNING_PROMPT,
    EVENING_PROMPT,
    WEEKLY_PROMPT,
    BLOCKED_PROMPT,
    SKILLS_PROMPT,
    BREAK_BLOCK_PROMPT,
)

# Configuración
COACH_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
COACH_DB = os.path.join(COACH_BASE, 'coach.db')

# LLMClient para el coach
LLM_URL = os.environ.get('MERCURE_LLM_URL', 'http://localhost:8080/v1')
LLM_MODEL = os.environ.get('MERCURE_LLM_MODEL', 'qwen35-9b')
LLM_API_KEY = os.environ.get('MERCURE_LLM_API_KEY')

llm_client = LLMClient(base_url=LLM_URL, model=LLM_MODEL, api_key=LLM_API_KEY)

# --- BASE DE DATOS LOCAL DEL COACH ---

def init_coach_db():
    """Inicializa la base de datos local del coach."""
    os.makedirs(os.path.dirname(COACH_DB), exist_ok=True)
    conn = sqlite3.connect(COACH_DB)
    cursor = conn.cursor()
    
    # Tabla de usuarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            created_at TEXT
        )
    """)
    
    # Tabla de rituales
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rituals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            type TEXT,
            content TEXT,
            created_at TEXT
        )
    """)
    
    # Tabla de interacciones
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            alma TEXT,
            content TEXT,
            response TEXT,
            created_at TEXT
        )
    """)
    
    # Insertar usuario local por defecto
    cursor.execute("""
        INSERT OR IGNORE INTO users (id, name, created_at) 
        VALUES (?, ?, ?)
    """, ("local_user", "Usuario Local", time.strftime("%Y-%m-%d %H:%M:%S")))
    
    conn.commit()
    conn.close()
    print("[Coach DB] Base de datos inicializada.")

init_coach_db()

# --- LÓGICA DEL COACH ---

def get_coach_response(query, alma="proactive", mode="morning", context=""):
    """
    Consulta al coach.
    
    Args:
        query (str): La consulta del usuario
        alma (str): "proactive" para Estratega, "reactive" para Reactivo
        mode (str): "morning", "evening", "weekly", "blocked", "skills", "general"
        context (str): Contexto adicional
    
    Returns:
        dict: {"response": str, "usage": dict, "duration": float}
    """
    
    if alma == "proactive":
        system_prompt = STRATEGA_SYSTEM_PROMPT
        prompts = {
            "morning": MORNING_PROMPT,
            "evening": EVENING_PROMPT,
            "weekly": WEEKLY_PROMPT,
            "blocked": BLOCKED_PROMPT,
            "skills": SKILLS_PROMPT,
            "general": "¿En qué puedo ayudarte hoy?"
        }
        user_prompt = prompts.get(mode, prompts["general"])
        if context:
            user_prompt += f"\n\nContexto adicional: {context}"
    else:  # alma == "reactive"
        system_prompt = REACTIVA_SYSTEM_PROMPT
        user_prompt = "¿En qué puedo ayudarte hoy?"
    
    full_prompt = f"""{system_prompt}\n\n---\n\n[CONTEXTO]:\n{context}\n\n[INTERACCIÓN]:\n{user_prompt}\n\n[RESPUESTA DEL USUARIO]:\n{query}"""
    
    start_time = time.time()
    try:
        response_obj = llm_client.chat(system_prompt, full_prompt)
        duration = time.time() - start_time
        
        return {
            "response": response_obj.get("content", ""),
            "usage": response_obj.get("usage", {}),
            "duration": duration
        }
    except Exception as e:
        return {
            "response": f"Error llamando al LLM: {str(e)}",
            "usage": {},
            "duration": 0
        }


def save_interaction(alma, content, response, context=""):
    """Guarda la interacción en la base de datos local."""
    user_id = "local_user"
    
    conn = sqlite3.connect(COACH_DB)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO interactions (user_id, alma, content, response, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, alma, content, response, time.strftime("%Y-%m-%d %H:%M:%S")))
    
    if alma == "proactive":
        cursor.execute("""
            INSERT INTO rituals (user_id, type, content, created_at)
            VALUES (?, ?, ?, ?)
        """, (user_id, context, content, time.strftime("%Y-%m-%d %H:%M:%S")))
    
    conn.commit()
    conn.close()
    return True


def get_history(alma=None, limit=10):
    """Obtiene el historial de interacciones."""
    cursor = sqlite3.connect(COACH_DB).cursor()
    
    if alma:
        cursor.execute("""
            SELECT content, response, created_at 
            FROM interactions 
            WHERE alma = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (alma, limit))
    else:
        cursor.execute("""
            SELECT content, response, created_at 
            FROM interactions 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (limit,))
    
    rows = cursor.fetchall()
    cursor.close()
    
    return [{"content": r[0], "response": r[1], "timestamp": r[2]} for r in rows]


def get_ritual_history():
    """Obtiene el historial de rituales."""
    cursor = sqlite3.connect(COACH_DB).cursor()
    cursor.execute("""
        SELECT type, content, created_at 
        FROM rituals 
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    cursor.close()
    
    return [{"type": r[0], "content": r[1], "timestamp": r[2]} for r in rows]


# --- APP FASTAPI ---

app = FastAPI(
    title="Coach Personal API",
    description="API para interactuar con el Coach Personal de CAMS Mercure",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"message": "Coach Personal API v1.0.0", "docs": "/docs"}


@app.get("/api/coach/history")
async def get_history_endpoint(alma=None, limit=10):
    """Obtiene el historial de interacciones."""
    return get_history(alma=alma, limit=limit)


@app.get("/api/coach/ritual-history")
async def get_ritual_history_endpoint():
    """Obtiene el historial de rituales."""
    return get_ritual_history()


@app.post("/api/coach/consult")
async def consult_endpoint(
    query: str,
    alma: str = "proactive",
    mode: str = "morning",
    context: str = "",
):
    """Consulta al coach."""
    
    # Validar parámetros
    if alma not in ["proactive", "reactive"]:
        raise HTTPException(status_code=400, detail="'alma' debe ser 'proactive' o 'reactive'")
    if mode not in ["morning", "evening", "weekly", "blocked", "skills", "general"]:
        raise HTTPException(status_code=400, detail=f"'mode' no válido. Opciones: morning, evening, weekly, blocked, skills, general")
    
    # Obtener respuesta del LLM
    result = get_coach_response(query, alma=alma, mode=mode, context=context)
    
    # Guardar interacción en la base de datos local
    save_interaction(alma, query, result["response"], mode)
    
    return result


@app.post("/api/coach/save")
async def save_interaction_endpoint(
    alma: str,
    content: str,
    response: str,
    context: str = "",
):
    """Guarda una interacción en la base de datos local."""
    save_interaction(alma, content, response, context)
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
