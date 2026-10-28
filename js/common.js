// Utilidades compartidas por el sitio público (app.js) y el panel admin (admin.js).
window.Mel = (function () {
  'use strict';

  const { API_URL, CATEGORIAS } = window.CONFIG;
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
    'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Escapa texto para insertarlo de forma segura en HTML.
  function esc(valor) {
    const d = document.createElement('div');
    d.textContent = valor == null ? '' : String(valor);
    return d.innerHTML;
  }

  // Fecha de hoy (hora local del navegador) como "YYYY-MM-DD".
  function hoyISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // "Hacer-Octubre-3" -> "Modelado" (ver CATEGORIAS en config.js)
  function nombreVisible(nombre) {
    const prefijo = String(nombre || '').split('-')[0].trim();
    return CATEGORIAS[prefijo.toLowerCase()] || prefijo || String(nombre || '');
  }

  // Título largo: "Modelado" -> "Taller de modelado".
  // Si el nombre ya empieza con "Taller" (ej. "Taller creativo") se deja igual.
  function tituloTaller(nombre) {
    const n = nombreVisible(nombre);
    return /^taller/i.test(n) ? n : `Taller de ${n.toLowerCase()}`;
  }

  // Familia visual de cada taller (color e ilustración en el sitio): 'modelado' | 'pintura' | 'creativo'.
  function categoria(nombre) {
    const n = nombreVisible(nombre).toLowerCase();
    if (n.startsWith('modelado')) return 'modelado';
    if (n.startsWith('pintura')) return 'pintura';
    return 'creativo';
  }

  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // "2026-11-20" -> { dia: 20, mesCorto: 'Nov', semanaCorta: 'Vie', semana: 'Viernes' }
  function partesFecha(fechaISO) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO || '');
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return {
      dia: d.getDate(),
      mesCorto: MESES[d.getMonth()].slice(0, 3),
      semanaCorta: DIAS_CORTOS[d.getDay()],
      semana: DIAS_LARGOS[d.getDay()]
    };
  }

  // "2026-10-29" -> "29 de Octubre, 2026"
  function formatFecha(a) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(a.fechaISO || '');
    if (m) return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}, ${m[1]}`;
    const p = String(a.fecha || '').split('-'); // respaldo: "29-Octubre-2026"
    return p.length === 3 ? `${p[0]} de ${p[1]}, ${p[2]}` : String(a.fecha || '');
  }

  // Extrae HH:MM aunque llegue como "10:00" o como texto de fecha completo.
  function hora24(h) {
    const m = /(\d{1,2}):(\d{2})/.exec(String(h || ''));
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  }

  // "15:00" -> "3:00 p. m."
  function formatHora(h) {
    const t = hora24(h);
    if (!t) return String(h || '');
    const [hh, mm] = t.split(':').map(Number);
    const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
    return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${sufijo}`;
  }

  // 45 -> "45", 35.5 -> "35.50"
  function formatMonto(valor) {
    const n = Number(valor);
    if (valor === '' || valor == null || !isFinite(n)) return String(valor == null ? '' : valor);
    return Number.isInteger(n) ? String(n) : (Math.round(n * 100) / 100).toFixed(2);
  }

  // 1 -> "1 persona", 3 -> "3 personas"
  function personasTxt(n) {
    return `${n} ${Number(n) === 1 ? 'persona' : 'personas'}`;
  }

  // text/plain evita el preflight CORS, que Apps Script no soporta.
  async function postApi(payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async function getApi(action) {
    const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
    return res.json();
  }

  return { MESES, esc, hoyISO, nombreVisible, tituloTaller, categoria, partesFecha, formatFecha, hora24, formatHora, formatMonto, personasTxt, postApi, getApi };
})();
