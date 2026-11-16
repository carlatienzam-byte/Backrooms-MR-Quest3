/* ════════════════════════════════════════════════════════════════════
   BACKROOMS MR · Presentación animada (motion graphics) de la interfaz
   ────────────────────────────────────────────────────────────────────
   Se muestra antes de la pantalla ENTRAR. Todo es SVG + CSS (sin vídeo,
   sin archivos externos), así que pesa poco y va fluido en el Quest.
   · Avanza sola; también con ◀ ▶, las flechas del teclado o tocando los puntos.
   · "Saltar" la cierra. Una vez vista, solo vuelve a salir con el botón
     "🎬 Ver tutorial" de la pantalla de inicio.
   · ?intro=1 → mostrarla siempre ·  ?intro=0 → no mostrarla nunca
   · Voz masculina (audio/tutorial/escenaN.mp3, generada con Piper TTS,
     voz "carlfm" en castellano). Botón 🔊/🔇 para quitarla. Como el
     navegador no deja sonar audio sin un toque previo, la primera vez
     sale una portada con "Empezar con voz".
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const params = new URLSearchParams(location.search);
  const CLAVE = 'backroomsMR_tutorialVisto';
  const leer = () => { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; } };
  const marcar = () => { try { localStorage.setItem(CLAVE, '1'); } catch (e) {} };

  const A = '#f0e68c', OSC = '#0d0c08';

  /* ───────── piezas reutilizables ───────── */
  // Mano estilizada. Las clases idx/pul animan índice y pulgar (pellizco).
  function mano(cls, transform) {
    return `<g class="mano ${cls}" transform="${transform}">
      <path class="palma" d="M-42 12 Q-48 72 -12 98 L30 98 Q52 62 44 12 Q20 -6 -42 12Z"/>
      <path class="dedo" d="M-6 8 Q-4 -22 6 -12"/>
      <path class="dedo" d="M12 8 Q16 -16 24 -6"/>
      <path class="dedo" d="M30 12 Q36 -6 40 6"/>
      <path class="dedo idx" d="M-24 10 Q-30 -40 -32 -78"/>
      <path class="dedo pul" d="M-40 52 Q-72 36 -84 -2"/>
      <circle class="chispa" cx="-64" cy="-38" r="10"/>
    </g>`;
  }
  // Fondo de moqueta en perspectiva + luces del techo (estética Backrooms)
  function backrooms(op) {
    let l = '';
    for (let i = -8; i <= 8; i++) l += `<line x1="${400 + i * 22}" y1="250" x2="${400 + i * 160}" y2="450"/>`;
    for (let j = 0; j < 6; j++) { const y = 250 + Math.pow(j / 5, 1.7) * 200; l += `<line x1="0" y1="${y}" x2="800" y2="${y}"/>`; }
    let luces = '';
    [[330, 40, 140, 22], [360, 120, 80, 12], [380, 170, 40, 7], [240, 70, 90, 14], [470, 70, 90, 14]].forEach(([x, y, w, h], k) =>
      luces += `<rect class="luz" style="animation-delay:${k * 0.37}s" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`);
    return `<g opacity="${op}"><rect width="800" height="450" fill="url(#gBack)"/><g class="moqueta">${l}</g>${luces}</g>`;
  }
  const DEFS = `<defs>
    <linearGradient id="gBack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9b458"/><stop offset=".55" stop-color="#8f7d33"/><stop offset="1" stop-color="#4a3f17"/>
    </linearGradient>
    <linearGradient id="gPasillo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e8d98a"/><stop offset=".6" stop-color="#b09a45"/><stop offset="1" stop-color="#6b5a2a"/>
    </linearGradient>
    <radialGradient id="gHalo"><stop offset="0" stop-color="${A}" stop-opacity=".55"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
    <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  // Puerta: marco + pasillo de Backrooms dentro
  function puerta(x, y, s, extra) {
    return `<g transform="translate(${x} ${y}) scale(${s})" class="${extra || ''}">
      <rect x="-60" y="-210" width="120" height="210" fill="url(#gPasillo)"/>
      <path d="M-60 -210 L-22 -150 L22 -150 L60 -210 M-60 0 L-22 -70 L22 -70 L60 0 M-22 -150 L-22 -70 M22 -150 L22 -70" stroke="#6b5a2a" stroke-width="2" fill="none"/>
      <rect x="-14" y="-146" width="28" height="5" fill="#fff" opacity=".9"/>
      <rect x="-68" y="-218" width="136" height="218" fill="none" stroke="#c9b458" stroke-width="12" filter="url(#fGlow)"/>
    </g>`;
  }
  // Avatar de otro usuario (cabeza con visor)
  function avatar(x, y, color, nombre, delay) {
    return `<g class="avatar" style="animation-delay:${delay}s" transform="translate(${x} ${y})">
      <ellipse cx="0" cy="118" rx="38" ry="8" fill="${color}" opacity=".35"/>
      <circle r="34" fill="${color}"/><rect x="-26" y="-10" width="52" height="18" rx="8" fill="#111"/>
      <circle cx="-48" cy="62" r="11" fill="${color}"/><circle cx="48" cy="62" r="11" fill="${color}"/>
      <rect x="-46" y="-74" width="92" height="24" rx="6" fill="#1b1b1b" stroke="${color}"/>
      <text y="-57" text-anchor="middle" font-size="15" fill="${color}" font-weight="bold">${nombre}</text>
    </g>`;
  }

  /* ───────── escenas ───────── */
  const ESCENAS = [
    { dur: 4800, titulo: 'BACKROOMS MR', texto: 'Cómo se juega en Meta Quest 3 · menos de un minuto',
      svg: `${backrooms(1)}
        <rect width="800" height="450" fill="${OSC}" class="cortina"/>
        <g class="titulo" text-anchor="middle">
          <text x="400" y="215" font-size="86" class="glitch g1">BACKROOMS</text>
          <text x="400" y="215" font-size="86" class="glitch g2">BACKROOMS</text>
          <text x="400" y="215" font-size="86" fill="${A}" letter-spacing="6">BACKROOMS</text>
          <rect x="350" y="240" width="100" height="40" rx="6" fill="${A}" class="etiqMR"/>
          <text x="400" y="270" font-size="28" fill="${OSC}" font-weight="bold" class="etiqMR">MR</text>
          <text x="400" y="320" font-size="20" fill="#fff" opacity=".75" class="sub">realidad mixta · manos · multiusuario</text>
        </g>` },

    { dur: 6000, titulo: 'Deja los mandos', texto: 'Aquí se juega con las manos. Antes, activa en el Quest: Configuración → Movimiento → Seguimiento de manos.',
      svg: `${backrooms(0.25)}
        <g class="mando" transform="translate(250 230)">
          <rect x="-46" y="-70" width="92" height="140" rx="40" fill="none" stroke="#999" stroke-width="7"/>
          <ellipse cx="0" cy="-70" rx="70" ry="34" fill="none" stroke="#999" stroke-width="7"/>
          <circle cx="0" cy="-10" r="14" fill="#999"/>
          <path class="tachar" d="M-80 -110 L80 90" stroke="#ff3344" stroke-width="10" stroke-linecap="round"/>
        </g>
        <g class="aparece" style="animation-delay:1.6s">${mano('', 'translate(540 210) scale(1.5)')}</g>
        <g class="aparece" style="animation-delay:2.2s">${mano('', 'translate(660 230) scale(-1.3 1.3)')}</g>
        <text x="600" y="420" text-anchor="middle" font-size="22" fill="${A}" class="aparece" style="animation-delay:2.8s">✋ seguimiento de manos</text>` },

    { dur: 6500, titulo: 'Apunta y pellizca = clic', texto: 'Un rayo sale de tu mano derecha. Junta pulgar e índice para pulsar portales, máquinas y objetos.',
      svg: `${backrooms(0.55)}
        <g transform="translate(190 175)" class="objetivo">
          <circle r="75" fill="url(#gHalo)" class="halo"/>
          <rect x="-42" y="-80" width="84" height="150" rx="6" fill="#2a2a2a" stroke="${A}" stroke-width="4"/>
          <rect x="-30" y="-66" width="60" height="70" fill="#59b8d8" opacity=".7"/>
          <rect x="-30" y="16" width="40" height="10" fill="${A}"/><circle cx="22" cy="40" r="6" fill="#ff5c5c"/>
          <text class="nota" x="40" y="-60" font-size="34" fill="${A}">♪</text>
          <text class="nota n2" x="-10" y="-70" font-size="26" fill="${A}">♫</text>
        </g>
        <line class="rayo" x1="555" y1="262" x2="215" y2="180" stroke-dasharray="6 7"/>
        <circle class="punto" cx="215" cy="180" r="9"/>
        ${mano('pinza', 'translate(620 330) scale(1.55) rotate(-28)')}
        <text x="600" y="430" text-anchor="middle" font-size="20" fill="#00ffff" class="txtPinza">¡clic!</text>` },

    { dur: 7200, titulo: 'Pulsa AR: tu aula y una puerta', texto: 'Ves tu aula real (passthrough). A 1,6 m aparece una puerta, y a través de ella se ven los Backrooms.',
      svg: `<rect width="800" height="450" fill="#1a1a1a"/>
        <g class="aula">
          <rect width="800" height="450" fill="#5c5f63"/>
          <polygon points="0,300 800,300 800,450 0,450" fill="#77797c"/>
          <rect x="230" y="70" width="340" height="140" fill="#e9ecee" stroke="#444" stroke-width="5"/>
          <polygon points="60,330 230,330 210,380 40,380" fill="#8a6d4f"/><polygon points="570,330 740,330 760,380 590,380" fill="#8a6d4f"/>
          <line x1="60" y1="380" x2="60" y2="430" stroke="#555" stroke-width="5"/><line x1="740" y1="380" x2="740" y2="430" stroke="#555" stroke-width="5"/>
          <text x="400" y="150" text-anchor="middle" font-size="22" fill="#888">tu aula (real)</text>
        </g>
        <g class="crecePuerta">${puerta(400, 395, 1.15)}</g>
        <g class="botones">
          <rect x="300" y="170" width="90" height="90" rx="14" fill="#222" stroke="#fff" stroke-width="3"/>
          <text x="345" y="228" text-anchor="middle" font-size="34" fill="#fff" font-weight="bold">VR</text>
          <rect x="410" y="170" width="90" height="90" rx="14" fill="#222" stroke="#fff" stroke-width="3" class="botAR"/>
          <text x="455" y="228" text-anchor="middle" font-size="34" fill="#fff" font-weight="bold">AR</text>
          <circle cx="455" cy="215" r="16" fill="none" stroke="${A}" stroke-width="4" class="toque"/>
        </g>` },

    { dur: 7800, titulo: 'Cruza la puerta andando', texto: 'Dentro, la puerta queda detrás de ti y deja ver tu aula. Crúzala hacia atrás para volver (o pellizca el hueco).',
      svg: `<rect width="800" height="450" fill="#55585c"/>
        <text x="130" y="420" font-size="20" fill="#ccc">AULA (vista desde arriba)</text>
        <g class="mundo">
          <rect x="0" y="0" width="800" height="200" fill="#b09a45"/>
          <g stroke="#8f7d33" stroke-width="2">${Array.from({ length: 21 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="200"/>`).join('')}${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="800" y2="${i * 40}"/>`).join('')}</g>
          <text x="560" y="40" font-size="20" fill="${OSC}" font-weight="bold">BACKROOMS</text>
        </g>
        <rect class="inundar" width="800" height="450" fill="#b09a45"/>
        <g transform="translate(400 200)">
          <rect x="-70" y="-7" width="20" height="14" fill="#c9b458"/><rect x="50" y="-7" width="20" height="14" fill="#c9b458"/>
          <line x1="-50" y1="0" x2="50" y2="0" stroke="${A}" stroke-width="5" stroke-dasharray="8 6" filter="url(#fGlow)"/>
        </g>
        <g class="persona"><circle r="22" fill="#4dd2ff" stroke="#fff" stroke-width="3"/><path d="M-12 -14 L0 -36 L12 -14Z" fill="#fff"/></g>
        <text class="aviso a1" x="400" y="52" text-anchor="middle" font-size="26" fill="${OSC}" font-weight="bold">¡Dentro!</text>
        <text class="aviso a2" x="400" y="330" text-anchor="middle" font-size="26" fill="#fff" font-weight="bold">De vuelta al aula</text>` },

    { dur: 7800, titulo: 'Teletransporte con la mano izquierda', texto: 'Pellizca apuntando al suelo, mantén y suelta. Anillo verde: vale. Rojo: hay una pared.',
      svg: `${backrooms(1)}
        <rect x="610" y="120" width="190" height="230" fill="#a08c3c" stroke="#6b5a2a" stroke-width="3"/>
        <path class="arco ok" d="M190 300 Q330 150 430 365" fill="none" stroke="#33ff99" stroke-width="5" stroke-dasharray="10 8"/>
        <ellipse class="anillo ok" cx="430" cy="372" rx="60" ry="16" fill="none" stroke="#33ff99" stroke-width="7"/>
        <path class="arco mal" d="M190 300 Q420 120 640 250" fill="none" stroke="#ff3344" stroke-width="5" stroke-dasharray="10 8"/>
        <g class="anillo mal" transform="translate(640 252)"><ellipse rx="44" ry="44" fill="none" stroke="#ff3344" stroke-width="7"/>
          <path d="M-18 -18 L18 18 M18 -18 L-18 18" stroke="#ff3344" stroke-width="7" stroke-linecap="round"/></g>
        <rect class="whoosh" width="800" height="450" fill="#fff"/>
        ${mano('pinzaLarga', 'translate(150 360) scale(-1.4 1.4) rotate(-20)')}` },

    { dur: 7500, titulo: 'Mira tu palma izquierda: menú', texto: 'Aparece un menú en la muñeca. Tócalo con el índice derecho: volver al aula, ir al hub, girar 45°…',
      svg: `${backrooms(0.35)}
        <g class="giraPalma">${mano('', 'translate(300 300) scale(-1.7 1.7)')}</g>
        <g class="menu" transform="translate(300 125)">
          <rect x="-110" y="-95" width="220" height="190" rx="12" fill="${OSC}" opacity=".85"/>
          <g class="boton b1"><rect x="-95" y="-82" width="190" height="38" rx="8" fill="#1b1b1b" stroke="${A}" stroke-width="2"/><text y="-56" text-anchor="middle" font-size="18" fill="${A}">🚪 Volver al aula</text></g>
          <g><rect x="-95" y="-36" width="190" height="38" rx="8" fill="#1b1b1b" stroke="${A}" stroke-width="2"/><text y="-10" text-anchor="middle" font-size="18" fill="${A}">🏠 Ir al hub</text></g>
          <g><rect x="-95" y="10" width="90" height="38" rx="8" fill="#1b1b1b" stroke="${A}" stroke-width="2"/><text x="-50" y="36" text-anchor="middle" font-size="18" fill="${A}">⟲ 45°</text></g>
          <g><rect x="5" y="10" width="90" height="38" rx="8" fill="#1b1b1b" stroke="${A}" stroke-width="2"/><text x="50" y="36" text-anchor="middle" font-size="18" fill="${A}">45° ⟳</text></g>
          <text y="78" text-anchor="middle" font-size="15" fill="#ccc">👥 3 · sala 1DAM</text>
        </g>
        <g class="dedoToca">${mano('', 'translate(560 330) scale(1.5) rotate(-50)')}</g>` },

    { dur: 7500, titulo: 'Jugad juntos', texto: 'Misma dirección y misma sala = os veis. En el aula, colocad la puerta desde la misma marca del suelo.',
      svg: `${backrooms(0.8)}
        <g class="red"><line x1="200" y1="230" x2="400" y2="190"/><line x1="400" y1="190" x2="600" y2="240"/><line x1="200" y1="230" x2="600" y2="240"/></g>
        ${avatar(200, 230, '#ff5c5c', 'Lucía', 0)}${avatar(400, 190, '#4dd2ff', 'Carlos', 0.5)}${avatar(600, 240, '#7dff6b', 'Marcos', 1)}
        <g transform="translate(400 50)">
          <rect x="-330" y="-24" width="660" height="44" rx="22" fill="#1b1b1b" stroke="${A}" stroke-width="2"/>
          <text x="-310" y="6" font-size="18" fill="#ccc" font-family="monospace">…/Backrooms-MR-Quest3/<tspan fill="${A}" class="escribe">?sala=1DAM&amp;nombre=Lucía</tspan></text>
        </g>` },

    { dur: 0, titulo: '¡A explorar!', texto: 'Pulsa ENTRAR y después AR (realidad mixta) o VR (inmersivo).',
      svg: `${backrooms(1)}
        <circle cx="400" cy="250" r="230" fill="url(#gHalo)" class="halo"/>
        <g class="crecePuerta rapida">${puerta(400, 400, 1.3)}</g>` }
  ];

  /* Duración de cada locución (ms). Si se regeneran los mp3, actualizar. */
  const VOZ = [5690, 7650, 6660, 7390, 5670, 8070, 5690, 6660, 4130];
  // Un único reproductor: una vez desbloqueado con un toque, sirve para
  // todas las escenas (iPhone/iPad exigen esto; en el Quest también va bien).
  const VERSION_AUDIO = 4;
  const urlVoz = (i) => 'audio/tutorial/escena' + i + '.mp3?v=' + VERSION_AUDIO;
  const voz = new Audio(); voz.preload = 'auto';
  window.__vozTutorial = voz;
  ESCENAS.forEach((_, i) => { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = urlVoz(i); document.head.appendChild(l); });
  const audios = ESCENAS.map(() => voz);   // compatibilidad con el resto del código
  let conVoz = true;
  ESCENAS.forEach((e) => { e.anim = e.dur; });
  // Con voz, la escena dura lo que la locución (+ un respiro) y la animación se ralentiza a la par
  const duracion = (i) => { const e = ESCENAS[i]; if (!e.anim) return 0; return conVoz ? Math.max(e.anim, VOZ[i] + 900) : e.anim; };
  /* Música de fondo original (audio/tutorial/musica_fondo.mp3, bucle de 64 s
     compuesto para el proyecto). Baja sola mientras habla la voz. */
  const musica = new Audio('audio/tutorial/musica_fondo.mp3?v=' + VERSION_AUDIO);
  musica.loop = true; musica.preload = 'auto'; musica.volume = 0;
  window.__musicaTutorial = musica;
  let conMusica = true, volObjetivo = 0, fundidoMus = null;
  const VOL_MUSICA = 0.38, VOL_BAJO_VOZ = 0.14;
  function fundirMusica(v, ms) {
    volObjetivo = v; clearInterval(fundidoMus);
    const ini = musica.volume, t0 = performance.now(); ms = ms || 600;
    fundidoMus = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      musica.volume = Math.max(0, Math.min(1, ini + (volObjetivo - ini) * k));
      if (k >= 1) { clearInterval(fundidoMus); if (volObjetivo === 0) musica.pause(); }
    }, 40);
  }
  function sonarMusica() {
    if (!conMusica) return;
    if (musica.paused) musica.play().catch(() => {});
    fundirMusica(conVoz && !voz.paused ? VOL_BAJO_VOZ : VOL_MUSICA, 900);
  }
  voz.addEventListener('play', () => { if (conMusica && !musica.paused) fundirMusica(VOL_BAJO_VOZ, 350); });
  ['pause', 'ended'].forEach((ev) => voz.addEventListener(ev, () => { if (conMusica && !musica.paused && !pausado) fundirMusica(VOL_MUSICA, 900); }));

  function callar() { voz.pause(); }
  function hablar(i) {
    voz.pause();
    if (!conVoz) return;
    voz.src = urlVoz(i);
    voz.play().catch((e) => console.warn('[tutorial] el audio no pudo sonar:', e && e.message));
  }

  /* ───────── estilos ───────── */
  const CSS = `
  #intro{position:fixed;inset:0;z-index:10050;background:${OSC};color:#fff;font-family:sans-serif;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;transition:opacity .6s}
  #intro.fuera{opacity:0;pointer-events:none}
  #intro .escenario{width:min(94vw,calc((100vh - 190px)*16/9));aspect-ratio:16/9;border:1px solid #3a3420;border-radius:8px;overflow:hidden;
    box-shadow:0 0 60px #f0e68c22;background:#000}
  #intro svg{width:100%;height:100%;display:block;font-family:sans-serif}
  #intro .rotulo{text-align:center;max-width:min(94vw,820px);min-height:86px}
  #intro h2{margin:0 0 6px;color:${A};letter-spacing:.08em;font-size:clamp(20px,3vw,30px);text-transform:uppercase}
  #intro p{margin:0;opacity:.8;font-size:clamp(14px,1.8vw,18px);line-height:1.45}
  #intro .rotulo.nuevo h2,#intro .rotulo.nuevo p{animation:subeTxt .6s both}#intro .rotulo.nuevo p{animation-delay:.12s}
  @keyframes subeTxt{from{opacity:0;transform:translateY(12px)}}
  #intro .controles{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
  #intro button{background:transparent;color:${A};border:1px solid ${A};border-radius:6px;padding:10px 16px;font-size:15px;cursor:pointer}
  #intro button:hover{background:#f0e68c22}
  #intro button.grande{font-size:18px;padding:12px 30px;background:${A};color:${OSC};font-weight:bold}
  #intro .puntos{display:flex;gap:7px;margin:0 6px}
  #intro .puntos i{width:26px;height:6px;border-radius:3px;background:#444;cursor:pointer;overflow:hidden;position:relative}
  #intro .puntos i.hecho{background:${A}}
  #intro .puntos i.actual b{position:absolute;inset:0;background:${A};transform-origin:left;animation:barra linear both}
  #intro.pausa .puntos i.actual b,#intro.pausa svg *{animation-play-state:paused!important}
  @keyframes barra{from{transform:scaleX(0)}to{transform:scaleX(1)}}

  /* piezas */
  #intro .mano .palma{fill:#f0e68c22;stroke:${A};stroke-width:5}
  #intro .mano .dedo{fill:none;stroke:${A};stroke-width:13;stroke-linecap:round}
  #intro .mano .chispa{fill:#00ffff;opacity:0}
  #intro .moqueta line{stroke:#00000022;stroke-width:2}
  #intro .luz{fill:#fffbe0;animation:parpadeo 3.1s infinite}
  @keyframes parpadeo{0%,100%{opacity:.95}46%{opacity:.95}48%{opacity:.3}50%{opacity:.9}52%{opacity:.4}54%{opacity:.95}}
  #intro .aparece{opacity:0;animation:aparece .7s both}
  @keyframes aparece{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
  #intro .halo{animation:latido 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes latido{50%{transform:scale(1.15);opacity:.7}}

  /* 0 · título */
  #intro .cortina{animation:cortina 1.4s .2s both}
  @keyframes cortina{to{opacity:.55}}
  #intro .glitch{font-weight:bold;letter-spacing:6px;opacity:.7}
  #intro .g1{fill:#ff3344;animation:gl1 2.2s infinite steps(1)}#intro .g2{fill:#00ffff;animation:gl2 2.2s infinite steps(1)}
  @keyframes gl1{0%,100%{transform:translate(0,0)}8%{transform:translate(-5px,2px)}10%{transform:translate(4px,-2px)}12%{transform:translate(0,0)}60%{transform:translate(3px,1px)}62%{transform:translate(0,0)}}
  @keyframes gl2{0%,100%{transform:translate(0,0)}8%{transform:translate(5px,-2px)}10%{transform:translate(-4px,2px)}12%{transform:translate(0,0)}60%{transform:translate(-3px,-1px)}62%{transform:translate(0,0)}}
  #intro .titulo{animation:aparece 1s .3s both}
  #intro .etiqMR{animation:pop .5s 1.3s both;transform-box:fill-box;transform-origin:center}
  #intro .sub{animation:aparece .8s 1.9s both}
  @keyframes pop{0%{opacity:0;transform:scale(.3)}70%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}

  /* 1 · mandos fuera */
  #intro .mando{animation:fueraMando 1s 1.2s both}
  @keyframes fueraMando{to{opacity:.25;transform:translate(250px,270px) scale(.85)}}
  #intro .tachar{stroke-dasharray:260;stroke-dashoffset:260;animation:trazo .5s .7s forwards}
  @keyframes trazo{to{stroke-dashoffset:0}}

  /* 2 · pellizco */
  #intro .rayo{stroke:#fff;stroke-width:4;opacity:0;animation:rayo 6.5s both}
  @keyframes rayo{0%,8%{opacity:0}18%{opacity:.85;stroke:#fff}38%{stroke:${A}}44%,62%{stroke:#00ffff;opacity:1}72%,100%{stroke:${A};opacity:.85}}
  #intro .punto{fill:${A};opacity:0;animation:punto 6.5s both}
  @keyframes punto{0%,15%{opacity:0}22%,100%{opacity:1}44%,62%{fill:#00ffff}}
  #intro .pinza .idx{animation:idx 6.5s both}#intro .pinza .pul{animation:pul 6.5s both}#intro .pinza .chispa{animation:chispa 6.5s both}
  @keyframes idx{0%,38%{d:path("M-24 10 Q-30 -40 -32 -78")}46%,60%{d:path("M-24 10 Q-46 -46 -64 -40")}70%,100%{d:path("M-24 10 Q-30 -40 -32 -78")}}
  @keyframes pul{0%,38%{d:path("M-40 52 Q-72 36 -84 -2")}46%,60%{d:path("M-40 52 Q-72 12 -64 -34")}70%,100%{d:path("M-40 52 Q-72 36 -84 -2")}}
  @keyframes chispa{0%,44%{opacity:0;r:4px}48%{opacity:1;r:18px}60%{opacity:0;r:26px}100%{opacity:0}}
  #intro .objetivo>rect:first-of-type{animation:none}
  #intro .objetivo .halo{animation:haloClic 6.5s both}
  @keyframes haloClic{0%,44%{opacity:.2}50%{opacity:1;transform:scale(1.5)}100%{opacity:.6;transform:scale(1)}}
  #intro .nota{opacity:0;animation:nota 6.5s both}#intro .nota.n2{animation-delay:.3s}
  @keyframes nota{0%,48%{opacity:0;transform:translateY(0)}60%{opacity:1}100%{opacity:0;transform:translateY(-60px)}}
  #intro .txtPinza{opacity:0;animation:nota 6.5s both}

  /* 3 · AR + puerta */
  #intro .aula{opacity:0;animation:aula 7.2s both}
  @keyframes aula{0%,28%{opacity:0}40%,100%{opacity:1}}
  #intro .botones{animation:botones 7.2s both}
  @keyframes botones{0%{opacity:0}8%,26%{opacity:1}34%,100%{opacity:0}}
  #intro .toque{opacity:0;animation:toque 7.2s both;transform-box:fill-box;transform-origin:center}
  @keyframes toque{0%,14%{opacity:0;transform:scale(.3)}18%{opacity:1}24%{opacity:0;transform:scale(2.4)}100%{opacity:0}}
  #intro .botAR{animation:botAR 7.2s both}
  @keyframes botAR{0%,16%{fill:#222}18%,30%{fill:#6b5a2a}}
  #intro .crecePuerta{transform-box:fill-box;transform-origin:bottom center;animation:crece 7.2s both}
  #intro .crecePuerta.rapida{animation-duration:2.6s}
  @keyframes crece{0%,42%{opacity:0;transform:scaleY(0)}56%{opacity:1;transform:scaleY(1.06)}62%,100%{opacity:1;transform:scaleY(1)}}

  /* 4 · cruzar */
  #intro .persona{animation:persona 7.8s both}
  @keyframes persona{0%{transform:translate(400px,400px)}38%{transform:translate(400px,110px)}50%{transform:translate(400px,110px) rotate(0)}56%{transform:translate(400px,110px) rotate(180deg)}
    60%{transform:translate(400px,110px) rotate(180deg)}92%,100%{transform:translate(400px,390px) rotate(180deg)}}
  #intro .inundar{opacity:0;animation:inundar 7.8s both}
  @keyframes inundar{0%,22%{opacity:0}26%,72%{opacity:.92}76%,100%{opacity:0}}
  #intro .aviso{opacity:0}#intro .a1{animation:av1 7.8s both}#intro .a2{animation:av2 7.8s both}
  @keyframes av1{0%,24%{opacity:0}30%,66%{opacity:1}70%,100%{opacity:0}}
  @keyframes av2{0%,76%{opacity:0}82%,100%{opacity:1}}

  /* 5 · teletransporte */
  #intro .pinzaLarga .idx{animation:idxL 7.8s both}#intro .pinzaLarga .pul{animation:pulL 7.8s both}
  @keyframes idxL{0%,8%{d:path("M-24 10 Q-30 -40 -32 -78")}14%,42%{d:path("M-24 10 Q-46 -46 -64 -40")}48%,60%{d:path("M-24 10 Q-30 -40 -32 -78")}66%,92%{d:path("M-24 10 Q-46 -46 -64 -40")}98%,100%{d:path("M-24 10 Q-30 -40 -32 -78")}}
  @keyframes pulL{0%,8%{d:path("M-40 52 Q-72 36 -84 -2")}14%,42%{d:path("M-40 52 Q-72 12 -64 -34")}48%,60%{d:path("M-40 52 Q-72 36 -84 -2")}66%,92%{d:path("M-40 52 Q-72 12 -64 -34")}98%,100%{d:path("M-40 52 Q-72 36 -84 -2")}}
  #intro .arco,#intro .anillo{opacity:0}
  #intro .arco.ok,#intro .anillo.ok{animation:okA 7.8s both}
  #intro .arco.mal,#intro .anillo.mal{animation:malA 7.8s both}
  @keyframes okA{0%,13%{opacity:0}18%,42%{opacity:1}45%,100%{opacity:0}}
  @keyframes malA{0%,64%{opacity:0}70%,92%{opacity:1}96%,100%{opacity:0}}
  #intro .anillo.ok{transform-box:fill-box;transform-origin:center}
  #intro .whoosh{opacity:0;animation:whoosh 7.8s both}
  @keyframes whoosh{0%,43%{opacity:0}46%{opacity:.85}56%,100%{opacity:0}}

  /* 6 · menú */
  #intro .giraPalma{transform-box:fill-box;transform-origin:center;animation:giraPalma 7.5s both}
  @keyframes giraPalma{0%{transform:scaleX(.08);opacity:.4}18%,100%{transform:scaleX(1);opacity:1}}
  #intro .menu{opacity:0;animation:menu 7.5s both}
  @keyframes menu{0%,20%{opacity:0;transform:translate(300px,165px) scale(.6)}30%,100%{opacity:1;transform:translate(300px,125px) scale(1)}}
  #intro .dedoToca{animation:dedoToca 7.5s both}
  @keyframes dedoToca{0%,36%{transform:translate(120px,80px);opacity:0}44%{opacity:1}62%,74%{transform:translate(-30px,-170px)}86%,100%{transform:translate(60px,20px);opacity:.6}}
  #intro .boton.b1 rect{animation:pulsado 7.5s both}
  @keyframes pulsado{0%,60%{fill:#1b1b1b}63%,76%{fill:#6b5a2a}80%,100%{fill:#1b1b1b}}

  /* 7 · multiusuario */
  #intro .avatar{animation:flota 2.4s ease-in-out infinite alternate}
  @keyframes flota{from{translate:0 -6px}to{translate:0 8px}}
  #intro .red line{stroke:${A};stroke-width:3;stroke-dasharray:6 10;animation:red 1s linear infinite;opacity:.7}
  @keyframes red{to{stroke-dashoffset:-32}}
  #intro .escribe{animation:escribe 3s 1s steps(22) both}
  @keyframes escribe{from{opacity:0}5%{opacity:1}}

  /* final */
  #intro.portada .controles{visibility:hidden}
  #intro .final-acciones{display:flex;gap:12px;justify-content:center;margin-top:10px}
  `;

  /* ───────── montaje ───────── */
  let raiz, escenario, rotulo, puntos, btnPausa, idx = 0, temporizador = null, pausado = false, restante = 0, inicio = 0;

  function construir() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    raiz = document.createElement('div'); raiz.id = 'intro'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-label', 'Tutorial animado');
    raiz.innerHTML = `
      <div class="escenario"></div>
      <div class="rotulo"></div>
      <div class="controles">
        <button data-a="ant" aria-label="Anterior">◀</button>
        <button data-a="pausa" aria-label="Pausa">❚❚</button>
        <span class="puntos">${ESCENAS.map((_, i) => `<i data-i="${i}"><b></b></i>`).join('')}</span>
        <button data-a="sig" aria-label="Siguiente">▶</button>
        <button data-a="voz" aria-label="Voz">🔊</button>
        <button data-a="musica" aria-label="Música">🎵</button>
        <button data-a="saltar">Saltar ▸▸</button>
      </div>`;
    document.body.appendChild(raiz);
    escenario = raiz.querySelector('.escenario'); rotulo = raiz.querySelector('.rotulo'); puntos = raiz.querySelectorAll('.puntos i');
    btnPausa = raiz.querySelector('[data-a="pausa"]');
    raiz.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a],[data-i]'); if (!b) return;
      if (b.dataset.i !== undefined) return mostrar(+b.dataset.i);
      ({ ant: () => mostrar(Math.max(0, idx - 1)), sig: () => mostrar(idx + 1), pausa: alternarPausa, saltar: cerrar, empezar: cerrar,
         repetir: () => mostrar(0), voz: alternarVoz, musica: alternarMusica, comenzar: () => { raiz.classList.remove('portada'); mostrar(0); } })[b.dataset.a]();
    });
    document.addEventListener('keydown', teclas);
  }

  function teclas(e) {
    if (!raiz || raiz.classList.contains('fuera')) return;
    if (e.key === 'ArrowRight') mostrar(idx + 1);
    else if (e.key === 'ArrowLeft') mostrar(Math.max(0, idx - 1));
    else if (e.key === ' ') { e.preventDefault(); alternarPausa(); }
    else if (e.key === 'Escape') cerrar();
  }

  function programar(ms) {
    clearTimeout(temporizador);
    if (!ms) return;
    restante = ms; inicio = performance.now();
    temporizador = setTimeout(() => mostrar(idx + 1), ms);
  }

  function alternarPausa() {
    pausado = !pausado;
    raiz.classList.toggle('pausa', pausado);
    btnPausa.textContent = pausado ? '▶︎' : '❚❚';
    if (pausado) { clearTimeout(temporizador); restante -= performance.now() - inicio; callar(); if (!musica.paused) fundirMusica(0, 300); }
    else {
      sonarMusica();
      if (duracion(idx)) programar(Math.max(300, restante));
      if (conVoz && !voz.ended && voz.src) voz.play().catch(() => {});
    }
  }

  function alternarMusica() {
    conMusica = !conMusica;
    const b = raiz.querySelector('[data-a="musica"]');
    b.textContent = '🎵'; b.style.opacity = conMusica ? '1' : '.4'; b.style.textDecoration = conMusica ? '' : 'line-through';
    if (conMusica) sonarMusica(); else fundirMusica(0, 400);
  }

  function alternarVoz() {
    conVoz = !conVoz;
    raiz.querySelector('[data-a="voz"]').textContent = conVoz ? '🔊' : '🔇';
    if (!conVoz) callar(); else if (!pausado) hablar(idx);
  }

  function mostrar(i) {
    if (i >= ESCENAS.length) return cerrar();
    idx = i;
    const e = ESCENAS[i];
    escenario.innerHTML = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">${DEFS}${e.svg}</svg>`;
    const fin = i === ESCENAS.length - 1;
    rotulo.innerHTML = `<h2>${e.titulo}</h2><p>${e.texto}</p>` +
      (fin ? `<div class="final-acciones"><button class="grande" data-a="empezar">Empezar ▶</button><button data-a="repetir">↺ Ver otra vez</button></div>` : '');
    rotulo.classList.remove('nuevo'); void rotulo.offsetWidth; rotulo.classList.add('nuevo');
    puntos.forEach((p, k) => {
      p.className = k < i ? 'hecho' : (k === i ? 'actual' : '');
      const b = p.querySelector('b'); b.style.animation = 'none'; void b.offsetWidth;
      b.style.animation = (k === i && e.dur) ? `barra ${e.dur}ms linear both` : (k === i ? 'none' : '');
      if (k === i && !e.dur) p.className = 'hecho';
    });
    if (pausado) alternarPausa();
    const d = duracion(i);
    // la barra de progreso y la animación siguen a la locución
    const barra = puntos[i] && puntos[i].querySelector('b');
    if (barra && d) barra.style.animation = `barra ${d}ms linear both`;
    if (d && e.anim && d !== e.anim) {
      const svg = escenario.querySelector('svg');
      requestAnimationFrame(() => svg.getAnimations({ subtree: true }).forEach((a) => {
        const t = a.effect && a.effect.getTiming();
        if (t && t.iterations === 1) a.playbackRate = e.anim / d;
      }));
    }
    hablar(i);
    sonarMusica();
    programar(d);
  }

  function cerrar() {
    clearTimeout(temporizador);
    callar();
    fundirMusica(0, 700);
    marcar();
    raiz.classList.add('fuera');
    setTimeout(() => { raiz.style.display = 'none'; escenario.innerHTML = ''; }, 650);
  }

  // conGesto = el usuario acaba de tocar algo → el audio puede sonar ya.
  // Si no, se muestra una portada con "Empezar con voz" (ese toque desbloquea el audio).
  function abrir(conGesto) {
    if (!raiz) construir();
    raiz.style.display = ''; void raiz.offsetWidth; raiz.classList.remove('fuera');
    pausado = false; raiz.classList.remove('pausa'); btnPausa.textContent = '❚❚';
    if (conGesto === true) { raiz.classList.remove('portada'); return mostrar(0); }
    clearTimeout(temporizador); callar();
    raiz.classList.add('portada');
    idx = 0;
    escenario.innerHTML = `<svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">${DEFS}${ESCENAS[0].svg}</svg>`;
    rotulo.innerHTML = `<h2>Tutorial con voz · 1 minuto</h2><p>Te explico cómo se juega antes de entrar. 🎧 Sube el volumen.</p>
      <div class="final-acciones"><button class="grande" data-a="comenzar">▶ Empezar</button><button data-a="saltar">Saltar</button></div>`;
    rotulo.classList.remove('nuevo'); void rotulo.offsetWidth; rotulo.classList.add('nuevo');
  }
  window.abrirTutorial = abrir;

  document.addEventListener('DOMContentLoaded', () => {
    // Botón para volver a verla desde la pantalla ENTRAR
    const ov = document.getElementById('start-overlay');
    if (ov) {
      const b = document.createElement('button');
      b.textContent = '🎬 Ver tutorial';
      b.style.cssText = 'background:transparent;border:1px solid #f0e68c;color:#f0e68c;border-radius:4px;padding:8px 18px;font-size:.95rem;cursor:pointer;opacity:.85';
      b.addEventListener('click', (e) => { e.stopPropagation(); abrir(true); });
      ov.appendChild(b);
    }
    const forzar = params.get('intro');
    if (forzar === '0' || MR_simulando()) return;
    if (forzar === '1' || !leer()) abrir(false);
  });
  // En la simulación de escritorio (?modo=aula) no se interrumpe
  function MR_simulando() { return params.get('modo') === 'aula'; }
})();
