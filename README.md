# Chat de Chaturbate para OBS

Fuente de navegador para OBS que reproduce el **chat en directo** de un modelo de
Chaturbate y una **marquesina con el tip menu**, con todo el diseño editable desde
un editor web (tamaños, colores, temas, eventos e imágenes).

- Sin dependencias: solo Node.js.
- Sin WebSocket no oficial: usa la **Events API** de Chaturbate.
- El **tip menu** se mantiene aquí porque la API pública no lo expone.
- Guarda configuración e imágenes en `data/` (no se sube a Git).

---

## Descargar y ejecutar (Windows, sin instalar nada)

### [⬇️ Descargar ChatOBS-win-x64.zip](https://github.com/Piscu/chaturbate-chat-obs/releases/latest/download/ChatOBS-win-x64.zip)

El ZIP incluye `node.exe`, así que no hace falta instalar Node. También está en la
página de la [última versión](https://github.com/Piscu/chaturbate-chat-obs/releases/latest),
junto al SHA256 de cada archivo.

1. Descomprime la carpeta en el Escritorio o en Documentos (no en "Archivos de programa").
2. Doble clic en `iniciar.bat`: se abre el editor en el navegador.
3. Pega tu token en **Conexión → Guardar** y monta la fuente en OBS.

Los pasos detallados están en **`LEEME.txt`**, dentro del ZIP. El resto de este
README es la guía completa y la documentación para quien quiera modificarlo.

---

## 1. Requisitos

- **Node.js 18 o superior** — <https://nodejs.org/>
- OBS Studio o cualquier software que admita fuentes de navegador.
- Un **token de la Events API** de Chaturbate (ver siguiente paso).

No hace falta `npm install`: el proyecto no tiene dependencias.

---

## 2. Obtener el token (paso obligatorio)

El chat **no funciona sin un token**. Chaturbate lo genera desde su web, no desde
esta aplicación.

1. Inicia sesión en <https://chaturbate.com/>
2. Abre <https://chaturbate.com/statsapi/authtoken/>
3. En **Auth Token**, elige el alcance **Events API**.
   - Si quieres ver **tips y mensajes privados**, marca el alcance privado.
   - El token privado es más restringido: no sirve para otros sitios.
4. Copia el token generado.
5. Pégalo en el editor, pestaña **Conexión → Token de la Events API**, y pulsa **Guardar**.

El token se guarda solo en `data/config.json` en tu equipo y **nunca** se envía a
Chaturbate desde el navegador de OBS ni se expone en la URL de la fuente.

> El token es como una contraseña: no lo compartas ni lo subas a Git.

---

## 3. Arrancar

| Forma | Qué hace |
| --- | --- |
| `iniciar.bat` | Arranca el servidor, abre el editor y deja la ventana visible (Ctrl+C para parar). |
| `minimizar.bat` | Arranca el servidor minimizado y abre el editor. |

O directamente:

```bash
node server.mjs
```

- Editor: <http://127.0.0.1:8017/>
- Fuente: <http://127.0.0.1:8017/source>

El servidor escucha solo en `127.0.0.1` (no es accesible desde la red). Si el
puerto 8017 está ocupado, prueba el 8018, 8019… y muestra en pantalla la
dirección elegida: usa esa misma en OBS. Para forzar uno concreto:
`set PORT=8018 && node server.mjs` en Windows, o `PORT=8018 node server.mjs`.

**Déjalo abierto mientras estés en directo.** OBS no puede leer la fuente si el
servidor está apagado.

---

## 4. Montar la fuente en OBS

1. En OBS: **Fuentes → + → Navegador**.
2. Nombre: `Chat Chaturbate`.
3. URL: `http://127.0.0.1:8017/source`
   - Si cambiaste el tamaño o la posición desde el editor, **añade los parámetros**:
     `http://127.0.0.1:8017/source?w=420&h=560`
   - Solo la marquesina: `http://127.0.0.1:8017/source?marquee=1`
4. **Ancho / Alto**: usa los valores que fijaste en el editor, o deja que la fuente
   ocupe todo (por ejemplo 1920×1080) y posiciona el panel con el editor.
5. **CSS personalizado**: **déjalo vacío**. La página ya trae su estilo.
6. Deja marcada **"Actualizar cuando se vuelve visible"**.
7. **Refrescar caché del navegador** si algo no aparece.

Tip: en OBS conviene añadir un filtro *Ajustar a la pantalla* o *Transformar* si
la fuente no coincide exactamente con el lienzo.

---

## 5. El editor

Ocho pestañas, todas con vista previa en directo a la derecha. Los cambios se ven
al instante; pulsa **Guardar** (o `Ctrl+S`) para persistirlos y aplicarlos a OBS.
Arriba tienes un **buscador** que filtra los ajustes de todas las pestañas.

| Pestaña | Qué controla |
| --- | --- |
| **Conexión** | Usuario, token, intervalo de sondeo, modo testbed, indicador de directo, plantilla de eventos. |
| **Diseño y tamaño** | Tamaño del panel, posición (6 anclajes), márgenes, separación entre bloques, opacidad del panel, tipografías, tema claro/oscuro y presets. |
| **Chat** | Color y tamaño de fuente, máximo de líneas, caducidad, agrupar líneas seguidas del mismo usuario, avatares, bloqueo de palabras, emotes, insignias (mod/fanclub/guía/seguidor), marcas de tiempo, insignias de eventos y el estilo de los mensajes. |
| **Insignias y emotes** | Tamaño y color de las insignias, tamaño de emotes, alineación vertical, forma del avatar, y mostrar el código si la imagen no carga. |
| **Eventos** | Activar y filtrar cada tipo de evento: entradas, salidas, follow, subscripción, redención, barra de fans, compra de contenido, media, tips, mensajes privados, moderación, avisos del streamer. Cada uno con su texto, color, posición y tamaño. |
| **Marquesina tip menu** | Altura, tamaño y velocidad, colores, y la lista de opciones del tip menu. |
| **PNGs y fondos** | Subir imágenes, usar una como fondo (con opacidad y ajuste), y otra como logo en la cabecera. |
| **Avanzado** | Distinción de eventos, reagrupación de mensajes, insignia de conexión, y registro de depuración. |

### Estilos del chat

Dentro de **Chat → Estilo de los mensajes** puedes dar un aspecto propio a cada
línea sin tocar CSS:

| Ajuste | Qué hace |
| --- | --- |
| **Estilo** | `Plano` (sin fondo, como el chat original), `Burbuja`, `Tarjeta con borde`, `Cristal` (desenfoque), `Filas alternas`, `Barra lateral de acento` o `Sable de luz` (barra luminosa con halo). |
| **Fondo de los mensajes** | Color de fondo de las burbujas y tarjetas (acepta transparencia). |
| **Redondeo / Relleno** | Esquinas y aire interior de cada mensaje. |
| **Separadores entre mensajes** | Línea fina divisoria entre entradas. |
| **Estilo del nombre** | Normal, negrita, mayúsculas, cursiva o contorno. |
| **Brillo en el nombre** | Halo con el color propio de cada usuario. |
| **Borde negro en el nombre** | Contorno oscuro alrededor del nombre para que se lea sobre cualquier vídeo. |
| **Sombra del texto** | Mejora la legibilidad sobre vídeo claro. |
| **Forma del avatar** | Círculo, redondeado o cuadrado (pestaña *Insignias y emotes*). |

Los temas rápidos de **Diseño y tamaño → Tema** ahora incluyen también *Océano*,
*Atardecer*, *Cyber*, *Caramelo*, *Medianoche* y *Sable de luz* (inspirado en el
crawl de Star Wars), además de los anteriores. Un preset puede cambiar la paleta y
también el estilo de los mensajes: *Sable de luz* activa el estilo homónimo, pone
los nombres en mayúsculas con halo y añade sombra al texto. Se aplican al pulsar el
chip; recuerda **Guardar** para que lleguen a OBS.

### Importar el tip menu

Pega el texto copiado del panel de Chaturbate en **"Importar texto"**. Se acepta
una opción por línea, en cualquiera de estos formatos:

```
100 - Saludo
1.000 - Strip
250 tokens: Foto
Show en privado (5000)
Pack de fotos · 10000
```

- El número se detecta al principio o al final de la línea.
- Se aceptan `1.000`, `1,50` y `1000` como separadores de miles o decimales.
- Se ignoran cabeceras (`Tip menu`, `Opciones`, `Options`) y duplicados.
- Si una línea no tiene número reconocible, se conserva como texto libre.

Puedes reordenar, editar, colorear o quitar las opciones a mano, y añadir un PNG a
cada una. **Guardar** es necesario para que los cambios lleguen a OBS.

En el campo de imagen de cada opción puedes poner **la URL completa** de una imagen
de Chaturbate (`https://static-pub.highwebmedia.com/...`). Si copias solo la ruta
relativa (`/assets/...`) no carga: eso solo funciona para imágenes subidas desde el
editor.

---

## 6. Probar el overlay: ver tus propios mensajes

Por diseño, **tus propios mensajes no salen en el overlay** mientras estás en
directo: si aparecieran, se verían duplicados en tu propio stream (el del chat y el
del overlay). Para verlos necesitas dos interruptores, ambos apagados por defecto:

| Dónde | Ajuste | Qué hace |
| --- | --- | --- |
| Pestaña **Chat** | **Mostrar mis mensajes** | Tus mensajes normales salen como los de cualquier viewer, con el color de dueño. |
| Pestaña **Eventos → Avisos** | **Mostrar avisos del broadcaster** | Tus mensajes *con formato* (los que llevan color de fondo o texto) salen como avisos. |

Los dos son independientes: con el primero ves tu chat, con el segundo ves los
avisos, y con los dos ves ambos. **Apágalos antes de tu directo real.**

### Los avisos y el color

Un aviso del broadcaster llega con su propio color de fondo y de texto, que es lo
que tienes configurado en tu panel de Chaturbate. Por defecto el overlay **los
ignora** y usa su propia paleta, para que se vea igual de bien en cualquier canal.
Si prefieres el aspecto original de cada aviso, en **Eventos → Avisos** pon
*Colores del aviso* en **Los de Chaturbate**.

---

## 7. Detalles técnicos

**Cómo llega el chat.** El servidor mantiene un único long-poll contra la Events
API y reparte los eventos a todos los OBS abiertos por SSE. Un `HTTP 400` con
`nextUrl` es la continuación normal cuando expira el sondeo, no un error.

**Emotes.** Chaturbate no usa packs: los emotes llegan como marcado
`%%%[emoticon ...]%%%` con su URL, y se renderizan como imagen. Si la imagen no
carga, se muestra el nombre entre `:dos puntos:` (configurable).

**Avatares.** Chaturbate no expone avatares de usuario; su web usa una burbuja con
la inicial. El modo `photo` usa una miniatura pública y vuelve a la inicial si falla.

**Sin número de viewers.** La Events API solo informa de si la emisión está activa
o no; no hay contador de espectadores.

**Público / privado.** El tip menu no tiene endpoint público: se edita a mano o se
importa desde texto. Por eso el token con alcance privado es opcional (solo lo
necesitas para tips y mensajes privados).

---

## 8. Estructura

```
server.mjs              Servidor: API de eventos, SSE, configuración, assets, emotes
empaquetar.mjs          Genera el ZIP portable para Windows (incluye node.exe)
iniciar.bat / minimizar.bat
LEEME.txt               Instrucciones para el usuario final del ZIP
LICENSE                 MIT
public/
  index.html -> editor.html
  source.html           La fuente que carga OBS
  js/config.mjs         Defaults, esquema, presets (compartido por editor y fuente)
  js/source.mjs         Arranque de la fuente, eventos, layout, modo preview
  js/chat.mjs           Render del chat, agrupado, caducidad, filtros
  js/emotes.mjs         Marcado de emotes y resolución de imágenes
  js/marquee.mjs        Marquesina e importador del tip menu
  js/editor.mjs         Formulario dinámico, vista previa, subida de PNGs
  css/…
data/                   config.json, assets/, emotes/  (generado, ignorado por Git)
```

---

## 9. Problemas frecuentes

**El chat sale vacío.**
- ¿Hay token guardado? Pestaña Conexión → **Guardar**.
- Comprueba el estado en el editor: si pone `auth-error`, el token es inválido o
  tiene otro alcance. Si pone `offline`, no hay emisión en directo.
- El token caduca: genera uno nuevo.

**No aparece mi propio nombre ni mis mensajes.**
- Es lo esperado: el overlay oculta los del broadcaster para no duplicarlos en tu
  propio stream. Activa **Chat → Mostrar mis mensajes** mientras pruebas.
- Si lo que no sale son tus mensajes *con formato*, es otra casilla:
  **Eventos → Avisos → Mostrar avisos del broadcaster**.

**El color de un aviso no es el que tengo puesto.**
- Por defecto el overlay usa su propia paleta. En **Eventos → Avisos →
  Colores del aviso** cámbialo a *Los de Chaturbate* para respetar el color real
  de cada aviso.

**Sale "Sin conexión" o la fuente no carga.**
- ¿Sigue abierto el servidor? Debe estar en `127.0.0.1:8017`.
- ¿El puerto de la URL coincide con el que imprime el servidor al arrancar?

**Los cambios del editor no aparecen en OBS.**
- Pulsa **Guardar** y luego **Refrescar caché** en las propiedades de la fuente.
- Si cambiaste el tamaño o la posición, actualiza también `w` y `h` en la URL.

**No se ven los emotes.**
- Activa **Emotes** en la pestaña Chat y revisa que la fuente de la imagen cargue.
- Puedes marcar **mostrar el código** como red de seguridad.

**El token es visible en alguna parte.**
- No debería estarlo: la fuente usa `/api/config?view=source`, que lo oculta.
  Si lo has pegado en un chat o captura, genera uno nuevo.

---

## 10. Publicar una versión para otros

```bash
node empaquetar.mjs
```

Genera `dist/ChatOBS-<versión>-win-x64.zip` y una copia con nombre estable,
`dist/ChatOBS-win-x64.zip`, que es la que enlaza el README mediante
`/releases/latest/download/`. El script copia **solo** una lista blanca de
archivos y aborta si encuentra un `config.json` o el token, el usuario o el
título guardados en `data/config.json`. `data/` nunca entra en el ZIP.

Para publicarla:

```bash
gh release create v1.0.0 dist/ChatOBS-win-x64.zip --title "v1.0.0" --notes "Primera versión"
```

Para probar el empaquetado sin descargar los ~90 MB de `node.exe`:

```bash
node empaquetar.mjs --skip-node
```

---

## Licencia

MIT. Consulta `LICENSE`.
