// Solicitud de taller privado / evento especial (sitio público).
(function () {
  'use strict';

  const { MONEDA } = window.CONFIG;
  const { MESES, esc, formatHora, formatMonto, personasTxt, postApi, partesFecha } = window.Mel;
  const $ = (id) => document.getElementById(id);
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let ETIQUETA = { modelado: 'Modelado', pintura: 'Pintura de taza', tile: 'Pintura de tile' };

  let info = null;      // info.privado
  let mesCal = 0;       // año * 12 + mes
  let fechaSel = '';
  let enviando = false;

  const mesIdx = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  function fechaLarga(f) {
    const p = partesFecha(f);
    return `${p.semana} ${p.dia} de ${MESES[Number(f.slice(5, 7)) - 1].toLowerCase()}, ${f.slice(0, 4)}`;
  }

  function renderCal() {
    const min = mesIdx(info.minFecha), max = mesIdx(info.maxFecha);
    mesCal = Math.min(Math.max(mesCal, min), max);
    const y = Math.floor(mesCal / 12), m = mesCal % 12;
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const n = new Date(y, m + 1, 0).getDate();
    let celdas = '';
    for (let i = 0; i < offset; i++) celdas += '<span class="mc-vacio"></span>';
    for (let d = 1; d <= n; d++) {
      const f = iso(y, m, d);
      const lleno = info.diasLlenos.indexOf(f) >= 0;
      const fuera = f < info.minFecha || f > info.maxFecha;
      const off = lleno || fuera;
      celdas += `<button type="button" class="mc-dia${f === fechaSel ? ' sel' : ''}${lleno ? ' lleno' : ''}" data-f="${f}" ${off ? 'disabled' : ''}` +
        `${lleno ? ' title="Ese día ya tiene talleres"' : ''} aria-pressed="${f === fechaSel}">${d}</button>`;
    }
    $('priv-cal').innerHTML = `
      <div class="mc-nav">
        <button type="button" class="cal-btn" data-nav="-1" aria-label="Mes anterior" ${mesCal <= min ? 'disabled' : ''}>&lsaquo;</button>
        <strong>${esc(MESES[m])} ${y}</strong>
        <button type="button" class="cal-btn" data-nav="1" aria-label="Mes siguiente" ${mesCal >= max ? 'disabled' : ''}>&rsaquo;</button>
      </div>
      <div class="mc-grid">${DIAS.map((d) => `<span class="mc-sem">${d}</span>`).join('')}${celdas}</div>`;
    $('priv-fecha-txt').textContent = fechaSel ? fechaLarga(fechaSel) : 'Elige un día disponible';
    $('priv-fecha-txt').classList.toggle('elegida', !!fechaSel);
  }

  // Entre semana y fines de semana (sáb/dom) tienen horarios distintos.
  function rangoDe(f) {
    const d = new Date(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10))).getDay();
    return Object.assign({}, (d === 0 || d === 6) ? info.horarios.finde : info.horarios.semana);
  }

  function restar(hhmm, horas) {
    const [h, m] = hhmm.split(':').map(Number);
    const t = Math.max(0, h * 60 + m - Math.round(horas * 60));
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  }

  function llenarHoras() {
    const sel = $('priv-hora');
    if (!fechaSel) {
      sel.innerHTML = ''; sel.disabled = true;
      $('priv-hora-hint').textContent = 'Elige primero la fecha para ver los horarios.';
      return;
    }
    const previa = sel.value;
    const r = rangoDe(fechaSel);
    r.fin = restar(info.horaCierre, info.horas[$('priv-tipo').value] || 2);
    sel.innerHTML = opcionesHora(r);
    sel.disabled = false;
    if (previa && sel.querySelector(`option[value="${previa}"]`)) sel.value = previa;
    else if (sel.querySelector('option[value="15:00"]') && r.inicio <= '15:00') sel.value = '15:00';
    $('priv-hora-hint').textContent = `Ese día puedes empezar entre las ${formatHora(r.inicio)} y las ${formatHora(r.fin)}. Cerramos a las ${formatHora(info.horaCierre)}`;
  }

  function opcionesHora(r) {
    const [h0, m0] = r.inicio.split(':').map(Number);
    const [h1, m1] = r.fin.split(':').map(Number);
    const out = [];
    for (let t = h0 * 60 + m0; t <= h1 * 60 + m1; t += 30) {
      const v = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      out.push(`<option value="${v}">${esc(formatHora(v))}</option>`);
    }
    return out.join('');
  }

  function infoTipo() {
    const t = $('priv-tipo').value;
    $('priv-tipo-info').innerHTML = window.Mel.tipoInfoHTML(t, info.precios[t]);
  }

  function actualizarTotal() {
    const n = Number($('priv-personas').value);
    const precio = info.precios[$('priv-tipo').value];
    $('priv-total').textContent = Number.isInteger(n) && n >= 1 && isFinite(precio)
      ? `${personasTxt(n)} × ${MONEDA}${formatMonto(precio)} = ${MONEDA}${formatMonto(n * precio)} (estimado)` : '';
  }

  async function abrir() {
    const btn = $('op-privado');
    btn.disabled = true;
    try { info = (await window.Mel.cargarInfo()).privado; } catch (e) { info = null; } // ya precargada al abrir la página
    window.Mel.cargarInfo(true).catch(() => {}); // refresca en segundo plano para la próxima vez
    btn.disabled = false;
    if (!info || !info.activo) return;
    $('priv-form').reset();
    fechaSel = '';
    mesCal = mesIdx(info.minFecha);
    ETIQUETA = Object.assign({}, ETIQUETA, info.etiquetas || {});
    $('priv-nota').textContent = info.notaPrivado || '';
    $('priv-tipo').innerHTML = Object.keys(ETIQUETA).map((t) =>
      `<option value="${t}">${ETIQUETA[t]} · ${MONEDA}${formatMonto(info.precios[t])} p/p</option>`).join('');
    llenarHoras();
    infoTipo();
    $('priv-personas').max = info.maxPersonas;
    $('priv-max').textContent = info.maxPersonas;
    renderCal();
    actualizarTotal();
    $('priv-error').hidden = true;
    $('priv-form-vista').hidden = false;
    $('priv-ok-vista').hidden = true;
    $('modal-privado').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function cerrar() {
    if (enviando) return;
    $('modal-privado').hidden = true;
    document.body.style.overflow = '';
  }

  function error(msg) { $('priv-error').textContent = msg; $('priv-error').hidden = false; }

  async function enviar(ev) {
    ev.preventDefault();
    if (enviando) return;
    const f = ev.target;
    const datos = {
      action: 'solicitarPrivado',
      tipo: f.tipo.value, fecha: fechaSel, hora: f.hora.value,
      personas: Number(f.personas.value),
      nombre: f.nombre.value.trim(), telefono: f.telefono.value.trim(), email: f.email.value.trim(),
      notas: f.notas.value.trim(), instagram: $('priv-ig').value.trim(), web: $('priv-web').value
    };
    if (!datos.fecha) return error('Elige un día en el calendario.');
    if (!datos.hora) return error('Elige la hora de inicio.');
    if (!Number.isInteger(datos.personas) || datos.personas < 1) return error('Indica cuántas personas serán.');
    if (datos.personas > info.maxPersonas) return error(`El máximo es ${info.maxPersonas} personas.`);
    if (!datos.nombre || !datos.telefono || !datos.email) return error('Completa tus datos de contacto.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return error('El correo no parece válido.');

    enviando = true;
    const btn = $('priv-enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';
    $('priv-error').hidden = true;
    try {
      const resp = await postApi(datos);
      if (resp.error) throw new Error(resp.error);
      $('priv-ok-detalle').innerHTML = `Pediste un <strong>taller de ${esc(ETIQUETA[datos.tipo].toLowerCase())}</strong> el ` +
        `<strong>${esc(fechaLarga(datos.fecha).toLowerCase())}</strong> a las <strong>${esc(formatHora(datos.hora))}</strong>.`;
      const total = resp.total !== undefined ? resp.total : datos.personas * info.precios[datos.tipo];
      $('priv-ok-resumen').textContent = `${personasTxt(datos.personas)} · Total estimado: ${MONEDA}${formatMonto(total)}`;
      $('priv-form-vista').hidden = true;
      $('priv-ok-vista').hidden = false;
    } catch (e) {
      error(e.message || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      enviando = false; btn.disabled = false; btn.textContent = 'Enviar solicitud';
    }
  }

  $('op-privado').addEventListener('click', abrir);
  $('priv-cerrar').addEventListener('click', cerrar);
  $('priv-cancelar').addEventListener('click', cerrar);
  $('priv-ok-btn').addEventListener('click', cerrar);
  $('modal-privado').addEventListener('click', (e) => { if (e.target === $('modal-privado')) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal-privado').hidden) cerrar(); });
  $('priv-form').addEventListener('submit', enviar);
  $('priv-tipo').addEventListener('change', () => { actualizarTotal(); infoTipo(); llenarHoras(); });
  $('priv-personas').addEventListener('input', actualizarTotal);
  $('priv-cal').addEventListener('click', (e) => {
    const nav = e.target.closest('button[data-nav]');
    if (nav && !nav.disabled) { mesCal += Number(nav.dataset.nav); renderCal(); return; }
    const d = e.target.closest('button[data-f]');
    if (d && !d.disabled) { fechaSel = d.dataset.f; renderCal(); llenarHoras(); }
  });
})();
