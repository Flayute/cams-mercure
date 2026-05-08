import os
import time
import requests
import json
import subprocess
from datetime import datetime

# CONFIGURACIÓN
CAMS_BASE = os.environ.get('CAMS_BASE_PATH', os.path.join(os.path.expanduser('~'), 'Documents', 'CAMS-Mercure'))
MODELS_DIR = os.path.join(CAMS_BASE, 'models')
AUDIT_RESULTS_PATH = os.path.join(CAMS_BASE, 'recursos', 'audit_results.json')
LLM_URL = "http://localhost:8080/v1/chat/completions"

# SUITE DE PRUEBAS
BENCHMARK_PROMPTS = [
    {"id": "logic", "prompt": "Si tengo 3 manzanas y me quitan 2, pero luego me dan el doble de las que me quedan, ¿cuántas tengo? Explica el razonamiento paso a paso (CoT)."},
    {"id": "coding", "prompt": "Escribe una función en Python para invertir una cadena de texto sin usar [::-1]."},
    {"id": "creative", "prompt": "Describe un amanecer en un planeta donde el cielo es violeta y hay dos lunas verdes."}
]

def clean_vram():
    print("🧹 Limpiando VRAM...")
    subprocess.run("fuser -k 8080/tcp", shell=True, stderr=subprocess.DEVNULL)
    time.sleep(2)

def run_benchmark(model_name):
    print(f"🚀 Iniciando benchmark para: {model_name}")
    results = {"model": model_name, "timestamp": datetime.now().isoformat(), "tests": []}
    
    for test in BENCHMARK_PROMPTS:
        start_time = time.time()
        try:
            response = requests.post(LLM_URL, json={
                "messages": [{"role": "user", "content": test["prompt"]}],
                "max_tokens": 200,
                "temperature": 0.2
            }, timeout=120)
            
            duration = time.time() - start_time
            if response.status_code == 200:
                data = response.json()
                text = data['choices'][0]['message']['content']
                usage = data.get('usage', {})
                tps = usage.get('completion_tokens', 0) / duration if duration > 0 else 0
                
                results["tests"].append({
                    "id": test["id"],
                    "duration": round(duration, 2),
                    "tokens_per_second": round(tps, 2),
                    "response_preview": text[:100] + "..."
                })
                print(f"  ✅ Test {test['id']} completado: {round(tps, 2)} tk/s")
            else:
                print(f"  ❌ Error en test {test['id']}: {response.status_code}")
        except Exception as e:
            print(f"  ❌ Error de conexión: {e}")
            break
            
    return results

def main():
    if not os.path.exists(os.path.dirname(AUDIT_RESULTS_PATH)):
        os.makedirs(os.path.dirname(AUDIT_RESULTS_PATH), exist_ok=True)
        
    print("📋 Sistema de Auditoría CAMS Detectado")
    # Nota: Este script asume que el servidor ya está corriendo.
    # En futuras versiones, este script podría rotar modelos automáticamente.
    
    # Por ahora, evaluamos el modelo que esté CARGADO actualmente.
    try:
        # Intentar obtener info del modelo actual
        res = requests.get("http://localhost:8080/slots")
        if res.status_code == 200:
            model_info = "Model_Loaded" # llama.cpp no siempre da el nombre exacto aquí fácil
            audit_results = run_benchmark(model_info)
            
            # Guardar resultados
            history = []
            if os.path.exists(AUDIT_RESULTS_PATH):
                with open(AUDIT_RESULTS_PATH, 'r') as f:
                    history = json.load(f)
            
            history.append(audit_results)
            with open(AUDIT_RESULTS_PATH, 'w') as f:
                json.dump(history, f, indent=2)
                
            print(f"💾 Resultados guardados en: {AUDIT_RESULTS_PATH}")
        else:
            print("❗ El servidor llama.cpp no parece estar corriendo en el puerto 8080.")
    except Exception as e:
        print(f"❗ Error conectando con el servidor: {e}")

if __name__ == "__main__":
    main()
