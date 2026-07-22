/* ============================================================
   ParticleBlob — motor original de nube de puntos orgánica.
   Canvas 2D + geometría 3D proyectada, fiel a la referencia:
   - anillos latitud-longitud (retícula de separación uniforme)
   - deformación del radio por tres ondas (una por eje)
   - jerarquía de rotación por grupos INDEPENDIENTES:
       autoGroup     → rotación automática permanente
       inertiaGroup  → impulsos (puntero/scroll) con fricción
       pointerGroup  → orientación por cursor (quaternion+slerp)
   - el cursor NUNCA empuja ni deforma puntos: la nube se
     comporta como un único cuerpo tridimensional coherente
   - proyección en perspectiva, alfa cuadrático hacia atrás
   - morfosis entre escenas por scroll + degradado de marca
   ============================================================ */
(function () {
    'use strict';

    /* ---------- utilidades ---------- */
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function hexToRgb(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    /* ---------- quaternions mínimos [x, y, z, w] ---------- */
    const QUAT_ID = [0, 0, 0, 1];
    function quatAxisAngle(x, y, z, ang) {
        const h = ang / 2, s = Math.sin(h);
        return [x * s, y * s, z * s, Math.cos(h)];
    }
    function quatFromEulerYXZ(rx, ry, rz) {
        const cx = Math.cos(rx / 2), sx = Math.sin(rx / 2);
        const cy = Math.cos(ry / 2), sy = Math.sin(ry / 2);
        const cz = Math.cos(rz / 2), sz = Math.sin(rz / 2);
        // q = qY · qX · qZ
        return [
            cy * sx * cz + sy * cx * sz,
            sy * cx * cz - cy * sx * sz,
            cy * cx * sz - sy * sx * cz,
            cy * cx * cz + sy * sx * sz
        ];
    }
    function quatMul(a, b) {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];
        return [
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz
        ];
    }
    // slerp: para pasos pequeños por frame basta nlerp con corrección
    // de hemisferio (evita saltos al cruzar ±PI)
    function quatSlerp(a, b, t) {
        const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        const s = d < 0 ? -1 : 1;
        const x = lerp(a[0], b[0] * s, t);
        const y = lerp(a[1], b[1] * s, t);
        const z = lerp(a[2], b[2] * s, t);
        const w = lerp(a[3], b[3] * s, t);
        const n = Math.hypot(x, y, z, w) || 1;
        return [x / n, y / n, z / n, w / n];
    }
    function quatToMat3(q) {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        return [
            1 - (yy + zz), xy - wz, xz + wy,
            xy + wz, 1 - (xx + zz), yz - wx,
            xz - wy, yz + wx, 1 - (xx + yy)
        ];
    }

    /* Tabla de 256 colores: degradado de marca rosa→magenta→violeta.
       El color depende de la longitud del punto, así gira con la forma. */
    function buildBrandLut() {
        const stops = [
            { t: 0.00, c: hexToRgb('#ff3d8a') },
            { t: 0.45, c: hexToRgb('#e84df2') },
            { t: 0.75, c: hexToRgb('#c05cff') },
            { t: 1.00, c: hexToRgb('#b18cff') }
        ];
        const lut = new Array(256);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let s0 = stops[0], s1 = stops[stops.length - 1];
            for (let s = 0; s < stops.length - 1; s++) {
                if (t >= stops[s].t && t <= stops[s + 1].t) { s0 = stops[s]; s1 = stops[s + 1]; break; }
            }
            const k = (t - s0.t) / Math.max(1e-6, (s1.t - s0.t));
            const r = Math.round(lerp(s0.c[0], s1.c[0], k));
            const g = Math.round(lerp(s0.c[1], s1.c[1], k));
            const b = Math.round(lerp(s0.c[2], s1.c[2], k));
            lut[i] = 'rgb(' + r + ',' + g + ',' + b + ')';
        }
        return lut;
    }

    /* ---------- escenas (valores medidos de la referencia) ---------- */
    const SCENES = {
        hero: {
            waves: [
                { amp: 76.923, freq: 0.879, phase: 0 },
                { amp: 60.0,   freq: 0.165, phase: 0 },
                { amp: 50.0,   freq: 0.0,   phase: 0 }
            ],
            size: 250, distance: 1000, persp: 1, dot: 1.5
        },
        text: {
            waves: [
                { amp: 0, freq: 0, phase: 0 },
                { amp: 0, freq: 0, phase: 0 },
                { amp: 35, freq: 10, phase: 0 }
            ],
            size: 220, distance: 0, persp: 3, dot: 1.0
        },
        awards: {
            waves: [
                { amp: 200, freq: 7.692, phase: 6.283 },
                { amp: 200, freq: 7.912, phase: 6.283 },
                { amp: 200, freq: 10.0,  phase: 6.283 }
            ],
            size: 220, distance: 1000, persp: 1, dot: 1.021
        },
        footer: {
            // misma silueta que el hero: círculo con deformaciones suaves
            waves: [
                { amp: 76.923, freq: 0.879, phase: 0 },
                { amp: 60.0,   freq: 0.165, phase: 0 },
                { amp: 50.0,   freq: 0.0,   phase: 0 }
            ],
            size: 220, distance: 1000, persp: 1, dot: 1.021
        }
    };

    function cloneScene(s) {
        return {
            waves: s.waves.map(w => ({ amp: w.amp, freq: w.freq, phase: w.phase })),
            size: s.size, distance: s.distance, persp: s.persp, dot: s.dot
        };
    }

    /* ---------- movimiento automático de la geometría ---------- */
    const WAVE1_SPEED = 1.3;        // deriva de fase de la onda 1 (rad/s)
    const WAVE2_SPEED = 0.8;        // deriva de fase de la onda 2 (rad/s)

    /* ---------- pointerGroup: orientación por posición del cursor ---------- */
    const P_ROT_Y = 35 * Math.PI / 180;  // ±35° en eje Y
    const P_ROT_X = 22 * Math.PI / 180;  // ±22° en eje X
    const P_ROT_Z = 7 * Math.PI / 180;   // inclinación leve en Z
    const P_FOLLOW = 12;                 // damping siguiendo (≈80-150 ms)
    const P_RETURN = 1.7;                // damping retorno al centro (≈600 ms)
    const POINTER_SMOOTH = 7.5;          // posición suavizada (más lenta que el cursor visual)
    const IDLE_MS = 700;                 // ms sin mover para soltar (histéresis anti-tirones)

    /* ---------- inertiaGroup: impulsos con fricción exponencial ---------- */
    const SPIN_FRICTION = 2.1;           // fricción: rueda con inercia ~1.5-2 s
    const SPIN_MAX = 6.0;                // rad/s, límite de velocidad angular
    const PV_IMPULSE = 0.008;            // ganancia del giro por velocidad de puntero
    const PV_MAX_ADD = 4.0;              // límite del impulso sostenido del puntero
    const SCROLL_IMPULSE = 0.00035;      // impulso continuo por velocidad de scroll
    const HERO_IMPULSE_Y = [1.8, 3.5];   // rango de impulso al reentrar el hero

    /* ---------- autoGroup: rotación automática permanente ---------- */
    const AUTO_Y = 0.12;                 // rad/s eje Y
    const AUTO_X_AMP = 0.05, AUTO_X_FREQ = 0.21;  // oscilación pequeña eje X
    const AUTO_Z_AMP = 0.03, AUTO_Z_FREQ = 0.17;  // oscilación casi imperceptible eje Z

    /* ---------- escala sutil (baseGroup) ---------- */
    const BREATH_AMP = 0.018;            // respiración ±1.8%
    const BREATH_SPEED = 0.9;            // rad/s
    const SPEED_ZOOM_MAX = 0.02;         // +2% máx por velocidad del ratón
    const SCALE_DAMP = 6;                // damping del regreso a escala 1

    /* ---------- motor ---------- */
    class ParticleBlob {
        constructor(container) {
            this.container = container;
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            container.appendChild(this.canvas);

            this.lut = buildBrandLut();
            this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            // estado de escena: actual (animado) y objetivo
            this.sceneName = 'hero';
            this.cur = cloneScene(SCENES.hero);
            this.from = cloneScene(SCENES.hero);
            this.target = cloneScene(SCENES.hero);
            this.morphT = 1;
            this.morphDur = 1.0;      // segundos
            this.expandAmount = 0;

            // ---------- rotación por grupos independientes ----------
            // pointerGroup: orientación por posición del cursor (quaternion)
            this.qPointer = [0, 0, 0, 1];
            // inertiaGroup: impulsos puntero/scroll con fricción (quaternion)
            this.qInertia = [0, 0, 0, 1];
            this.spinX = 0; this.spinY = 0;      // velocidad angular (rad/s)
            this.pendingImpulseX = 0; this.pendingImpulseY = 0;
            // autoGroup: rotación automática permanente
            this.autoY = 0;
            // baseGroup: escala sutil por velocidad del ratón
            this.speedBoost = 0;
            // scroll: solo se guarda posición; la velocidad se calcula en el frame
            this._scrollY = window.scrollY || window.pageYOffset || 0;
            this._prevScrollY = this._scrollY;
            this.scrollVelEMA = 0;

            this.time = 0;

            // ratón: los eventos solo guardan posición y velocidad
            this._lastMX = 0; this._lastMY = 0; this._hasMouse = false;
            this._lastMoveT = 0;
            this.mx = 0; this.my = 0;          // posición actual del cursor (px)
            this.smx = 0; this.smy = 0;        // posición suavizada (orientación)
            this.pvX = 0; this.pvY = 0;        // velocidad del puntero filtrada
            this.speedEMA = 0;                 // rapidez del ratón (px/s, EMA)

            // calidad
            this.detail = 60;
            this.fpsWatch = { acc: 0, n: 0, cap: 60 };

            this._resize = this.resize.bind(this);
            window.addEventListener('resize', this._resize);
            if (!this.reduced) {
                window.addEventListener('mousemove', (e) => this._onMouseMove(e), { passive: true });
                // al salir el cursor de la ventana, la figura vuelve a reposo
                document.addEventListener('mouseleave', () => { this._hasMouse = false; });
            }

            // scroll: el evento solo guarda la posición actual
            window.addEventListener('scroll', () => {
                this._scrollY = window.scrollY || window.pageYOffset || 0;
            }, { passive: true });

            // hero re-entra desde abajo con velocidad → guarda un impulso
            const heroEl = document.querySelector('section');
            if (heroEl && 'IntersectionObserver' in window) {
                this._heroVisible = true;
                new IntersectionObserver((entries) => {
                    const en = entries[0];
                    const wasOut = !this._heroVisible;
                    this._heroVisible = en.isIntersecting;
                    if (en.isIntersecting && wasOut && this.scrollVelEMA < -900) {
                        const imp = clamp(-this.scrollVelEMA / 1400, HERO_IMPULSE_Y[0], HERO_IMPULSE_Y[1]);
                        this.pendingImpulseY = imp;      // eje Y: 1.8-3.5 rad/s
                        this.pendingImpulseX = imp * 0.35; // eje X: impulso menor
                    }
                }, { threshold: 0.12 }).observe(heroEl);
            }

            this.resize();
            this.buildRings();

            this._last = performance.now();
            this._raf = null;
            this._running = false;
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) { this.stop(); } else { this._last = performance.now(); this.start(); }
            });
        }

        resize() {
            const w = window.innerWidth, h = window.innerHeight;
            const small = Math.min(w, h);
            if (w <= 600) { this.detail = 48; }
            else { this.detail = 60; }
            // degradación progresiva por rendimiento (en pasos, sin saltos)
            this.detail = Math.min(this.detail, this.fpsWatch.cap);
            if (this.reduced) this.detail = 30;

            this.w = w; this.h = h;
            // la referencia dibuja en píxeles CSS (sin DPR): más rápido y fiel
            this.canvas.width = w;
            this.canvas.height = h;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Escala responsive: en pantallas estrechas la forma crece
            // hasta sangrar por los bordes (referencia móvil)
            const boost = clamp(900 / Math.max(w, 480), 1, 1.4);
            this.fit = (small / 900) * boost;   // unidades de mundo → px
            this.dotFit = w > 600 ? 1 : 0.8;
            this.cx = w / 2;
            this.cy = h / 2;
            this.buildRings();
            if (this.reduced) this.renderFrame();
        }

        buildRings() {
            // anillos latitud-longitud: separación uniforme en superficie
            const det = this.detail;
            const pts = [];
            for (let l = 1; l <= det; l++) {
                const lat = (l / det) * Math.PI - Math.PI / 2;
                const h = Math.max(1, Math.round(det * Math.cos(lat) * 2));
                for (let g = 0; g < h; g++) {
                    const lon = (g / h) * 2 * Math.PI - Math.PI;
                    pts.push({ lat, lon, colorT: (lon + Math.PI) / (2 * Math.PI) });
                }
            }
            this.pts = pts;
        }

        setScene(name) {
            if (!SCENES[name] || name === this.sceneName) return;
            // las fases de las ondas 1 y 2 no se morfan: siguen su deriva
            const keep1 = this.cur.waves[0].phase;
            const keep2 = this.cur.waves[1].phase;
            this.sceneName = name;
            this.from = cloneScene(this.cur);
            this.target = cloneScene(SCENES[name]);
            this.target.waves[0].phase = keep1;
            this.target.waves[1].phase = keep2;
            this.morphT = 0;
            // expansión intermedia durante la morfosis
            this.expandAmount = this.cur.size * 0.85 + 60;
        }

        _onMouseMove(e) {
            // el evento SOLO guarda posición y velocidad; nada de rotación
            const now = performance.now();
            const dtEv = Math.min((now - this._lastMoveT) / 1000, 0.1) || 0.016;
            this._lastMoveT = now;
            this.mx = e.clientX; this.my = e.clientY;
            if (!this._hasMouse) {
                this._lastMX = this.mx; this._lastMY = this.my;
                this.smx = this.mx; this.smy = this.my;
                this._hasMouse = true;
                return;
            }
            // pointerVelocity: (posición actual - anterior) / deltaTime
            const vx = (this.mx - this._lastMX) / dtEv;
            const vy = (this.my - this._lastMY) / dtEv;
            this._lastMX = this.mx; this._lastMY = this.my;
            // filtro EMA para evitar picos
            this.pvX = lerp(this.pvX, clamp(vx, -6000, 6000), 0.2);
            this.pvY = lerp(this.pvY, clamp(vy, -6000, 6000), 0.2);
            this.speedEMA = lerp(this.speedEMA, Math.min(Math.hypot(this.pvX, this.pvY), 4000), 0.25);
        }

        start() {
            if (this._running || this.reduced) return;
            this._running = true;
            const loop = (now) => {
                if (!this._running) return;
                const dt = Math.min((now - this._last) / 1000, 1 / 30);
                this._last = now;
                this.update(dt, now);
                this.renderFrame();
                this.watchFps(dt);
                this._raf = requestAnimationFrame(loop);
            };
            this._raf = requestAnimationFrame(loop);
        }

        stop() {
            this._running = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = null;
        }

        watchFps(dt) {
            const w = this.fpsWatch;
            if (w.cap <= 36) return;
            w.acc += dt; w.n++;
            if (w.n >= 180) {
                // degrada en pasos de 10 anillos cada ~3 s: sin salto visible
                if (w.acc / w.n > 0.024) {
                    w.cap -= 10;
                    this.detail = Math.min(this.detail, w.cap);
                    this.buildRings();
                }
                w.acc = 0; w.n = 0;
            }
        }

        update(dt, now) {
            this.time += dt;

            // deriva continua de fases (ondas 1 y 2)
            this.cur.waves[0].phase += WAVE1_SPEED * dt;
            this.cur.waves[1].phase += WAVE2_SPEED * dt;

            // avance de la morfosis entre escenas
            if (this.morphT < 1) {
                this.morphT = Math.min(1, this.morphT + dt / this.morphDur);
                const e = easeInOutCubic(this.morphT);
                for (let i = 0; i < 3; i++) {
                    this.cur.waves[i].amp = lerp(this.from.waves[i].amp, this.target.waves[i].amp, e);
                    this.cur.waves[i].freq = lerp(this.from.waves[i].freq, this.target.waves[i].freq, e);
                }
                // la fase solo se morfa en la onda 3
                this.cur.waves[2].phase = lerp(this.from.waves[2].phase, this.target.waves[2].phase, e);
                this.cur.size = lerp(this.from.size, this.target.size, e);
                this.cur.distance = lerp(this.from.distance, this.target.distance, e);
                this.cur.persp = lerp(this.from.persp, this.target.persp, e);
                this.cur.dot = lerp(this.from.dot, this.target.dot, e);
            }
            // pulso de expansión: máximo en el centro de la morfosis
            this.pulse = Math.pow(Math.sin(Math.PI * this.morphT), 1.4) * this.expandAmount;

            /* ---------- pointerGroup: orientación por posición ---------- */
            // posición suavizada, más lenta que el círculo del cursor visual
            const kP = 1 - Math.exp(-POINTER_SMOOTH * dt);
            this.smx += (this.mx - this.smx) * kP;
            this.smy += (this.my - this.smy) * kP;

            // quaternion objetivo desde coordenadas normalizadas -1..1
            const idle = !this._hasMouse || (now - this._lastMoveT > IDLE_MS);
            let qTarget = QUAT_ID;
            if (!idle) {
                const nx = clamp((this.smx - this.cx) / (this.w / 2), -1, 1);
                const ny = clamp((this.smy - this.cy) / (this.h / 2), -1, 1);
                qTarget = quatFromEulerYXZ(-ny * P_ROT_X, nx * P_ROT_Y, -nx * P_ROT_Z);
            }
            // slerp con damping dependiente de deltaTime
            const lambda = idle ? P_RETURN : P_FOLLOW;
            this.qPointer = quatSlerp(this.qPointer, qTarget, 1 - Math.exp(-lambda * dt));

            /* ---------- inertiaGroup: impulsos con fricción ---------- */
            // impulso angular por velocidad del puntero (dinámico, limitado)
            const pvS = Math.hypot(this.pvX, this.pvY);
            if (pvS > 25) {
                const rate = Math.min(pvS * PV_IMPULSE, PV_MAX_ADD);
                this.spinY += (this.pvX / pvS) * rate * dt;
                this.spinX += (-this.pvY / pvS) * rate * dt * 0.85;
            }
            // la velocidad del puntero se desvanece al detenerse
            const pvFr = Math.exp(-4 * dt);
            this.pvX *= pvFr; this.pvY *= pvFr;

            // scrollVelocity suavizada y limitada → impulso continuo
            const sy = this._scrollY;
            const rawSV = (sy - this._prevScrollY) / Math.max(dt, 1e-4);
            this._prevScrollY = sy;
            this.scrollVelEMA = lerp(this.scrollVelEMA, clamp(rawSV, -6000, 6000), 1 - Math.exp(-8 * dt));
            this.spinY += clamp(this.scrollVelEMA * SCROLL_IMPULSE, -0.8, 0.8) * dt;

            // impulso puntual al reentrar el hero (lo guarda el observer)
            if (this.pendingImpulseY > 0) {
                this.spinY += this.pendingImpulseY;
                this.spinX += this.pendingImpulseX;
                this.pendingImpulseY = 0; this.pendingImpulseX = 0;
            }

            // límite suave (tanh, sin rodilla) y fricción exponencial:
            // rápido al inicio, desacelera progresivamente, sin frenazos
            const sp = Math.hypot(this.spinX, this.spinY);
            if (sp > 1e-6) {
                const soft = SPIN_MAX * Math.tanh(sp / SPIN_MAX) / sp;
                this.spinX *= soft; this.spinY *= soft;
            }
            const fr = Math.exp(-SPIN_FRICTION * dt);
            this.spinX *= fr; this.spinY *= fr;

            // integrar la velocidad angular en el quaternion de inercia
            const wS = Math.hypot(this.spinX, this.spinY);
            if (wS > 1e-6) {
                const dq = quatAxisAngle(this.spinX / wS, this.spinY / wS, 0, wS * dt);
                this.qInertia = quatMul(dq, this.qInertia);
                const nQ = Math.hypot(this.qInertia[0], this.qInertia[1], this.qInertia[2], this.qInertia[3]) || 1;
                this.qInertia[0] /= nQ; this.qInertia[1] /= nQ;
                this.qInertia[2] /= nQ; this.qInertia[3] /= nQ;
            }

            /* ---------- autoGroup: rotación automática permanente ---------- */
            this.autoY += AUTO_Y * dt;
            if (this.autoY > Math.PI * 2) this.autoY -= Math.PI * 2;

            /* ---------- baseGroup: escala sutil por velocidad ---------- */
            this.speedEMA *= Math.exp(-3 * dt);
            const tBoost = clamp(this.speedEMA / 2000, 0, 1) * SPEED_ZOOM_MAX;
            this.speedBoost += (tBoost - this.speedBoost) * (1 - Math.exp(-SCALE_DAMP * dt));
        }

        renderFrame() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.w, this.h);

            const c = this.cur;
            const w1 = c.waves[0], w2 = c.waves[1], w3 = c.waves[2];
            const R = c.size + this.pulse;
            const focal = 1000 / c.persp;
            const dist = c.distance / c.persp;
            // orientación final = autoGroup · inertiaGroup · pointerGroup
            const t = this.time;
            const qAuto = quatFromEulerYXZ(
                AUTO_X_AMP * Math.sin(t * AUTO_X_FREQ),
                this.autoY,
                AUTO_Z_AMP * Math.sin(t * AUTO_Z_FREQ)
            );
            const M = quatToMat3(quatMul(qAuto, quatMul(this.qInertia, this.qPointer)));
            const m00 = M[0], m01 = M[1], m02 = M[2];
            const m10 = M[3], m11 = M[4], m12 = M[5];
            const m20 = M[6], m21 = M[7], m22 = M[8];

            // escala global sutil: respiración + impulso por velocidad del ratón
            const S = (1 + BREATH_AMP * Math.sin(t * BREATH_SPEED)) * (1 + this.speedBoost);

            const fit = this.fit, cx = this.cx, cy = this.cy;
            const dotBase = c.dot * this.dotFit;
            const lut = this.lut;

            for (let i = 0; i < this.pts.length; i++) {
                const p = this.pts[i];
                const rx = R + w1.amp * Math.sin(w1.freq * p.lat + w1.phase);
                const ry = R + w2.amp * Math.sin(w2.freq * p.lon + w2.phase);
                const rz = R + w3.amp * Math.sin(w3.freq * p.lat + w3.phase);
                const ce = Math.cos(p.lat);
                const x = rx * ce * Math.cos(p.lon);
                const y = ry * ce * Math.sin(p.lon);
                const z = rz * Math.sin(p.lat);

                // orientación final (grupos compuestos) + escala global.
                // Los vértices siempre se calculan desde su posición original.
                const X = (m00 * x + m01 * y + m02 * z) * S;
                const Y = (m10 * x + m11 * y + m12 * z) * S;
                const Z = (m20 * x + m21 * y + m22 * z) * S;

                const denom = dist + Z;
                if (denom < 60) continue;              // demasiado cerca / detrás
                const scale = Math.min(focal / denom, 8);
                const b = dotBase * scale;
                if (b <= 0.05) continue;

                ctx.globalAlpha = scale < 1 ? scale * scale : 1;
                ctx.fillStyle = lut[(p.colorT * 255) | 0];
                const bs = Math.max(b, 0.4);
                ctx.fillRect(cx + X * scale * fit - bs / 2, cy + Y * scale * fit - bs / 2, bs, bs);
            }
            ctx.globalAlpha = 1;
        }
    }

    window.ParticleBlob = ParticleBlob;
    window.BLOB_SCENES = SCENES;
})();
