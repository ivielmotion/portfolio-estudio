# Sonido interactivo — decisión recomendada

**Estado:** documentado, todavía no implementado.

## Opción elegida

- Sin música ambiental.
- Sin Howler, Tone.js ni otras librerías.
- Sin audios remotos o CDN.
- Usar la Web Audio API nativa en un único archivo `js/sound-effects.js`.
- Sonido desactivado por defecto y activado con un control pequeño y explícito.

## Primera versión

1. Un efecto suave de 0,4–0,7 s cuando la esfera empieza a transformarse en
   partículas.
2. Debe sonar una sola vez al cruzar el inicio de la transformación, nunca en
   cada cuadro del scroll.
3. El sonido se genera en el navegador con oscilador, ruido filtrado y volumen
   bajo: cero archivos de audio y cero peticiones nuevas.
4. No añadir sonidos al cursor, al hover ni a todas las acciones.

La esfera actual es visual y tiene `pointer-events: none`; no se añadirá un
sonido de pulsación hasta que exista una interacción real de clic o toque.

## Integración prevista

- `js/particle-scenes.js` detecta una sola vez que el progreso cruza el inicio
  del morph y solicita el sonido.
- `js/sound-effects.js` crea `AudioContext` únicamente después de que el usuario
  active el sonido.
- `scripts/build-static.mjs` incluye ese archivo solo en `home.bundle.js`.
- El módulo no participa en `requestAnimationFrame` ni modifica el motor de
  partículas.

## Límites de rendimiento

- JavaScript nuevo: objetivo máximo de **3 KB sin comprimir**.
- Audio descargado: **0 KB**.
- Peticiones iniciales nuevas: **0**.
- Procesamiento: solo durante el efecto, no durante todo el scroll.

El bundle actual de la home pesa aproximadamente 74,3 KB y el límite del
proyecto es 80 KB. Por eso una librería externa no es adecuada.

Si el sonido sintético no alcanza la calidad deseada, la segunda opción será un
único archivo local comprimido de máximo 30 KB, con carga diferida. No se usará
un enlace externo.
