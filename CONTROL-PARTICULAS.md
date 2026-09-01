# Control de partículas

Todos los ajustes están en `js/particles.config.js`.

## Fondo de la página Portfolio

Las páginas `portfolio.html` y `project.html` ya no usan la escena
esférica: su fondo es una retícula fluida de puntos (inspirada en
haoqi.design) definida en `js/fluid-grid.js`, objeto `SETTINGS`.
Al ser el mismo fondo en ambas, abrir un proyecto no recarga nada
y la transición es inmediata.

- `finePeriod` y `dotRadius`: tamaño de la microtrama de puntos.
- `radius`, `strength`, `inertia`: deformación al mover el cursor.
- `trail`: longitud de la estela.
- `parallax`: cuánto se desplaza el fondo al mover el ratón a un lado.
- `guideLineAlpha` y `guideCrossAlpha`: guías grandes y cruces.
- Los colores del halo interactivo salen de `PARTICLE_CONFIG.colors`:
  son los mismos puntos de la esfera y de la extrusión.

Sin WebGL2 se muestra un respaldo estático (`.fallback-grid` en
`css/style.css`). Con `prefers-reduced-motion` se dibuja un solo
fotograma, sin animación.

## Nombres que se pueden llamar

| Nombre | Uso |
|---|---|
| `hero` | Esfera de la portada |
| `text` | Puntos abiertos de clientes |
| `services` | Fondo orgánico de servicios |
| `footer` | Esfera final |
| `portfolio` | Fondo abierto permanente del portfolio |

Desde la consola o desde otro archivo:

```js
siteParticles.setScene('hero');
siteParticles.setScene('portfolio');
siteParticles.getStats();
```

## Controles principales

- `responsive.desktop.scale`: tamaño general en PC.
- `responsive.mobile.scale`: tamaño general en móvil.
- `responsive.*.detail`: cantidad máxima de puntos.
- `responsive.*.maxFps`: límite de imágenes por segundo.
- `responsive.*.insideNearClipScale`: profundidad de la cámara interior.
- `responsive.*.insideMaxProjectionScale`: tamaño máximo por perspectiva.
- `responsive.*.insideDepthSizePower`: fuerza del tamaño según profundidad.
- `responsive.*.insideDepthAlphaPower`: fuerza de transparencia según profundidad.
- `scenes.NOMBRE.size`: tamaño de una forma.
- `scenes.NOMBRE.density`: cantidad visible de puntos de esa forma.
- `scenes.NOMBRE.dot`: tamaño de cada punto.
- `scenes.NOMBRE.dotScaleByProfile`: tamaño extra del punto en PC o móvil.
- `scenes.NOMBRE.nearClip`: cercanía de la cámara interior.
- `scenes.NOMBRE.maxProjectionScale`: límite de los puntos más cercanos.
- `scenes.NOMBRE.insideView`: activa la retícula circular vista desde dentro.
- `scenes.portfolio.insideRotationSpeed`: velocidad permanente compartida por Portfolio y proyectos (`0.07` = 50% de la velocidad anterior).
- `scenes.NOMBRE.offsetX` y `offsetY`: posición.
- `scenes.NOMBRE.waves`: deformación de la esfera.
- `motion`: velocidad, giro, respiración, scroll y duración del cambio.
- `scroll.linkedMorph.desktop/mobile.startViewport`: inicio del morph.
- `scroll.linkedMorph.desktop/mobile.endViewport`: distancia donde termina.
- `scroll.linkedMorph.desktop/mobile.smoothness`: respuesta inicial (0 a 1).
- `scroll.linkedMorph.desktop/mobile.pulseScale/pulseExtra`: expansión intermedia.
- `scroll.activationLine.desktop`: momento del cambio en PC.
- `scroll.activationLine.mobile`: momento del cambio en móvil.
- `scroll.themeActivationLine`: momento posterior en que cambia el color.
- `scroll.entries`: relación entre cada parte de la página y su forma.

## Regla de rendimiento

Para hacer una forma más grande, subir `scale` o `size`. No subir `detail`
salvo que sea imprescindible: más tamaño casi no cuesta; más puntos sí.
