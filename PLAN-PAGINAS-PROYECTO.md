# Plan completo — páginas de proyecto del Portfolio

## Objetivo

Construir una sola plantilla reutilizable para todos los trabajos del Portfolio,
inspirada en la página de referencia y adaptada al ancho `.box` del sitio.
La demostración inicial usa el proyecto autorizado:
`https://vimeo.com/849088364`.

## Alcance exacto

### 1. Entrada desde el Portfolio

- Mantener la cuadrícula y los filtros actuales.
- Mostrar la portada del proyecto en el formato vertical existente.
- Convertir toda la tarjeta en el acceso a la página del proyecto.
- Guardar posición y filtro activos antes de navegar.
- Registrar las medidas de la tarjeta para que la página de detalle nazca desde
  esa posición con una animación de escalado.

### 2. Plantilla reutilizable de proyecto

- Usar `project.html?id=<id>` para todos los trabajos.
- Mantener el fondo oscuro y las partículas del sitio.
- Usar un solo contenedor claro con:
  - hero o portada;
  - botón de cierre;
  - título, descripción y enlace del caso;
  - datos del proyecto;
  - galería alternada;
  - siguiente proyecto.
- Respetar siempre el ancho `.box`: 50%, 70% y 80% según los breakpoints
  existentes.

### 3. Animaciones

- Entrada del contenedor mediante escalado desde la tarjeta pulsada.
- Aparición del encabezado después del hero.
- Revelado individual de las imágenes al entrar en pantalla:
  opacidad, desplazamiento, recorte y escala.
- Desactivar las animaciones no esenciales con `prefers-reduced-motion`.

### 4. Reproductor

- No cargar Vimeo durante la carga inicial de la página.
- Mostrar primero una portada ligera.
- Al pulsar la portada, crear un reproductor fijo a pantalla completa.
- Cargar la API oficial de Vimeo únicamente en ese momento.
- Añadir controles propios:
  - reproducir y pausar;
  - silenciar y activar sonido;
  - progreso y búsqueda;
  - tiempo;
  - pantalla completa;
  - cierre.
- Permitir cerrar con `Escape`, bloquear el scroll mientras está abierto y
  devolver el foco al botón que lo abrió.

### 5. Galería y siguiente proyecto

- Dos columnas alternadas en escritorio y una en móvil.
- Aceptar imágenes y pies de foto desde `data/content.json`.
- Añadir una sección de siguiente proyecto con imagen, etiquetas, título y
  progreso de scroll.
- Mantener navegación circular según el orden del contenido.

### 6. Proyecto de demostración

- Añadir “Codificación Industrial” al comienzo del Portfolio.
- Usar el Vimeo `849088364`.
- Usar su portada oficial adaptada por CSS al formato vertical.
- Añadir tres imágenes creativas temporales del caso para comprobar el diseño y
  las animaciones.
- Dejar todos estos campos editables desde el panel administrativo.

## Archivos que se modifican

- `portfolio.html`
- `css/portfolio.css`
- `js/portfolio.js`
- `project.html`
- `css/project.css`
- `js/project.js`
- `data/content.json`
- `admin/config.yml`
- `scripts/build-static.mjs` (solo verificación; ya incluye la entrada)
- `assets/projects/codificacion-industrial-01.svg`
- `assets/projects/codificacion-industrial-02.svg`
- `assets/projects/codificacion-industrial-03.svg`

## Verificación obligatoria

- Portfolio sin iframe inicial.
- Página de proyecto sin iframe inicial.
- Vimeo creado únicamente después del clic.
- Animación de escalado desde una tarjeta.
- Imágenes reveladas de forma individual al hacer scroll.
- Cierre por botón y por `Escape`.
- Regreso al filtro y posición anteriores.
- Diseño correcto a 1280 × 720 y 390 × 844.
- `npm run build` finaliza correctamente y crea `dist/js/project.bundle.js`.
- Sin errores de consola en la carga inicial, reproducción y cierre.
