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
  app.js          Lógica del sitio público
  admin.js        Lógica del panel
img/              Marca (logos, ilustraciones, bordes) y logo de Yappy
fonts/            Bricolage Grotesque, Inter y Schoolbell (autoalojadas, licencias incluidas)
```

## Cómo funciona

- El navegador habla con el Web App de Apps Script (`API_URL` en `js/config.js`).
- Las peticiones POST usan `Content-Type: text/plain` para evitar el preflight de CORS.
- El backend guarda en dos pestañas del Sheet (Actividades e Inscripciones), descuenta cupos, sube el comprobante a Drive, mantiene un evento de Calendar por taller y envía correos.
- El panel pide la contraseña en cada operación y el backend la compara con la propiedad de script `ADMIN_PASSWORD`. No hay sesión ni contraseña en el código del sitio.

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

**Actividades:** ID · Nombre · Fecha · Hora · Cupos_Totales · Cupos_Disponibles · Precio · Descripcion · ID_Evento

**Inscripciones:** ID · ID_Actividad · Nombre · Telefono · Email · Link comprobante · Fecha · Personas · Total · Pagado · Origen

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
