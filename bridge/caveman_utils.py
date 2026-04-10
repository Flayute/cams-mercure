import re

class CavemanCompressor:
    """
    Simula la compresión 'Caveman' para tokens en español.
    Remueve palabras de poco valor semántico (stop words estructurales)
    pero mantiene marcadores somáticos y hechos clave.
    """
    
    # Palabras a eliminar (artículos, preposiciones estructurales, copulativos)
    STOPWORDS = set([
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "es", "son", "era", "eran", "fue", "fueron", "será", "serán",
        "de", "del", "que", "y", "a", "ante", "bajo", "cabe", "con", "contra",
        "mi", "tu", "su", "mis", "tus", "sus", "este", "esta", "estos", "estas"
    ])

    @classmethod
    def compress(cls, text: str) -> str:
        if not text:
            return ""
        
        # Limpieza básica
        text = text.lower()
        # Dividir por palabras manteniendo puntuación básica
        tokens = re.findall(r"[\wáéíóúüñ]+|[.,!?;]", text)
        
        compressed = []
        for token in tokens:
            if token in cls.STOPWORDS:
                continue
            compressed.append(token)
            
        return " ".join(compressed)

    @classmethod
    def decompress_prompt(cls, compressed_text: str) -> str:
        """
        No es reversible realmente, pero prepara el texto para que el LLM 
        entienda que debe 'expandirlo' o razonar sobre él.
        """
        return f"[CAVEMAN CONTEXT]: {compressed_text}"

if __name__ == "__main__":
    test = "El paciente presenta una rigidez en la zona cervical durante la sesión de hoy."
    print(f"Original: {test}")
    print(f"Compressed: {CavemanCompressor.compress(test)}")
