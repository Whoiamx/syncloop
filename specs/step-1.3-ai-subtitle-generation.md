# Step 1.3 — Generacion de Subtitulos con IA

## 1. Descripcion de la Feature

Generacion automatica de subtitulos para videos mediante analisis visual de frames con GPT-4o. El sistema toma los frames previamente extraidos del video (Step 1.2), los envia como imagenes a la API de OpenAI en una unica llamada, y recibe un JSON estructurado con subtitulos alineados temporalmente. Los subtitulos se validan, persisten en base de datos y se muestran en la UI.

No se utiliza audio ni transcripcion de voz. El modelo de IA describe visualmente lo que ocurre en cada segmento del video.

---

## 2. Objetivos

- Permitir al usuario generar subtitulos descriptivos a partir de frames de video sin intervencion manual.
- Producir subtitulos alineados temporalmente que cubran la duracion completa del video.
- Soportar regeneracion de subtitulos (reemplaza los existentes).
- Mantener la transicion de estados del proyecto consistente, incluyendo rollback ante errores.

---

## 3. Usuarios / Actores

- **Usuario final**: creador de contenido que sube un video y quiere subtitulos generados automaticamente.
- **Sistema (backend)**: orquesta la carga de frames, la llamada a GPT-4o, la validacion y persistencia.

---

## 4. Casos de Uso

### CU-1: Generar subtitulos por primera vez
El usuario tiene un proyecto con video subido y frames extraidos. Presiona "Generar Subtitulos". El sistema analiza los frames con IA y muestra los subtitulos generados.

### CU-2: Regenerar subtitulos
El usuario ya tiene subtitulos generados pero quiere una nueva version. Presiona "Regenerar". El sistema elimina los subtitulos existentes, ejecuta una nueva llamada a GPT-4o y muestra los nuevos resultados.

### CU-3: Error en la generacion
La llamada a la IA falla (API key invalida, respuesta vacia, JSON malformado). El sistema muestra un mensaje de error y revierte el estado del proyecto a `frames_extracted`.

---

## 5. Requisitos Funcionales

### RF-01: Endpoint de generacion
- Ruta: `POST /api/projects/:id/generate-subtitles`
- No recibe body (sin parametros de request).
- Respuesta exitosa (200):
  ```json
  {
    "subtitleCount": 12,
    "subtitles": [
      { "startTime": 0.0, "endTime": 3.0, "text": "Descripcion del segmento" }
    ]
  }
  ```
- Respuestas de error:
  - `404`: `{ "error": "Project not found" }`
  - `400`: `{ "error": "No video uploaded for this project" }`
  - `400`: `{ "error": "No frames extracted. Extract frames first." }`
  - `500`: `{ "error": "AI returned empty response" }`
  - `500`: `{ "error": "AI returned invalid subtitle format" }`
  - `500`: `{ "error": "Subtitle generation failed. Check your OPENAI_API_KEY." }`

### RF-02: Carga y muestreo de frames
- Se leen los frames del directorio `uploads/{projectId}/frames/`.
- Se filtran archivos con patron `frame_*.jpg`, ordenados alfabeticamente.
- Si hay mas de 60 frames, se realiza un muestreo uniforme: se seleccionan 60 frames equidistantes (paso = total / 60, seleccion por indice `Math.floor(i * paso)`).
- Si hay 60 o menos frames, se usan todos.
- Los frames se cargan como base64 para enviar como `data:image/jpeg;base64,...`.

### RF-03: Construccion del prompt
El prompt enviado a GPT-4o incluye:
- Titulo del proyecto.
- Duracion total del video (en segundos).
- Descripcion del template:
  - `product_demo`: "This is a product demo video -- focus on features being shown, UI interactions, and key product highlights."
  - Cualquier otro valor (incluido `null`): "This is a tutorial/how-to video -- focus on steps being performed, instructions, and explanations."
- Cantidad de frames enviados y el intervalo entre frames (fijo: 2 segundos).
- Idioma de salida: `es` -> "Spanish", `pt` -> "Portuguese", otro -> "English".
- Guia de timing: mapeo de indice de frame a timestamp.
- Instrucciones de formato: JSON estricto, sin texto adicional.
- Restricciones para subtitulos: duracion 2-6 segundos, sin solapamiento, cobertura completa.

### RF-04: Llamada a GPT-4o
- Modelo: `gpt-4o`.
- `max_tokens`: 4096.
- Un unico mensaje `user` con contenido multipart: texto del prompt + imagenes como `image_url` con `detail: "low"`.
- Una sola llamada (no se divide en multiples llamadas).

### RF-05: Parseo y validacion de respuesta
- Se extrae `choices[0].message.content`.
- Se limpian bloques de codigo markdown (``` o ```json) si la respuesta los incluye.
- Se parsea el JSON y se valida con schema Zod:
  ```
  SubtitleSchema = { startTime: number (min 0), endTime: number (min 0), text: string (min 1 char) }
  SubtitlesResponseSchema = { subtitles: array de SubtitleSchema }
  ```

### RF-06: Persistencia de subtitulos
- Se eliminan todos los subtitulos existentes del proyecto antes de insertar los nuevos.
- Cada subtitulo se inserta con:
  - `projectId`: ID del proyecto.
  - `index`: posicion secuencial (0, 1, 2...).
  - `startTime`, `endTime`: tiempos en segundos (real/float).
  - `text`: texto del subtitulo.
  - `source`: `"ai_generated"`.
- Si el array de subtitulos esta vacio, no se inserta nada (pero se considera exito).

### RF-07: Transiciones de estado del proyecto
- Al iniciar la generacion: `status` cambia a `"analyzing"`.
- Al completar exitosamente: `status` cambia a `"ready"`.
- En caso de error (cualquier tipo): `status` revierte a `"frames_extracted"`.
- El campo `updatedAt` se actualiza en cada transicion.

### RF-08: Comportamiento de la UI - Estado sin subtitulos
- Se muestra un bloque vacio con texto descriptivo.
- Si hay frames extraidos: se muestra el boton "Generar Subtitulos" (i18n: `generateSubtitles`).
- Si no hay frames: se muestra solo texto indicando que primero se deben extraer frames.
- El boton muestra un spinner y texto "Analizando frames con IA..." durante la generacion (i18n: `generatingSubtitles`).
- El boton se deshabilita durante la generacion.
- Si ocurre un error, se muestra inline debajo del texto descriptivo.

### RF-09: Comportamiento de la UI - Estado con subtitulos
- Se muestra la lista de subtitulos con encabezado "Subtitulos" y conteo de segmentos.
- Cada subtitulo muestra: rango de tiempo (formato `HH:MM:SS` o `MM:SS`) y texto.
- Se incluye un boton "Regenerar" (i18n: `regenerateSubtitles`) en el header de la seccion.
- El boton "Regenerar" se deshabilita durante la generacion.
- Despues de generar/regenerar, se recarga el proyecto completo desde la API para reflejar el nuevo estado y subtitulos.

### RF-10: Claves i18n agregadas
Se agregaron las siguientes claves en los 3 idiomas (en, es, pt):
- `generateSubtitles`: texto del boton de generacion.
- `generatingSubtitles`: texto durante la generacion (con spinner).
- `generateSubtitlesDesc`: descripcion cuando hay frames pero no subtitulos.
- `generationFailed`: mensaje de error generico.
- `regenerateSubtitles`: texto del boton de regeneracion.

---

## 6. Requisitos No Funcionales

- **Tiempo de respuesta**: la llamada a GPT-4o puede tomar 15-60 segundos dependiendo de la cantidad de frames. La operacion es sincrona (no hay workers ni colas).
- **Limite de contexto**: maximo 60 frames por llamada para mantenerse dentro del context window de GPT-4o.
- **Detalle de imagenes**: se usa `detail: "low"` para reducir tokens consumidos por imagen.
- **Resiliencia**: ante cualquier error no controlado, se intenta revertir el estado del proyecto en un bloque catch separado.

---

## 7. Edge Cases

| Caso | Comportamiento esperado |
|------|------------------------|
| Proyecto no existe | 404 con mensaje "Project not found" |
| Proyecto sin video | 400 con mensaje "No video uploaded for this project" |
| Directorio de frames no existe o vacio | 400 con mensaje "No frames extracted. Extract frames first." |
| OPENAI_API_KEY no configurada o invalida | 500 con mensaje "Subtitle generation failed. Check your OPENAI_API_KEY." |
| GPT-4o retorna `content` vacio/null | 500, estado revierte a `frames_extracted`, mensaje "AI returned empty response" |
| GPT-4o retorna JSON invalido o no parseable | 500, estado revierte a `frames_extracted`, mensaje "AI returned invalid subtitle format" |
| GPT-4o retorna JSON valido pero subtitulos no cumplen schema Zod | 500, mismo comportamiento que JSON invalido |
| GPT-4o envuelve respuesta en bloques markdown (```json ... ```) | Se limpian los delimitadores antes de parsear |
| Subtitulos previos existen al regenerar | Se eliminan antes de insertar los nuevos (DELETE + INSERT, no upsert) |
| GPT-4o retorna array de subtitulos vacio `{ "subtitles": [] }` | Se eliminan existentes, no se insertan nuevos, estado pasa a `ready`, respuesta exitosa con `subtitleCount: 0` |
| Video sin duracion registrada (`duration` null) | Se calcula duracion estimada como `frameCount * intervalSeconds` |
| Mas de 60 frames extraidos (video largo) | Se muestrean 60 frames uniformemente distribuidos |
| Error de red al revertir estado en catch | Se ignora silenciosamente (catch anidado vacio) |

---

## 8. Criterios de Aceptacion

### CA-01: Generacion exitosa
```
Given un proyecto con status "frames_extracted" y frames disponibles en disco
When el usuario invoca POST /api/projects/:id/generate-subtitles
Then el status del proyecto cambia a "analyzing" durante el procesamiento
  And se envia una llamada a GPT-4o con los frames como imagenes base64
  And la respuesta se parsea y valida con el schema Zod
  And los subtitulos se persisten en la tabla "subtitles"
  And el status del proyecto cambia a "ready"
  And la respuesta contiene subtitleCount y el array de subtitulos
```

### CA-02: Muestreo de frames
```
Given un proyecto con 120 frames extraidos
When se ejecuta la generacion de subtitulos
Then se seleccionan exactamente 60 frames uniformemente distribuidos
  And los frames seleccionados cubren todo el rango temporal del video
```

### CA-03: Regeneracion
```
Given un proyecto con status "ready" y 15 subtitulos existentes
When el usuario invoca POST /api/projects/:id/generate-subtitles
Then los 15 subtitulos existentes se eliminan
  And se generan nuevos subtitulos via GPT-4o
  And los nuevos subtitulos se insertan en la base de datos
```

### CA-04: Error - respuesta vacia de IA
```
Given un proyecto con frames extraidos
When GPT-4o retorna content vacio o null
Then se retorna 500 con error "AI returned empty response"
  And el status del proyecto revierte a "frames_extracted"
```

### CA-05: Error - JSON invalido de IA
```
Given un proyecto con frames extraidos
When GPT-4o retorna texto que no es JSON valido o no cumple el schema
Then se retorna 500 con error "AI returned invalid subtitle format"
  And el status del proyecto revierte a "frames_extracted"
```

### CA-06: Error - sin frames
```
Given un proyecto con video pero sin frames extraidos
When se invoca POST /api/projects/:id/generate-subtitles
Then se retorna 400 con error "No frames extracted. Extract frames first."
  And el status del proyecto NO cambia
```

### CA-07: UI - boton de generacion
```
Given el usuario esta en la pagina de detalle de un proyecto con frames extraidos y sin subtitulos
When visualiza la seccion de subtitulos
Then ve un boton "Generar Subtitulos" habilitado
When presiona el boton
Then el boton se deshabilita y muestra spinner con texto "Analizando frames con IA..."
When la generacion finaliza exitosamente
Then se recarga el proyecto y se muestra la lista de subtitulos con conteo de segmentos
```

### CA-08: UI - regeneracion
```
Given el usuario esta en la pagina de detalle con subtitulos existentes
When presiona el boton "Regenerar"
Then se ejecuta la generacion nuevamente
  And los subtitulos anteriores se reemplazan por los nuevos
```

### CA-09: UI - error visible
```
Given la generacion falla por cualquier motivo
When el error se recibe en el frontend
Then se muestra un mensaje de error inline en la seccion de subtitulos
  And el boton de generacion vuelve a estar habilitado
```

---

## 9. Supuestos

- El intervalo entre frames es fijo en 2 segundos (coherente con Step 1.2 que extrae frames cada 2 segundos).
- Se asume que GPT-4o puede procesar hasta 60 imagenes en `detail: "low"` dentro de una sola llamada sin exceder el context window.
- La llamada es sincrona: el usuario debe esperar la respuesta completa (no hay streaming ni polling).
- No se implementa rate limiting ni control de costos en esta fase.
- La variable de entorno `OPENAI_API_KEY` debe estar configurada en `.env.local`.
- Los frames siempre son JPEG con nombre `frame_NNNNN.jpg`.

---

## 10. Dudas / Ambiguedades

- **Concurrencia**: No hay proteccion contra llamadas concurrentes al mismo proyecto. Si dos usuarios (o dos tabs) invocan la generacion simultaneamente, el comportamiento es indefinido (posible estado inconsistente).
- **Costo**: No se estima ni muestra al usuario el costo de la llamada a OpenAI antes de ejecutarla. Considerar agregar confirmacion o estimacion en fases futuras.
- **Calidad de subtitulos**: La calidad depende enteramente del modelo GPT-4o y del prompt. No hay mecanismo de retry automatico si la calidad es baja.
- **Videos largos**: Para videos de 20 minutos con frames cada 2 segundos = 600 frames, se muestrean a 60. Esto significa que se pierde el 90% de los frames, lo cual puede afectar la precision temporal de los subtitulos.
- **Solapamiento de subtitulos**: El prompt indica "no overlap" pero no hay validacion server-side de que los subtitulos retornados realmente no se solapan.
- **Cobertura temporal**: El prompt pide cobertura completa pero no se valida que `startTime` del primer subtitulo sea 0 ni que `endTime` del ultimo cubra la duracion total.

---

## Dependencias

| Dependencia | Uso |
|-------------|-----|
| `openai` (npm package) | Cliente para la API de OpenAI (GPT-4o) |
| `zod/v4` | Validacion del schema de respuesta de la IA |
| `fs/promises` | Lectura de frames del filesystem |

---

## Schema de Base de Datos (referencia)

Tabla `subtitles`:
| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | uuid | PK, auto-generado |
| project_id | uuid | FK -> projects.id, ON DELETE CASCADE |
| index | integer | NOT NULL |
| start_time | real | NOT NULL |
| end_time | real | NOT NULL |
| text | text | NOT NULL |
| source | varchar(50) | default "ai_generated" |
| created_at | timestamp | default now(), NOT NULL |
| updated_at | timestamp | default now(), NOT NULL |
