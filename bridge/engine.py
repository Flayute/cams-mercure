import os
import re
import json
from llm_client import LLMClient

# Ruta base portable — usa variable de entorno o ~/Documents/CAMS-Mercure
CAMS_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
WIKI_INDEX = os.path.join(CAMS_BASE, 'wiki-index.json')
RESPONSE_PATH = os.path.join(CAMS_BASE, 'respuestas', 'RESPONSE.md')

# Asegurar que la carpeta de respuestas existe
os.makedirs(os.path.join(CAMS_BASE, 'respuestas'), exist_ok=True)

class FederatedQueryEngine:
    def __init__(self,
                 wiki_index_path=None,
                 response_path=None,
                 llm_url="http://localhost:8081/v1",
                 model="local-model"):
        self.wiki_index_path = wiki_index_path or WIKI_INDEX
        self.response_path = response_path or RESPONSE_PATH
        self.llm = LLMClient(base_url=llm_url, model=model)

    def get_vaults_from_master(self):
        """Lee wiki-index.json para obtener las carpetas indexadas por el usuario."""
        if not os.path.exists(self.wiki_index_path):
            return []
        try:
            with open(self.wiki_index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)
            return [entry['path'] for entry in index.get('folders', []) if os.path.isdir(entry['path'])]
        except Exception:
            return []

    def query(self, user_query, session_mode=False, save_to_file=True, output_filename="RESPONSE.md"):
        vault_paths = self.get_vaults_from_master()
        all_context = []
        
        for path in vault_paths:
            wiki_path = os.path.join(path, "_wiki.md")
            if os.path.exists(wiki_path):
                with open(wiki_path, "r", encoding="utf-8") as f:
                    all_context.append(f.read())
        
        full_context_str = "\n".join(all_context)
        system_prompt = (
            "Eres el Bibliotecario del sistema CAMS Mercure y un Intérprete Caveman (Decodificador de Engramas).\n"
            "El CONTEXTO WIKI proporcionado es un índice comprimido en lenguaje troglodita (hechos puros, tokens minimizados).\n\n"
            "INSTRUCCIONES:\n"
            "1. Inspecciona el contexto Caveman buscando hechos relacionados con la consulta.\n"
            "2. Decodifica e interpreta esa información: reconstruye la gramática y el flujo lógico.\n"
            "3. Redacta una respuesta natural, empática y detallada, expandiendo los conceptos clave sin inventar datos.\n"
            "4. Si no hay contexto relevante, indícalo brevemente y razona desde tu conocimiento base.\n"
        )
        
        if session_mode:
            system_prompt += "Prioriza marcadores somáticos y la Espiral de Erikson."

        user_prompt = f"[CONTEXTO WIKI]:\n{full_context_str}\n\n[CONSULTA]:\n{user_query}"
        full_response = self.llm.chat(system_prompt, user_prompt)
        
        t_match = re.search(r"<therapeutic_output>(.*?)</therapeutic_output>", full_response, re.DOTALL)
        u_match = re.search(r"<thought_ultra>(.*?)</thought_ultra>", full_response, re.DOTALL)
        
        therapeutic_output = t_match.group(1).strip() if t_match else full_response.strip()
        thought_ultra = u_match.group(1).strip() if u_match else ""

        if save_to_file:
            target_path = os.path.join(os.path.dirname(self.response_path), output_filename)
            content = (
                f"# 🪞 CAMS Mirror: {output_filename.split('.')[0].upper()}\n\n"
                f"## 💭 Consulta\n> {user_query}\n\n"
                f"## 📝 Respuesta\n{therapeutic_output}\n\n"
                f"---\n"
                f"## 📂 Fuentes: " + ", ".join([f"[[{os.path.basename(v)}]]" for v in vault_paths]) + "\n"
                f"<!-- THOUGHT:\n{thought_ultra}\n-->"
            )
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(content)
            return content
            
        return therapeutic_output
