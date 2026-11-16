# Backrooms MR · Meta Quest 3

Versión de **realidad mixta** del proyecto *Backrooms VR* (IES Carmen de Burgos Seguí), hecha en **A-Frame 1.7.1**.
El proyecto VR original (`EPE-IESCarmen-de-Burgos`) no se ha modificado: esto es un repositorio aparte.

## Qué añade

| | VR original | Esta versión |
|---|---|---|
| Interacción | Mandos: raycaster + gatillo | **Manos**: rayo desde la mano + **pellizco pulgar-índice** (los mandos siguen funcionando) |
| Modo | Solo VR | **AR / realidad mixta** (passthrough) + VR |
| Usuarios | Uno | **Varios a la vez**, sin servidor (WebRTC) |

## Tutorial animado

Al abrir la página por primera vez sale una presentación animada (unos 55 s) que explica la interfaz: manos y pellizco, modo AR y puerta, cruzar, teletransporte, menú de la muñeca y multiusuario. Se puede saltar, pausar y navegar con ◀ ▶. Después solo vuelve a salir con el botón **🎬 Ver tutorial** de la pantalla de inicio.
`?intro=1` la muestra siempre · `?intro=0` no la muestra nunca.
Lleva **locución con voz masculina** en castellano (`audio/tutorial/escena0-8.mp3`, generada con Piper TTS, voz *carlfm*). El botón 🔊/🔇 la quita. De fondo suena una **música original** compuesta para el proyecto (`audio/tutorial/musica_fondo.mp3`, bucle de 64 s: zumbido de fluorescentes, acordes y campanas) que baja sola cuando habla la voz; el botón 🎵 la quita. La primera vez sale una portada con «▶ Empezar», porque el navegador no deja sonar audio sin un toque previo.

## Cómo se usa en el Quest 3

1. Activa el seguimiento de manos en el Quest (*Configuración → Movimiento → Seguimiento de manos*).
2. Abre la página en el navegador del Quest, pulsa **ENTRAR** y después **AR** (o **VR**).
3. En **AR** aparece una **puerta** en tu aula, a 1,6 m delante de ti. A través de ella se ve el World 1.
   - **Cruza la puerta andando** para entrar (o pellizca el hueco).
   - Dentro, la misma puerta queda **detrás de ti** y se ve tu aula real a través de ella. Crúzala hacia atrás para volver.
4. Gestos:
   - **Mano derecha**: apunta y pellizca = clic (portales, máquina expendedora, vallas, etc.).
   - **Mano izquierda**: pellizca sobre un objeto = clic. Pellizca hacia el suelo, mantén y suelta = **teletransporte** (anillo verde = válido, rojo = pared).
   - **Palma izquierda hacia la cara** = menú: volver al aula, mover la puerta, ir al hub y giros de 45°. Se pulsa **tocándolo con el índice derecho**.

## Multiusuario

- Todos los que abran la misma dirección con la misma sala se ven entre sí: cabeza, manos, nombre y en qué mundo está cada uno. También se comparten los interruptores de sonido y de objetos del mundo en el que estéis juntos.
- Parámetros de la URL:
  - `?sala=1DAM` → sala (por defecto `backrooms-iescdb`)
  - `?nombre=Lucia` → nombre que ven los demás
  - `?multi=0` → desactivar el multiusuario
  - Se combinan con `&`: `index.html?sala=1DAM&nombre=Lucia`
- **Aula compartida**: en realidad mixta, las posiciones se envían respecto a la puerta. Para que los avatares coincidan con las personas reales, pegad una **marca en el suelo** y que cada uno coloque la puerta (menú → *Puerta aquí delante*) **desde esa marca, mirando hacia el mismo sitio**.
- Funciona sin servidor propio: los cascos se encuentran mediante relés públicos (Nostr) y luego se conectan directamente. Si la red del centro bloquea WebSockets o WebRTC, no se conectarán (en la esquina del menú aparece `⚪ sin red` o `👥 1`).

## Probar en el ordenador

- `index.html` → igual que la versión VR (WASD + ratón).
- `index.html?modo=aula` → simula el aula: se ve la puerta con la ventana al World 1. Muévete con WASD para cruzarla, o usa los botones del panel.

## Archivos nuevos

- `js/mr-core.js` → realidad mixta, puerta con stencil, manos, teletransporte y menú de muñeca.
- `js/multijugador.js` → avatares y sincronización.
- `js/intro.js` → tutorial animado (SVG + CSS, sin vídeo).
- `lib/trystero.min.js` → librería WebRTC (Trystero 0.27, empaquetada en local).
- `colisiones.js` → igual que el original, pero se desactiva en el aula y se reinicia tras cada salto.
