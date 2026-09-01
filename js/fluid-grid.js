/* ============================================================
   FluidGrid — fondo interactivo de la página Portfolio.
   Inspirado en la lógica visual de haoqi.design (sin copiar su
   código): base marfil, microtrama fina, guías estructurales
   con cruces técnicos y deformación local con estela.

   Adaptado a la identidad del sitio: la trama fina son PUNTOS,
   los mismos puntos de la esfera y de la extrusión. Al acercar
   el cursor, los puntos deformados toman el degradado de marca
   definido en PARTICLE_CONFIG.colors, de modo que el fondo y
   las figuras 3D comparten el mismo lenguaje de partículas.

   - Deformación local de la trama al mover el cursor.
   - Estela corta con inercia y disipación suave (cascada).
   - Parallax: todo el fondo se desplaza un poco con el ratón.
   - Fallback estático cuando WebGL2 no está disponible.
   - Respeta prefers-reduced-motion.
   ============================================================ */
(function () {
    'use strict';

    /* Valores recomendados de producción (ver README-instrucciones). */
    var SETTINGS = {
        base: [0.941, 0.945, 0.980],     /* lavanda claro #F0F1FA */
        ink: [0.055, 0.043, 0.086],      /* tinta #0E0B16 */
        finePeriod: 4,                   /* microtrama 4 x 4 px (CSS) */
        dotRadius: 0.85,                 /* radio de cada punto (CSS px) */
        dotAlpha: 0.12,                  /* opacidad base del punto */
        sparseRatio: 0.02,               /* % de puntos con color de marca */
        sparseAlpha: 0.30,
        haloAlpha: 0.90,                 /* opacidad del punto deformado */
        radius: 160,                     /* radio del área afectada (CSS px) */
        strength: 16,                    /* desplazamiento máximo (CSS px) */
        trail: 10,                       /* puntos de la estela */
        inertia: 0.16,                   /* velocidad de seguimiento (0-1) */
        parallax: 22,                    /* recorrido total del fondo (CSS px) */
        parallaxEase: 0.05,
        guideLineAlpha: 0.10,            /* opacidad de la retícula grande */
        guideCrossAlpha: 0.32,
        guideCrossArm: 9,                /* brazo del cruce técnico (CSS px) */
        maxDpr: 1.5,
        idleMs: 1200                     /* pausa de dibujo sin actividad */
    };

    /* Colores de marca: los mismos que la esfera y la extrusión. */
    function brandColors() {
        var fallback = ['#ff3d8a', '#e84df2', '#c05cff', '#b18cff'];
        var list = window.PARTICLE_CONFIG &&
            Array.isArray(window.PARTICLE_CONFIG.colors) &&
            window.PARTICLE_CONFIG.colors.length >= 2 ?
            window.PARTICLE_CONFIG.colors : fallback;
        return list.map(function (hex) {
            var n = parseInt(String(hex).slice(1), 16);
            return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255,
                (n & 255) / 255];
        });
    }

    var VERT = [
        '#version 300 es',
        'layout(location=0) in vec2 aPos;',
        'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
    ].join('\n');

    var FRAG = [
        '#version 300 es',
        'precision highp float;',
        'uniform vec2 uRes;',
        'uniform float uDpr;',
        'uniform vec2 uParallax;',
        'uniform vec2 uGuide;',
        'uniform vec2 uTrail[' + SETTINGS.trail + '];',
        'uniform vec3 uBase;',
        'uniform vec3 uInk;',
        'uniform vec3 uBrand[4];',
        'out vec4 outColor;',
        '',
        'vec3 brand(float t){',
        '    t = clamp(t, 0.0, 1.0);',
        '    if (t < 0.33333) return mix(uBrand[0], uBrand[1], t * 3.0);',
        '    if (t < 0.66667)',
        '        return mix(uBrand[1], uBrand[2], (t - 0.33333) * 3.0);',
        '    return mix(uBrand[2], uBrand[3], (t - 0.66667) * 3.0);',
        '}',
        '',
        'void main(){',
        '    vec2 frag = gl_FragCoord.xy;',
        '    vec2 pw = frag - uParallax;',
        '',
        '    /* Deformación local: estela en cascada con inercia. */',
        '    float R = ' + SETTINGS.radius.toFixed(1) + ' * uDpr;',
        '    float S = ' + SETTINGS.strength.toFixed(1) + ' * uDpr;',
        '    vec2 def = vec2(0.0);',
        '    float wsum = 0.0;',
        '    for (int i = 0; i < ' + SETTINGS.trail + '; i++) {',
        '        float w = pow(0.72, float(i));',
        '        vec2 d = pw - uTrail[i];',
        '        float dist = length(d);',
        '        float f = 1.0 - smoothstep(0.0, R, dist);',
        '        if (dist > 0.001) def += (d / dist) * f * w;',
        '        wsum += w;',
        '    }',
        '    def = def / max(wsum, 0.0001) * S;',
        '    float dl = length(def);',
        '    if (dl > S) def *= S / dl;',
        '    float infl = clamp(dl / S, 0.0, 1.0);',
        '',
        '    /* Microtrama fina de PUNTOS (coordenadas deformadas). */',
        '    vec2 pf = pw + def;',
        '    float P = ' + SETTINGS.finePeriod.toFixed(1) + ' * uDpr;',
        '    vec2 cell = floor(pf / P);',
        '    vec2 center = (cell + 0.5) * P;',
        '    float dd = length(pf - center);',
        '    float dotR = ' + SETTINGS.dotRadius.toFixed(2) + ' * uDpr;',
        '    float aa = 0.65 * uDpr;',
        '    float dotA = 1.0 - smoothstep(dotR - aa, dotR + aa, dd);',
        '',
        '    float t = clamp(center.x / uRes.x, 0.0, 1.0);',
        '    vec3 bcol = brand(t);',
        '    float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);',
        '    float sparse = step(' + (1 - SETTINGS.sparseRatio).toFixed(3) + ', h);',
        '',
        '    vec3 dotCol = mix(uInk, bcol, sparse);',
        '    float alpha = mix(' + SETTINGS.dotAlpha.toFixed(2) + ',',
        '        ' + SETTINGS.sparseAlpha.toFixed(2) + ', sparse);',
        '    /* El halo interactivo usa los puntos de marca: la misma',
        '       materia que la esfera y la extrusión. */',
        '    dotCol = mix(dotCol, bcol, infl);',
        '    alpha = mix(alpha, ' + SETTINGS.haloAlpha.toFixed(2) + ', infl);',
        '',
        '    /* Guías estructurales grandes: coordenadas originales,',
        '       así permanecen estables mientras la trama fina se deforma. */',
        '    vec2 pg = frag - uParallax * 0.6;',
        '    vec2 gf = fract(pg / uGuide);',
        '    vec2 gb = (0.5 - abs(gf - 0.5)) * uGuide;',
        '    float lw = 1.0 * uDpr;',
        '    float vline = 1.0 - smoothstep(lw - aa, lw + aa, gb.x);',
        '    float hline = 1.0 - smoothstep(lw - aa, lw + aa, gb.y);',
        '    float guides = max(vline, hline);',
        '',
        '    /* Cruces técnicos en las intersecciones. */',
        '    float arm = ' + SETTINGS.guideCrossArm.toFixed(1) + ' * uDpr;',
        '    float crossV = step(gb.x, lw) * step(gb.y, arm);',
        '    float crossH = step(gb.y, lw) * step(gb.x, arm);',
        '    float crosses = max(crossV, crossH);',
        '',
        '    vec3 col = uBase;',
        '    col = mix(col, uInk, guides * ' + SETTINGS.guideLineAlpha.toFixed(2) + ');',
        '    col = mix(col, uInk, crosses * ' + SETTINGS.guideCrossAlpha.toFixed(2) + ');',
        '    col = mix(col, dotCol, dotA * alpha);',
        '    outColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    function compile(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader) || 'shader');
        }
        return shader;
    }

    function FluidGrid(canvas) {
        this.canvas = canvas;
        this.reduced = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;
        this.dpr = Math.min(window.devicePixelRatio || 1, SETTINGS.maxDpr);

        var gl = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: 'low-power'
        });
        if (!gl) throw new Error('WebGL2 no disponible');
        this.gl = gl;

        var program = gl.createProgram();
        gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program) || 'link');
        }
        gl.useProgram(program);
        this.program = program;

        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        this.u = {
            res: gl.getUniformLocation(program, 'uRes'),
            dpr: gl.getUniformLocation(program, 'uDpr'),
            parallax: gl.getUniformLocation(program, 'uParallax'),
            guide: gl.getUniformLocation(program, 'uGuide'),
            trail: gl.getUniformLocation(program, 'uTrail[0]') ||
                gl.getUniformLocation(program, 'uTrail'),
            base: gl.getUniformLocation(program, 'uBase'),
            ink: gl.getUniformLocation(program, 'uInk'),
            brand: gl.getUniformLocation(program, 'uBrand[0]') ||
                gl.getUniformLocation(program, 'uBrand')
        };
        gl.uniform3fv(this.u.base, SETTINGS.base);
        gl.uniform3fv(this.u.ink, SETTINGS.ink);
        gl.uniform3fv(this.u.brand, brandColors().reduce(function (acc, c) {
            return acc.concat(c[0], c[1], c[2]);
        }, []).slice(0, 12));

        /* Estado del puntero: suavizado + estela en cascada. */
        this.mx = 0; this.my = 0;
        this.smx = 0; this.smy = 0;
        this.trail = new Float32Array(SETTINGS.trail * 2);
        this.px = 0; this.py = 0;      /* parallax actual */
        this.lastMove = 0;
        this.raf = null;
        this.running = false;
        this.lastT = 0;

        this._resize = this.resize.bind(this);
        this._frame = this._frame.bind(this);
        this._onMove = this._onMove.bind(this);

        window.addEventListener('resize', this._resize);
        if (!this.reduced) {
            window.addEventListener('mousemove', this._onMove, {
                passive: true
            });
        }
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._pause();
            else if (this.running && !this.reduced) this._loop();
        });

        this.resize();
        this._center();
        if (this.reduced) this._render(); /* un solo fotograma estático */
    }

    FluidGrid.supported = function () {
        try {
            var test = document.createElement('canvas');
            return Boolean(test.getContext('webgl2'));
        } catch (error) {
            return false;
        }
    };

    FluidGrid.prototype._center = function () {
        var x = this.canvas.width / 2;
        var y = this.canvas.height / 2;
        this.mx = x; this.my = y;
        this.smx = x; this.smy = y;
        for (var i = 0; i < SETTINGS.trail; i++) {
            this.trail[i * 2] = x;
            this.trail[i * 2 + 1] = y;
        }
    };

    FluidGrid.prototype.resize = function () {
        var w = window.innerWidth;
        var h = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, SETTINGS.maxDpr);
        this.canvas.width = Math.round(w * this.dpr);
        this.canvas.height = Math.round(h * this.dpr);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        /* Guías: fracciones de viewport (5 x 4 en PC, 3 x 3 en móvil). */
        var gx = w > 700 ? w / 5 : w / 3;
        var gy = h > 700 ? h / 4 : h / 3;
        this.gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.u.dpr, this.dpr);
        this.gl.uniform2f(this.u.guide, gx * this.dpr, gy * this.dpr);

        this._center();
        if (this.reduced || !this.running) this._render();
    };

    FluidGrid.prototype._onMove = function (event) {
        this.mx = event.clientX * this.dpr;
        /* gl_FragCoord tiene el eje Y hacia arriba. */
        this.my = this.canvas.height - event.clientY * this.dpr;
        this.lastMove = performance.now();
        if (this.running && !this.raf && !document.hidden) this._loop();
    };

    FluidGrid.prototype._frame = function (now) {
        this.raf = null;
        var dt = Math.min(64, now - (this.lastT || now)) / 16.667;
        this.lastT = now;
        var k = 1 - Math.pow(1 - SETTINGS.inertia, dt);
        var kp = 1 - Math.pow(1 - SETTINGS.parallaxEase, dt);

        /* Posición suavizada y estela en cascada (cada punto sigue al
           anterior con algo menos de velocidad: inercia + disipación). */
        this.smx += (this.mx - this.smx) * k;
        this.smy += (this.my - this.smy) * k;
        var prevX = this.smx;
        var prevY = this.smy;
        var ki = k;
        for (var i = 0; i < SETTINGS.trail; i++) {
            var ix = i * 2;
            this.trail[ix] += (prevX - this.trail[ix]) * ki;
            this.trail[ix + 1] += (prevY - this.trail[ix + 1]) * ki;
            prevX = this.trail[ix];
            prevY = this.trail[ix + 1];
            ki *= 0.86;
        }

        /* Parallax: mover el ratón a un lado desplaza un poco el fondo. */
        var tx = (this.mx / this.canvas.width - 0.5) *
            SETTINGS.parallax * this.dpr;
        var ty = (this.my / this.canvas.height - 0.5) *
            SETTINGS.parallax * this.dpr;
        this.px += (tx - this.px) * kp;
        this.py += (ty - this.py) * kp;

        /* Reposo: sin movimiento reciente y todo asentado → no redibujar. */
        var settled =
            Math.abs(this.mx - this.smx) < 0.05 &&
            Math.abs(this.my - this.smy) < 0.05 &&
            Math.abs(tx - this.px) < 0.05 &&
            Math.abs(ty - this.py) < 0.05;
        if (!(settled && now - this.lastMove > SETTINGS.idleMs)) {
            this._render();
        }

        if (this.running && !document.hidden) this._loop();
    };

    FluidGrid.prototype._render = function () {
        var gl = this.gl;
        gl.uniform2fv(this.u.trail, this.trail);
        gl.uniform2f(this.u.parallax, this.px, this.py);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    FluidGrid.prototype._loop = function () {
        if (this.raf) return;
        this.raf = requestAnimationFrame(this._frame);
    };

    FluidGrid.prototype._pause = function () {
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = null;
        }
    };

    FluidGrid.prototype.start = function () {
        if (this.running) return;
        this.running = true;
        if (!this.reduced) this._loop();
    };

    FluidGrid.prototype.stop = function () {
        this.running = false;
        this._pause();
    };

    window.FluidGrid = FluidGrid;
})();
