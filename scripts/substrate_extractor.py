import os
import sqlite3
import json
import requests
import glob
from time import sleep

CAMS_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
SUBSTRATE_DB = os.path.join(CAMS_BASE, 'substrate', 'substrato.db')
TARGET_DIRS = [
    os.path.join(os.path.expanduser('~'), 'Obsidian', 'TFM'),
    os.path.join(os.path.expanduser('~'), 'Obsidian', 'Ollama', 'UMA Universal Music Analyser')
]
TARGET_FILES = [
    os.path.join(CAMS_BASE, 'backups', 'arquitecto.md')
]
LLM_URL = "http://localhost:8080/v1/chat/completions"

def init_db():
    os.makedirs(os.path.dirname(SUBSTRATE_DB), exist_ok=True)
    conn = sqlite3.connect(SUBSTRATE_DB)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS glosario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE,
            significado TEXT
        )
    ''')
    conn.commit()
    return conn

def extract_concepts_from_text(text, filename):
    prompt = f"""
    Analiza el siguiente texto extraído del archivo '{filename}'.
    Extrae los 3 conceptos técnicos o entidades clave más importantes y genera una breve definición de cada uno.
    Devuelve ÚNICAMENTE un array JSON válido con el formato: [{{"token": "nombre del concepto", "significado": "definición breve"}}]
    
    TEXTO:
    {text[:2000]} # Limitamos a los primeros 2000 caracteres para ser rápidos
    """
    
    try:
        response = requests.post(LLM_URL, json={
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 2000
        }, timeout=180)
        
        if response.status_code == 200:
            content = response.json()['choices'][0]['message']['content']
            
            # Limpiar posible markdown formatting y buscar el array JSON
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                clean_content = json_match.group(0)
            else:
                clean_content = content.replace('```json', '').replace('```', '').strip()
                
            return json.loads(clean_content)
        else:
            print(f"Error HTTP {response.status_code} en {filename}")
    except json.JSONDecodeError as e:
        print(f"Error de Parseo JSON en {filename}: No se devolvió un formato válido.")
        print(f"Respuesta cruda del modelo: {repr(content[:100])}...")
    except Exception as e:
        print(f"Error procesando {filename}: {e}")
    return []

def main():
    print("🧠 Iniciando Minería de Substrato CAMS...")
    conn = init_db()
    c = conn.cursor()
    
    files_to_process = list(TARGET_FILES)
    for d in TARGET_DIRS:
        if os.path.exists(d):
            files_to_process.extend(glob.glob(os.path.join(d, '*.md')))
            
    print(f"📂 Encontrados {len(files_to_process)} archivos para procesar.")
    
    for file_path in files_to_process:
        if os.path.exists(file_path):
            print(f"  Analizando: {os.path.basename(file_path)}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read().strip()
                if not text: continue
                
            conceptos = extract_concepts_from_text(text, os.path.basename(file_path))
            
            for concepto in conceptos:
                try:
                    c.execute("INSERT OR REPLACE INTO glosario (token, significado) VALUES (?, ?)", 
                              (concepto.get('token', '').lower(), concepto.get('significado', '')))
                    print(f"    + {concepto.get('token')}")
                except Exception as e:
                    pass
            conn.commit()
            sleep(1) # Breve pausa para no saturar
            
    conn.close()
    print("✅ Minería completada y Substrato actualizado.")

if __name__ == "__main__":
    main()
