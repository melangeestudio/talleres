(function () {
  'use strict';

  const { API_URL, MONEDA, MAX_ARCHIVO_MB, YAPPY_NUMERO, UBICACION } = window.CONFIG;
  const { MESES, esc, hoyISO, nombreVisible, tituloTaller, categoria, partesFecha, formatFecha, hora24, formatHora, formatMonto, personasTxt, postApi } = window.Mel;
  const $ = (id) => document.getElementById(id);

  let actividades = [];
  let seleccionada = null;
  let enviando = false;

  function leerArchivoBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsDataURL(file);
    });
  }

  // ---------- listado ----------
  async function cargarActividades() {
    const estado = $('estado');
    estado.className = 'estado';
    estado.textContent = 'Cargando talleres…';
    estado.hidden = false;
    try {
      const res = await fetch(`${API_URL}?action=listarActividades`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const hoy = hoyISO();
      actividades = data
        .filter((a) => a.fechaISO >= hoy)
        .sort((a, b) => (a.fechaISO + hora24(a.hora)).localeCompare(b.fechaISO + hora24(b.hora)));

      render();
    } catch (err) {
      estado.className = 'estado error';
      estado.textContent = 'No pudimos cargar los talleres. Intenta de nuevo en unos minutos.';
    }
  }

  // ---------- vistas: lista agrupada por mes / calendario ----------
  let vista = 'lista';
  let mesCal = null; // índice de mes: año * 12 + mes (0-11)
  let diaSel = null; // día seleccionado en el calendario (solo móvil)
  const mq = window.matchMedia('(max-width: 600px)');
  const esMovil = () => mq.matches;
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const mesIdx = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
  const mesTitulo = (idx) => `${MESES[idx % 12]} ${Math.floor(idx / 12)}`;

  // Ilustración de la marca para cada familia de taller.
  const ILUSTRACION = { modelado: 'jarron', pintura: 'flor', creativo: 'estrella' };

  function textoCupos(disp) {
    if (disp <= 0) return 'Agotado';
    if (disp === 1) return '¡Queda 1 cupo!';
    if (disp <= 3) return `¡Quedan ${disp} cupos!`;
    return `${disp} cupos libres`;
  }

  // "Viernes 6 de noviembre" (el año ya está en el título del mes y en el sello)
  function fechaCorta(a, f) {
    if (!f) return formatFecha(a);
    return `${f.semana} ${f.dia} de ${MESES[Number(a.fechaISO.slice(5, 7)) - 1].toLowerCase()}`;
  }

  function cardHTML(a) {
    const disp = Number(a.cuposDisponibles);
    const claseCupo = disp <= 0 ? 'agotado' : disp <= 3 ? 'pocos' : '';
    const cat = categoria(a.nombre);
    const f = partesFecha(a.fechaISO);
    const sello = f ? `
          <span class="sello" aria-hidden="true">
            <span class="sello-sem">${esc(f.semanaCorta)}</span>
            <span class="sello-dia">${f.dia}</span>
            <span class="sello-mes">${esc(f.mesCorto)}</span>
          </span>` : '';
    return `
      <article class="card cat-${cat}${disp <= 0 ? ' card-agotada' : ''}">
        <div class="card-banda">
          <img class="card-ilus" src="img/marca/${ILUSTRACION[cat]}.svg" alt="" loading="lazy">${sello}
        </div>
        <div class="card-cuerpo">
          <h3>${esc(nombreVisible(a.nombre))}</h3>
          <p class="fecha">${esc(fechaCorta(a, f))} · <span class="nowrap">${esc(formatHora(a.hora))}</span></p>
          ${a.descripcion ? `<p class="desc">${esc(a.descripcion)}</p>` : ''}
          <div class="meta">
            <span class="precio">${esc(MONEDA)}${esc(formatMonto(a.precio))} <small class="pp">p/p</small></span>
            <span class="cupos ${claseCupo}">${textoCupos(disp)}</span>
          </div>
          <button class="btn" data-id="${esc(a.id)}" ${disp <= 0 ? 'disabled' : ''}>
            ${disp <= 0 ? 'Sin cupos' : 'Inscribirme'}
          </button>
        </div>
      </article>`;
  }

  function chipHTML(a) {
    const disp = Number(a.cuposDisponibles);
    const cupos = disp <= 0 ? 'Agotado' : disp === 1 ? '1 cupo' : `${disp} cupos`;
    const info = `${tituloTaller(a.nombre)} · ${formatHora(a.hora)} · ${MONEDA}${formatMonto(a.precio)} p/p · ${cupos}`;
    return `<button type="button" class="chip cat-${categoria(a.nombre)}${disp <= 0 ? ' agotado' : ''}" data-id="${esc(a.id)}"
      title="${esc(info)}" ${disp <= 0 ? 'disabled' : ''}><span class="chip-hora">${esc(formatHora(a.hora))}</span> ${esc(nombreVisible(a.nombre))}</button>`;
  }

  function renderLista() {
    const grupos = new Map();
    actividades.forEach((a) => {
      const k = mesIdx(a.fechaISO);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(a);
    });
    $('lista').innerHTML = [...grupos].map(([k, items]) => `
      <section class="mes">
        <h3 class="mes-titulo">${esc(mesTitulo(k))}</h3>
        <div class="grid">${items.map(cardHTML).join('')}</div>
      </section>`).join('');
  }

  function renderCalendario() {
    const min = mesIdx(actividades[0].fechaISO);
    const max = mesIdx(actividades[actividades.length - 1].fechaISO);
    if (mesCal === null || mesCal < min) mesCal = min;
    if (mesCal > max) mesCal = max;

    const y = Math.floor(mesCal / 12);
    const m = mesCal % 12;
    const offset = (new Date(y, m, 1).getDay() + 6) % 7; // semana empieza en lunes
    const diasMes = new Date(y, m + 1, 0).getDate();

    const porDia = {};
    actividades.filter((a) => mesIdx(a.fechaISO) === mesCal).forEach((a) => {
      const d = Number(a.fechaISO.slice(8, 10));
      (porDia[d] = porDia[d] || []).push(a);
    });

    // En móvil el calendario es compacto: al tocar un día se muestra su detalle debajo.
    const dias = Object.keys(porDia).map(Number).sort((a, b) => a - b);
    if (esMovil() && !porDia[diaSel] && dias.length) diaSel = dias[0];
    const detalle = esMovil() && porDia[diaSel]
      ? `<div class="cal-detalle"><h4 class="cal-detalle-titulo">${diaSel} de ${esc(MESES[m])}</h4>
         <div class="grid">${porDia[diaSel].map(cardHTML).join('')}</div></div>`
      : '';

    let celdas = '';
    for (let i = 0; i < offset; i++) celdas += '<div class="dia vacio"></div>';
    for (let d = 1; d <= diasMes; d++) {
      const chips = (porDia[d] || []).map(chipHTML).join('');
      const clases = `dia${chips ? ' con-taller' : ''}${esMovil() && d === diaSel && chips ? ' seleccionado' : ''}`;
      celdas += `<div class="${clases}" ${chips ? `data-dia="${d}"` : ''}><span class="dia-num">${d}</span>${chips}</div>`;
    }

    $('calendario').innerHTML = `
      <div class="cal-nav">
        <button type="button" class="cal-btn" data-nav="-1" aria-label="Mes anterior" ${mesCal <= min ? 'disabled' : ''}>&lsaquo;</button>
        <strong>${esc(mesTitulo(mesCal))}</strong>
        <button type="button" class="cal-btn" data-nav="1" aria-label="Mes siguiente" ${mesCal >= max ? 'disabled' : ''}>&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${DIAS.map((d) => `<div class="dia-semana">${d}</div>`).join('')}
        ${celdas}
      </div>
      ${detalle}`;
  }

  function render() {
    const estado = $('estado');
    const hayDatos = actividades.length > 0;
    $('vista-toggle').hidden = !hayDatos;
    if (!hayDatos) {
      $('lista').innerHTML = '';
      $('calendario').innerHTML = '';
      estado.hidden = false;
      estado.textContent = 'Por ahora no hay talleres programados. ¡Vuelve pronto!';
      return;
    }
    estado.hidden = true;
    $('lista').hidden = vista !== 'lista';
    $('calendario').hidden = vista !== 'calendario';
    document.querySelectorAll('.toggle-btn').forEach((b) => {
      const on = b.dataset.vista === vista;
      b.classList.toggle('activo', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (vista === 'lista') renderLista(); else renderCalendario();
  }

  // ---------- modal ----------
  function abrirModal(id) {
    seleccionada = actividades.find((a) => String(a.id) === String(id));
    if (!seleccionada) return;
    $('modal-titulo').textContent = tituloTaller(seleccionada.nombre);
    $('modal-resumen').textContent =
      `${formatFecha(seleccionada)} · ${formatHora(seleccionada.hora)} · ${MONEDA}${formatMonto(seleccionada.precio)} p/p`;
    $('yappy-num').textContent = YAPPY_NUMERO;
    $('max-mb').textContent = MAX_ARCHIVO_MB;
    $('form').reset();
    const disp = Math.max(1, Number(seleccionada.cuposDisponibles) || 1);
    $('f-personas').max = disp;
    $('max-personas').textContent = disp;
    actualizarTotal();
    $('form-error').hidden = true;
    $('vista-form').hidden = false;
    $('vista-ok').hidden = true;
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // "2 personas × $45 = $90" y el monto a pagar por Yappy.
  function actualizarTotal() {
    const precio = Number(seleccionada.precio);
    const n = Number($('f-personas').value);
    const valido = isFinite(precio) && Number.isInteger(n) && n >= 1;
    const total = valido ? precio * n : null;
    $('total-linea').textContent = valido
      ? `${personasTxt(n)} × ${MONEDA}${formatMonto(precio)} = ${MONEDA}${formatMonto(total)}`
      : '';
    $('pago-total').textContent = valido ? `${MONEDA}${formatMonto(total)}` : 'el total';
  }

  function cerrarModal() {
    if (enviando) return;
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }

  function mostrarError(msg) {
    const el = $('form-error');
    el.textContent = msg;
    el.hidden = false;
  }

  // ---------- envío ----------
  async function enviar(ev) {
    ev.preventDefault();
    if (enviando || !seleccionada) return;

    const f = ev.target;
    const nombre = f.nombre.value.trim();
    const telefono = f.telefono.value.trim();
    const email = f.email.value.trim();
    const archivo = f.comprobante.files[0];
    const personas = Number(f.personas.value);
    const disp = Number(seleccionada.cuposDisponibles);

    if (!nombre || !telefono || !email) return mostrarError('Completa todos los campos.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarError('El correo no parece válido.');
    if (!Number.isInteger(personas) || personas < 1) return mostrarError('Indica cuántas personas se inscriben.');
    if (personas > disp) {
      return mostrarError(disp === 1 ? 'Solo queda 1 cupo disponible.' : `Solo quedan ${disp} cupos disponibles.`);
    }
    if (!archivo) return mostrarError('Adjunta tu comprobante de pago.');
    if (archivo.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      return mostrarError(`El archivo supera ${MAX_ARCHIVO_MB} MB.`);
    }

    enviando = true;
    const btn = $('btn-enviar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    $('form-error').hidden = true;

    try {
      const base64 = await leerArchivoBase64(archivo);
      const resp = await postApi({
        action: 'inscribir',
        idActividad: seleccionada.id,
        nombre, telefono, email, personas,
        web: $('f-web').value,   // campo trampa: vacío para personas
        comprobanteBase64: base64,
        comprobanteTipo: archivo.type || 'application/octet-stream'
      });
      if (resp.error) throw new Error(resp.error);

      const horaTxt = formatHora(seleccionada.hora);
      const articulo = /^1:/.test(horaTxt) ? 'a la' : 'a las'; // "a la 1:00", "a las 3:00"
      const f = partesFecha(seleccionada.fechaISO);
      $('ok-detalle').innerHTML =
        `Nos vemos en Mélange Estudio para el <strong>${esc(tituloTaller(seleccionada.nombre).toLowerCase())}</strong> ` +
        `el <strong>${esc(f ? fechaCorta(seleccionada, f).toLowerCase() : formatFecha(seleccionada))}</strong> ${articulo} <strong>${esc(horaTxt)}</strong>`; // la hora ya termina en punto ("a. m.")
      const totalOk = resp.total !== undefined && resp.total !== '' ? resp.total : Number(seleccionada.precio) * personas;
      $('ok-resumen').textContent = `Reserva para ${personasTxt(personas)} · Total: ${MONEDA}${formatMonto(totalOk)}`;
      $('vista-form').hidden = true;
      $('vista-ok').hidden = false;
      cargarActividades(); // refresca cupos
    } catch (err) {
      mostrarError(err.message || 'No se pudo completar la inscripción. Intenta de nuevo.');
    } finally {
      enviando = false;
      btn.disabled = false;
      btn.textContent = 'Confirmar inscripción';
    }
  }

  // ---------- eventos ----------
  const correoPriv = $('priv-correo');
  correoPriv.textContent = window.CONFIG.CONTACTO_EMAIL;
  correoPriv.href = 'mailto:' + window.CONFIG.CONTACTO_EMAIL;
  $('anio').textContent = new Date().getFullYear();
  $('f-personas').addEventListener('input', () => { if (seleccionada) actualizarTotal(); });
  document.querySelectorAll('.ubicacion').forEach((a) => {
    a.href = UBICACION.mapsUrl;
    a.innerHTML = `<svg class="pin" aria-hidden="true"><use href="#ico-pin"/></svg>` +
      `<span>${UBICACION.lineas.map(esc).join('<br>')}</span>`;
  });
  $('lista').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b && !b.disabled) abrirModal(b.dataset.id);
  });
  $('vista-toggle').addEventListener('click', (e) => {
    const b = e.target.closest('[data-vista]');
    if (b) { vista = b.dataset.vista; render(); }
  });
  $('calendario').addEventListener('click', (e) => {
    const nav = e.target.closest('button[data-nav]');
    if (nav && !nav.disabled) { mesCal += Number(nav.dataset.nav); diaSel = null; render(); return; }
    const boton = e.target.closest('button[data-id]');
    // Botón "Inscribirme" del detalle (móvil) o chip en escritorio.
    if (boton && !boton.disabled && (boton.classList.contains('btn') || !esMovil())) {
      abrirModal(boton.dataset.id);
      return;
    }
    const dia = e.target.closest('[data-dia]');
    if (dia && esMovil()) { diaSel = Number(dia.dataset.dia); render(); }
  });
  mq.addEventListener('change', render);
  $('btn-cerrar').addEventListener('click', cerrarModal);
  $('btn-ok').addEventListener('click', cerrarModal);
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });
  $('form').addEventListener('submit', enviar);

  cargarActividades();
})();
