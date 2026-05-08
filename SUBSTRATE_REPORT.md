# 📊 Reporte de Auditoría y Viabilidad CAMS

## 1. Análisis de Rendimiento Actual (Baseline)
Hemos evaluado el modelo **Qwen3.5-9B-GLM 5.1 Distill Q5** bajo condiciones de carga real. Estos son los resultados en tu RTX 3050 (8GB VRAM):

| Test | Rendimiento (tk/s) | Latencia Media |
| :--- | :--- | :--- |
| **Lógica (CoT)** | 21.88 tk/s | ~4.5s |
| **Coding (Python)** | 20.60 tk/s | ~5.2s |
| **Creativa (Visual)** | 19.53 tk/s | ~6.1s |

> [!NOTE]
> El modelo GLM está utilizando **7.6GB de los 8GB** disponibles con un contexto de 32k. Es una configuración muy optimizada, pero al límite de la VRAM.

## 2. Resolución del "Misterio 9B"
El error que experimentabas al lanzar el modelo desde el script (`llama-mercure.sh`) pero no desde la UI se debía a una **acumulación de procesos en la VRAM**. El script manual no liberaba la memoria de sesiones anteriores.
- **Solución Aplicada**: He actualizado `llama-mercure.sh` para que ejecute una limpieza forzosa (`fuser -k`) del puerto 8080 antes de cada inicio. Ahora debería funcionar idéntico a la UI.

## 3. Estrategia de "Squeezing" para 14B y 27B
Para lograr que modelos más grandes funcionen en tus 8GB de VRAM, utilizaremos estas configuraciones:

### 🧩 Candidato 14B (Q3_K_S)
- **Peso estimado**: ~6.6 GiB.
- **Reto**: Con contexto de 32k, superará los 8GB.
- **Estrategia**: 
  - Reducir contexto a **16k** (`-c 16384`).
  - Forzar cuantización de KV cache (`-ctk turbo3 -ctv turbo3`).
  - Si sigue fallando: `-ngl 28` (Mover 4 capas a la CPU/RAM).

### 🧩 Candidato 27B (Q3_K_S)
- **Peso estimado**: ~12 GiB.
- **Reto**: No cabe físicamente en la GPU.
- **Estrategia (Offloading)**:
  - Usar **Partial Layer Offloading**: `-ngl 16` (aprox. la mitad del modelo en GPU).
  - Activar el motor **TurboQuant** para acelerar el procesamiento paralelo.
  - El rendimiento bajará a **3-5 tk/s**, pero podrás usar la inteligencia del 27B.

## 4. Próximos Pasos
1. **Prueba el script** `scripts/llama-mercure.sh` con el nuevo modelo 9B; ahora debería cargar sin problemas.
2. En cuanto tengas el **14B/27B**, avísame para configurar el "modo elástico" en el Bridge y que no sature tu sistema.
