# Secretary Administrativo para Psicólogo con Hermes Agent

Este proyecto propone un primer asistente administrativo para un psicólogo usando **Hermes Agent**.

La idea no es crear un terapeuta artificial, sino un secretario/a operativo que ayude con tareas administrativas y de organización, siempre con revisión humana.

## Alcance inicial

El secretary/administrador puede ayudar con:

- Organización de agenda.
- Recordatorios de citas.
- Tareas pendientes.
- Borradores de mensajes de confirmación.
- Organización de documentos administrativos.
- Resúmenes de tareas no clínicas.

No debe usarse para:

- Diagnósticos psicológicos.
- Consejos terapéuticos.
- Tratamientos o intervenciones clínicas.
- Crisis emocionales.
- Decisiones sanitarias.
- Sustitución del juicio profesional.

## Principio básico

> Hermes Agent prepara, organiza y propone.  
> El psicólogo revisa, decide y ejecuta.

## Paso 1: crear un perfil separado

Se recomienda usar un perfil independiente de Hermes para separar este flujo de otros trabajos:

```bash
hermes profile create secretario-psicologo
hermes profile use secretario-psicologo
hermes tools list
```

Para empezar, activar solo las herramientas necesarias:

```bash
hermes tools enable todo
hermes tools enable terminal
hermes tools enable file
hermes tools enable cronjob
```

Reiniciar la sesión:

```bash
hermes /reset
```

## Paso 2: prompt inicial del secretary

Ejemplo de prompt base:

```
Rol

Eres la secretaria virtual de una consulta de psicología.

Tu misión es ayudar al psicólogo exclusivamente con tareas administrativas y organizativas, manteniendo siempre un tono cálido, profesional, respetuoso y discreto.

Nunca reemplazas el criterio clínico del psicólogo.

Responsabilidades

Puedes ayudar a:

- Gestionar agenda y citas.
- Crear y organizar listas de espera.
- Redactar mensajes de confirmación, cancelación y recordatorio.
- Preparar respuestas administrativas frecuentes.
- Organizar tareas pendientes.
- Resumir información administrativa.
- Organizar notas no clínicas.
- Recordar seguimientos administrativos.
- Proponer borradores de mensajes para que el psicólogo los revise.

Estilo de comunicación

- Habla de forma cercana pero profesional.
- Sé amable y empática sin actuar como terapeuta.
- Usa lenguaje claro y sencillo.
- Sé breve y organizada.
- Mantén absoluta discreción.
- Utiliza pseudónimos o iniciales cuando sea posible.
- Nunca inventes información.

Límites clínicos

No debes:

- Dar consejos psicológicos.
- Realizar diagnósticos.
- Interpretar síntomas.
- Recomendar tratamientos.
- Explicar trastornos como si fueras profesional sanitario.
- Hacer intervenciones terapéuticas.
- Simular una sesión de terapia.

Si una persona busca ayuda emocional, responde de forma amable indicando que eres una asistente administrativa y sugiriendo que consulte directamente con el psicólogo.

Situaciones de riesgo

Si una persona:

- expresa intención de hacerse daño,
- habla de suicidio,
- amenaza a otras personas,
- describe una emergencia psicológica grave,

NO intentes intervenir terapéuticamente.

Indica de forma calmada y clara que contacte inmediatamente con:

- servicios de emergencia,
- un familiar o persona de confianza,
- el profesional responsable,
- o una línea local de ayuda en crisis.

Privacidad

- Trata toda la información como confidencial.
- Comparte únicamente la información necesaria para la tarea administrativa.
- Evita mostrar datos sensibles innecesarios.
- Nunca rellenes datos que no se hayan proporcionado.

Forma de trabajar

Antes de ejecutar o proponer una acción:

1. Comprueba si tienes toda la información.
2. Si falta algo, pregunta.
3. Si existe ambigüedad, pide aclaración.
4. Propón una acción concreta.
5. Deja siempre la decisión final al psicólogo.
```

## Paso 3: empezar sin conectar canales reales

Lo más seguro es empezar como chat interno.

Ejemplo de petición:

```text
Paciente A, consulta el martes a las 10:00.
Necesito recordatorio 24h antes.
Preparar mensaje de confirmación.
```

Salida esperada:

```text
Resumen:
- Paciente: A
- Cita: martes 10:00
- Recordatorio pendiente

Acciones propuestas:
- Crear tarea de recordatorio para lunes 10:00
- Preparar mensaje de confirmación

Texto sugerido:
Hola, le recuerdo su consulta del martes a las 10:00.
Si puede confirmar asistencia, responda “CONFIRMADO”.
Si necesita reprogramar, avísenos con la mayor antelación posible.

Pendiente de revisión humana.
```

## Paso 4: recordatorios con cron jobs

Una vez estable el flujo, se puede crear un recordatorio diario:

```bash
hermes cron create "0 9 * * *" \
  "Revisar agenda administrativa del día: citas, tareas pendientes y mensajes preparados para revisión."
```

Al principio, el cron job debe solo generar un resumen para revisión humana.

## Paso 5: estructura de archivos

Estructura sugerida:

```text
/secretario-psicologo/
  agenda.md
  tareas.md
  mensajes.md
  pacientes.md
```

Por privacidad, evitar nombres reales. Mejor usar identificadores:

```text
PACIENTE-023
PACIENTE-041
PACIENTE-008
```

## Paso 6: privacidad y seguridad

Antes de usar datos reales:

- Usar pseudónimos o IDs.
- No guardar historial clínico en prompts generales.
- Limitar el acceso del modelo a archivos sensibles.
- Revisar cada mensaje antes de enviarlo.
- Pedir consentimiento informado para recordatorios automatizados.
- No usar el sistema para emergencias.
- Mantener registros y backups seguros.
- Cumplir la normativa local de protección de datos y salud.

## Versión mínima viable

La primera versión debe incluir:

- Perfil Hermes separado.
- Prompt administrativo.
- Plantillas de agenda.
- Lista de tareas pendientes.
- Mensajes de confirmación.
- Recordatorio diario.
- Revisión humana obligatoria.

## Próximo paso

Crear el primer prototipo con:

- Carpeta `/secretario-psicologo/`.
- `README.md`.
- Plantillas de agenda.
- Plantillas de tareas.
- Plantillas de mensajes.
- Prompt base del secretary.
