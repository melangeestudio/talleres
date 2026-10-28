# Mélange Estudio · Talleres

Portal web para ver el calendario de talleres de cerámica, inscribirse y adjuntar el comprobante de pago (Yappy), sin crear cuenta. Incluye un panel de administración para gestionar actividades e inscritos.

Sitio estático (HTML, CSS y JS puro) publicado en GitHub Pages. El backend es un Google Apps Script que usa Google Sheets como base de datos.

## Estructura

```
index.html        Sitio público (lista y calendario, formulario de inscripción)
admin.html        Panel de administración
css/              styles.css (público) · admin.css (panel)
js/
  config.js       Configuración: URL de la API, categorías, ubicación, número Yappy
  common.js       Utilidades compartidas
  app.js          Lógica del sitio público (lista, calendario, inscripción, miércoles)
  privado.js      Solicitud de taller privado / evento especial
  admin.js        Lógica del panel
img/              Marca (logos, ilustraciones, bordes) y logo de Yappy
fonts/            Bricolage Grotesque, Inter y Schoolbell (autoalojadas, licencias incluidas)
```

## Cómo funciona

- El navegador habla con el Web App de Apps Script (`API_URL` en `js/config.js`).
- Las peticiones POST usan `Content-Type: text/plain` para evitar el preflight de CORS.
- El backend guarda en dos pestañas del Sheet (Actividades e Inscripciones), descuenta cupos, sube el comprobante a Drive, mantiene un evento de Calendar por taller y envía correos.
- El panel inicia sesión con usuario y contraseña (y código de app autenticadora si ese usuario tiene MFA) y recibe un token de sesión de 6 h. La contraseña no se guarda ni se vuelve a enviar.

## Configuración

Todo lo editable del sitio está en `js/config.js`:

| Campo | Qué es |
|---|---|
| `API_URL` | URL del Web App de Apps Script (termina en `/exec`) |
| `CATEGORIAS` | Prefijo del ID de la actividad → nombre público (`Hacer` → Modelado, etc.) |
| `UBICACION` | Dirección y enlace de Google Maps |
| `YAPPY_NUMERO` | Número al que se paga |

Para cambiar el backend (correos, Calendar, duración de eventos, personas máximas) se edita el `Codigo.gs` en Apps Script y se vuelve a desplegar como **nueva versión** del mismo Web App, así la URL no cambia.

## Datos en el Sheet

**Actividades:** ID · Nombre · Fecha · Hora · Cupos_Totales · Cupos_Disponibles · Precio · Descripcion · ID_Evento · Categoria (vacío, `Miércoles` o `Privado`)

**Inscripciones:** ID · ID_Actividad · Nombre · Telefono · Email · Link comprobante · Fecha · Personas · Total · Pagado · Origen (`Manual`, `Privado` o vacío)

**Configuracion** (Clave · Valor · Nota) y **Solicitudes** se crean al ejecutar `prepararHojas()` una vez en el editor de Apps Script.

## Talleres de miércoles y talleres privados

- **Miércoles:** el sitio siempre ofrece los próximos 8 miércoles, con modelado y pintura (cada uno con su precio y cupos). La actividad se crea sola con la primera inscripción y no aparece en la lista general. Para cerrar un miércoles, anotar su fecha en `miercoles_cerrados` (formato `2026-11-11, 2026-12-02`).
- **Privados:** el cliente pide fecha, hora, tipo y personas. Llega un correo al estudio y la solicitud aparece en el panel, pestaña **Solicitudes privadas**. Al **aprobar**: se crea la actividad y el evento en Calendar, y el cliente recibe un correo con el total y los datos de Yappy. Al **rechazar**: correo amable con motivo opcional.
- **Límite por día:** un día con 2 talleres (de cualquier tipo) no se ofrece ni se puede aprobar (`privado_max_talleres_dia`). Los miércoles cuentan una vez que alguien se inscribe.
- **Editar valores:** hora, cupos, precios, horario de privados, anticipación y meses máximos están en la pestaña **Configuracion** del Sheet; los cambios aplican de inmediato.

## Seguridad

- **Usuarios:** cada persona es una propiedad de script (Apps Script → Configuración del proyecto → Propiedades del script) llamada `USER_<usuario>` con su contraseña como valor, por ejemplo `USER_ella` y `USER_boris`. Para quitar a alguien se borra su propiedad: sus sesiones dejan de valer. Usar frases largas.
- **MFA (TOTP):** en el editor de Apps Script ejecutar `configurarMFA()`; crea una clave por usuario (en el registro de ejecución) y cada persona la agrega en su app autenticadora ("ingresar clave de configuración"). Para reiniciar a una persona: borrar su propiedad `TOTP_<usuario>` y volver a ejecutar. `desactivarMFA()` lo quita para todos.
- **Bloqueo:** 5 intentos fallidos sobre un usuario lo bloquean 15 min y envían un aviso por correo (nombres inexistentes se frenan aparte, sin bloquear a usuarios reales). Las sesiones ya abiertas siguen funcionando.
- **Formulario público:** campo trampa anti-bots, límites por correo/teléfono (4 por 30 min) y global (30 por hora), aviso de privacidad visible y comprobantes solo en imagen o PDF.
- **Datos:** Sheet y carpeta de comprobantes privados (sin enlaces públicos). El script corre con la cuenta del estudio: activar verificación en dos pasos en esa cuenta de Google.
- **Navegador:** Content-Security-Policy en `index.html` y `admin.html` (solo scripts propios y conexión a Apps Script).

## Publicación

1. Subir el contenido de este repo a la rama `main`.
2. En **Settings → Pages**: *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. El sitio queda en `https://melangeestudio.github.io/talleres/` y el panel en `/admin.html`.

## Probar en local

Las tipografías se cargan con `crossorigin`, por lo que no funcionan abriendo el archivo directamente (`file://`). Sirve la carpeta con un servidor local:

```
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

## Licencias

Las fuentes conservan su licencia original (ver `fonts/`). La identidad visual, logos e ilustraciones pertenecen a Mélange Estudio.
