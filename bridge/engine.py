import os
import re
import json
import sqlite3
import sys
from llm_client import LLMClient

# Ruta base portable — usa variable de entorno o ~/Documents/CAMS-Mercure
CAMS_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
WIKI_INDEX = os.path.join(CAMS_BASE, 'wiki-index.json')
RESPONSE_PATH = os.path.join(CAMS_BASE, 'respuestas', 'RESPONSE.md')

# Saneamiento de rutas heredado
def is_safe_path(base_dir, path_to_check):
    base_dir = os.path.abspath(base_dir)
    path_to_check = os.path.abspath(path_to_check)
    return os.path.commonpath([base_dir]) == os.path.commonpath([base_dir, path_to_check])

def sanitize_filename(filename):
    return re.sub(r'[^\w\-_\. ]', '', os.path.basename(filename))

# Asegurar que la carpeta de respuestas existe
os.makedirs(os.path.join(CAMS_BASE, 'respuestas'), exist_ok=True)

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

    def _get_substrate_context(self, query):
        """Consulta el Knowledge Substrate para patrones o glosarios."""
        if not os.path.exists(self.substrate_path):
            return ""
        try:
            conn = sqlite3.connect(self.substrate_path)
            cursor = conn.cursor()
            cursor.execute("SELECT significado FROM glosario WHERE ? LIKE '%' || token || '%'", (query,))
            meanings = cursor.fetchall()
            conn.close()
            if meanings:
                return "\n[GLOSARIO SUBSTRATO]:\n" + "\n".join([m[0] for m in meanings])
        except Exception:
            pass
        return ""

    def get_context_from_index(self):
        """Lee wiki-index.json y recopila contenido de carpetas y archivos individuales."""
        if not os.path.exists(self.wiki_index_path):
            return []
        
        all_contents = []
        try:
            with open(self.wiki_index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)
            
            # 1. Contenido de folders (índices _wiki.md)
            for entry in index.get('folders', []):
                path = entry.get('path')
                if path and os.path.isdir(path):
                    wiki_file = os.path.join(path, "_wiki.md")
                    if os.path.exists(wiki_file):
                        with open(wiki_file, "r", encoding="utf-8") as f_in:
                            all_contents.append(f_in.read())
            
            # 2. Contenido de archivos individuales (Watchdog / Manual)
            for entry in index.get('files', []):
                path = entry.get('path')
                if path and os.path.exists(path):
                    with open(path, "r", encoding="utf-8") as f_in:
                        all_contents.append(f_in.read())
                        
        except Exception as e:
            print(f"⚠️ Error leyendo wiki-index: {e}")
            
        return all_contents

    def query(self, user_query, file_context="", images=None, session_mode=False, save_to_file=True, output_filename="RESPONSE.md", origin_node="Central"):
        # Recopilar contexto híbrido (Folders + Archivos del Centinela)
        all_context = self.get_context_from_index()
        
        full_context_str = "\n".join(all_context)
        substrate_ctx = self._get_substrate_context(user_query)

        system_prompt = (
            "Eres el Bibliotecario del sistema CAMS Mercure y un Intérprete Caveman (Decodificador de Engramas).\n"
            "El CONTEXTO WIKI proporcionado es un índice comprimido en lenguaje troglodita (hechos puros, tokens minimizados).\n"
            "También cuentas con aportaciones de otros agentes (Investigador/Explorador) procesadas por el Centinela.\n\n"
            "INSTRUCCIONES:\n"
            "1. Inspecciona el contexto Caveman buscando hechos relacionados con la consulta.\n"
            "2. Decodifica e interpreta esa información: reconstruye la gramática y el flujo lógico.\n"
            "3. Redacta una respuesta natural, empática y detallada, expandiendo los conceptos clave.\n"
            "4. Si no hay contexto relevante, razona desde tu conocimiento base.\n"
        )
        
        if session_mode:
            system_prompt += "Prioriza marcadores somáticos y la Espiral de Erikson."

        user_prompt = f"{file_context}\n{substrate_ctx}\n[CONTEXTO WIKI]:\n{full_context_str}\n\n[CONSULTA]:\n{user_query}"
        res_obj = self.llm.chat(system_prompt, user_prompt, images=images)
        full_response = res_obj["content"]
        usage = res_obj.get("usage", {})
        duration = res_obj.get("duration", 0)
        
        t_match = re.search(r"<therapeutic_output>(.*?)</therapeutic_output>", full_response, re.DOTALL)
        u_match = re.search(r"<thought_ultra>(.*?)</thought_ultra>", full_response, re.DOTALL)
        
        therapeutic_output = t_match.group(1).strip() if t_match else full_response.strip()
        thought_ultra = u_match.group(1).strip() if u_match else ""

        if save_to_file:
            safe_filename = sanitize_filename(output_filename)
            target_path = os.path.abspath(os.path.join(os.path.dirname(self.response_path), safe_filename))
            
            if not is_safe_path(os.path.dirname(self.response_path), target_path):
                print(f"⚠️ Bloqueada escritura en ruta no segura: {target_path}")
                return therapeutic_output

            content = (
                f"# 🏛️ CAMS Mercure: {safe_filename.split('.')[0].upper()}\n"
                f"**Nodo de Origen:** {origin_node}\n\n"
                f"## 💭 Consulta\n> {user_query}\n\n"
                f"## 📝 Respuesta\n{therapeutic_output}\n\n"
                f"---\n"
                f"<!-- THOUGHT:\n{thought_ultra}\n-->"
            )
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"response": content, "usage": usage, "duration": duration}
            
        return {"response": therapeutic_output, "usage": usage, "duration": duration}
