import os
import re
from llm_client import LLMClient

class FederatedQueryEngine:
    def __init__(self, master_wiki_path="/home/aorsi/Obsidian/RAG/AGENTS.md", 
                 response_path="/home/aorsi/Obsidian/RAG/RESPONSE.md",
                 llm_url="http://localhost:8081/v1",
                 model="qwen2.5-coder-7b-instruct"):
        self.master_wiki_path = master_wiki_path
        self.response_path = response_path
        self.llm = LLMClient(base_url=llm_url, model=model)

    def get_vaults_from_master(self):
        """Parsea AGENTS.md buscando rutas de vaults en la tabla."""
        if not os.path.exists(self.master_wiki_path):
            return []
            
        vault_paths = []
        with open(self.master_wiki_path, "r", encoding="utf-8") as f:
            for line in f:
                if "|" in line and "/home/aorsi/Obsidian" in line:
                    parts = line.split("|")
                    if len(parts) >= 3:
                        path = parts[2].strip()
                        if os.path.isdir(path):
                            vault_paths.append(path)
        return vault_paths

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
            "Eres el 'Bibliotecario' del sistema CAMS Neuro-Engram.\n"
            "Tu especialidad es la psicología somática y el marco teórico 'Entrando al Yo'.\n\n"
            "INSTRUCCIONES DE SALIDA:\n"
            "1. Provee razonamiento comprimido <thought_ultra>.\n"
            "2. Respuesta empática y técnica en <therapeutic_output>.\n"
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
