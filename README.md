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
- **Horarios de privados:** lunes a viernes desde las 5:30 p. m. y sábado/domingo desde las 10:00 a. m.; cierre 9:30 p. m. La última hora de inicio es el cierre menos la duración del evento (`DURACION_HORAS_EVENTO`, 2 h en `Codigo.gs`). Máximo 16 personas (`privado_max_personas`).
- **Instagram:** campo opcional en todos los formularios (inscripción, privado y alta manual). Se guarda como `@usuario` (columna `Instagram` en Inscripciones y Solicitudes).
- **Tipos y precios oficiales:** modelado $65 (hasta 3 h), pintura de taza $35 y pintura de tile / mosaico $25 (hasta 2 h). Los formularios de miércoles y privados muestran una tarjeta explicativa de cada tipo (texto en `TIPOS_INFO`, `js/config.js`). Los privados muestran el aviso de que pueden traer snacks, boquitas, bebidas y decoraciones.
- **Recordatorio:** un correo el día antes del taller a cada inscrito con correo. Se activa una sola vez ejecutando `activarRecordatorios()` en Apps Script (corre cada día a las 9 a. m.); se apaga con `recordatorios_activo = No` en Configuracion o con `desactivarRecordatorios()`. Queda registrado en la columna `Recordatorio` para no repetirlo.
- **Piezas listas:** en Actividades, botón **Piezas listas**: elige a quién avisar (cada persona recibe su propio correo: retiro en el taller o delivery con costo adicional). Queda en la columna `Aviso_Retiro`.
- **Finanzas:** pestaña del panel con recaudado y por cobrar por mes (según la fecha del taller), gráfica y desglose por tipo. Recaudado = inscripciones marcadas como pagadas.
- **Editar valores:** hora, cupos, precios, horario de privados, anticipación y meses máximos están en la pestaña **Configuracion** del Sheet; los cambios aplican de inmediato.

## Seguridad

- **Usuarios:** cada persona es una propiedad de script (Apps Script → Configuración del proyecto → Propiedades del script) llamada `USER_<usuario>` con su contraseña como valor, por ejemplo `USER_ella` y `USER_boris`. Para quitar a alguien se borra su propiedad: sus sesiones dejan de valer. Usar frases largas.
- **MFA (TOTP):** en el editor de Apps Script ejecutar `configurarMFA()`; crea una clave por usuario (en el registro de ejecución) y cada persona la agrega en su app autenticadora ("ingresar clave de configuración"). Para reiniciar a una persona: borrar su propiedad `TOTP_<usuario>` y volver a ejecutar. `desactivarMFA()` lo quita para todos.
- **Bloqueo:** 5 intentos fallidos sobre un usuario lo bloquean 15 min y envían un aviso por correo (nombres inexistentes se frenan aparte, sin bloquear a usuarios reales). Las sesiones ya abiertas siguen funcionando.
- **Formulario público:** campo trampa anti-bots, límites por correo/teléfono (4 por 30 min) y global (30 por hora), aviso de privacidad visible y comprobantes solo en imagen o PDF.
- **Datos:** Sheet y carpeta de comprobantes privados (sin enlaces públicos). El script corre con la cuenta del estudio: activar verificación en dos pasos en esa cuenta de Google.
- **Navegador:** Content-Security-Policy en `index.html` y `admin.html` (solo scripts propios y conexión a Apps Script).

## Preguntas frecuentes (FAQ)

Están al final de `index.html`, en `<section class="faq">`: cada pregunta es un `<details class="faq-item">` con su `<summary>` (pregunta) y un `<div class="faq-resp">` (respuesta). Para editar, cambiar el texto; para agregar, copiar un bloque `<details>` completo; para quitar, borrarlo. Es un acordeón nativo (sin JavaScript). Si se cambia el CSS o JS, subir el número de `?v=` en los enlaces de `index.html` y `admin.html` para evitar caché.

## Respaldo y limpieza

Se ejecutan a mano desde el editor de Apps Script (no requieren nuevo despliegue):

- `respaldarHoja()`: copia completa del Sheet en la carpeta de Drive "Respaldos - Talleres Melange".
- `activarRespaldoSemanal()` / `desactivarRespaldoSemanal()`: respaldo automático cada lunes a las 3 am.
- `limpiarTodo()`: hace un respaldo y borra actividades, inscripciones y solicitudes (conserva encabezados), sus eventos de Calendar y manda a la papelera los comprobantes. No toca `Configuracion` ni usuarios. Para ejecutarla hay que cambiar `CONFIRMAR = false` a `true` dentro de la función.

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
