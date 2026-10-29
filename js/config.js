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
    taza: 'Pintura de taza',
    tile: 'Pintura de mosaico',
    otros: 'Taller creativo',
    charms: 'Taller creativo'
  },
  // Tipos de taller que ella elige en el panel admin. "valor" es el prefijo que se guarda
  // en el nombre del Sheet (ej. "Hacer-Noviembre-1"); "etiqueta" es lo que ve el público.
  TIPOS: [
    { valor: 'Hacer', etiqueta: 'Modelado' },
    { valor: 'Pintar', etiqueta: 'Pintura' },
    { valor: 'Taza', etiqueta: 'Pintura de taza' },
    { valor: 'Tile', etiqueta: 'Pintura de mosaico' },
    { valor: 'Otros', etiqueta: 'Taller creativo' }
  ],
  // Qué trata cada tipo de taller (miércoles y talleres privados). La clave coincide con el tipo del backend.
  TIPOS_INFO: {
    modelado: {
      titulo: 'Modelado: cerámica desde cero',
      texto: 'Crea tu pieza a mano desde cero y después píntala dejando volar tu creatividad. Es la experiencia completa de la cerámica: experimentar con la arcilla y con distintas técnicas.',
      puntos: ['Dura hasta 3 horas', 'Pensado para grupos de 8 a 10 personas', 'Desde los 11 años, sin experiencia previa', 'Incluye materiales y horneado de tu pieza'],
      ilustracion: 'jarron'
    },
    pintura: {
      titulo: 'Pintura de taza',
      texto: 'Pinta una taza de cerámica que ya viene horneada: un lienzo en blanco para dibujar lo que quieras. Ideal si disfrutas de pintar o solo quieres pasarla bien con tus amigos y personalizar tu taza.',
      puntos: ['Dura hasta 2 horas', 'Desde los 11 años, sin experiencia previa', 'Incluye materiales y horneado de tu pieza'],
      ilustracion: 'jarron-lila'
    },
    tile: {
      titulo: 'Pintura de mosaico',
      texto: 'Pinta tu propio mosaico de cerámica, ya horneado: una pieza decorativa para regalar o lucir en tu casa. Es un plan tranquilo y creativo, sin necesidad de experiencia.',
      puntos: ['Dura hasta 2 horas', 'Desde los 11 años, sin experiencia previa', 'Incluye materiales y horneado de tu pieza'],
      ilustracion: 'flor'
    }
  },
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
