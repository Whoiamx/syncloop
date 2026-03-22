# Guia de Estilo y Calidad de Subtitulos - Syncloop

## 1. Descripcion de la Feature

Definicion del estandar de contenido, estructura, tono y calidad que deben cumplir los subtitulos generados por IA en Syncloop segun el template del proyecto (Tutorial o Product Demo). Esta guia establece las reglas que determinan como deben verse, leerse y sentirse los subtitulos producidos por el sistema.

Esta spec NO define la implementacion tecnica (cubierta en `step-1.3-ai-subtitle-generation.md`), sino el **output esperado**: que debe producir la IA, como debe sonar, y que criterios determinan si el resultado es aceptable o no.

---

## 2. Objetivos

- Establecer un estandar medible de calidad para los subtitulos generados.
- Documentar la estructura narrativa esperada para cada template.
- Proveer ejemplos concretos de subtitulos buenos y malos para cada caso.
- Definir reglas de idioma, timing y formato que aplican a todos los templates.
- Servir como referencia para evaluar, ajustar prompts y validar resultados.

---

## 3. Usuarios / Actores

- **Creador de contenido**: consume los subtitulos generados y espera que sean utiles sin edicion excesiva.
- **Sistema de IA (GPT-4o)**: genera los subtitulos siguiendo las reglas de esta guia (traducidas al prompt).
- **Equipo de producto**: usa esta guia para evaluar si los subtitulos cumplen el estandar de calidad.

---

## 4. Reglas Generales (Aplican a TODOS los Templates)

### 4.1 Timing y Sincronizacion

| Regla | Valor |
|-------|-------|
| Duracion minima de un subtitulo | 2 segundos |
| Duracion maxima de un subtitulo | 6 segundos |
| Solapamiento entre subtitulos | Prohibido. `endTime` de subtitulo N debe ser <= `startTime` de subtitulo N+1 |
| Gap maximo sin subtitulo | 3 segundos. No debe haber vacios mayores a 3s sin justificacion visual |
| Cobertura temporal | Los subtitulos deben cubrir desde el segundo 0 hasta el final del video |
| Primer subtitulo | Debe comenzar en `startTime: 0.0` |
| Ultimo subtitulo | Su `endTime` debe estar dentro de 2 segundos del final del video |

### 4.2 Formato de Texto

| Regla | Detalle |
|-------|---------|
| Longitud maxima por subtitulo | 120 caracteres. Si el texto es mas largo, debe dividirse en dos subtitulos |
| Mayusculas | Solo al inicio de oracion y nombres propios. NUNCA todo en mayusculas |
| Puntuacion | Usar puntos al final de oraciones completas. Comas para pausas naturales |
| Emojis | Prohibidos |
| Caracteres especiales | Solo los necesarios para el idioma (tildes, enie, cedilla) |
| Abreviaciones | Evitar. Escribir "por ejemplo" en vez de "p.ej." |
| Numeros | Del 1 al 10 se escriben en letras. Del 11 en adelante se escriben en cifras |

### 4.3 Cobertura de Contenido

- Cada subtitulo debe corresponder a algo **visible en el video** durante ese rango de tiempo.
- No inventar acciones que no se ven en los frames.
- No repetir informacion entre subtitulos consecutivos.
- Si multiples acciones pequenas ocurren en rapida sucesion, agruparlas en un solo subtitulo significativo.

### 4.4 Reglas de Idioma por Locale

#### Espanol (`es`)
- Usar **tuteo** (tu) por defecto, no voseo ni ustedeo.
- Tono imperativo informal: "Haz clic", "Selecciona", "Escribe".
- Tildes y signos de apertura obligatorios en exclamaciones e interrogaciones.
- No usar anglicismos cuando exista equivalente: "haz clic" en vez de "clickea", "correo electronico" en vez de "email" (excepto cuando el termino en ingles es el nombre visible en la UI).
- Si la UI del software mostrado esta en ingles, referirse a los elementos por su nombre en ingles entre comillas: Haz clic en "Settings".

#### Ingles (`en`)
- Usar segunda persona: "you", "your".
- Tono imperativo directo: "Click on", "Select", "Enter your".
- Contracciones permitidas en tono casual: "you'll", "let's", "don't".
- Evitar voz pasiva. Preferir "Click the button" sobre "The button should be clicked".

#### Portugues (`pt`)
- Usar **voce** (portugues brasileno) por defecto.
- Tono imperativo: "Clique em", "Selecione", "Digite".
- Acentuacion correcta obligatoria.
- Mismo criterio de anglicismos que espanol.

---

## 5. Template: Tutorial

### 5.1 Estructura Narrativa

Los subtitulos de un tutorial siguen una estructura de **cuatro fases** obligatorias:

```
INTRO  -->  STEPS (con TRANSITIONS intermedias)  -->  OUTRO
```

| Fase | Proposito | Cantidad | Ubicacion |
|------|-----------|----------|-----------|
| INTRO | Saludar y explicar que se va a aprender | 1 subtitulo | Primeros 2-4 segundos |
| STEP | Describir una accion que el viewer debe ejecutar | Variable (el grueso del video) | Cuerpo del video |
| TRANSITION | Conectar secciones tematicas del tutorial | 1-3 por video | Entre grupos de steps |
| OUTRO | Cerrar, resumir y despedir | 1 subtitulo | Ultimos 2-4 segundos |

### 5.2 Tono y Estilo

- **Voz**: imperativa, directa, guia al usuario como un instructor.
- **Perspectiva**: segunda persona ("Haz clic...", "Click on...").
- **Ritmo**: denso. Apuntar a 1 subtitulo cada 2-4 segundos.
- **Foco**: acciones de UI (clicks, escritura, navegacion, seleccion de menus).
- **Nivel de detalle**: describir la accion Y donde ocurre. "Haz clic en el boton Enviar" es mejor que "Haz clic ahi".

### 5.3 Reglas de Escritura para Steps

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|-----------------|-------------------|
| Usar imperativo | "Haz clic en Redactar" | "El usuario hace clic en Redactar" |
| Nombrar elementos de UI | "Selecciona la opcion Programar envio" | "Selecciona la opcion del menu" |
| Describir accion + ubicacion | "En el campo Para, escribe el email" | "Escribe el email" |
| Agrupar micro-acciones | "Completa los campos de nombre y apellido" | "Escribe tu nombre. Ahora escribe tu apellido." (en dos subtitulos separados) |
| Lenguaje simple | "Abre el menu de configuracion" | "Accede al panel de parametrizacion avanzada" |

### 5.4 Reglas de Escritura para Transitions

- Deben ser breves (maximo 8 palabras idealmente).
- Introducen la siguiente seccion tematica.
- Usan conectores naturales: "Ahora vamos a...", "A continuacion...", "El siguiente paso es...".

| Ejemplo correcto | Ejemplo incorrecto |
|-----------------|-------------------|
| "Ahora vamos a configurar las notificaciones." | "Muy bien, excelente trabajo hasta ahora, ahora pasemos a la siguiente parte que es super importante." |
| "Now let's set up the export settings." | "Moving on." |

### 5.5 Contenido Prohibido en Tutorial

- Lenguaje de marketing o promocional ("Esta increible herramienta...", "The amazing feature...").
- Descripciones vagas sin accion ("Se puede ver la interfaz", "The screen shows something").
- Opiniones subjetivas ("Este es el mejor metodo", "This looks great").
- Explicaciones tecnicas internas ("El sistema usa una API REST para...").
- Redundancia ("Haz clic en el boton. Ya hiciste clic en el boton.").

### 5.6 Densidad Esperada

| Duracion del video | Subtitulos esperados (aprox.) |
|-------------------|-------------------------------|
| 20 segundos | 7-10 |
| 60 segundos | 20-30 |
| 3 minutos | 50-80 |
| 5 minutos | 80-130 |

### 5.7 Ejemplo Completo - Tutorial de Gmail (espanol, ~22 segundos)

```
[00:00.0 -> 00:03.0] INTRO
"Hola a todos. En este video te voy a ensenar como programar el envio de un correo en Gmail."

[00:03.0 -> 00:06.0] STEP
"Para redactar un nuevo mensaje, haz clic en el boton Redactar."

[00:06.0 -> 00:08.0] STEP
"En el campo Para, comienza a escribir el nombre o email del destinatario y selecciona el contacto."

[00:08.0 -> 00:10.0] STEP
"Escribe el asunto del correo en el campo Asunto."

[00:10.0 -> 00:13.0] STEP
"Ahora redacta el contenido de tu mensaje en el cuerpo del correo."

[00:13.0 -> 00:15.0] TRANSITION
"Ahora vamos a agendar el envio del correo."

[00:15.0 -> 00:17.0] STEP
"Haz clic en la pequena flecha al lado del boton Enviar."

[00:17.0 -> 00:19.0] STEP
"Selecciona la opcion Programar envio del menu desplegable."

[00:19.0 -> 00:22.0] OUTRO
"Y listo, ya agendaste el envio. Nos vemos en el proximo video."
```

**Analisis del ejemplo**:
- 9 subtitulos en 22 segundos = ~1 cada 2.4 segundos (densidad correcta).
- Estructura completa: INTRO (1) + STEPS (6) + TRANSITION (1) + OUTRO (1).
- Tono imperativo consistente.
- Elementos de UI nombrados explicitamente ("boton Redactar", "campo Para", "campo Asunto").
- Sin solapamiento, cobertura completa.

---

## 6. Template: Product Demo

### 6.1 Estructura Narrativa

Los subtitulos de un product demo siguen una estructura de **cuatro fases** obligatorias:

```
HOOK  -->  FEATURES (con TRANSITIONS intermedias)  -->  CLOSING
```

| Fase | Proposito | Cantidad | Ubicacion |
|------|-----------|----------|-----------|
| HOOK | Captar atencion, presentar el producto | 1-2 subtitulos | Primeros 3-5 segundos |
| FEATURE | Destacar una capacidad del producto y su beneficio | Variable (el grueso del video) | Cuerpo del video |
| TRANSITION | Conectar secciones o crear expectativa | 1-3 por video | Entre grupos de features |
| CLOSING | Cerrar con impacto, call-to-action o slogan | 1-2 subtitulos | Ultimos 3-5 segundos |

### 6.2 Tono y Estilo

- **Voz**: confiada, energica, orientada al valor.
- **Perspectiva**: mixta. Puede usar "you/tu" o hablar del producto en tercera persona.
- **Ritmo**: menos denso que tutorial. Dejar que los visuales respiren. Apuntar a 1 subtitulo cada 3-5 segundos.
- **Foco**: beneficios, resultados, experiencia del usuario. NO instrucciones.
- **Impacto**: cada subtitulo debe hacer que el viewer quiera usar el producto.

### 6.3 Reglas de Escritura para Features

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|-----------------|-------------------|
| Resaltar el beneficio, no la mecanica | "Encuentra cualquier archivo en milisegundos" | "Escribe en la barra de busqueda y presiona Enter" |
| Subtitulos punchy y concisos | "Un dashboard que habla por si solo." | "Aqui podemos ver un dashboard que muestra varias metricas y graficos." |
| Enfatizar velocidad/simplicidad | "Configura todo en menos de un minuto." | "El proceso de configuracion consta de varios pasos." |
| Mostrar lo que el usuario gana | "Tus reportes, listos con un clic." | "El sistema genera reportes automaticamente." |
| Evitar lo generico | "Integracion nativa con Slack, Notion y 50 apps mas." | "Se integra con muchas herramientas." |

### 6.4 Reglas de Escritura para Hooks

- Deben ser memorables y crear curiosidad.
- Maximo 2 subtitulos de hook.
- Pueden usar formulas como: "Conoce [producto]", "Imagina poder...", "Y si pudieras...".

| Ejemplo correcto | Ejemplo incorrecto |
|-----------------|-------------------|
| "Conoce Syncloop. Subtitulos inteligentes para tus videos, sin esfuerzo." | "Este es un video sobre Syncloop." |
| "Meet Acme. Your data, finally under control." | "Welcome to our product demo video." |

### 6.5 Reglas de Escritura para Closings

- Deben cerrar con fuerza y dejar una impresion.
- Pueden incluir un call-to-action implicito.
- Maximo 2 subtitulos de closing.

| Ejemplo correcto | Ejemplo incorrecto |
|-----------------|-------------------|
| "Esto es Acme. Construido para velocidad, disenado para ti." | "Eso es todo. Gracias por ver el video." |
| "Start building today. Your team will thank you." | "That concludes our product demonstration." |

### 6.6 Contenido Prohibido en Product Demo

- Instrucciones paso a paso ("Haz clic en...", "Selecciona...").
- Explicaciones tecnicas ("Usa una arquitectura de microservicios", "Built on React with...").
- Descripciones planas de lo que se ve ("Se ve una pantalla con un formulario").
- Lenguaje debil o dubitativo ("Quizas te podria servir", "It might help").
- Frases genericas sin sustancia ("Es muy bueno", "It's really great").

### 6.7 Densidad Esperada

| Duracion del video | Subtitulos esperados (aprox.) |
|-------------------|-------------------------------|
| 20 segundos | 4-7 |
| 60 segundos | 12-20 |
| 3 minutos | 35-55 |
| 5 minutos | 55-85 |

### 6.8 Ejemplo Completo - Product Demo de "TaskFlow" (espanol, ~30 segundos)

```
[00:00.0 -> 00:03.5] HOOK
"Conoce TaskFlow. La forma mas rapida de organizar el trabajo de tu equipo."

[00:03.5 -> 00:07.0] FEATURE
"Un dashboard limpio e intuitivo que te muestra todo de un vistazo."

[00:07.0 -> 00:10.5] FEATURE
"Arrastra y suelta para reorganizar prioridades al instante."

[00:10.5 -> 00:14.0] FEATURE
"Filtros inteligentes que encuentran exactamente lo que necesitas."

[00:14.0 -> 00:16.5] TRANSITION
"Pero eso es solo el comienzo."

[00:16.5 -> 00:20.0] FEATURE
"Automatizaciones que eliminan el trabajo repetitivo de tu dia."

[00:20.0 -> 00:23.5] FEATURE
"Integracion directa con Slack, Notion y 30 herramientas mas."

[00:23.5 -> 00:26.5] FEATURE
"Reportes en tiempo real para que siempre sepas donde esta tu equipo."

[00:26.5 -> 00:30.0] CLOSING
"TaskFlow. Menos gestion, mas resultados."
```

**Analisis del ejemplo**:
- 9 subtitulos en 30 segundos = ~1 cada 3.3 segundos (densidad correcta para demo).
- Estructura completa: HOOK (1) + FEATURES (6) + TRANSITION (1) + CLOSING (1).
- Tono confiado, orientado a beneficios.
- Sin instrucciones paso a paso.
- Subtitulos punchy, ninguno supera los 70 caracteres.
- Sin solapamiento, cobertura completa.

### 6.9 Ejemplo Completo - Product Demo de "CloudVault" (ingles, ~25 segundos)

```
[00:00.0 -> 00:03.5] HOOK
"Meet CloudVault. Your files, encrypted and accessible from anywhere."

[00:03.5 -> 00:07.0] FEATURE
"A workspace that feels familiar from day one."

[00:07.0 -> 00:10.0] FEATURE
"Upload anything. Preview everything. No plugins needed."

[00:10.0 -> 00:13.5] FEATURE
"Real-time collaboration that actually keeps up with your team."

[00:13.5 -> 00:16.0] TRANSITION
"And security? Built into every layer."

[00:16.0 -> 00:19.5] FEATURE
"End-to-end encryption with zero-knowledge architecture."

[00:19.5 -> 00:22.0] FEATURE
"Granular permissions so the right people see the right files."

[00:22.0 -> 00:25.0] CLOSING
"CloudVault. Security meets simplicity."
```

---

## 7. Criterios de Calidad: Buenos vs. Malos Subtitulos

### 7.1 Criterios Universales (ambos templates)

Un **buen subtitulo**:
- Corresponde a lo que se ve en el video durante ese rango de tiempo.
- Es autocontenido: se entiende sin leer los subtitulos anteriores.
- Tiene la longitud justa: ni telegrama ni parrafo.
- Usa vocabulario consistente a lo largo del video.
- No repite informacion del subtitulo anterior.

Un **mal subtitulo**:
- Describe algo que no se ve en el video.
- Es tan generico que podria aplicarse a cualquier video.
- Repite casi textualmente el subtitulo anterior.
- Usa terminologia inconsistente (llama al mismo elemento "panel", "sidebar" y "menu lateral" en subtitulos distintos).
- Tiene errores gramaticales o de puntuacion.

### 7.2 Comparacion Directa - Tutorial

| Situacion | Buen subtitulo | Mal subtitulo | Porque es malo |
|-----------|---------------|---------------|----------------|
| Usuario hace clic en un boton | "Haz clic en el boton Guardar en la esquina superior derecha." | "Haz clic." | Demasiado vago, no dice donde ni en que |
| Se muestra un formulario | "Completa los campos de nombre, email y contrasena." | "Ahora vemos un formulario con varios campos que debemos llenar para poder continuar." | Demasiado largo, usa "vemos" en vez de imperativo |
| Transicion entre secciones | "Ahora vamos a configurar los permisos." | "Bien, pasemos a lo siguiente." | No dice a que se pasa, generico |
| Pantalla de carga visible | "Espera mientras se procesan los datos." | "Se esta cargando algo." | Vago, no informa que se carga |
| Menu desplegable | "Abre el menu desplegable y selecciona Exportar como PDF." | "Selecciona la opcion correcta del menu." | No nombra la opcion especifica |

### 7.3 Comparacion Directa - Product Demo

| Situacion | Buen subtitulo | Mal subtitulo | Porque es malo |
|-----------|---------------|---------------|----------------|
| Dashboard con metricas | "Todas tus metricas clave en un solo lugar." | "Aqui se puede ver el dashboard con graficos." | Descriptivo sin valor, no resalta beneficio |
| Busqueda rapida | "Resultados instantaneos con cada letra que escribes." | "La busqueda funciona bien." | Generico, sin impacto |
| Integraciones | "Conecta con las herramientas que ya usas." | "Tiene muchas integraciones." | Vago, no genera conexion emocional |
| Pantalla de login | "Acceso seguro en segundos, desde cualquier dispositivo." | "Haz clic en Iniciar sesion y escribe tu contrasena." | Es instruccion paso a paso, no es demo |
| Feature de colaboracion | "Tu equipo, siempre sincronizado." | "Varias personas pueden editar al mismo tiempo." | Descriptivo plano, sin punch |

---

## 8. Edge Cases

### 8.1 Video sin UI visible (grabacion de pantalla en blanco, fondo estatico)

**Comportamiento esperado**: La IA debe generar subtitulos basados en el contexto disponible (titulo del proyecto). Si no hay actividad visual distinguible:
- INTRO y OUTRO se generan normalmente basados en el titulo.
- Los STEPS/FEATURES deben ser genericos pero coherentes con el titulo.
- Es preferible generar menos subtitulos con contenido razonable que muchos subtitulos que digan "Se muestra una pantalla estatica".
- El sistema NO debe fallar. Debe producir un resultado utilizable que el usuario pueda editar.

### 8.2 Video con mucho texto visible en pantalla (IDE, documentos, terminales)

**Comportamiento esperado**:
- Tutorial: describir las acciones, no leer el texto en pantalla. "Escribe el comando de instalacion en la terminal" es mejor que transcribir el comando literal.
- Product Demo: resaltar lo que el texto implica. "Documentacion integrada que se actualiza sola" es mejor que "Se ve un archivo de texto".
- NUNCA transcribir literalmente bloques de codigo o texto largo visibles en pantalla.

### 8.3 Video con partes estaticas (pantalla sin cambios por varios segundos)

**Comportamiento esperado**:
- Si la pantalla no cambia durante mas de 4 segundos, es aceptable tener UN subtitulo largo (hasta 6s) cubriendo ese periodo.
- No generar multiples subtitulos que digan variaciones de "La pantalla sigue igual".
- Usar el tiempo estatico para transiciones, contexto o anticipacion: "Mientras se procesa la solicitud..." o "Todo listo para el siguiente paso."

### 8.4 Video muy corto (menos de 10 segundos)

**Comportamiento esperado**:
- Minimo 2 subtitulos (apertura + contenido o contenido + cierre).
- No forzar las cuatro fases completas. Un INTRO + STEP o HOOK + FEATURE es suficiente.
- No omitir cobertura: incluso en 8 segundos debe haber subtitulos desde el segundo 0 al final.

### 8.5 Video largo (mas de 5 minutos)

**Comportamiento esperado**:
- Las TRANSITIONS cobran mas importancia para segmentar el contenido.
- Debe haber al menos 1 TRANSITION por cada 60-90 segundos de video.
- Los subtitulos no deben volverse repetitivos. Si acciones similares se repiten, variar la redaccion.
- La densidad debe mantenerse consistente a lo largo del video (no empezar denso y terminar escaso).

### 8.6 Idioma del video vs. idioma del proyecto

**Comportamiento esperado**:
- Los subtitulos SIEMPRE se generan en el idioma configurado del proyecto (`language`), independientemente del idioma visible en la UI del video.
- Si la UI del video esta en ingles pero el proyecto esta en espanol, los subtitulos son en espanol pero referencian los elementos de UI en ingles entre comillas: "Haz clic en 'Settings'".

### 8.7 Video con transiciones animadas o efectos visuales

**Comportamiento esperado**:
- No describir las animaciones ("Se ve una transicion con fade").
- Usar esos momentos para TRANSITIONS narrativas.
- Si la animacion dura menos de 2 segundos, extender el subtitulo anterior o siguiente para cubrirla.

---

## 9. Criterios de Aceptacion

### CA-01: Estructura completa - Tutorial
```
Given un proyecto con template "tutorial" y video con frames extraidos
When se generan subtitulos
Then el primer subtitulo es una INTRO que explica que se va a aprender
  And el ultimo subtitulo es un OUTRO que cierra y despide
  And los subtitulos intermedios son STEPS en tono imperativo con al menos 1 TRANSITION
```

### CA-02: Estructura completa - Product Demo
```
Given un proyecto con template "product_demo" y video con frames extraidos
When se generan subtitulos
Then el primer subtitulo es un HOOK que presenta el producto
  And el ultimo subtitulo es un CLOSING con impacto
  And los subtitulos intermedios son FEATURES orientados a beneficios con al menos 1 TRANSITION
```

### CA-03: Tono imperativo en Tutorial
```
Given subtitulos generados para un proyecto con template "tutorial"
When se revisan los subtitulos de tipo STEP
Then al menos el 80% usan verbos en imperativo ("Haz", "Selecciona", "Escribe", "Click", "Select")
  And ninguno usa voz pasiva o tercera persona para describir acciones del usuario
```

### CA-04: Tono orientado a valor en Product Demo
```
Given subtitulos generados para un proyecto con template "product_demo"
When se revisan los subtitulos de tipo FEATURE
Then ninguno contiene instrucciones paso a paso ("haz clic en", "click on", "selecciona")
  And al menos el 60% mencionan un beneficio o resultado para el usuario
```

### CA-05: Timing correcto
```
Given cualquier conjunto de subtitulos generados
When se verifican los tiempos
Then ningun subtitulo dura menos de 2 segundos
  And ningun subtitulo dura mas de 6 segundos
  And no hay solapamiento entre subtitulos consecutivos (endTime[n] <= startTime[n+1])
  And el primer subtitulo comienza en 0.0
  And el ultimo subtitulo termina dentro de 2 segundos del final del video
```

### CA-06: Longitud de texto
```
Given cualquier conjunto de subtitulos generados
When se mide la longitud de cada texto
Then ningun subtitulo supera los 120 caracteres
```

### CA-07: Idioma correcto
```
Given un proyecto con language "es"
When se generan subtitulos
Then todos los subtitulos estan escritos en espanol
  And usan tuteo (tu/haz/selecciona) y no voseo ni ustedeo
  And los nombres de elementos de UI en ingles aparecen entre comillas
```

### CA-08: Densidad adecuada - Tutorial
```
Given un proyecto tutorial con video de D segundos
When se generan subtitulos
Then la cantidad de subtitulos esta entre D/4 y D/2 (1 cada 2-4 segundos)
```

### CA-09: Densidad adecuada - Product Demo
```
Given un proyecto product_demo con video de D segundos
When se generan subtitulos
Then la cantidad de subtitulos esta entre D/5 y D/3 (1 cada 3-5 segundos)
```

### CA-10: Sin contenido prohibido - Tutorial
```
Given subtitulos generados para template "tutorial"
When se revisa el contenido
Then ningun subtitulo contiene lenguaje de marketing o promocional
  And ningun subtitulo describe algo no visible en los frames
  And ningun subtitulo es una descripcion pasiva ("Se ve...", "Se muestra...")
```

### CA-11: Sin contenido prohibido - Product Demo
```
Given subtitulos generados para template "product_demo"
When se revisa el contenido
Then ningun subtitulo contiene instrucciones paso a paso
  And ningun subtitulo contiene explicaciones tecnicas de implementacion
  And ningun subtitulo es una descripcion plana sin valor ("Aqui se ve...", "This shows...")
```

### CA-12: Cobertura sin vacios
```
Given cualquier conjunto de subtitulos generados para un video de D segundos
When se calculan los gaps entre subtitulos consecutivos
Then ningun gap supera los 3 segundos
  And la suma de duraciones de todos los subtitulos cubre al menos el 80% de D
```

### CA-13: Consistencia terminologica
```
Given cualquier conjunto de subtitulos generados
When se identifican referencias al mismo elemento de UI o concepto
Then el mismo termino se usa consistentemente (no alternar entre "sidebar", "panel lateral" y "menu izquierdo")
```

---

## 10. Supuestos

- El modelo GPT-4o es capaz de distinguir acciones en interfaces graficas a partir de frames estaticos con `detail: "low"`.
- El titulo del proyecto proporciona contexto suficiente para que la IA entienda la tematica del video.
- Los frames se extraen cada 2 segundos, lo cual es suficiente para capturar la mayoria de acciones relevantes.
- El usuario preferira subtitulos que necesiten poca edicion antes que subtitulos perfectos que tarden mucho en generarse.
- Los videos son grabaciones de pantalla (screencasts) o demos de software. No se contemplan videos con personas hablando a camara como caso principal.
- El template por defecto (cuando no se especifica o es null) es "tutorial".

---

## 11. Dudas / Ambiguedades

- **Mezcla de templates**: No esta definido que hacer si un video tiene partes que encajan en tutorial y partes que encajan en demo. Actualmente se asume un template unico por proyecto. Evaluar si se necesita un template hibrido.
- **Subtitulos para audio**: Esta spec asume generacion puramente visual. Si en el futuro se agrega transcripcion de audio, las reglas de contenido pueden cambiar significativamente (los subtitulos pasarian de ser descriptivos a ser transcripcion).
- **Nivel de detalle en STEPS**: No esta definido un umbral claro para cuando agrupar micro-acciones vs. separarlas. El criterio actual es "acciones significativas" pero eso es subjetivo.
- **Validacion automatica de calidad**: Actualmente no existe un mecanismo para validar automaticamente que los subtitulos cumplen las reglas de esta guia. La validacion es solo estructural (Zod schema). Considerar agregar validaciones de longitud, densidad y cobertura en el servidor.
- **Feedback del usuario**: No esta definido como recoger feedback sobre la calidad de los subtitulos para iterar el prompt. Considerar un sistema de rating o reportes.
- **Variabilidad del modelo**: GPT-4o puede producir resultados diferentes para los mismos frames en distintas ejecuciones. No hay garantia de consistencia entre regeneraciones.
- **Transitions automaticas**: No esta definido como la IA decide donde colocar TRANSITIONS. El criterio actual es implicito ("entre secciones tematicas") y depende de la interpretacion del modelo.
