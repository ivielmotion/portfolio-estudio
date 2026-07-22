# RENDIMIENTO — Regla prioritaria del proyecto

> **La velocidad de la página es la prioridad nº 1.**
> Los dispositivos de los visitantes pueden ser lentos o tener mala conexión.
> Todo cambio futuro debe respetar este documento. Si una mejora hace la página
> más lenta, NO se aplica (o se aplica de forma optimizada).

---

## Presupuesto de velocidad (no superar)

| Concepto | Límite |
|---|---|
| Peso total de la home (HTML+CSS+JS+fuentes) | **< 500 KB** |
| `data/content.json` | **< 20 KB** |
| Cada imagen (logos, portadas) | **< 60 KB** (formato **WebP**) |
| JavaScript total | **< 80 KB** sin comprimir |
| Peticiones en la carga inicial | **< 12** |
| Vídeos / iframes externos | **0** hasta que el usuario haga clic |

## Reglas obligatorias

1. **Sin frameworks ni librerías pesadas** en la página pública (nada de React,
   jQuery, Bootstrap…). El sitio es HTML + CSS + JS vanilla.
2. **Sin base de datos ni APIs en cada visita.** El contenido vive en
   `data/content.json`, un archivo estático que se descarga una vez.
3. **Imágenes siempre optimizadas**: formato WebP, tamaño justo (máx. 1200 px de
   ancho), `loading="lazy"` y `decoding="async"` en todas las nuevas.
4. **Vídeos y embeds externos (Vimeo, etc.) con patrón facade**: solo miniatura
   visible; el `<iframe>` se crea al hacer clic. Nunca en la carga inicial.
5. **Nada de scripts de terceros** (analytics, pixels, chats) sin aprobación
   expresa. Cada uno añade 50-300 KB y bloquea.
6. **Fuentes**: solo las actuales (Fraunces + Lato) con `display=swap`.
   No añadir más familiares ni pesos.
7. **Animaciones**: todo en `requestAnimationFrame` con `deltaTime`; respetar
   `prefers-reduced-motion`; pausar lo que no esté en pantalla.
8. **El panel `/admin` es una ruta separada**: los visitantes nunca lo cargan.
   No enlazar sus recursos desde la página pública.

## Comprobación antes de dar un cambio por bueno

1. Recargar con Ctrl+F5 y comprobar que la página carga igual de rápido.
2. Abrir DevTools → Network: revisar que no aparecen peticiones nuevas
   innecesarias ni archivos grandes.
3. Si se añaden imágenes o secciones, repetir la captura de validación en
   móvil 390 px (dispositivo lento de referencia).

## Decisiones ya tomadas que cumplen esta regla

- CMS git-based (Sveltia) en `/admin`: cero peso en la página pública.
- Contenido en JSON estático (~5 KB) en vez de CMS con API en tiempo real.
- Blob en Canvas 2D propio (~15 KB) en vez de Three.js (~600 KB).
- Canvas sin DPR + degradación progresiva de puntos si el FPS cae.
