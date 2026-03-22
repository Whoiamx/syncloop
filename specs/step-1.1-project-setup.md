# Step 1.1 — Setup del Proyecto + Upload + CRUD de Proyectos

## 1. Descripcion General

Este step establece la base de la aplicacion Syncloop: la estructura del proyecto, la base de datos, el CRUD completo de proyectos, la subida de archivos de video con extraccion de metadata, y el streaming de video con soporte de range requests para seeking.

Adicionalmente incluye:
- Sistema de temas (dark/light mode) basado en preferencia del sistema con toggle manual.
- Internacionalizacion (i18n) con soporte para ingles, espanol y portugues, detectando automaticamente el idioma del navegador.

---

## 2. Implementacion Actual

### 2.1 Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Base de Datos | PostgreSQL 16 (Docker) + Drizzle ORM |
| Video | FFmpeg/FFprobe via fluent-ffmpeg |
| Validacion | Zod v4 (`zod/v4`) |
| Storage | Sistema de archivos local (`/uploads/`) |

### 2.2 Flujo de Creacion de Proyecto

1. El usuario llena el formulario: titulo + template (tutorial o product_demo).
2. Se envia POST `/api/projects` con `{ title, template }`.
3. Se valida con Zod y se inserta en la tabla `projects` con status `draft`.
4. Inmediatamente despues, se sube el video via POST `/api/projects/:id/upload` con FormData.
5. El servidor guarda el archivo en `/uploads/{projectId}/`, extrae metadata con FFprobe, y crea un registro en la tabla `videos`.
6. El status del proyecto cambia a `uploaded`.
7. Se redirige al usuario a la pagina de detalle del proyecto.

### 2.3 Streaming de Video

El endpoint `GET /api/videos/:id` implementa range requests (HTTP 206 Partial Content):
- Busca el video en DB por ID.
- Lee el header `Range` del request.
- Si hay range: devuelve solo el chunk solicitado (206).
- Si no hay range: devuelve el archivo completo (200).
- Convierte Node.js ReadStream a Web ReadableStream para compatibilidad con Next.js.

### 2.4 Tema e Internacionalizacion

**Tema:**
- ThemeProvider lee `localStorage` al montar; si no hay preferencia guardada, usa `prefers-color-scheme` del sistema.
- Aplica clase `light` o `dark` en `<html>`.
- Las variables CSS de superficie se invierten en `:root.light`.
- Toggle en la navbar (icono sol/luna).

**i18n:**
- `detectLocale()` lee `navigator.language`, extrae el codigo de idioma base.
- Si es `en`, `es` o `pt`: usa ese idioma. Si no: cae a `en`.
- Todas las strings de la UI estan centralizadas en `src/lib/i18n.ts`.
- Cada componente accede a las traducciones via `useI18n()`.

---

## 3. Endpoints API

### POST /api/projects
Crea un nuevo proyecto.

**Request:**
```json
{ "title": "Mi Video", "template": "tutorial" }
```
- `title`: string, 1-500 chars, requerido.
- `template`: `"tutorial"` | `"product_demo"`, opcional.

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Mi Video",
  "status": "draft",
  "template": "tutorial",
  "language": "en",
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

### GET /api/projects
Lista todos los proyectos con su video asociado (si existe), ordenados por fecha de creacion descendente.

**Response (200):** Array de proyectos con campo `video` (objeto o null).

### GET /api/projects/:id
Obtiene un proyecto con su video y subtitulos.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "...",
  "status": "...",
  "template": "...",
  "language": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "video": { "id": "...", "fileName": "...", ... } | null,
  "subtitles": [{ "id": "...", "index": 0, ... }]
}
```

### PATCH /api/projects/:id
Actualiza campos del proyecto.

**Request:** Campos opcionales: `title`, `template`, `status`.

**Response (200):** Proyecto actualizado.

### DELETE /api/projects/:id
Elimina el proyecto, sus videos y subtitulos (cascade en DB). Limpia archivos del disco (`/uploads/{id}/`).

**Response (200):** `{ "success": true }`

### POST /api/projects/:id/upload
Sube un archivo de video para el proyecto.

**Request:** FormData con campo `video` (archivo).

**Validaciones:**
- Tipos permitidos: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`.
- Duracion maxima: 20 minutos (1200 segundos).

**Proceso:**
1. Guarda archivo en `/uploads/{projectId}/{fileName}`.
2. Extrae metadata con FFprobe (duracion, resolucion, fps).
3. Si ya existia un video, lo reemplaza.
4. Cambia el status del proyecto a `uploaded`.

**Response (201):** Objeto video con metadata.

### GET /api/videos/:id
Sirve el archivo de video con soporte de range requests.

**Headers soportados:** `Range: bytes=start-end`

**Response:** 200 (completo) o 206 (parcial) con headers `Content-Range`, `Accept-Ranges`, `Content-Length`, `Content-Type`.

---

## 4. Modelo de Datos

### Tabla: projects
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid (PK) | Generado automaticamente |
| title | varchar(500) | Titulo del proyecto |
| status | varchar(30) | `draft`, `uploaded`, `frames_extracted`, `analyzing`, `ready` |
| template | varchar(50) | `tutorial` o `product_demo`, nullable |
| language | varchar(10) | Default `en` |
| created_at | timestamp | Fecha de creacion |
| updated_at | timestamp | Ultima actualizacion |

### Tabla: videos
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid (PK) | Generado automaticamente |
| project_id | uuid (FK, unique) | Referencia a projects, cascade delete |
| file_name | varchar(500) | Nombre original del archivo |
| file_path | text | Ruta absoluta en disco |
| file_size | integer | Tamano en bytes |
| mime_type | varchar(100) | Tipo MIME del video |
| duration | real | Duracion en segundos |
| width | integer | Ancho en pixeles |
| height | integer | Alto en pixeles |
| fps | real | Frames por segundo |
| created_at | timestamp | Fecha de creacion |

### Tabla: subtitles
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid (PK) | Generado automaticamente |
| project_id | uuid (FK) | Referencia a projects, cascade delete |
| index | integer | Indice secuencial del subtitulo |
| start_time | real | Tiempo de inicio en segundos |
| end_time | real | Tiempo de fin en segundos |
| text | text | Texto del subtitulo |
| source | varchar(50) | Default `ai_generated` |
| created_at | timestamp | Fecha de creacion |
| updated_at | timestamp | Ultima actualizacion |

---

## 5. Estructura de Archivos

```
src/
  app/
    layout.tsx                          # Layout raiz (providers de tema e i18n)
    nav-bar.tsx                         # Barra de navegacion (toggle tema, boton nuevo proyecto)
    page.tsx                            # Pagina principal: listado de proyectos
    globals.css                         # Variables de tema dark/light + animaciones
    projects/
      new/page.tsx                      # Formulario de creacion + upload
      [id]/page.tsx                     # Detalle del proyecto + video player
    api/
      projects/
        route.ts                        # POST (crear) + GET (listar)
        [id]/
          route.ts                      # GET (detalle) + PATCH + DELETE
          upload/route.ts               # POST (subir video + ffprobe)
      videos/
        [id]/route.ts                   # GET (stream video con range requests)
  db/
    schema.ts                           # Schema Drizzle: projects, videos, subtitles
    index.ts                            # Pool de conexion a DB
  lib/
    ffprobe.ts                          # Extraccion de metadata de video
    format.ts                           # Formateadores de duracion y tamano de archivo
    i18n.ts                             # Traducciones (en/es/pt) y deteccion de idioma
    i18n-context.tsx                    # React context para i18n
    theme-context.tsx                   # React context para dark/light mode
uploads/                                # Archivos de video (gitignored)
docker-compose.yml                      # PostgreSQL 16
drizzle.config.ts                       # Configuracion de Drizzle Kit
```

---

## 6. Limitaciones Conocidas (MVP)

- **Sin workers ni colas**: todo el procesamiento (FFprobe, upload) es sincronico en el API route.
- **Storage local**: los videos se guardan en `/uploads/` en el filesystem, no en S3.
- **Sin chunked uploads**: se usa FormData multipart simple. Videos muy grandes pueden causar timeout.
- **Sin autenticacion**: todos los endpoints son publicos.
- **Sin paginacion**: el listado de proyectos carga todos de una vez.
- **Un video por proyecto**: la relacion es 1:1 (unique constraint en project_id).
- **Sin validacion de duracion minima**: solo se valida el maximo (20 min).
- **Body size limit**: configurado en 500MB via `serverActions.bodySizeLimit` en next.config.mjs.
