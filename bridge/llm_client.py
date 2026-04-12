import requests
import json
import os

class LLMClient:
    def __init__(self, base_url="http://localhost:11434/v1", model="qwen2.5-coder-7b-instruct"):
        """
        Cliente para interactuar con el modelo local. 
        Compatible con Ollama, llama.cpp (server) o vLLM.
        """
        self.base_url = base_url
        self.model = model

    def chat(self, system_prompt, user_prompt, images=None, temperature=0.1):
        content = [{"type": "text", "text": user_prompt}]
        
        if images:
            for img in images:
                # El formato esperado es "data:image/jpeg;base64,..."
                content.append({
                    "type": "image_url",
                    "image_url": {"url": img}
                })

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ],
            "temperature": temperature
        }
        
        try:
            response = requests.post(f"{self.base_url}/chat/completions", json=payload)
            response.raise_for_status()
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"Error llamando al LLM: {str(e)}"

    def compress_ultra(self, note_content):
        """
        Implementa la Arquitectura Caveman Ultra (Codificación Conceptual).
        Fuerza al modelo a mapear conceptos a un dialecto lógico y comprimido.
        """
        system_prompt = (
            "Eres un compilador de pensamiento ultra-comprimido (Caveman Ultra). "
            "Tu objetivo es codificar la información en un bloque 'thought_ultra' "
            "usando el mínimo de tokens posible. \n\n"
            "REGLAS DE CODIFICACIÓN:\n"
            "- Mapea entidades: Px (Paciente), LC (Les Corts), TE (Transferencia Erótical).\n"
            "- Usa operadores lógicos: ! (Alerta/Bloqueo), → (Causalidad), ⊘ (Impedimento).\n"
            "- Poda semántica radical: elimina gramática, solo nodos y relaciones.\n"
            "- Define siglas dinámicas al inicio si no están en la lista base.\n\n"
            "FORMATO DE SALIDA:\n"
            "<thought_ultra>\n[Codificación lógica aquí]\n</thought_ultra>"
        )
        response = self.chat(system_prompt, f"Codifica esta nota a Ultra:\n\n{note_content}")
        # Extraer solo el contenido de las etiquetas
        import re
        match = re.search(r"<thought_ultra>(.*?)</thought_ultra>", response, re.DOTALL)
        return match.group(1).strip() if match else response.strip()

if __name__ == "__main__":
    # Test rápido si hay servidor corriendo
    # client = LLMClient()
    # print(client.compress_note("Paciente reporta dolor de cabeza y tensión en hombros."))
    pass
