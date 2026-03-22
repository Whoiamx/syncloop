# Step 1.2 — Extraccion de Frames

## 1. Descripcion General

Este step agrega la capacidad de extraer frames (capturas de pantalla) de un video subido, usando FFmpeg. Los frames se extraen cada 2 segundos y se guardan como archivos JPG en el filesystem local. Estos frames son la entrada para el Step 1.3 (analisis con IA).

---

## 2. Implementacion Actual

### 2.1 Proceso de Extraccion

1. El usuario hace clic en "Extraer Frames" en la pagina de detalle del proyecto.
2. Se envia POST a `/api/projects/:id/extract-frames`.
3. El servidor valida que el proyecto y video existen.
4. Se ejecuta FFmpeg con filtro `fps=1/2` (un frame cada 2 segundos) y calidad `-q:v 2`.
5. Los frames se guardan como `frame_0001.jpg`, `frame_0002.jpg`, etc. en `/uploads/{projectId}/frames/`.
6. El status del proyecto se actualiza a `frames_extracted`.
7. La UI recarga la lista de frames y muestra un grid de thumbnails.

### 2.2 Funcion extractFrames

Ubicada en `src/lib/ffmpeg.ts`. Recibe:

- `videoPath`: ruta absoluta al archivo de video.
- `outputDir`: directorio donde guardar los frames.
- `intervalSeconds`: intervalo entre frames (default: 2).

Retorna:

- `frameCount`: cantidad de frames extraidos.
- `framePaths`: array de rutas absolutas a cada frame.
- `intervalSeconds`: el intervalo usado.

Usa fluent-ffmpeg con la opcion `-vf fps=1/{interval}` para extraer frames a intervalo fijo.

### 2.3 Servicio de Frames

Dos endpoints para consultar y servir frames:

- `GET /api/projects/:id/frames` lista los frames disponibles.
- `GET /api/projects/:id/frames/:filename` sirve la imagen individual.

### 2.4 UI

**Estado sin frames (video subido):**

- Seccion con borde punteado, icono de grilla, texto descriptivo.
- Boton "Extraer Frames" con estilo brand (naranja).
- Al hacer clic: spinner + texto "Extrayendo frames...".
- Si falla: mensaje de error en rojo debajo del boton.

**Estado con frames extraidos:**

- Header con titulo "Frames Extraidos" + badge con cantidad + boton de re-extraccion.
- Descripcion: "Frames extraidos cada 2 segundos del video".
- Grid responsivo: 3 columnas (mobile) a 6 columnas (desktop).
- Cada frame es un thumbnail con aspect ratio de video.
- Hover revela un overlay con el timestamp (calculado como `index * 2` segundos).
- Imagenes usan `loading="lazy"` para carga diferida.

**Status badge:**

- El status `frames_extracted` se muestra con estilo azul (sky) tanto en el listado de proyectos como en el detalle.

---

## 3. Endpoints API

### POST /api/projects/:id/extract-frames

Extrae frames del video del proyecto.

**Validaciones:**

- El proyecto debe existir (404 si no).
- El proyecto debe tener un video subido (400 si no).

**Proceso:**

1. Determina el directorio de salida: `/uploads/{projectId}/frames/`.
2. Ejecuta `extractFrames()` con intervalo de 2 segundos.
3. Actualiza status del proyecto a `frames_extracted`.

**Response (200):**

```json
{
  "frameCount": 150,
  "intervalSeconds": 2
}
```

**Response de error (500):**

```json
{ "error": "Frame extraction failed. Is FFmpeg installed?" }
```

### GET /api/projects/:id/frames

Lista los frames extraidos para un proyecto.

**Response (200):**

```json
{
  "frames": [
    {
      "index": 0,
      "filename": "frame_0001.jpg",
      "url": "/api/projects/{id}/frames/frame_0001.jpg"
    },
    {
      "index": 1,
      "filename": "frame_0002.jpg",
      "url": "/api/projects/{id}/frames/frame_0002.jpg"
    }
  ],
  "count": 150
}
```

Si no hay frames extraidos, retorna `{ "frames": [], "count": 0 }`.

### GET /api/projects/:id/frames/:filename

Sirve un archivo de frame individual (imagen JPEG).

**Validaciones de seguridad:**

- Se usa `path.basename()` para prevenir path traversal.
- Solo se aceptan archivos que empiecen con `frame_` y terminen en `.jpg`.

**Response:** Imagen JPEG con headers:

- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=31536000, immutable`

---

## 4. Modelo de Datos

Este step no agrega tablas nuevas a la base de datos. Los frames se almacenan exclusivamente en el filesystem.

**Cambio en el status del proyecto:**

- Se agrega el valor `frames_extracted` al flujo de estados: `draft` -> `uploaded` -> `frames_extracted`.

**Estructura en disco:**

```
uploads/
  {projectId}/
    video_file.mp4          # Video original (Step 1.1)
    frames/
      frame_0001.jpg        # Frame en t=0s
      frame_0002.jpg        # Frame en t=2s
      frame_0003.jpg        # Frame en t=4s
      ...
```

---

## 5. Estructura de Archivos

```
src/
  lib/
    ffmpeg.ts                                    # Funcion extractFrames()
  app/
    api/
      projects/
        [id]/
          extract-frames/route.ts                # POST: ejecutar extraccion
          frames/
            route.ts                             # GET: listar frames
            [filename]/route.ts                  # GET: servir imagen individual
    projects/
      [id]/page.tsx                              # UI actualizada con seccion de frames
    page.tsx                                     # Status frames_extracted en listado
  lib/
    i18n.ts                                      # Traducciones nuevas: extractFrames, extractingFrames, etc.
```

---

## 6. Limitaciones Conocidas (MVP)

- **Extraccion sincronica**: FFmpeg corre dentro del API route. Para videos largos (20 min = ~600 frames) puede tardar varios segundos y bloquear el request.
- **Sin progreso real**: la UI solo muestra un spinner, no un porcentaje de progreso.
- **Sin persistencia en DB**: los frames no se registran en la base de datos, solo existen en el filesystem. Si se consultan, se lee el directorio cada vez.
- **Re-extraccion sobreescribe**: al extraer frames de nuevo, se sobreescriben los anteriores sin confirmacion.
- **Intervalo fijo**: siempre 2 segundos, no configurable desde la UI.
- **Sin thumbnails optimizados**: se sirven los JPGs a resolucion completa del video. No hay redimensionamiento para thumbnails.
- **Calidad fija**: `-q:v 2` (alta calidad JPEG), no configurable.
- **Limpieza parcial**: al eliminar un proyecto, el directorio completo `/uploads/{id}/` se borra (incluyendo frames), pero no hay limpieza si la extraccion falla a mitad de camino.
