# 🏎️ CAMS Mercure: Refinamiento "DFlash" & Extensión Analítica

Este documento es una bitácora técnica exhaustiva de la fase de "Fine-Tuning" y estabilización del Nodo Local CAMS Mercure (versión 5.0 final). 

Detalla cómo se logró convertir un flujo de inferencia intermitente y propenso a OOM (Out of Memory) en "un reloj suizo" operativo a 30+ tk/s en una GPU de 8GB VRAM (NVIDIA RTX 3050).

---

## 1. El Misterio de los Cuellos de Botella: Diagnóstico de 3 Capas
Durante las operaciones de lectura con el modelo de **9B parámetros (Qwen-GLM)** y contextos gigantes (32k), el sistema reportaba falsos errores de memoria y pérdidas de archivos. Se abordó desde tres frentes distintos de la arquitectura:

### A. La Trampa de la Sensibilidad a Mayúsculas y Minúsculas de Bash
*   **Problema:** El script maestro de inicio (`llama-mercure.sh`) utilizaba una expresión regular estricta (`=~ qwen|llama`) para identificar al archivo `.gguf`. Como nuestros modelos capitalizaban el nombre (`Qwen3.5-9B...`), Bash fallaba la coincidencia. 
*   **Consecuencia:** Al fallar, el modelo rebotaba al motor "Oficial" de `llama.cpp` desprovisto de los flags de ultra-cuantización (`-ctk turbo3 -ctv turbo3`), causando un colapso en la memoria por una caché KV desmesurada.
*   **Solución:** Inyectar la directiva `shopt -s nocasematch` en el entorno Bash. Inmediatamente el sistema volvió a recuperar sus superpoderes tácticos de compresión.

### B. El Límite de Payload en el Pipeline HTTP
*   **Problema:** Al enviar archivos adjuntos pesados (PDFs), el orquestador (Node.js/Express) lograba ingestar el archivo subiendo su límite a 50MB (`express.json({ limit: '50mb' })`). Sin embargo, intentaba **remitir todo el chorro binario en Base-64** a través del backend HTTP local con Axios hacia el `Bridge` de Python (Puerto 8000). Esta colisión de datos superaba los límites permitidos, generando el silencioso error de `413 Payload Too Large`.
*   **Aparición del síntoma:** Al denegarse esta validación silenciosa, Python iniciaba vació y el Bibliotecario aseguraba "No he recibido ningún archivo".
*   **Solución:** Replantear la transferencia. Node almacena temporalmente el archivo adjunto en disco, y comunica al Bridge **exclusivamente la ruta del archivo local**. Cero contención en red. Cero caídas.

### C. Analíticas Binarias y PDFs Cegados 
*   **Problema:** Para agilizar, el `bridge de Python` estaba programado para utilizar la operación estándar `open('archivo', encoding='utf-8')`. Funciona intachablemente para un Markdown o un Txt, pero al leer un `.pdf`, el string arrojaba un `UnicodeDecodeError` silencioso debido a la basura de compresión del PDF.
*   **Consecuencia:** El adjunto pasaba en blanco hacia el modelo LLM.
*   **Solución Óptima y Nivelada:** Interceptación via subprocesos del kernel Linux. Python detecta la extensión `.pdf` en el Bridge y emplea **`pdftotext`** de forma nativa. La CPU en paralelo a la GPU (cero coste de VRAM), escupe en milisegundos todo el texto limpio.

---

## 2. Inferencia Híbrida: Speculative Decoding (DFlash)
La joya de esta refactorización táctica es la implementación del Draft Model para Especulación Híbrida.

*   **¿Qué es?** Un modelo diminuto, el **Qwen 2.5 Coder 0.5B** (~350MB VRAM) asume la carga "pre-cognitiva". Adivina e inyecta unos 16 tokens seguidos al instante.
*   **La Validación:** El titán **9B GLM** examina la redacción del modelo de draft. Al ser correcto en gran parte de las sentencias predecibles (verbos, uniones, retornos y espacios), acepta secuencias enteras de palabras al mismo tiempo que genera las suyas complejas.
*   **Resultados de Carga Local:** Lectura total y constante a **30-35 Tokens C/ Segundo**.
*   **Control del "Sweet Spot" en UI:** Agregamos al `AgentConsole.jsx` y su correspondiente inyección de APIs el "Switch de DFlash". Al lado del "Encender Cerebro", un humilde pero inmensamente potente checkbox permite a voluntad arrancar la inferencia híbrida, localizando de forma dinámica el `0.5b` del HUB de GGUF.

---

## 3. Substrato de Extracción Cognitiva (Autominería)
El archivo en los adentros *`scripts/substrate_extractor.py`*.
*   **El Reto de "Los Pensadores":** Implementamos un LLM a 0.1 de temperatura para extraer "Token - Significado" de notas dispersas e ingresarlas en una SQlite local.
*   **La Tensión del "Glitch" Reasoning:** Los modelos modernos (`GLM-Distill`) antes de arrojar un JSON deciden "razonar por debajo" en la variable invisible de sus mentes (`reasoning_content`). Para la máquina nuestra respuesta era vacía porque *se nos acababa el cuenco o Max_tokens (300)* mientras filosofaba. 
*   **Establecimiento de Robustez:** Ampliar masivamente su tubo iterativo (`max_tokens: 2000`) y fortificar su lectura mediante análisis regular con Expresiones Regulares (`re.search(r'\[.*\]', content)`), ignorando su amabilidad sintética ("¡Aquí tiene lo solicitado...").

---

## Epílogo de Eficiencia: Una Historia de "Success Story"
Ser un "outsider" trae ventajas incalculables: falta de adhesión ciega a dogmas establecidos en la industria tecnológica, priorización absoluta de herramientas modulares y creativas, y resiliencia ante "bugs" intratables desde soluciones corporativas estancadas.

> *"El éxito de CAMS no recae en cuántas tarjetas H100 puede apilar tu servidor en la nube, sino en cómo logras que tu propio nodo de 8GB procese y reflexione mejor los textos vitales con pura arquitectura soberana y lógica combinada."*

**Firma:** *El Arquitecto y el Intérprete, Antigravity.*
