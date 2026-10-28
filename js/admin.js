(function () {
  'use strict';

  const { MONEDA, TIPOS } = window.CONFIG;
  const { MESES, esc, hoyISO, nombreVisible, formatFecha, hora24, formatHora, formatMonto, personasTxt, postApi, getApi } = window.Mel;
  const $ = (id) => document.getElementById(id);
  const CLAVE = 'melange_admin_sesion';

  let token = null;          // token de sesión (la contraseña no se guarda)
  let usuarioActual = '';
  let pwPendiente = null;    // solo en memoria mientras se pide el código MFA
  let userPendiente = '';
  let actividades = [];
  let editando = null;
  let guardando = false;
  let tabActual = 'actividades';
  let reqInscritos = 0;
  let inscritosActuales = [];

  // ---------- sesión (solo dura mientras la pestaña esté abierta) ----------
  function leerSesion() { try { return sessionStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardarSesion(t) { try { sessionStorage.setItem(CLAVE, t); } catch (e) { /* sin storage */ } }
  function leerUsuarioGuardado() { try { return localStorage.getItem('melange_admin_usuario') || ''; } catch (e) { return ''; } }
  function guardarUsuario(u) { try { localStorage.setItem('melange_admin_usuario', u); } catch (e) { /* sin storage */ } }
  function borrarSesion() { try { sessionStorage.removeItem(CLAVE); } catch (e) { /* sin storage */ } }

  // ---------- UI básica ----------
  let toastTimer;
  function toast(msg, esError) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('err', !!esError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }

  function setEstado(msg, esError) {
    const el = $('estado');
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg;
    el.className = esError ? 'estado error' : 'estado';
    el.hidden = false;
  }

  function mostrarLogin(msg) {
    $('vista-panel').hidden = true;
    $('vista-login').hidden = false;
    const e = $('login-error');
    e.textContent = msg || '';
    e.hidden = !msg;
    $('login-pass').value = '';
    pwPendiente = null;
    userPendiente = '';
    pasoCodigo(false);
  }

  // Segundo paso del ingreso: el código de 6 dígitos de la app autenticadora.
  function pasoCodigo(on) {
    $('lbl-user').hidden = on;
    $('lbl-pass').hidden = on;
    $('lbl-code').hidden = !on;
    $('btn-login-volver').hidden = !on;
    $('login-code').value = '';
    if (on) { $('login-code').focus(); return; }
    $('login-user').value = $('login-user').value || leerUsuarioGuardado();
    ($('login-user').value ? $('login-pass') : $('login-user')).focus();
  }

  function errorLogin(msg) {
    const e = $('login-error');
    e.textContent = msg || '';
    e.hidden = !msg;
  }

  function cerrarSesion(msg) {
    // Invalida el token también en el servidor (sin esperar la respuesta).
    if (token) postApi({ action: 'logout', token }).catch(() => {});
    token = null;
    usuarioActual = '';
    borrarSesion();
    cerrarModal(true);
    cerrarElim(true);
    cerrarManual(true);
    mostrarLogin(msg);
  }

  // Llamadas que requieren sesión. Si el backend dice "No autorizado", se vuelve al login.
  async function api(action, extra) {
    const r = await postApi(Object.assign({ action, token }, extra));
    if (r && r.error === 'No autorizado') {
      cerrarSesion('La sesión expiró. Ingresa de nuevo.');
      const e = new Error('No autorizado');
      e.silent = true;
      throw e;
    }
    if (r && !Array.isArray(r) && r.error) throw new Error(r.error);
    return r;
  }

  function mostrarError(err, porDefecto) {
    if (err && err.silent) return;
    toast((err && err.message) || porDefecto, true);
  }

  // ---------- login ----------
  $('form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const enCodigo = !$('lbl-code').hidden;
    const usuario = enCodigo ? userPendiente : $('login-user').value.trim();
    const pw = enCodigo ? pwPendiente : $('login-pass').value;
    const codigo = enCodigo ? $('login-code').value.trim() : '';
    if (!usuario || !pw || (enCodigo && !codigo)) return;
    const btn = $('btn-login');
    btn.disabled = true;
    btn.textContent = 'Verificando…';
    try {
      const r = await postApi({ action: 'login', usuario, password: pw, codigo });
      if (r.ok && r.token) {
        token = r.token;
        usuarioActual = r.usuario || usuario;
        guardarSesion(token);
        guardarUsuario(usuarioActual);
        $('login-pass').value = '';
        pwPendiente = null;
        await entrar();
      } else if (r.needsCode) {
        userPendiente = usuario;
        pwPendiente = pw;                       // usuario y contraseña ya fueron correctos; falta el código
        pasoCodigo(true);
        errorLogin(r.error || '');
      } else {
        mostrarLogin(r.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      errorLogin('No se pudo conectar. Intenta de nuevo.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  $('btn-login-volver').addEventListener('click', () => mostrarLogin());

  $('btn-salir').addEventListener('click', () => cerrarSesion());

  // Recarga actividades (y la lista de inscritos si esa pestaña está abierta).
  let recargando = false;
  $('btn-reload').addEventListener('click', async () => {
    if (recargando) return;
    recargando = true;
    const b = $('btn-reload');
    b.disabled = true;
    b.textContent = '↻ Actualizando…';
    try {
      await cargarActividades();
      if (tabActual === 'inscritos' && !$('sel-actividad').value) await cargarInscritos();
      toast('Datos actualizados');
    } finally {
      recargando = false;
      b.disabled = false;
      b.textContent = '↻ Actualizar';
    }
  });

  async function entrar() {
    $('vista-login').hidden = true;
    $('vista-panel').hidden = false;
    const chip = $('admin-usuario');
    chip.textContent = usuarioActual;
    chip.hidden = !usuarioActual;
    cambiarTab('actividades');
    await cargarActividades();
  }

  // ---------- tabs ----------
  function cambiarTab(t) {
    tabActual = t;
    $('tab-actividades').hidden = t !== 'actividades';
    $('tab-inscritos').hidden = t !== 'inscritos';
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('activo', b.dataset.tab === t));
    if (t === 'inscritos') cargarInscritos();
  }

  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) cambiarTab(b.dataset.tab);
  });

  // ---------- actividades ----------
  async function cargarActividades() {
    setEstado('Cargando…');
    try {
      const data = await getApi('listarActividades');
      if (!Array.isArray(data)) throw new Error((data && data.error) || 'Respuesta inesperada');
      actividades = data.sort((a, b) =>
        (a.fechaISO + hora24(a.hora)).localeCompare(b.fechaISO + hora24(b.hora)));
      setEstado('');
      renderActividades();
      renderSelector();
    } catch (err) {
      setEstado('No se pudieron cargar las actividades. Intenta de nuevo.', true);
    }
  }

  function renderActividades() {
    const hoy = hoyISO();
    const verPasadas = $('chk-pasadas').checked;
    const filas = actividades.filter((a) => verPasadas || a.fechaISO >= hoy);
    const tbody = document.querySelector('#tabla-actividades tbody');
    if (!filas.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="vacio">${verPasadas
        ? 'No hay actividades.'
        : 'No hay actividades próximas. Crea una con “Nueva actividad”.'}</td></tr>`;
      return;
    }
    tbody.innerHTML = filas.map((a) => {
      const total = Number(a.cuposTotales);
      const ocupados = total - Number(a.cuposDisponibles);
      const pasada = a.fechaISO < hoy;
      const id = esc(a.id);
      return `
        <tr class="${pasada ? 'pasada' : ''}">
          <td>${esc(formatFecha(a))}<br><small>${esc(formatHora(a.hora))}${pasada ? '<span class="badge">Pasada</span>' : ''}</small></td>
          <td>${esc(nombreVisible(a.nombre))}</td>
          <td>${ocupados} / ${total}</td>
          <td>${esc(MONEDA)}${esc(formatMonto(a.precio))} <small>p/p</small></td>
          <td class="acciones">
            <button type="button" class="btn-mini" data-accion="inscritos" data-id="${id}">Inscritos</button>
            <button type="button" class="btn-mini" data-accion="editar" data-id="${id}">Editar</button>
            <button type="button" class="btn-mini peligro" data-accion="eliminar" data-id="${id}">Eliminar</button>
          </td>
        </tr>`;
    }).join('');
  }

  $('chk-pasadas').addEventListener('change', renderActividades);

  document.querySelector('#tabla-actividades tbody').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const a = actividades.find((x) => String(x.id) === b.dataset.id);
    if (!a) return;
    if (b.dataset.accion === 'editar') abrirForm(a);
    else if (b.dataset.accion === 'eliminar') eliminar(a);
    else if (b.dataset.accion === 'inscritos') {
      $('sel-actividad').value = String(a.id);
      cambiarTab('inscritos');
    }
  });

  async function eliminar(a) {
    const ocupados = Number(a.cuposTotales) - Number(a.cuposDisponibles);
    const aviso = ocupados > 0
      ? `\n\nTiene ${ocupados} inscrito(s). Sus registros se conservan en la hoja “Inscripciones”, pero los eventos de Google Calendar no se borran solos.`
      : '';
    if (!window.confirm(`¿Eliminar "${nombreVisible(a.nombre)}" del ${formatFecha(a)}?${aviso}`)) return;
    try {
      await api('eliminarActividad', { id: a.id });
      toast('Actividad eliminada');
      await cargarActividades();
    } catch (err) {
      mostrarError(err, 'No se pudo eliminar.');
    }
  }

  // ---------- formulario crear / editar ----------
  function tipoDe(nombre) {
    const p = String(nombre || '').split('-')[0].trim().toLowerCase();
    if (p === 'hacer') return 'Hacer';
    if (p === 'pintar' || p === 'pintura') return 'Pintar';
    return 'Otros';
  }

  // Nombre interno que se guarda en el Sheet: "Hacer-Noviembre-2".
  // Al editar se conserva si no cambió ni el tipo ni el mes.
  function nombreFinal(tipo, fechaISO) {
    if (editando && tipoDe(editando.nombre) === tipo &&
        String(editando.fechaISO).slice(5, 7) === fechaISO.slice(5, 7)) {
      return editando.nombre;
    }
    const base = `${tipo}-${MESES[Number(fechaISO.slice(5, 7)) - 1]}-`;
    const usados = actividades
      .filter((a) => !editando || a.id !== editando.id)
      .filter((a) => String(a.nombre).startsWith(base))
      .map((a) => Number(String(a.nombre).slice(base.length)))
      .filter(Number.isFinite);
    return base + ((usados.length ? Math.max(...usados) : 0) + 1);
  }

  function actualizarNombreInterno() {
    const fecha = $('f-fecha').value;
    $('f-nombre-interno').textContent = fecha
      ? `Se guardará como: ${nombreFinal($('f-tipo').value, fecha)}`
      : '';
  }

  function abrirForm(a) {
    editando = a || null;
    $('f-tipo').innerHTML = TIPOS.map((t) =>
      `<option value="${esc(t.valor)}">${esc(t.etiqueta)}</option>`).join('');
    $('form-act').reset();
    $('form-error').hidden = true;
    $('modal-titulo').textContent = a ? 'Editar actividad' : 'Nueva actividad';
    if (a) {
      $('f-tipo').value = tipoDe(a.nombre);
      $('f-fecha').value = a.fechaISO;
      $('f-hora').value = hora24(a.hora);
      $('f-cupos').value = a.cuposTotales;
      $('f-precio').value = a.precio;
      $('f-desc').value = a.descripcion || '';
    }
    actualizarNombreInterno();
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function cerrarModal(forzar) {
    if (guardando && !forzar) return;
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }

  function errorForm(msg) {
    const el = $('form-error');
    el.textContent = msg;
    el.hidden = false;
  }

  $('btn-nueva').addEventListener('click', () => abrirForm(null));
  $('btn-cerrar').addEventListener('click', () => cerrarModal());
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) cerrarModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    cerrarModal();
    cerrarElim();
    cerrarManual();
  });
  $('f-tipo').addEventListener('change', actualizarNombreInterno);
  $('f-fecha').addEventListener('input', actualizarNombreInterno);

  $('form-act').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (guardando) return;

    const tipo = $('f-tipo').value;
    const fecha = $('f-fecha').value;
    const hora = $('f-hora').value;
    const cupos = Number($('f-cupos').value);
    const precio = Number($('f-precio').value);
    const descripcion = $('f-desc').value.trim();

    if (!fecha || !hora) return errorForm('Indica la fecha y la hora.');
    if (!Number.isInteger(cupos) || cupos < 1) return errorForm('Los cupos deben ser un número entero mayor a 0.');
    if ($('f-precio').value === '' || !(precio >= 0)) return errorForm('Indica un precio válido.');
    if (editando) {
      const inscritos = Number(editando.cuposTotales) - Number(editando.cuposDisponibles);
      if (cupos < inscritos) {
        return errorForm(`Ya hay ${inscritos} inscrito(s); los cupos no pueden ser menos que eso.`);
      }
    }

    const payload = {
      nombre: nombreFinal(tipo, fecha),
      fecha, hora,
      cuposTotales: cupos,
      precio,
      descripcion
    };

    guardando = true;
    const btn = $('btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    $('form-error').hidden = true;
    try {
      if (editando) await api('editarActividad', Object.assign({ id: editando.id }, payload));
      else await api('crearActividad', payload);
      guardando = false;
      cerrarModal(true);
      toast(editando ? 'Cambios guardados' : 'Actividad creada');
      await cargarActividades();
    } catch (err) {
      if (!err.silent) errorForm(err.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      guardando = false;
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  });

  // ---------- inscritos ----------
  function renderSelector() {
    const sel = $('sel-actividad');
    const previo = sel.value;
    sel.innerHTML = actividades.map((a) =>
      `<option value="${esc(a.id)}">${esc(formatFecha(a))} · ${esc(formatHora(a.hora))} · ${esc(nombreVisible(a.nombre))}</option>`
    ).join('');
    if (previo && actividades.some((a) => String(a.id) === previo)) {
      sel.value = previo;
    } else {
      const hoy = hoyISO();
      const proxima = actividades.find((a) => a.fechaISO >= hoy) || actividades[0];
      if (proxima) sel.value = String(proxima.id);
    }
    if (tabActual === 'inscritos') cargarInscritos();
  }

  $('sel-actividad').addEventListener('change', cargarInscritos);

  document.querySelector('#tabla-inscritos tbody').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-accion="eliminar-insc"], button[data-accion="editar-insc"]');
    if (!b) return;
    const cliente = inscritosActuales.find((x) => String(x.id) === b.dataset.id);
    if (!cliente) return;
    if (b.dataset.accion === 'editar-insc') abrirManual(cliente);
    else eliminarInscrito(cliente);
  });

  // ---------- eliminar inscripción (total o parcial) ----------
  let elimCliente = null;
  let eliminando = false;

  function eliminarInscrito(c) {
    elimCliente = c;
    const n = Number(c.personas) || 1;
    $('form-elim').reset();
    $('elim-error').hidden = true;
    $('elim-cantidad').max = n;
    $('elim-cantidad').value = n; // por defecto: eliminar a todos
    $('elim-cantidad-wrap').hidden = n === 1;
    $('elim-detalle').textContent = n === 1
      ? `¿Eliminar a ${c.nombre} de esta actividad?`
      : `${c.nombre} se inscribió con ${personasTxt(n)}. Elige cuántas eliminar.`;
    actualizarElim();
    $('modal-elim').hidden = false;
    document.body.style.overflow = 'hidden';
    if (n > 1) $('elim-cantidad').select();
  }

  function actualizarElim() {
    if (!elimCliente) return;
    const n = Number(elimCliente.personas) || 1;
    const k = Number($('elim-cantidad').value);
    const valido = Number.isInteger(k) && k >= 1 && k <= n;
    const btn = $('btn-elim-ok');
    if (!valido) {
      $('elim-hint').textContent = `Indica un número entre 1 y ${n}.`;
      btn.textContent = 'Eliminar';
      return;
    }
    const cupos = k === 1 ? 'Se libera 1 cupo' : `Se liberan ${k} cupos`;
    $('elim-hint').textContent = k < n
      ? `${cupos} y ${elimCliente.nombre} queda con ${personasTxt(n - k)}. El total se ajusta.`
      : `${cupos}. Se elimina toda la inscripción; el comprobante se conserva en Drive.`;
    btn.textContent = k < n ? `Eliminar ${personasTxt(k)}` : (n === 1 ? 'Eliminar' : 'Eliminar inscripción completa');
  }

  function cerrarElim(forzar) {
    if (eliminando && !forzar) return;
    $('modal-elim').hidden = true;
    elimCliente = null;
    if ($('modal').hidden) document.body.style.overflow = '';
  }

  $('elim-cantidad').addEventListener('input', actualizarElim);
  $('btn-elim-cerrar').addEventListener('click', () => cerrarElim());
  $('btn-elim-cancelar').addEventListener('click', () => cerrarElim());
  $('modal-elim').addEventListener('click', (e) => { if (e.target === $('modal-elim')) cerrarElim(); });

  $('form-elim').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (eliminando || !elimCliente) return;
    const c = elimCliente;
    const n = Number(c.personas) || 1;
    const k = n === 1 ? 1 : Number($('elim-cantidad').value);
    if (!Number.isInteger(k) || k < 1 || k > n) {
      $('elim-error').textContent = `Indica un número entre 1 y ${n}.`;
      $('elim-error').hidden = false;
      return;
    }
    eliminando = true;
    const btn = $('btn-elim-ok');
    btn.disabled = true;
    btn.textContent = 'Eliminando…';
    try {
      await api('eliminarInscripcion', { id: c.id, cantidad: k });
      eliminando = false;
      cerrarElim(true);
      toast(k === n ? 'Inscripción eliminada' : `Se eliminaron ${personasTxt(k)} de ${c.nombre}`);
      await cargarActividades(); // refresca cupos y la lista de inscritos
    } catch (err) {
      if (!err.silent) {
        $('elim-error').textContent = err.message || 'No se pudo eliminar. Intenta de nuevo.';
        $('elim-error').hidden = false;
      }
    } finally {
      eliminando = false;
      btn.disabled = false;
      actualizarElim();
    }
  });

  // ---------- agregar inscrito manualmente ----------
  let guardandoManual = false;
  let editandoInsc = null; // null = alta manual; objeto = edición de ese cliente

  function actividadSeleccionada() {
    return actividades.find((x) => String(x.id) === String($('sel-actividad').value));
  }

  function actualizarManual() {
    const a = actividadSeleccionada();
    if (!a) return;
    const k = Number($('m-personas').value);
    const disp = Number(a.cuposDisponibles);
    const precio = Number(a.precio);
    if (!Number.isInteger(k) || k < 1) { $('manual-hint').textContent = `Quedan ${disp} cupos.`; return; }
    const total = isFinite(precio) ? ` · Total: ${MONEDA}${formatMonto(Math.round(precio * k * 100) / 100)}` : '';
    $('manual-hint').textContent = k > disp
      ? `Solo quedan ${disp} cupos.`
      : `${disp - k === 1 ? 'Quedará 1 cupo' : `Quedarán ${disp - k} cupos`}${total}`;
  }

  function abrirManual(cliente) {
    const a = actividadSeleccionada();
    if (!a) return toast('Primero elige una actividad.', true);
    editandoInsc = cliente && cliente.id ? cliente : null;
    $('form-manual').reset();
    $('manual-error').hidden = true;
    $('manual-detalle').textContent = `${nombreVisible(a.nombre)} · ${formatFecha(a)} · ${formatHora(a.hora)}`;
    $('manual-titulo').textContent = editandoInsc ? 'Editar cliente' : 'Agregar inscrito';
    $('btn-manual-ok').textContent = editandoInsc ? 'Guardar cambios' : 'Agregar';
    $('m-extra').hidden = !!editandoInsc; // personas y pago no se editan aquí
    $('manual-hint').hidden = !!editandoInsc;
    if (editandoInsc) {
      $('m-nombre').value = editandoInsc.nombre || '';
      $('m-telefono').value = editandoInsc.telefono || '';
      $('m-email').value = editandoInsc.email || '';
    } else {
      $('m-personas').max = Math.max(Number(a.cuposDisponibles), 1);
      actualizarManual();
    }
    actualizarEnviar();
    $('modal-manual').hidden = false;
    document.body.style.overflow = 'hidden';
    $('m-nombre').focus();
  }

  function cerrarManual(forzar) {
    if (guardandoManual && !forzar) return;
    $('modal-manual').hidden = true;
    if ($('modal').hidden && $('modal-elim').hidden) document.body.style.overflow = '';
  }

  $('btn-agregar-insc').addEventListener('click', () => abrirManual(null));

  // La casilla de correo solo se habilita con un correo válido escrito.
  function actualizarEnviar() {
    const valido = EMAIL_RE.test($('m-email').value.trim());
    $('m-enviar').disabled = !valido;
    if (!valido) $('m-enviar').checked = false;
    $('m-enviar-hint').hidden = valido;
  }
  $('m-email').addEventListener('input', actualizarEnviar);
  $('btn-manual-cerrar').addEventListener('click', () => cerrarManual());
  $('modal-manual').addEventListener('click', (e) => { if (e.target === $('modal-manual')) cerrarManual(); });
  $('m-personas').addEventListener('input', () => { $('manual-error').hidden = true; actualizarManual(); });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  $('form-manual').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (guardandoManual) return;
    const a = actividadSeleccionada();
    const nombre = $('m-nombre').value.trim();
    const telefono = $('m-telefono').value.trim();
    const email = $('m-email').value.trim();
    const err = (m) => { $('manual-error').textContent = m; $('manual-error').hidden = false; };
    if (!nombre) return err('Escribe el nombre.');
    if (email && !EMAIL_RE.test(email)) return err('El correo no parece válido.');

    const edicion = editandoInsc;
    let accion, datos, mensaje;
    if (edicion) {
      accion = 'editarInscripcion';
      datos = { id: edicion.id, nombre, telefono, email };
      mensaje = 'Cambios guardados';
    } else {
      const personas = Number($('m-personas').value);
      if (!a) return err('Elige una actividad.');
      if (!Number.isInteger(personas) || personas < 1) return err('Indica cuántas personas son.');
      if (personas > Number(a.cuposDisponibles)) return err(`Solo quedan ${a.cuposDisponibles} cupos.`);
      accion = 'agregarInscripcion';
      datos = { idActividad: a.id, nombre, telefono, email, personas, pagado: $('m-pagado').value === 'si',
        enviarCorreo: $('m-enviar').checked };
      mensaje = `${nombre} agregado/a`;
    }

    guardandoManual = true;
    const btn = $('btn-manual-ok');
    const textoBtn = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    $('manual-error').hidden = true;
    try {
      const r = await api(accion, datos);
      guardandoManual = false;
      cerrarManual(true);
      if (datos.enviarCorreo && r && r.correoEnviado === false) {
        toast(`${nombre} agregado/a, pero no se pudo enviar el correo`, true);
      } else {
        toast(datos.enviarCorreo ? `${mensaje} · correo enviado` : mensaje);
      }
      await cargarActividades(); // refresca cupos y la lista
    } catch (e) {
      if (!e.silent) err(e.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      guardandoManual = false;
      btn.disabled = false;
      btn.textContent = textoBtn;
    }
  });

  // Estado de pago: Pagado / Pendiente; las del sitio sin marcar muestran "Con comprobante" o "Sin pago".
  function estadoPago(i) {
    if (i.pagado === 'Sí') return { txt: 'Pagado', cls: 'si' };
    if (i.pagado === 'No') return { txt: 'Pendiente', cls: 'no' };
    return /^https:\/\/(drive|docs)\.google\.com\//.test(i.linkComprobante || '')
      ? { txt: 'Con comprobante', cls: 'neutro' }
      : { txt: 'Sin pago', cls: 'no' };
  }

  document.querySelector('#tabla-inscritos tbody').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-accion="pago"]');
    if (!b || b.disabled) return;
    const i = inscritosActuales.find((x) => String(x.id) === b.dataset.id);
    if (!i) return;
    const nuevo = i.pagado !== 'Sí'; // Pagado -> Pendiente; cualquier otro -> Pagado
    b.disabled = true;
    try {
      await api('marcarPago', { id: i.id, pagado: nuevo });
      toast(nuevo ? `${i.nombre}: marcado como pagado` : `${i.nombre}: marcado como pendiente`);
      await cargarInscritos();
    } catch (err) {
      b.disabled = false;
      mostrarError(err, 'No se pudo cambiar el estado de pago.');
    }
  });

  function enlaceComprobante(url) {
    return /^https:\/\/(drive|docs)\.google\.com\//.test(url || '')
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver comprobante</a>`
      : '<span class="hint">Sin comprobante</span>';
  }

  function fechaInscripcion(valor) {
    const d = new Date(valor);
    if (isNaN(d)) return '';
    return d.toLocaleString('es-PA', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Panama'
    });
  }

  async function cargarInscritos() {
    const tbody = document.querySelector('#tabla-inscritos tbody');
    const id = $('sel-actividad').value;
    if (!id) {
      $('resumen-inscritos').textContent = '';
      tbody.innerHTML = '<tr><td colspan="9" class="vacio">Aún no hay actividades.</td></tr>';
      return;
    }
    const mio = ++reqInscritos;
    $('resumen-inscritos').textContent = '';
    tbody.innerHTML = '<tr><td colspan="9" class="vacio">Cargando…</td></tr>';
    try {
      const lista = await api('listarInscritos', { idActividad: id });
      if (mio !== reqInscritos) return; // llegó una respuesta más vieja
      const a = actividades.find((x) => String(x.id) === String(id));
      const totalPersonas = lista.reduce((s, i) => s + (Number(i.personas) || 1), 0);
      $('resumen-inscritos').textContent =
        `${lista.length} inscripci${lista.length === 1 ? 'ón' : 'ones'} · ${personasTxt(totalPersonas)}` +
        (a ? ` · ${a.cuposTotales} cupos en total` : '');
      inscritosActuales = lista;
      if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="vacio">Todavía no hay inscritos en esta actividad.</td></tr>';
        return;
      }
      tbody.innerHTML = lista.map((i) => `
        <tr>
          <td>${esc(i.nombre)}${i.origen === 'Manual' ? '<span class="badge manual">Manual</span>' : ''}</td>
          <td>${esc(Number(i.personas) || 1)}</td>
          <td>${i.total === '' || i.total == null ? '' : esc(MONEDA + formatMonto(i.total))}</td>
          <td>${i.telefono ? `<a href="tel:${esc(String(i.telefono).replace(/[^\d+]/g, ''))}">${esc(i.telefono)}</a>` : '<span class="hint">—</span>'}</td>
          <td>${i.email ? `<a href="mailto:${esc(i.email)}">${esc(i.email)}</a>` : '<span class="hint">—</span>'}</td>
          <td>${esc(fechaInscripcion(i.fechaInscripcion))}</td>
          <td>${(() => { const p = estadoPago(i); return `<button type="button" class="pago-btn ${p.cls}" data-accion="pago" data-id="${esc(i.id)}" title="Clic para cambiar entre pagado y pendiente">${esc(p.txt)}</button>`; })()}</td>
          <td>${i.origen === 'Manual' ? '<span class="hint">—</span>' : enlaceComprobante(i.linkComprobante)}</td>
          <td class="acciones"><button type="button" class="btn-mini" data-accion="editar-insc" data-id="${esc(i.id)}">Editar</button><button type="button" class="btn-mini peligro" data-accion="eliminar-insc" data-id="${esc(i.id)}">Eliminar</button></td>
        </tr>`).join('');
    } catch (err) {
      if (mio !== reqInscritos) return;
      tbody.innerHTML = '<tr><td colspan="9" class="vacio">No se pudo cargar la lista.</td></tr>';
      mostrarError(err, 'No se pudo cargar la lista de inscritos.');
    }
  }

  // ---------- arranque ----------
  (async function iniciar() {
    const guardada = leerSesion();
    if (!guardada) return mostrarLogin();
    try {
      token = guardada;
      const r = await postApi({ action: 'sesion', token });
      if (r && r.ok) { usuarioActual = r.usuario || ''; await entrar(); }
      else { token = null; borrarSesion(); mostrarLogin(); }
    } catch (err) {
      mostrarLogin('No se pudo conectar. Intenta de nuevo.');
    }
  })();
})();
