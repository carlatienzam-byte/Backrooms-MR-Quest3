/* ════════════════════════════════════════════════════════════════════
   BACKROOMS MR · Meta Quest 3 — núcleo de realidad mixta y manos
   ────────────────────────────────────────────────────────────────────
   Estados (MR.estado):
   · 'vr'    → VR clásica o escritorio: igual que el proyecto original.
   · 'aula'  → Realidad mixta: ves tu aula (passthrough) y una PUERTA
               anclada al suelo. A través de ella se ve el World 1
               (máscara de stencil). Al cruzarla caminando, entras.
   · 'mundo' → Realidad mixta, pero dentro de un mundo Backrooms.
               Detrás de ti queda la misma puerta: cruzándola hacia
               atrás (o con el menú de la muñeca) vuelves al aula.

   Manos (sin mandos):
   · Mano DERECHA: rayo + PELLIZCO (pulgar-índice) = clic.
   · Mano IZQUIERDA: rayo + pellizco = clic sobre objetos; pellizco
     mantenido apuntando al suelo = teletransporte al soltar.
   · Palma IZQUIERDA mirando a la cara → menú de muñeca. Se pulsa
     tocándolo con el índice derecho (o con rayo + pellizco).

   Prueba en escritorio:  index.html?modo=aula  simula el aula.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (!window.AFRAME || !window.THREE) return;

  const V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
  const EJE_Y = new V3(0, 1, 0), UNO = new V3(1, 1, 1);
  const params = new URLSearchParams(location.search);

  const MR = window.MR = {
    estado: 'vr',                 // 'vr' | 'aula' | 'mundo'
    mundoActual: '#world_1',
    forzarAula: params.get('modo') === 'aula',
    ventana: false,               // World 1 visible solo a través de la puerta
    portal: { pos: new V3(0, 0, -1.8), yaw: 0, colocado: false },
    T: new M4(),                  // transforma el World 1 para encajarlo en la puerta
    planoCorte: new THREE.Plane(new V3(0, 0, -1), 1e6),
    reiniciarColisiones: false,
    menuVisible: false
  };

  /* ───────── utilidades ───────── */
  const _q = new Q(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  const escena = () => document.querySelector('a-scene');
  const rigEl = () => document.querySelector('#playerRig');
  const camEl = () => document.querySelector('#camara');
  const camObj = () => { const c = camEl(); return c && (c.getObject3D('camera') || c.object3D); };

  MR.enXR = () => { const s = escena(); return !!(s && s.renderer && s.renderer.xr.isPresenting); };
  MR.enAR = () => { const s = escena(); return !!(s && s.is('ar-mode')); };
  MR.enRM = () => MR.forzarAula || MR.enAR();

  MR.cabeza = function (out) {
    const c = camObj(); out = out || new V3();
    if (!c) return out.set(0, 1.6, 0);
    c.updateMatrixWorld(true);
    return c.getWorldPosition(out);
  };
  MR.yawCabeza = function () {
    const c = camObj(); if (!c) return 0;
    c.getWorldQuaternion(_q); _e.setFromQuaternion(_q, 'YXZ');
    return _e.y;
  };
  MR.adelante = function (out) {
    const y = MR.yawCabeza();
    return (out || new V3()).set(-Math.sin(y), 0, -Math.cos(y));
  };

  /* ¿Está este objeto 3D realmente visible (él y todos sus padres)? */
  MR.visible3D = function (o) {
    for (; o; o = o.parent) if (o.visible === false) return false;
    return true;
  };

  /* Teletransporta para que la CABEZA quede en (x,y,z) mirando a rotYdeg.
     En gafas, la cabeza no está en el centro del rig (el usuario camina
     por la sala), así que se compensa ese desplazamiento.
     rotYdeg = null → se mantiene la orientación actual. */
  MR.teleportRig = function (x, y, z, rotYdeg) {
    const r = rigEl(); if (!r) return;
    const o = r.object3D;
    o.updateMatrixWorld(true);
    const local = o.worldToLocal(MR.cabeza());
    const yawLocal = MR.yawCabeza() - o.rotation.y;
    const yawRig = (rotYdeg === null || rotYdeg === undefined)
      ? o.rotation.y
      : THREE.MathUtils.degToRad(rotYdeg) - yawLocal;
    const off = new V3(local.x, 0, local.z).applyAxisAngle(EJE_Y, yawRig);
    o.rotation.set(0, yawRig, 0);
    o.position.set(x - off.x, y, z - off.z);
    o.updateMatrixWorld(true);
    MR.reiniciarColisiones = true;
  };

  /* Gira al visitante alrededor de su propia cabeza (giro por pasos) */
  MR.girar = function (grados) {
    const r = rigEl(); if (!r) return;
    const o = r.object3D;
    o.updateMatrixWorld(true);
    const H = MR.cabeza();
    const local = o.worldToLocal(H.clone());
    o.rotation.y += THREE.MathUtils.degToRad(grados);
    o.updateMatrixWorld(true);
    const H2 = o.localToWorld(local);
    o.position.x += H.x - H2.x;
    o.position.z += H.z - H2.z;
    MR.reiniciarColisiones = true;
  };

  MR.rigIdentidad = function () {
    const r = rigEl(); if (!r) return;
    r.object3D.position.set(0, 0, 0);
    r.object3D.rotation.set(0, 0, 0);
    r.object3D.updateMatrixWorld(true);
    MR.reiniciarColisiones = true;
  };

  /* ───────── fundido a negro (pegado a la cámara real, también en gafas) ───────── */
  let velo = null, veloObjetivo = 0;
  function crearVelo() {
    const c = camObj(); if (!c) return null;
    velo = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
    );
    velo.position.set(0, 0, -0.25);
    velo.renderOrder = 9999;
    velo.frustumCulled = false;
    velo.visible = false;
    c.add(velo);
    return velo;
  }
  MR.fundido = function (fn) {
    if (!velo) crearVelo();
    veloObjetivo = 1;
    setTimeout(() => {
      try { fn && fn(); } catch (e) { console.error('[MR] error en transición', e); }
      veloObjetivo = 0;
    }, 230);
  };
  function tickVelo(dt) {
    if (!velo) return;
    const m = velo.material, paso = (dt || 16) / 200;
    if (m.opacity < veloObjetivo) m.opacity = Math.min(veloObjetivo, m.opacity + paso);
    else if (m.opacity > veloObjetivo) m.opacity = Math.max(veloObjetivo, m.opacity - paso * 0.5);
    velo.visible = m.opacity > 0.001;
  }

  /* ───────── ventana: el World 1 visto a través de la puerta ───────── */
  function calcularT() {
    const sp = (typeof spawnPoints !== 'undefined' && spawnPoints['#world_1']) || { x: 0, y: 0, z: 0, rotY: 0 };
    const P = new M4().compose(MR.portal.pos, new Q().setFromAxisAngle(EJE_Y, MR.portal.yaw), UNO);
    const S = new M4().compose(new V3(sp.x, sp.y, sp.z),
      new Q().setFromAxisAngle(EJE_Y, THREE.MathUtils.degToRad(sp.rotY)), UNO);
    MR.T.multiplyMatrices(P, S.invert());
  }

  /* Prepara los materiales del World 1: plano de corte (siempre el mismo
     objeto, así no se recompilan sombreadores al cambiar de modo) + stencil. */
  MR.ajustarMateriales = function () {
    const w = document.querySelector('#world_1'); if (!w) return;
    w.object3D.traverse((n) => {
      if (!n.isMesh && !n.isLine && !n.isPoints) return;
      if (n.userData.mrFijo) return;
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m) => {
        if (!m) return;
        if (!m.userData.mrCorte) {
          m.clippingPlanes = [MR.planoCorte];
          m.userData.mrCorte = true;
          m.needsUpdate = true;
        }
        m.stencilWrite = MR.ventana;
        m.stencilRef = 1;
        m.stencilFunc = MR.ventana ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc;
      });
      n.renderOrder = MR.ventana ? 2 : 0;
    });
  };

  let W0 = null;
  function guardarW0() {
    if (W0) return;
    const o = document.querySelector('#world_1').object3D;
    o.updateMatrix();
    W0 = o.matrix.clone();
  }
  MR.ponerVentana = function () {
    const w = document.querySelector('#world_1'); if (!w) return;
    guardarW0();
    calcularT();
    const M = MR.T.clone().multiply(W0);
    M.decompose(w.object3D.position, w.object3D.quaternion, w.object3D.scale);
    w.object3D.updateMatrixWorld(true);
    w.setAttribute('visible', true);
    // corta todo lo que quede a este lado de la puerta
    const n = new V3(-Math.sin(MR.portal.yaw), 0, -Math.cos(MR.portal.yaw));
    MR.planoCorte.set(n, -n.dot(MR.portal.pos) + 0.02);
    MR.ventana = true;
    MR.ajustarMateriales();
  };
  MR.quitarVentana = function () {
    const w = document.querySelector('#world_1'); if (!w) return;
    if (W0) {
      W0.decompose(w.object3D.position, w.object3D.quaternion, w.object3D.scale);
      w.object3D.updateMatrixWorld(true);
    }
    MR.planoCorte.constant = 1e6;     // ya no corta nada
    MR.ventana = false;
    MR.ajustarMateriales();
  };

  /* ───────── colocar la puerta en el aula ───────── */
  MR.colocarPortal = function () {
    const H = MR.cabeza(), f = MR.adelante();
    MR.portal.pos.set(H.x + f.x * 1.6, 0, H.z + f.z * 1.6);
    MR.portal.yaw = MR.yawCabeza();
    MR.portal.colocado = true;
    const aula = document.querySelector('#aula');
    if (aula) {
      aula.object3D.position.copy(MR.portal.pos);
      aula.object3D.rotation.set(0, MR.portal.yaw, 0);
      aula.object3D.updateMatrixWorld(true);
    }
    if (MR.ventana) MR.ponerVentana();
    umbral.prevAula = null;
    escena().emit('portal-colocado');
  };

  /* ───────── transiciones ───────── */
  /* En el aula real no hay joystick: moverse con el stick descuadraría
     la puerta respecto a la sala. En la simulación de escritorio, sí. */
  function permitirJoystick(si) {
    const r = rigEl();
    if (r && r.hasAttribute('movement-controls')) r.setAttribute('movement-controls', 'enabled', si);
  }

  function mostrarAula(si) {
    permitirJoystick(!si || !MR.enAR());
    const aula = document.querySelector('#aula');
    if (aula) aula.setAttribute('visible', si);
    const puerta = document.querySelector('#puerta_aula');
    if (puerta) puerta.setAttribute('visible', !si && MR.enRM());
  }

  MR.mostrarAula = mostrarAula;

  function refrescarRayos() {
    document.querySelectorAll('[raycaster]').forEach((r) => {
      const rc = r.components && r.components.raycaster;
      if (rc && rc.refreshObjects) rc.refreshObjects();
    });
  }

  /* Entrar (o volver) al aula: passthrough + puerta con la ventana al World 1 */
  MR.entrarAula = function () {
    if (typeof stopAllWorldMusic === 'function') stopAllWorldMusic();
    MR.estado = 'aula';
    MR.mundoActual = '#world_1';
    document.querySelectorAll('[data-world]').forEach((w) => w.setAttribute('visible', false));
    MR.rigIdentidad();
    if (!MR.portal.colocado) MR.colocarPortal();
    if (typeof aislarMundos === 'function') aislarMundos('#ninguno');   // nada de los mundos es interactivo
    MR.ponerVentana();
    mostrarAula(true);
    // la música del World 1 sale por la puerta (sonido posicional)
    const m = document.querySelector('#music_world1');
    if (m && m.components.sound) m.components.sound.playSound();
    umbral.prevAula = null;
    refrescarRayos();
    escena().emit('mundo-cambiado', { mundo: 'aula' });
  };

  /* Cruzar la puerta caminando: transición continua, sin saltos de imagen */
  MR.cruzarAMundo = function () {
    const r = rigEl(); if (!r) return;
    MR.quitarVentana();
    // mundo en T con el rig en R  ≡  mundo en su sitio con el rig en T⁻¹·R
    const R = new M4().compose(r.object3D.position, new Q().setFromEuler(r.object3D.rotation), UNO);
    const inv = MR.T.clone().invert().multiply(R), p = new V3(), q = new Q(), s = new V3();
    inv.decompose(p, q, s);
    _e.setFromQuaternion(q, 'YXZ');
    r.object3D.position.copy(p);
    r.object3D.rotation.set(0, _e.y, 0);
    r.object3D.updateMatrixWorld(true);
    MR.reiniciarColisiones = true;
    MR.estado = 'mundo';
    MR.mundoActual = '#world_1';
    mostrarAula(false);
    if (typeof aislarMundos === 'function') aislarMundos('#world_1');
    umbral.prevMundo = null;
    escena().emit('mundo-cambiado', { mundo: '#world_1' });
  };

  /* Entrar con un pellizco sobre la puerta (sin caminar) */
  MR.entrarPorClic = function () {
    MR.fundido(() => {
      MR.quitarVentana();
      MR.estado = 'mundo';
      mostrarAula(false);
      if (typeof goWorld === 'function') goWorld('#world_1');
      umbral.prevMundo = null;
    });
  };

  MR.volverAlAula = function () {
    MR.fundido(() => MR.entrarAula());
  };

  /* Al salir de las gafas, todo vuelve a ser el proyecto VR normal */
  MR.salirDeRM = function () {
    if (MR.estado === 'vr') return;
    MR.quitarVentana();
    MR.estado = 'vr';
    mostrarAula(false);
    const puerta = document.querySelector('#puerta_aula');
    if (puerta) puerta.setAttribute('visible', false);
    if (typeof goWorld === 'function') goWorld('#world_1');
  };

  /* ───────── detector de umbral (cruzar la puerta caminando) ───────── */
  const umbral = MR._umbral = { prevAula: null, prevMundo: null, ultimo: 0 };
  const _inv = new M4(), _h = new V3();
  function localEnPuerta(pos, yaw, out) {
    _inv.compose(pos, new Q().setFromAxisAngle(EJE_Y, yaw), UNO).invert();
    return out.copy(MR.cabeza(_h)).applyMatrix4(_inv);
  }
  /* "lado" de la puerta en que está la cabeza: +1 delante, -1 detrás.
     Hay una franja muerta de ±5 cm para que el temblor de la cabeza no
     dispare cruces falsos. Se cruza cuando el lado cambia dentro del marco. */
  function lado(z, anterior) {
    if (z > 0.05) return 1;
    if (z < -0.05) return -1;
    return anterior;
  }
  function tickUmbral(t) {
    const pausa = t - umbral.ultimo < 1200;          // pausa tras cada cruce
    const L = new V3();
    if (MR.estado === 'aula') {
      localEnPuerta(MR.portal.pos, MR.portal.yaw, L);
      const dentroMarco = Math.abs(L.x) < 0.6 && L.y > 0.4 && L.y < 2.6;
      const nuevo = lado(L.z, umbral.prevAula);
      if (!pausa && umbral.prevAula === 1 && nuevo === -1 && dentroMarco) {
        umbral.ultimo = t; umbral.prevAula = null;
        MR.cruzarAMundo();
        return;
      }
      umbral.prevAula = nuevo;
    } else if (MR.estado === 'mundo' && MR.mundoActual === '#world_1') {
      const sp = spawnPoints['#world_1'];
      localEnPuerta(new V3(sp.x, sp.y, sp.z), THREE.MathUtils.degToRad(sp.rotY), L);
      const dentroMarco = Math.abs(L.x) < 0.6;
      const nuevo = lado(L.z, umbral.prevMundo);
      if (!pausa && umbral.prevMundo === -1 && nuevo === 1 && dentroMarco) {
        umbral.ultimo = t; umbral.prevMundo = null;
        MR.volverAlAula();
        return;
      }
      umbral.prevMundo = nuevo;
    }
  }

  /* ───────── sistema principal ───────── */
  AFRAME.registerSystem('mr', {
    init: function () {
      const sc = this.el;
      sc.addEventListener('renderstart', () => {
        sc.renderer.localClippingEnabled = true;
        // Rayos acelerados con el árbol BVH que ya construye colisiones.js
        if (window.MeshBVHLib && MeshBVHLib.acceleratedRaycast) {
          THREE.Mesh.prototype.raycast = MeshBVHLib.acceleratedRaycast;
        }
      });
      sc.addEventListener('enter-vr', () => {
        document.body.classList.add('en-xr');
        if (sc.is('ar-mode')) {
          setTimeout(() => MR.entrarAula(), 50);
        }
      });
      sc.addEventListener('exit-vr', () => {
        document.body.classList.remove('en-xr');
        if (!MR.forzarAula) MR.salirDeRM();
      });
      // Los modelos del World 1 que terminan de cargar heredan el modo actual
      sc.addEventListener('model-loaded', (e) => {
        const w = document.querySelector('#world_1');
        if (w && e.target && w.contains(e.target) && (MR.ventana || MR.enRM())) MR.ajustarMateriales();
      });
    },
    tick: function (t, dt) {
      tickVelo(dt);
      if (MR.estado === 'aula' || MR.estado === 'mundo') tickUmbral(t);
    }
  });

  /* ════════════════════════════════════════════════════════════════
     COMPONENTES
     ════════════════════════════════════════════════════════════════ */

  /* Texto en un lienzo (sin fuentes de red) que se puede cambiar en vivo */
  AFRAME.registerComponent('etiqueta-viva', {
    schema: {
      text: { type: 'string', default: '' },
      width: { type: 'number', default: 0.3 },
      height: { type: 'number', default: 0.08 },
      bgColor: { type: 'color', default: '#1b1b1b' },
      textColor: { type: 'color', default: '#f0e68c' },
      borde: { type: 'color', default: '' }
    },
    init: function () {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = Math.max(32, Math.round(512 * this.data.height / this.data.width));
      this.tex = new THREE.CanvasTexture(this.canvas);
      this.tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.height), mat);
      this.el.setObject3D('mesh', this.mesh);
    },
    update: function () {
      const c = this.canvas, ctx = c.getContext('2d'), d = this.data;
      ctx.clearRect(0, 0, c.width, c.height);
      const r = Math.min(c.height * 0.25, 28);
      ctx.fillStyle = d.bgColor;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(2, 2, c.width - 4, c.height - 4, r); else ctx.rect(2, 2, c.width - 4, c.height - 4);
      ctx.fill();
      if (d.borde) { ctx.lineWidth = 4; ctx.strokeStyle = d.borde; ctx.stroke(); }
      let fs = Math.round(c.height * 0.55);
      ctx.fillStyle = d.textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      do { ctx.font = `bold ${fs}px sans-serif`; fs -= 2; } while (ctx.measureText(d.text).width > c.width * 0.9 && fs > 10);
      ctx.fillText(d.text, c.width / 2, c.height / 2 + 2);
      this.tex.needsUpdate = true;
    },
    remove: function () { this.el.removeObject3D('mesh'); }
  });

  /* Hueco de la puerta: escribe en el stencil (no pinta color).
     Todo el World 1 se dibuja SOLO donde está este hueco. */
  AFRAME.registerComponent('mascara-stencil', {
    schema: { width: { default: 1.0 }, height: { default: 2.1 } },
    init: function () {
      const mat = new THREE.MeshBasicMaterial({
        colorWrite: false, depthWrite: false,
        stencilWrite: true, stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.height), mat);
      m.renderOrder = -10;
      this.el.setObject3D('mesh', m);
    }
  });

  /* Hueco de la puerta VISTO DESDE DENTRO del mundo: pinta "transparente"
     (alfa 0) y así se ve el aula real a través de él (passthrough). */
  AFRAME.registerComponent('agujero-passthrough', {
    schema: { width: { default: 1.0 }, height: { default: 2.1 } },
    init: function () {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000, opacity: 0, transparent: false,
        blending: THREE.NoBlending, side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.height), mat);
      m.renderOrder = -10;
      m.userData.mrFijo = true;
      this.el.setObject3D('mesh', m);
    }
  });

  /* Pellizcar la puerta del mundo = volver al aula */
  AFRAME.registerComponent('volver-aula-clic', {
    init: function () {
      this.el.addEventListener('click', () => { if (MR.estado === 'mundo') MR.volverAlAula(); });
    }
  });

  /* Panel 2D (escritorio) y clic sobre el hueco de la puerta del aula */
  document.addEventListener('DOMContentLoaded', () => {
    const mascara = document.querySelector('#mascaraPortal');
    if (mascara) mascara.addEventListener('click', () => { if (MR.estado === 'aula') MR.entrarPorClic(); });
    setInterval(() => {
      const sim = MR.forzarAula;
      const ver = (id, v) => { const b = document.getElementById(id); if (b) b.classList.toggle('oculto', !v); };
      ver('hud-entrar', sim && MR.estado === 'aula');
      ver('hud-colocar', sim && MR.estado === 'aula');
      ver('hud-aula', sim && MR.estado === 'mundo');
    }, 300);
  });

  /* ───────── MANO con seguimiento: rayo + pellizco ───────── */
  const ARTIC = ['wrist', 'thumb-tip', 'index-finger-tip', 'index-finger-phalanx-proximal',
    'index-finger-metacarpal', 'pinky-finger-metacarpal', 'middle-finger-metacarpal'];

  AFRAME.registerComponent('mano-puntero', {
    schema: {
      hand: { default: 'right', oneOf: ['left', 'right'] },
      teletransporte: { default: false },
      alcance: { default: 15 }
    },
    init: function () {
      this.j = {}; ARTIC.forEach((n) => { this.j[n] = new V3(); });
      this.seguida = false; this.pinzado = false; this.palma = false;
      this.hover = null; this.modo = null; this.tp = { ok: false, punto: new V3() };
      this.ultimoToque = 0;
      this.normalPalma = new V3();
      this.rc = new THREE.Raycaster();
      this.origen = new V3(); this.dir = new V3();

      const color = 0xffffff;
      this.linea = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new V3(), new V3(0, 0, -1)]),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.55, depthWrite: false })
      );
      this.linea.frustumCulled = false;
      this.punto = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8),
        new THREE.MeshBasicMaterial({ color: color, depthTest: false, transparent: true }));
      this.punto.renderOrder = 999;
      const anillo = new THREE.RingGeometry(0.22, 0.3, 40); anillo.rotateX(-Math.PI / 2);
      this.marca = new THREE.Mesh(anillo, new THREE.MeshBasicMaterial({ color: 0x33ff99, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      [this.linea, this.punto, this.marca].forEach((o) => { o.visible = false; this.el.sceneEl.object3D.add(o); });
    },
    remove: function () {
      [this.linea, this.punto, this.marca].forEach((o) => o.parent && o.parent.remove(o));
    },

    leerArticulaciones: function () {
      const sc = this.el.sceneEl;
      if (!sc.renderer || !sc.renderer.xr.isPresenting || !sc.frame) return false;
      const session = sc.renderer.xr.getSession(), ref = sc.renderer.xr.getReferenceSpace();
      if (!session || !ref) return false;
      let src = null;
      for (const s of session.inputSources) if (s.hand && s.handedness === this.data.hand) { src = s; break; }
      if (!src) return false;
      const r = rigEl().object3D; r.updateMatrixWorld(true);
      for (const n of ARTIC) {
        const jt = src.hand.get(n), p = jt && sc.frame.getJointPose(jt, ref);
        if (!p) return false;
        const t = p.transform.position;
        this.j[n].set(t.x, t.y, t.z).applyMatrix4(r.matrixWorld);
      }
      return true;
    },

    ocultar: function () {
      this.linea.visible = this.punto.visible = this.marca.visible = false;
      this.cambiarHover(null);
    },

    cambiarHover: function (el, inter) {
      if (el === this.hover) return;
      if (this.hover) {
        this.hover.emit('mouseleave', { cursorEl: this.el });
        this.hover.emit('raycaster-intersected-cleared', { el: this.el });
      }
      if (el) {
        el.emit('mouseenter', { cursorEl: this.el, intersection: inter });
        el.emit('raycaster-intersected', { el: this.el, intersection: inter });
      }
      this.hover = el;
    },

    objetivos: function () {
      const lista = [];
      document.querySelectorAll('.clickable').forEach((el) => {
        if (!el.object3D || !MR.visible3D(el.object3D)) return;
        if (this.data.hand === 'left' && el.classList.contains('boton-menu')) return;
        lista.push(el);
      });
      return lista;
    },

    lanzarRayo: function () {
      const els = this.objetivos();
      if (!els.length) return null;
      this.rc.set(this.origen, this.dir);
      this.rc.far = this.data.alcance;
      this.rc.firstHitOnly = false;
      const hits = this.rc.intersectObjects(els.map((e) => e.object3D), true);
      for (const h of hits) {
        if (!MR.visible3D(h.object)) continue;
        let o = h.object;
        while (o && !(o.el && els.includes(o.el))) o = o.parent;
        if (o) return { el: o.el, inter: h };
      }
      return null;
    },

    apuntarTeleport: function () {
      const tp = this.tp; tp.ok = false; tp.punto.set(0, 0, 0);
      const mundo = document.querySelector(MR.mundoActual);
      const rigY = rigEl().object3D.position.y;
      this.rc.set(this.origen, this.dir); this.rc.far = 10; this.rc.firstHitOnly = true;
      let golpe = null;
      if (mundo) {
        const hits = this.rc.intersectObject(mundo.object3D, true);
        golpe = hits.find((h) => h.face && MR.visible3D(h.object) && !(h.object.el && h.object.el.classList.contains('clickable')));
      }
      if (golpe) {
        const n = golpe.face.normal.clone().transformDirection(golpe.object.matrixWorld);
        tp.punto.copy(golpe.point);
        tp.ok = n.y > 0.7;
      } else if (this.dir.y < -0.05) {
        const t = (rigY - this.origen.y) / this.dir.y;
        if (t > 0 && t < 10) { tp.punto.copy(this.origen).addScaledVector(this.dir, t); tp.ok = true; }
      }
      return tp;
    },

    dibujarLinea: function (hasta, color) {
      const pos = this.linea.geometry.attributes.position;
      pos.setXYZ(0, this.origen.x, this.origen.y, this.origen.z);
      pos.setXYZ(1, hasta.x, hasta.y, hasta.z);
      pos.needsUpdate = true;
      this.linea.material.color.set(color);
      this.linea.visible = true;
    },

    comprobarPalma: function () {
      const w = this.j['wrist'];
      const a = this.j['index-finger-metacarpal'].clone().sub(w);
      const b = this.j['pinky-finger-metacarpal'].clone().sub(w);
      // mano izquierda: normal de la palma = b × a ; derecha: a × b
      if (this.data.hand === 'left') this.normalPalma.crossVectors(b, a); else this.normalPalma.crossVectors(a, b);
      this.normalPalma.normalize();
      const aCara = MR.cabeza().sub(w).normalize();
      this.palma = this.normalPalma.dot(aCara) > 0.55;
    },

    tick: function (t) {
      if (!this.leerArticulaciones()) {
        if (this.seguida) { this.ocultar(); this.pinzado = false; this.modo = null; }
        this.seguida = false; this.palma = false;
        return;
      }
      this.seguida = true;

      // Pellizco con histéresis (evita parpadeos)
      const d = this.j['thumb-tip'].distanceTo(this.j['index-finger-tip']);
      const antes = this.pinzado;
      if (!this.pinzado && d < 0.022) this.pinzado = true;
      else if (this.pinzado && d > 0.045) this.pinzado = false;

      this.comprobarPalma();

      // La mano izquierda con la palma hacia la cara muestra el menú: sin rayo
      if (this.data.hand === 'left' && MR.menuVisible) {
        this.ocultar(); this.modo = null;
        return;
      }

      // Toque directo con la punta del índice derecho (botones del menú)
      if (this.data.hand === 'right' && MR.menuVisible && t - this.ultimoToque > 700) {
        const punta = this.j['index-finger-tip'];
        const bots = document.querySelectorAll('.boton-menu');
        for (const b of bots) {
          if (!MR.visible3D(b.object3D)) continue;
          const c = b.object3D.getWorldPosition(new V3());
          if (c.distanceTo(punta) < 0.035) { this.ultimoToque = t; b.emit('click', { cursorEl: this.el }); break; }
        }
      }

      // Rayo: desde un "hombro" estimado, pasando por el nudillo del índice
      const H = MR.cabeza(), yaw = MR.yawCabeza();
      const lado = this.data.hand === 'right' ? 1 : -1;
      const hombro = new V3(H.x + Math.cos(yaw) * 0.17 * lado, H.y - 0.2, H.z - Math.sin(yaw) * 0.17 * lado);
      this.origen.copy(this.j['index-finger-phalanx-proximal']);
      this.dir.subVectors(this.origen, hombro).normalize();

      const hit = (this.modo === 'tp') ? null : this.lanzarRayo();
      this.cambiarHover(hit ? hit.el : null, hit && hit.inter);

      // Inicio del pellizco
      if (this.pinzado && !antes) {
        if (hit) {
          this.modo = 'clic';
          hit.el.emit('click', { cursorEl: this.el, intersection: hit.inter });
        } else if (this.data.teletransporte && MR.estado !== 'aula') {
          this.modo = 'tp';
        }
      }
      // Fin del pellizco
      if (!this.pinzado && antes) {
        if (this.modo === 'tp' && this.tp.ok) {
          MR.teleportRig(this.tp.punto.x, this.tp.punto.y, this.tp.punto.z, null);
        }
        this.modo = null;
      }

      // Dibujo
      if (this.modo === 'tp') {
        const tp = this.apuntarTeleport();
        this.punto.visible = false;
        if (tp.ok || tp.punto.lengthSq() > 0) {
          this.marca.position.copy(tp.punto).add(new V3(0, 0.02, 0));
          this.marca.material.color.set(tp.ok ? 0x33ff99 : 0xff3344);
          this.marca.visible = true;
          this.dibujarLinea(tp.punto, tp.ok ? 0x33ff99 : 0xff3344);
        } else {
          this.marca.visible = false;
          this.dibujarLinea(this.origen.clone().addScaledVector(this.dir, 3), 0xff3344);
        }
        return;
      }
      this.marca.visible = false;
      const fin = hit ? hit.inter.point : this.origen.clone().addScaledVector(this.dir, 2.5);
      const color = this.pinzado ? 0x00ffff : (hit ? 0xf0e68c : 0xffffff);
      this.dibujarLinea(fin, color);
      this.punto.position.copy(fin);
      this.punto.material.color.set(color);
      this.punto.visible = true;
    }
  });

  /* ───────── MENÚ de la muñeca izquierda ───────── */
  AFRAME.registerComponent('menu-muneca', {
    init: function () {
      this.botones = {};
      this.el.querySelectorAll('[data-boton]').forEach((b) => {
        this.botones[b.dataset.boton] = b;
        b.classList.add('clickable', 'boton-menu');
        b.addEventListener('click', () => this.accion(b.dataset.boton));
      });
      this.el.object3D.visible = false;
    },
    accion: function (nombre) {
      switch (nombre) {
        case 'aula': MR.volverAlAula(); break;
        case 'colocar': MR.colocarPortal(); break;
        case 'hub': MR.fundido(() => goWorld('#world_1')); break;
        case 'girar-izq': MR.girar(45); break;
        case 'girar-der': MR.girar(-45); break;
      }
    },
    actualizarBotones: function () {
      const e = MR.estado, b = this.botones;
      const ver = (k, v) => { if (b[k] && b[k].object3D.visible !== v) b[k].object3D.visible = v; };
      ver('aula', e === 'mundo');
      ver('colocar', e === 'aula');
      ver('hub', e !== 'aula' && MR.mundoActual !== '#world_1');
      ver('girar-izq', e !== 'aula');
      ver('girar-der', e !== 'aula');
    },
    tick: function () {
      const izq = document.querySelector('#manoIzq');
      const m = izq && izq.components['mano-puntero'];
      const visible = !!(m && m.seguida && m.palma);
      MR.menuVisible = visible;
      this.el.object3D.visible = visible;
      if (!visible) return;
      this.actualizarBotones();
      // flota sobre la palma, mirando a la cara
      const p = m.j['middle-finger-metacarpal'].clone().lerp(m.j['wrist'], 0.5).addScaledVector(m.normalPalma, 0.09);
      this.el.object3D.position.copy(p);
      this.el.object3D.lookAt(MR.cabeza());
    }
  });
})();
