// Consulta rápida ("¿Tienes dudas? Escríbenos"): envía un correo al estudio; no es una inscripción.
(function () {
  'use strict';

  const { postApi } = window.Mel;
  const $ = (id) => document.getElementById(id);
  let enviando = false;

  function abrir() {
    $('ct-form').reset();
    $('ct-error').hidden = true;
    $('ct-form-vista').hidden = false;
    $('ct-ok-vista').hidden = true;
    $('modal-contacto').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { try { $('ct-form').nombre.focus(); } catch (e) { /* sin foco */ } }, 50);
  }

  function cerrar() {
    if (enviando) return;
    $('modal-contacto').hidden = true;
    // Si el formulario de inscripción o de taller privado sigue abierto debajo, no se libera el scroll.
    const otro = ['modal', 'modal-privado'].some((id) => $(id) && !$(id).hidden);
    if (!otro) document.body.style.overflow = '';
  }

  function error(msg) { const el = $('ct-error'); el.textContent = msg; el.hidden = false; }

  async function enviar(ev) {
    ev.preventDefault();
    if (enviando) return;
    const f = ev.target;
    const datos = {
      action: 'contacto',
      nombre: f.nombre.value.trim(), email: f.email.value.trim(),
      mensaje: f.mensaje.value.trim(), web: $('ct-web').value
    };
    if (!datos.nombre || !datos.email || !datos.mensaje) return error('Completa tu nombre, correo y mensaje.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return error('El correo no parece válido.');
    if (datos.mensaje.length < 5) return error('Cuéntanos un poco más tu duda.');

    enviando = true;
    const btn = $('ct-enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';
    $('ct-error').hidden = true;
    try {
      const resp = await postApi(datos);
      if (resp.error) throw new Error(resp.error);
      $('ct-form-vista').hidden = true;
      $('ct-ok-vista').hidden = false;
    } catch (e) {
      error(e.message || 'No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      enviando = false; btn.disabled = false; btn.textContent = 'Enviar mensaje';
    }
  }

  document.addEventListener('click', (e) => { if (e.target.closest('[data-contacto]')) abrir(); });
  $('ct-cerrar').addEventListener('click', cerrar);
  $('ct-cancelar').addEventListener('click', cerrar);
  $('ct-ok-btn').addEventListener('click', cerrar);
  $('modal-contacto').addEventListener('click', (e) => { if (e.target === $('modal-contacto')) cerrar(); });
  // En fase de captura para que Escape cierre solo esta ventana y no la de inscripción que está debajo.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('modal-contacto').hidden) { e.stopImmediatePropagation(); cerrar(); }
  }, true);
  $('ct-form').addEventListener('submit', enviar);
})();
