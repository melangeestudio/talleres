// Configuración del sitio. Solo este archivo cambia si cambia la URL del backend.
window.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbydkJz_2VAl7I_TSTwoQY8FsIJo-ePB9X3dUZs3LA3rf_OS-dDd2iZzY0bOvF2JcCc/exec',
  MONEDA: '$',
  MAX_ARCHIVO_MB: 5,
  // Nombre visible según el prefijo del nombre en el Sheet (lo que va antes del primer "-").
  // Ej.: "Hacer-Octubre-3" -> "Modelado". Prefijos no listados muestran el prefijo tal cual.
  CATEGORIAS: {
    hacer: 'Modelado',
    pintar: 'Pintura',
    pintura: 'Pintura',
    otros: 'Taller creativo',
    charms: 'Taller creativo'
  },
  // Tipos de taller que ella elige en el panel admin. "valor" es el prefijo que se guarda
  // en el nombre del Sheet (ej. "Hacer-Noviembre-1"); "etiqueta" es lo que ve el público.
  TIPOS: [
    { valor: 'Hacer', etiqueta: 'Modelado' },
    { valor: 'Pintar', etiqueta: 'Pintura' },
    { valor: 'Otros', etiqueta: 'Taller creativo' }
  ],
  // Ubicación del taller (se muestra en el pie de página y en la confirmación de inscripción).
  UBICACION: {
    lineas: ['Edificio 71, Segundo Piso, Local 9', 'Vía Argentina'],
    mapsUrl: 'https://maps.app.goo.gl/aoGrgTdQJbLgUuij9'
  },
  // Correo público del estudio (aviso de privacidad: a dónde escribir para borrar datos).
  CONTACTO_EMAIL: 'Melangestudioinfo@gmail.com',
  // Número de Yappy que verá el cliente en el formulario.
  YAPPY_NUMERO: '6292-0706'
};
