import os
import re
import json
import sqlite3
import sys
import numpy as np
from llm_client import LLMClient

# Intentar cargar sentence-transformers para RAG Semántico
try:
    from sentence_transformers import SentenceTransformer
    SEMANTIC_SUPPORT = True
except ImportError:
    SEMANTIC_SUPPORT = False

# Ruta base portable
CAMS_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
WIKI_INDEX = os.path.join(CAMS_BASE, 'wiki-index.json')
RESPONSE_PATH = os.path.join(CAMS_BASE, 'respuestas', 'RESPONSE.md')

def is_safe_path(base_dir, path_to_check):
    base_dir = os.path.abspath(base_dir)
    path_to_check = os.path.abspath(path_to_check)
    return os.path.commonpath([base_dir]) == os.path.commonpath([base_dir, path_to_check])

def sanitize_filename(filename):
    return re.sub(r'[^\w\-_\. ]', '', os.path.basename(filename))

def load_session_memory():
    session_path = os.path.join(CAMS_BASE, 'backups', 'session.md')
    if os.path.exists(session_path):
        try:
            with open(session_path, "r", encoding="utf-8") as f:
                content = f.read()
                parts = content.split('\n---\n')
                if len(parts) > 6:
                    content = parts[0] + '\n---\n' + '\n---\n'.join(parts[-5:])
                return f"\n[WIKI EFÍMERO DE SESIÓN (Últimos 5 registros)]:\n{content}\n"
        except: pass
    return ""

class FederatedQueryEngine:
    def __init__(self,
                 wiki_index_path=None,
                 response_path=None,
                 llm_url="http://localhost:8080/v1",
                 model="local-model"):
        self.wiki_index_path = wiki_index_path or WIKI_INDEX
        self.response_path = response_path or RESPONSE_PATH
        self.llm = LLMClient(base_url=llm_url, model=model)
        self.substrate_path = os.path.join(CAMS_BASE, 'substrate', 'substrato.db')
        self._ensure_cache_table()
        
        # Inicializar modelo de embeddings si está soportado
        self.embed_model = None
        if SEMANTIC_SUPPORT:
            try:
                # Modelo ligero multilingüe (paraphrase-multilingual-MiniLM-L12-v2)
                print("[Substrato] Cargando modelo de embeddings multilingüe...")
                self.embed_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                print("[Substrato] ✅ RAG Semántico Activado.")
            except Exception as e:
                print(f"[Substrato] ⚠️ Error cargando modelo de embeddings: {e}")

    def embed_text(self, text):
        """Genera un embedding para un texto dado."""
        if self.embed_model:
            return self.embed_model.encode(text)
        return None

    def _ensure_cache_table(self):
        os.makedirs(os.path.dirname(self.substrate_path), exist_ok=True)
        try:
            conn = sqlite3.connect(self.substrate_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS caveman_cache (
                    file_path TEXT PRIMARY KEY,
                    mtime REAL,
                    summary TEXT,
                    embedding BLOB
                )
            """)
            # Tabla para el glosario de patrones
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS glosario (
                    token TEXT PRIMARY KEY,
                    significado TEXT
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[Substrate Error] No se pudo inicializar la caché: {e}")

    def get_cached_caveman(self, file_path, current_mtime):
        try:
            conn = sqlite3.connect(self.substrate_path)
            cursor = conn.cursor()
            cursor.execute("SELECT summary, embedding FROM caveman_cache WHERE file_path = ? AND mtime = ?", (file_path, current_mtime))
            row = cursor.fetchone()
            conn.close()
            return row if row else None
        except Exception:
            return None

    def save_cached_caveman(self, file_path, mtime, summary, embedding=None):
        try:
            conn = sqlite3.connect(self.substrate_path)
            cursor = conn.cursor()
            emb_blob = sqlite3.Binary(embedding.astype(np.float32).tobytes()) if embedding is not None else None
            cursor.execute("INSERT OR REPLACE INTO caveman_cache (file_path, mtime, summary, embedding) VALUES (?, ?, ?, ?)", 
                           (file_path, mtime, summary, emb_blob))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[Substrate Error] No se pudo guardar caché: {e}")

    def _get_relevant_context(self, query, top_k=8):
        """Recupera los fragmentos de la Wiki más relevantes semánticamente."""
        if not self.embed_model:
            # Fallback a contexto completo si no hay embeddings (lo que teníamos antes)
            all_context = []
            if os.path.exists(self.wiki_index_path):
                with open(self.wiki_index_path, 'r', encoding='utf-8') as f:
                    index = json.load(f)
                for entry in index.get('folders', []):
                    path = entry.get('path')
                    wiki_file = os.path.join(path, "_wiki.md")
                    if os.path.exists(wiki_file):
                        with open(wiki_file, "r", encoding="utf-8") as f_in:
                            all_context.append(f_in.read())
            return "\n".join(all_context)

        # RAG Semántico
        query_emb = self.embed_model.encode(query)
        relevant_chunks = []
        
        try:
            conn = sqlite3.connect(self.substrate_path)
            cursor = conn.cursor()
            cursor.execute("SELECT summary, embedding FROM caveman_cache WHERE embedding IS NOT NULL")
            rows = cursor.fetchall()
            conn.close()
            
            if not rows:
                return "Wiki vacía o no indexada semánticamente."

            scores = []
            for summary, emb_blob in rows:
                emb = np.frombuffer(emb_blob, dtype=np.float32)
                score = np.dot(query_emb, emb) / (np.linalg.norm(query_emb) * np.linalg.norm(emb))
                scores.append((score, summary))
            
            # Ordenar por relevancia y tomar top_k
            scores.sort(key=lambda x: x[0], reverse=True)
            relevant_chunks = [s[1] for s in scores[:top_k]]
            
            print(f"[Substrato] Recuperados {len(relevant_chunks)} fragmentos semánticos.")
            return "\n".join(relevant_chunks)
        except Exception as e:
            print(f"[Substrato] Error en búsqueda semántica: {e}")
            return ""

    def query(self, user_query, file_context="", images=None, session_mode=False, save_to_file=True, output_filename="RESPONSE.md", origin_node="Central", agent_history=""):
        # Búsqueda semántica en la Wiki
        relevant_context = self._get_relevant_context(user_query)
        
        system_prompt = (
            "Eres el Bibliotecario de CAMS Mercure, el Guardián de la Bóveda de Conocimiento.\n"
            "TU FUNCIÓN: Organizar, recuperar y sintetizar la información contenida en los registros locales y adjuntos.\n\n"
            "INSTRUCCIONES DE OPERACIÓN:\n"
            "1. RELEVANCIA: Solo has recibido los fragmentos de la Wiki RELEVANTES para esta consulta. Úsalos como base.\n"
            "2. CONTEXTO HÍBRIDO: Integra el [CONTEXTO DEL CASO] o [WIKI EFÍMERO] si están presentes.\n"
            "3. DECODIFICACIÓN: Interpreta los registros Caveman con fluidez.\n"
            "4. TONO: Profesional, servicial y adaptativo al estilo del usuario."
        )
        
        if session_mode:
            system_prompt += " Prioriza marcadores somáticos y la Espiral de Erikson."
        
        session_ctx = load_session_memory() if session_mode else ""
        user_prompt = f"[ADJUNTOS DE ESTA SESIÓN]:\n{file_context}\n\n{session_ctx}{agent_history}\n[CONTEXTO WIKI RELEVANTE]:\n{relevant_context}\n\n[CONSULTA]:\n{user_query}"
        
        res_obj = self.llm.chat(system_prompt, user_prompt, images=images)
        full_response = res_obj["content"]
        usage = res_obj.get("usage", {})
        duration = res_obj.get("duration", 0)
        
        # Limpieza de tags terapéuticos si existen
        therapeutic_output = re.sub(r"<therapeutic_output>.*?</therapeutic_output>", "", full_response, flags=re.DOTALL).strip()
        therapeutic_output = therapeutic_output.replace("<therapeutic_output>", "").replace("</therapeutic_output>", "")

        if save_to_file:
            safe_filename = sanitize_filename(output_filename)
            target_path = os.path.abspath(os.path.join(os.path.dirname(self.response_path), safe_filename))
            
            content = (
                f"# 🏛️ CAMS Mercure: {safe_filename.split('.')[0].upper()}\n"
                f"**Nodo de Origen:** {origin_node}\n\n"
                f"## 💭 Consulta\n> {user_query}\n\n"
                f"## 📝 Respuesta\n{therapeutic_output}\n\n"
                f"---\n"
                f"<!-- METRICS: {usage.get('total_tokens', 0)} tokens | {duration:.2f}s -->"
            )
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"response": content, "usage": usage, "duration": duration}
            
        return {"response": therapeutic_output, "usage": usage, "duration": duration}
