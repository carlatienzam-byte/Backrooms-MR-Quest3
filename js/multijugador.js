/* ════════════════════════════════════════════════════════════════════
   BACKROOMS MR · Multiusuario sin servidor (WebRTC con Trystero)
   ────────────────────────────────────────────────────────────────────
   · Cada casco se conecta directamente con los demás (peer-to-peer).
     Para encontrarse usan relés públicos (Nostr): no hace falta servidor
     propio y funciona desde GitHub Pages.
   · Sala: index.html?sala=1DAM  (por defecto "backrooms-iescdb").
     Solo se ven los que estén en la MISMA sala.
   · Nombre: index.html?nombre=Carlos   ·  Desactivar: ?multi=0
   · Se comparte: cabeza, manos, en qué mundo está cada uno y los
     interruptores (sound-toggle / click-toggle) del mundo en que estáis.
   · EN EL AULA (realidad mixta) las posiciones se envían RELATIVAS A LA
     PUERTA: si todos colocáis la puerta desde la misma marca del suelo,
     mirando hacia el mismo sitio, los avatares coinciden con las personas.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (!window.AFRAME || !window.THREE) return;
  const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4, UNO = new V3(1, 1, 1), EJE_Y = new V3(0, 1, 0);
  const params = new URLSearchParams(location.search);
  const SALA = (params.get('sala') || 'backrooms-iescdb').trim();
  const NOMBRE = (params.get('nombre') || ('Visitante ' + Math.floor(10 + Math.random() * 90))).slice(0, 20);
  const COLORES = ['#ff5c5c', '#ffb84d', '#ffe14d', '#7dff6b', '#4dd2ff', '#6b8cff', '#c46bff', '#ff6bd6'];
  const COLOR = COLORES[Math.floor(Math.random() * COLORES.length)];
  const ACTIVO = params.get('multi') !== '0';

  const RED = window.RED = {
    sala: SALA, nombre: NOMBRE, color: COLOR,
    conectado: false, pares: {},
    numero: () => Object.keys(RED.pares).length,
    emitir: function () {}          // se sustituye al conectar
  };

  let room = null, accPose = null, accEvento = null;

  /* ───────── conversión de coordenadas (aula ⇄ relativa a la puerta) ───────── */
  function matrizPuerta() {
    return new M4().compose(MR.portal.pos, new Q().setFromAxisAngle(EJE_Y, MR.portal.yaw), UNO);
  }
  const r3 = (n) => Math.round(n * 1000) / 1000;

  function espacioActual() {
    return MR.estado === 'aula' ? 'aula' : MR.mundoActual;
  }

  function posMano(idMano, idMando) {
    const mano = document.querySelector(idMano);
    const c = mano && mano.components['mano-puntero'];
    if (c && c.seguida) return c.j['middle-finger-metacarpal'].clone().lerp(c.j['wrist'], 0.4);
    const mando = document.querySelector(idMando);
    const tc = mando && mando.components['tracked-controls'];
    if (tc && tc.controller) return mando.object3D.getWorldPosition(new V3());
    return null;
  }

  function construirPose() {
    const espacio = espacioActual();
    const camObj = document.querySelector('#camara').getObject3D('camera');
    camObj.updateMatrixWorld(true);
    let Mh = camObj.matrixWorld.clone();
    let l = posMano('#manoIzq', '#mandoIzq'), r = posMano('#manoDer', '#mandoDer');
    if (espacio === 'aula') {
      const inv = matrizPuerta().invert();
      Mh = inv.clone().multiply(Mh);
      if (l) l.applyMatrix4(inv);
      if (r) r.applyMatrix4(inv);
    }
    const p = new V3(), q = new Q(), s = new V3();
    Mh.decompose(p, q, s);
    return {
      s: espacio, n: NOMBRE, c: COLOR,
      h: [r3(p.x), r3(p.y), r3(p.z), r3(q.x), r3(q.y), r3(q.z), r3(q.w)],
      l: l ? [r3(l.x), r3(l.y), r3(l.z)] : 0,
      r: r ? [r3(r.x), r3(r.y), r3(r.z)] : 0
    };
  }

  /* ───────── avatares de los demás ───────── */
  function crearAvatar(id) {
    if (RED.pares[id]) return RED.pares[id];
    const cont = document.querySelector('#avatares');
    const el = document.createElement('a-entity');
    el.setAttribute('avatar-remoto', '');
    el.setAttribute('sin-colision', '');
    cont.appendChild(el);
    RED.pares[id] = { el: el, datos: null, ultimo: performance.now() };
    actualizarContador();
    return RED.pares[id];
  }
  function borrarAvatar(id) {
    const p = RED.pares[id];
    if (p && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    delete RED.pares[id];
    actualizarContador();
  }

  AFRAME.registerComponent('avatar-remoto', {
    init: function () {
      const e = this.el;
      e.innerHTML =
        '<a-entity class="av-cabeza">' +
        '  <a-sphere radius="0.13" segments-width="16" segments-height="12" material="shader: flat; color: #fff"></a-sphere>' +
        '  <a-box width="0.2" height="0.07" depth="0.06" position="0 0.01 -0.11" material="shader: flat; color: #111"></a-box>' +
        '</a-entity>' +
        '<a-entity class="av-nombre" etiqueta-viva="text: ...; width: 0.5; height: 0.1"></a-entity>' +
        '<a-sphere class="av-izq" radius="0.045" segments-width="10" segments-height="8" material="shader: flat; color: #fff"></a-sphere>' +
        '<a-sphere class="av-der" radius="0.045" segments-width="10" segments-height="8" material="shader: flat; color: #fff"></a-sphere>' +
        '<a-ring class="av-anillo" radius-inner="0.25" radius-outer="0.3" rotation="-90 0 0" material="shader: flat; color: #fff; side: double"></a-ring>';
      this.cabeza = e.querySelector('.av-cabeza');
      this.nombre = e.querySelector('.av-nombre');
      this.izq = e.querySelector('.av-izq');
      this.der = e.querySelector('.av-der');
      this.anillo = e.querySelector('.av-anillo');
      this.tH = new V3(); this.tQ = new Q(); this.tL = new V3(); this.tR = new V3();
      this.color = null; this.textoNombre = null; this.primera = true;
    },
    aplicarDatos: function (d) {
      if (d.c !== this.color) {
        this.color = d.c;
        this.cabeza.querySelector('a-sphere').setAttribute('material', 'color', d.c);
        this.izq.setAttribute('material', 'color', d.c);
        this.der.setAttribute('material', 'color', d.c);
        this.anillo.setAttribute('material', 'color', d.c);
      }
      if (d.n !== this.textoNombre) {
        this.textoNombre = d.n;
        this.nombre.setAttribute('etiqueta-viva', { text: d.n, textColor: d.c });
      }
    },
    tick: function (t, dt) {
      const par = Object.values(RED.pares).find((p) => p.el === this.el);
      const d = par && par.datos;
      const mismoSitio = d && d.s === espacioActual() && (performance.now() - par.ultimo) < 8000;
      this.el.object3D.visible = !!mismoSitio;
      if (!mismoSitio) { this.primera = true; return; }
      this.aplicarDatos(d);

      // destino en coordenadas del mundo
      const M = new M4().compose(new V3(d.h[0], d.h[1], d.h[2]), new Q(d.h[3], d.h[4], d.h[5], d.h[6]), UNO);
      let Mp = null;
      if (d.s === 'aula') { Mp = matrizPuerta(); M.premultiply(Mp); }
      const s = new V3(); M.decompose(this.tH, this.tQ, s);
      const enAula = d.s === 'aula';

      const k = this.primera ? 1 : Math.min(1, (dt || 16) / 90);
      this.primera = false;
      const ch = this.cabeza.object3D;
      ch.position.lerp(this.tH, k);
      ch.quaternion.slerp(this.tQ, k);
      // en el aula ya ves a la persona real: solo nombre + anillo en el suelo
      ch.visible = !enAula;
      this.nombre.object3D.position.set(ch.position.x, ch.position.y + 0.3, ch.position.z);
      this.nombre.object3D.lookAt(MR.cabeza());
      this.anillo.object3D.visible = enAula;
      this.anillo.object3D.position.set(ch.position.x, (enAula ? 0.01 : ch.position.y - 1.55), ch.position.z);

      const manos = [[this.izq, d.l, this.tL], [this.der, d.r, this.tR]];
      manos.forEach(([el, v, tgt]) => {
        if (!v || enAula) { el.object3D.visible = false; return; }
        tgt.set(v[0], v[1], v[2]);
        if (Mp) tgt.applyMatrix4(Mp);
        if (!el.object3D.visible) el.object3D.position.copy(tgt);
        el.object3D.visible = true;
        el.object3D.position.lerp(tgt, k);
      });
    }
  });

  /* ───────── estado compartido de los interruptores ───────── */
  function asignarIdsRed() {
    document.querySelectorAll('[sound-toggle], [click-toggle]').forEach((el, i) => {
      if (!el.dataset.net) el.dataset.net = el.id || ('net' + i);
    });
  }
  function recibirEvento(d) {
    if (!d || d.t !== 'toggle') return;
    const el = document.querySelector('[data-net="' + d.id + '"]');
    if (!el || !MR.visible3D(el.object3D)) return;    // solo si estoy en ese mundo
    const st = el.components['sound-toggle'], ct = el.components['click-toggle'];
    if (d.k === 'sound' && st && st.setEstado) st.setEstado(d.v, true);
    if (d.k === 'click' && ct && ct.setEstado) ct.setEstado(d.v, true);
  }

  /* ───────── contador e interfaz ───────── */
  function actualizarContador() {
    const n = RED.numero() + 1;
    const txt = (RED.conectado ? '👥 ' + n : '⚪ sin red') + ' · sala ' + SALA;
    const info = document.querySelector('#infoRed');
    if (info) info.setAttribute('etiqueta-viva', 'text', txt);
    const hud = document.getElementById('hud-red');
    if (hud) hud.textContent = txt + ' · ' + NOMBRE;
  }

  /* ───────── conexión ───────── */
  function conectar() {
    asignarIdsRed();
    actualizarContador();
    if (!ACTIVO) return;
    if (!window.Trystero || !Trystero.joinRoom) { console.warn('[red] Trystero no está cargado'); return; }
    try {
      room = Trystero.joinRoom({ appId: 'colombine-backrooms-mr-quest3' }, SALA);
    } catch (e) { console.warn('[red] no se pudo entrar en la sala', e); return; }
    RED.conectado = true;
    accPose = room.makeAction('pose');
    accEvento = room.makeAction('evento');

    room.onPeerJoin(({ peerId }) => {
      crearAvatar(peerId);
      try { accPose.send(construirPose(), { target: peerId }); } catch (e) {}
    });
    room.onPeerLeave(({ peerId }) => borrarAvatar(peerId));
    accPose.onMessage((d, ctx) => {
      const p = crearAvatar(ctx.peerId);
      p.datos = d; p.ultimo = performance.now();
    });
    accEvento.onMessage((d) => recibirEvento(d));

    RED.emitir = function (d) { try { accEvento.send(d); } catch (e) {} };

    setInterval(() => {
      if (!RED.numero()) return;
      try { accPose.send(construirPose()); } catch (e) {}
    }, 80);
    // limpiar pares que dejaron de responder
    setInterval(() => {
      const ahora = performance.now();
      Object.keys(RED.pares).forEach((id) => { if (ahora - RED.pares[id].ultimo > 30000) borrarAvatar(id); });
    }, 5000);
    actualizarContador();
    window.addEventListener('beforeunload', () => { try { room.leave(); } catch (e) {} });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const sc = document.querySelector('a-scene');
    if (sc.hasLoaded) conectar(); else sc.addEventListener('loaded', conectar);
  });
})();
