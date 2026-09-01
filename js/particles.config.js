/* ============================================================
   CONTROL CENTRAL DE PARTICULAS
   ------------------------------------------------------------
   Este es el unico archivo que hay que tocar para cambiar:
   - tamano y posicion en PC o movil
   - cantidad de puntos y limite de FPS
   - forma de cada escena
   - movimiento, scroll y velocidad de transformacion
   ============================================================ */
(function () {
    'use strict';

    window.PARTICLE_CONFIG = {
        /* Colores del degradado de cada punto. */
        colors: ['#ff3d8a', '#e84df2', '#c05cff', '#b18cff'],

        /* Calidad y tamano por tipo de pantalla.
           detail controla el maximo de puntos:
           PC 72 ~= 6599 puntos; movil 44 ~= 2467 puntos. */
        responsive: {
            breakpoint: 600,
            desktop: {
                /* Igual que la retícula original: 4585 puntos máximos. */
                detail: 72,
                minDetail: 34,
                maxFps: 45,
                morphSeconds: 0.9,
                scale: 1.08,
                dotScale: 0.50,
                insideNearClipScale: 0.50,
                insideMaxProjectionScale: 1.40,
                insideDepthSizePower: 1.08,
                insideDepthAlphaPower: 2.25,
                centerX: 0.5,
                centerY: 0.5
            },
            mobile: {
                detail: 44,
                minDetail: 30,
                maxFps: 30,
                morphSeconds: 0.9,
                /* Zoom móvil: la forma ocupa casi todo el ancho,
                   como en las referencias enviadas. */
                scale: 1.92,
                /* Puntos más finos en móvil, sin reducir su cantidad. */
                dotScale: 0.50,
                /* Cámara interior más limitada para ahorrar dibujo y
                   evitar puntos grandes en pantallas pequeñas. */
                insideNearClipScale: 1.50,
                insideMaxProjectionScale: 0.58,
                insideDepthSizePower: 1,
                insideDepthAlphaPower: 2.40,
                centerX: 0.5,
                centerY: 0.5
            },
            autoLowPower: true,
            lowPowerDetailReduction: 6
        },

        /* Cada nombre es una forma que se puede llamar con:
           siteParticles.setScene('nombre').

           size       = tamano base
           density    = proporcion de puntos visibles (0 a 1)
           dot        = tamano de cada punto
           sceneScale = escala adicional solo para esa forma
           offsetX/Y  = posicion relativa a la pantalla
           distance y perspective = profundidad / cercania
           waves      = deformacion de la esfera en los tres ejes */
        scenes: {
            hero: {
                waves: [
                    { amp: 76.923, freq: 0.879, phase: 0 },
                    { amp: 60, freq: 0.165, phase: 0 },
                    { amp: 50, freq: 0, phase: 0 }
                ],
                size: 250,
                density: 1,
                distance: 1000,
                perspective: 1,
                dot: 1.5,
                sceneScale: 1,
                offsetX: 0,
                offsetY: 0
            },
            text: {
                waves: [
                    { amp: 0, freq: 0, phase: 0 },
                    { amp: 0, freq: 0, phase: 0 },
                    { amp: 35, freq: 10, phase: 0 }
                ],
                size: 220,
                /* La segunda forma conserva toda la retícula para que se
                   lean los anillos circulares desde dentro de la esfera. */
                density: 1,
                distance: 0,
                perspective: 3,
                /* Cámara interior: admite puntos cercanos al plano de
                   proyección sin permitir cuadrados descontrolados. */
                nearClip: 12,
                maxProjectionScale: 12,
                /* Retícula diagonal como una esfera vista desde dentro. */
                insideView: 1,
                dot: 1,
                sceneScale: 1,
                offsetX: 0,
                offsetY: 0
            },
            services: {
                waves: [
                    { amp: 200, freq: 7.692, phase: 6.283 },
                    { amp: 200, freq: 7.912, phase: 6.283 },
                    { amp: 200, freq: 10, phase: 6.283 }
                ],
                size: 220,
                density: 0.72,
                distance: 1000,
                perspective: 1,
                dot: 1.021,
                sceneScale: 1,
                offsetX: 0,
                offsetY: 0
            },
            footer: {
                waves: [
                    { amp: 76.923, freq: 0.879, phase: 0 },
                    { amp: 60, freq: 0.165, phase: 0 },
                    { amp: 50, freq: 0, phase: 0 }
                ],
                size: 220,
                density: 0.82,
                distance: 1000,
                perspective: 1,
                dot: 1.021,
                sceneScale: 1,
                offsetX: 0,
                offsetY: 0
            },
            /* Misma segunda forma de la home, con un movimiento interior
               apenas mayor y exclusivo para la página portfolio. */
            portfolio: {
                waves: [
                    { amp: 0, freq: 0, phase: 0 },
                    { amp: 0, freq: 0, phase: 0 },
                    { amp: 35, freq: 10, phase: 0 }
                ],
                size: 220,
                density: 1,
                distance: 0,
                perspective: 3,
                nearClip: 12,
                maxProjectionScale: 12,
                insideView: 1,
                dot: 1,
                /* Movimiento permanente al 50% para Portfolio y proyectos. */
                insideRotationSpeed: 0.07,
                sceneScale: 1,
                offsetX: 0,
                offsetY: 0
            }
        },

        motion: {
            morphSeconds: 0.9,
            transitionPulse: 0.72,
            transitionExtra: 45,
            wave1Speed: 1.3,
            wave2Speed: 0.8,
            pointerRotationY: 55,
            pointerRotationX: 35,
            pointerRotationZ: 2,
            pointerFollow: 18,
            pointerReturn: 1.7,
            pointerSmooth: 10,
            pointerIdleMs: 700,
            spinFriction: 1.4,
            spinMax: 10,
            pointerImpulse: 0.025,
            pointerImpulseMax: 8,
            scrollImpulse: 0.00035,
            heroReturnImpulse: [1.8, 3.5],
            autoRotationY: 0.12,
            insideRotationSpeed: 0.30,
            autoRotationX: 0.05,
            autoRotationXFrequency: 0.21,
            autoRotationZ: 0.03,
            autoRotationZFrequency: 0.17,
            breathAmount: 0.018,
            breathSpeed: 0.9,
            pointerZoomMax: 0.02,
            scaleDamping: 6
        },

        /* Punto de activacion del scroll: 0 = arriba, 1 = abajo.
           Los selectores indican que marcador llama a cada forma. */
        scroll: {
            /* En móvil, el primer morph no usa un temporizador:
               su progreso está conectado directamente al scroll.
               startViewport/endViewport se miden desde arriba en vh. */
            linkedMorph: {
                desktop: {
                    from: 'hero',
                    to: 'text',
                    startViewport: 0,
                    /* En PC termina cerca de 380 px con una pantalla
                       de 720 px, igual que la referencia analizada. */
                    endViewport: 0.53,
                    /* Respuesta visible desde el primer tramo de scroll. */
                    smoothness: 0.80,
                    pulseScale: 0.22,
                    pulseExtra: 10
                },
                mobile: {
                    from: 'hero',
                    to: 'text',
                    startViewport: 0,
                    endViewport: 0.50,
                    /* 0 = lineal; 1 = curva suave. El valor intermedio
                       responde desde el primer movimiento sin dar saltos. */
                    smoothness: 0.60,
                    /* Expansión extra durante el recorrido. Se mantiene
                       baja para que el primer gesto no produzca un salto. */
                    pulseScale: 0.22,
                    pulseExtra: 10
                }
            },
            /* En móvil la siguiente escena se activa cuando su marcador
               entra por la parte baja de la pantalla. Así la esfera ya
               está expandida cerca de 420 px de scroll, como la original. */
            activationLine: {
                desktop: 0.48,
                mobile: 0.82
            },
            /* El color de fondo cambia después de la explosión.
               En PC conserva exactamente el comportamiento anterior. */
            themeActivationLine: {
                desktop: 0.48,
                mobile: 0.48
            },
            entries: [
                { marker: '#delegato-hero', scene: 'hero', dark: true },
                { marker: '#delegato-clientes', scene: 'text', dark: false },
                { marker: '#delegato-servicios', scene: 'services', dark: false },
                { marker: '#delegato-footer', scene: 'footer', dark: true }
            ]
        },

        pages: {
            homeInitialScene: 'hero',
            /* La página de trabajos conserva exactamente la segunda forma
               de la home: cámara dentro de la retícula esférica 3D. */
            portfolioScene: 'portfolio',
            aboutScene: 'portfolio'
        }
    };
})();
