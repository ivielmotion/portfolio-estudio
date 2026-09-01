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

    const CONFIG = window.PARTICLE_CONFIG;
    if (!CONFIG) throw new Error('Falta cargar js/particles.config.js antes de js/blob.js');
    const MOTION = CONFIG.motion;
    const SCENES = CONFIG.scenes;

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
        const last = CONFIG.colors.length - 1;
        const stops = CONFIG.colors.map(function (color, index) {
            return { t: index / last, c: hexToRgb(color) };
        });
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

    function cloneScene(s) {
        return {
            waves: s.waves.map(w => ({ amp: w.amp, freq: w.freq, phase: w.phase })),
            size: s.size,
            density: s.density == null ? 1 : s.density,
            distance: s.distance,
            persp: s.persp == null ? s.perspective : s.persp,
            nearClip: s.nearClip == null ? 60 : s.nearClip,
            maxProjectionScale: s.maxProjectionScale == null
                ? 8
                : s.maxProjectionScale,
            insideView: s.insideView || 0,
            insideRotationSpeed: s.insideRotationSpeed == null
                ? MOTION.insideRotationSpeed
                : s.insideRotationSpeed,
            dot: s.dot,
            sceneScale: s.sceneScale == null ? 1 : s.sceneScale,
            offsetX: s.offsetX || 0,
            offsetY: s.offsetY || 0
        };
    }

    /* ---------- movimiento automático de la geometría ---------- */
    const WAVE1_SPEED = MOTION.wave1Speed;
    const WAVE2_SPEED = MOTION.wave2Speed;

    /* ---------- pointerGroup: orientación por posición del cursor ---------- */
    const P_ROT_Y = MOTION.pointerRotationY * Math.PI / 180;
    const P_ROT_X = MOTION.pointerRotationX * Math.PI / 180;
    const P_ROT_Z = MOTION.pointerRotationZ * Math.PI / 180;
    const P_FOLLOW = MOTION.pointerFollow;
    const P_RETURN = MOTION.pointerReturn;
    const POINTER_SMOOTH = MOTION.pointerSmooth;
    const IDLE_MS = MOTION.pointerIdleMs;

    /* ---------- inertiaGroup: impulsos con fricción exponencial ---------- */
    const SPIN_FRICTION = MOTION.spinFriction;
    const SPIN_MAX = MOTION.spinMax;
    const PV_IMPULSE = MOTION.pointerImpulse;
    const PV_MAX_ADD = MOTION.pointerImpulseMax;
    const SCROLL_IMPULSE = MOTION.scrollImpulse;
    const HERO_IMPULSE_Y = MOTION.heroReturnImpulse;

    /* ---------- autoGroup: rotación automática permanente ---------- */
    const AUTO_Y = MOTION.autoRotationY;
    const INSIDE_ROTATION_SPEED = MOTION.insideRotationSpeed || 0.3;
    const AUTO_X_AMP = MOTION.autoRotationX;
    const AUTO_X_FREQ = MOTION.autoRotationXFrequency;
    const AUTO_Z_AMP = MOTION.autoRotationZ;
    const AUTO_Z_FREQ = MOTION.autoRotationZFrequency;

    /* ---------- escala sutil (baseGroup) ---------- */
    const BREATH_AMP = MOTION.breathAmount;
    const BREATH_SPEED = MOTION.breathSpeed;
    const SPEED_ZOOM_MAX = MOTION.pointerZoomMax;
    const SCALE_DAMP = MOTION.scaleDamping;

    /* ---------- motor ---------- */
    class ParticleBlob {
        constructor(container) {
            this.container = container;
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', {
                alpha: true,
                desynchronized: true
            });
            container.appendChild(this.canvas);

            this.lut = buildBrandLut();
            this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const deviceMemory = navigator.deviceMemory || 8;
            const processorCount = navigator.hardwareConcurrency || 8;
            this.lowPower = CONFIG.responsive.autoLowPower &&
                (deviceMemory <= 4 || processorCount <= 4);

            // estado de escena: actual (animado) y objetivo
            this.sceneName = CONFIG.pages.homeInitialScene;
            this.cur = cloneScene(SCENES[this.sceneName]);
            this.from = cloneScene(SCENES[this.sceneName]);
            this.target = cloneScene(SCENES[this.sceneName]);
            this.morphT = 1;
            this.morphDur = MOTION.morphSeconds;
            this.expandAmount = 0;
            this.scrollMorphActive = false;
            this.scrollMorphProgress = 0;
            this.scrollMorphEased = 0;
            this.scrollMorphExpand = 0;

            // ---------- rotación por grupos independientes ----------
            // pointerGroup: orientación por posición del cursor (quaternion)
            this.qPointer = [0, 0, 0, 1];
            // inertiaGroup: impulsos puntero/scroll con fricción (quaternion)
            this.qInertia = [0, 0, 0, 1];
            this.spinX = 0; this.spinY = 0;      // velocidad angular (rad/s)
            this.pendingImpulseX = 0; this.pendingImpulseY = 0;
            // autoGroup: rotación automática permanente
            this.autoY = 0;
            this.insideAngle = 0;
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
            this.detail = 0;
            this.profileName = '';
            this.profile = null;
            this.maxFps = 30;
            this.fpsWatch = { acc: 0, n: 0, cap: Infinity };

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

            this._lastUpdate = performance.now();
            this._lastFrame = this._lastUpdate;
            this._raf = null;
            this._running = false;
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.stop();
                } else {
                    this._lastUpdate = performance.now();
                    this._lastFrame = this._lastUpdate;
                    this.start();
                }
            });
        }

        resize() {
            const w = window.innerWidth, h = window.innerHeight;
            const small = Math.min(w, h);
            const nextProfileName = w <= CONFIG.responsive.breakpoint ? 'mobile' : 'desktop';
            const profileChanged = nextProfileName !== this.profileName;
            this.profileName = nextProfileName;
            this.profile = CONFIG.responsive[nextProfileName];

            let requestedDetail = this.profile.detail;
            if (this.lowPower) {
                requestedDetail -= CONFIG.responsive.lowPowerDetailReduction;
            }
            requestedDetail = Math.max(this.profile.minDetail, requestedDetail);
            if (profileChanged) this.fpsWatch.cap = requestedDetail;
            this.detail = Math.min(requestedDetail, this.fpsWatch.cap);
            if (this.reduced) this.detail = this.profile.minDetail;
            this.maxFps = this.profile.maxFps;
            this.morphDur = this.profile.morphSeconds || MOTION.morphSeconds;

            this.w = w; this.h = h;
            // la referencia dibuja en píxeles CSS (sin DPR): más rápido y fiel
            this.canvas.width = w;
            this.canvas.height = h;
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.fit = (small / 900) * this.profile.scale;
            this.dotFit = this.profile.dotScale;
            this.cx = w * this.profile.centerX;
            this.cy = h * this.profile.centerY;
            this.buildRings();
            this.syncCanvasInfo();
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
                    const index = pts.length + 1;
                    pts.push({
                        lat: lat,
                        lon: lon,
                        sinLat: Math.sin(lat),
                        cosLat: Math.cos(lat),
                        sinLon: Math.sin(lon),
                        cosLon: Math.cos(lon),
                        colorT: (lon + Math.PI) / (2 * Math.PI),
                        rank: ((index * 2654435761) >>> 0) / 4294967295
                    });
                }
            }
            // Orden estable pseudoaleatorio: density reduce puntos de forma uniforme.
            pts.sort(function (a, b) { return a.rank - b.rank; });
            this.pts = pts;
        }

        setScene(name, immediate) {
            if (!SCENES[name]) return;
            if (name === this.sceneName && !this.scrollMorphActive) return;
            this.scrollMorphActive = false;
            this.scrollMorphProgress = 0;
            this.scrollMorphEased = 0;
            this.scrollMorphExpand = 0;

            if (name === this.sceneName) {
                if (immediate) {
                    this.cur = cloneScene(SCENES[name]);
                    this.from = cloneScene(this.cur);
                    this.target = cloneScene(this.cur);
                    this.morphT = 1;
                    this.expandAmount = 0;
                    this.pulse = 0;
                    if (this.reduced) this.renderFrame();
                }
                this.syncCanvasInfo();
                return;
            }

            // las fases de las ondas 1 y 2 no se morfan: siguen su deriva
            const keep1 = this.cur.waves[0].phase;
            const keep2 = this.cur.waves[1].phase;
            this.sceneName = name;
            this.from = cloneScene(this.cur);
            this.target = cloneScene(SCENES[name]);
            this.target.waves[0].phase = keep1;
            this.target.waves[1].phase = keep2;
            this.morphT = immediate ? 1 : 0;
            // expansión intermedia durante la morfosis
            this.expandAmount = this.cur.size * MOTION.transitionPulse +
                MOTION.transitionExtra;
            if (immediate) {
                this.cur = cloneScene(this.target);
                this.from = cloneScene(this.target);
                this.expandAmount = 0;
                this.pulse = 0;
                if (this.reduced) this.renderFrame();
            }
            this.syncCanvasInfo();
        }

        /* Morph controlado por posición, no por tiempo.
           progress 0..1 permite avanzar y retroceder con el scroll. */
        setSceneProgress(
            fromName,
            toName,
            progress,
            smoothness,
            pulseScale,
            pulseExtra
        ) {
            if (!SCENES[fromName] || !SCENES[toName]) return;

            const t = clamp(progress, 0, 1);
            const delayedT = t * t * t * t;
            const delayedSmooth = delayedT * delayedT *
                (3 - 2 * delayedT);
            const curveMix = clamp(
                smoothness == null ? 0.75 : smoothness,
                0,
                1
            );
            const e = lerp(t, delayedSmooth, curveMix);
            const source = SCENES[fromName];
            const destination = SCENES[toName];
            const keep1 = this.cur.waves[0].phase;
            const keep2 = this.cur.waves[1].phase;

            for (let i = 0; i < 3; i++) {
                this.cur.waves[i].amp = lerp(
                    source.waves[i].amp,
                    destination.waves[i].amp,
                    e
                );
                this.cur.waves[i].freq = lerp(
                    source.waves[i].freq,
                    destination.waves[i].freq,
                    e
                );
            }
            this.cur.waves[0].phase = keep1;
            this.cur.waves[1].phase = keep2;
            this.cur.waves[2].phase = lerp(
                source.waves[2].phase,
                destination.waves[2].phase,
                e
            );
            this.cur.size = lerp(source.size, destination.size, e);
            this.cur.distance = lerp(source.distance, destination.distance, e);
            this.cur.persp = lerp(
                source.persp == null ? source.perspective : source.persp,
                destination.persp == null
                    ? destination.perspective
                    : destination.persp,
                e
            );
            this.cur.nearClip = lerp(
                source.nearClip == null ? 60 : source.nearClip,
                destination.nearClip == null ? 60 : destination.nearClip,
                e
            );
            this.cur.maxProjectionScale = lerp(
                source.maxProjectionScale == null
                    ? 8
                    : source.maxProjectionScale,
                destination.maxProjectionScale == null
                    ? 8
                    : destination.maxProjectionScale,
                e
            );
            this.cur.insideView = lerp(
                source.insideView || 0,
                destination.insideView || 0,
                e
            );
            this.cur.insideRotationSpeed = lerp(
                source.insideRotationSpeed == null
                    ? MOTION.insideRotationSpeed
                    : source.insideRotationSpeed,
                destination.insideRotationSpeed == null
                    ? MOTION.insideRotationSpeed
                    : destination.insideRotationSpeed,
                e
            );
            this.cur.dot = lerp(source.dot, destination.dot, e);
            this.cur.density = lerp(
                source.density == null ? 1 : source.density,
                destination.density == null ? 1 : destination.density,
                e
            );
            this.cur.sceneScale = lerp(
                source.sceneScale == null ? 1 : source.sceneScale,
                destination.sceneScale == null
                    ? 1
                    : destination.sceneScale,
                e
            );
            this.cur.offsetX = lerp(
                source.offsetX || 0,
                destination.offsetX || 0,
                e
            );
            this.cur.offsetY = lerp(
                source.offsetY || 0,
                destination.offsetY || 0,
                e
            );

            this.sceneName = t >= 1 ? toName : fromName;
            this.scrollMorphActive = true;
            this.scrollMorphProgress = t;
            this.scrollMorphEased = e;
            this.scrollMorphExpand = source.size *
                (pulseScale == null ? 0.22 : pulseScale) +
                (pulseExtra == null ? 10 : pulseExtra);
            this.pulse = Math.pow(Math.sin(Math.PI * e), 1.4) *
                this.scrollMorphExpand;
            this.morphT = 1;
            this.expandAmount = 0;
            this.from = cloneScene(this.cur);
            this.target = cloneScene(this.cur);
            this.syncCanvasInfo();
            if (this.reduced) this.renderFrame();
        }

        _onMouseMove(e) {
            const now = performance.now();
            this.mx = e.clientX; this.my = e.clientY;
            if (!this._hasMouse) {
                this._lastMX = this.mx; this._lastMY = this.my;
                this.smx = this.mx; this.smy = this.my;
                this._hasMouse = true;
                this._lastMoveT = now;
                return;
            }
            // Throttle: solo procesar cada 25 ms (40 fps) como la referencia.
            // Los gaming mice envían 500-1000 Hz; sin throttle el jitter
            // del sensor se acumula en el filtro EMA y genera tics.
            if (now - this._lastMoveT < 25) return;

            const dtEv = Math.min((now - this._lastMoveT) / 1000, 0.1) || 0.025;
            this._lastMoveT = now;

            const dx = this.mx - this._lastMX;
            const dy = this.my - this._lastMY;
            const dist = Math.hypot(dx, dy);

            // Deadzone: ignorar micro-movimientos del sensor (< 3 px).
            // El jitter típico del mouse es 1-2 px; esto lo elimina.
            if (dist < 3) return;

            const vx = dx / dtEv;
            const vy = dy / dtEv;
            this._lastMX = this.mx; this._lastMY = this.my;

            // EMA time-based: cutoff ~8 Hz. El factor fijo 0.2 era válido
            // solo a ~40 Hz de eventos; a otras frecuencias distorsionaba.
            const emaAlpha = 1 - Math.exp(-8 * dtEv);
            this.pvX = lerp(this.pvX, clamp(vx, -6000, 6000), emaAlpha);
            this.pvY = lerp(this.pvY, clamp(vy, -6000, 6000), emaAlpha);
            this.speedEMA = lerp(this.speedEMA, Math.min(Math.hypot(this.pvX, this.pvY), 4000), emaAlpha);
        }

        start() {
            if (this._running || this.reduced) return;
            this._running = true;
            const loop = (now) => {
                if (!this._running) return;
                const dt = Math.min((now - this._lastUpdate) / 1000, 0.05);
                this._lastUpdate = now;
                this._lastFrame = now;
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
            if (w.cap <= this.profile.minDetail) return;
            w.acc += dt; w.n++;
            if (w.n >= 120) {
                const expectedFrame = 1 / this.maxFps;
                if (w.acc / w.n > expectedFrame * 1.4) {
                    w.cap = Math.max(this.profile.minDetail, w.cap - 4);
                    if (w.cap < this.detail) {
                        this.detail = w.cap;
                        this.buildRings();
                        this.syncCanvasInfo();
                    }
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
                this.cur.nearClip = lerp(
                    this.from.nearClip,
                    this.target.nearClip,
                    e
                );
                this.cur.maxProjectionScale = lerp(
                    this.from.maxProjectionScale,
                    this.target.maxProjectionScale,
                    e
                );
                this.cur.insideView = lerp(
                    this.from.insideView,
                    this.target.insideView,
                    e
                );
                this.cur.insideRotationSpeed = lerp(
                    this.from.insideRotationSpeed,
                    this.target.insideRotationSpeed,
                    e
                );
                this.cur.dot = lerp(this.from.dot, this.target.dot, e);
                this.cur.density = lerp(this.from.density, this.target.density, e);
                this.cur.sceneScale = lerp(this.from.sceneScale, this.target.sceneScale, e);
                this.cur.offsetX = lerp(this.from.offsetX, this.target.offsetX, e);
                this.cur.offsetY = lerp(this.from.offsetY, this.target.offsetY, e);
            }
            // pulso de expansión: máximo en el centro de la morfosis
            this.pulse = this.scrollMorphActive
                ? Math.pow(
                    Math.sin(Math.PI * this.scrollMorphEased),
                    1.4
                ) * this.scrollMorphExpand
                : Math.pow(Math.sin(Math.PI * this.morphT), 1.4) *
                    this.expandAmount;

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
                // INVERTIDO: -nx en Y y +nx en Z para que la esfera siga al mouse
                qTarget = quatFromEulerYXZ(-ny * P_ROT_X, -nx * P_ROT_Y, nx * P_ROT_Z);
            }
            // slerp con damping dependiente de deltaTime
            const lambda = idle ? P_RETURN : P_FOLLOW;
            this.qPointer = quatSlerp(this.qPointer, qTarget, 1 - Math.exp(-lambda * dt));

            /* ---------- inertiaGroup: impulsos con fricción ---------- */
            // impulso angular por velocidad del puntero (dinámico, limitado)
            const pvS = Math.hypot(this.pvX, this.pvY);
            // Umbral alto: solo movimientos INTENCIONALES del mouse.
            // El jitter del sensor genera 60-200 px/s; 150 filtra eso.
            if (pvS > 150) {
                const rate = Math.min(pvS * PV_IMPULSE, PV_MAX_ADD);
                this.spinY += (this.pvX / pvS) * rate * dt;
                this.spinX += (-this.pvY / pvS) * rate * dt * 0.85;
            }
            // Si el mouse está en idle (quieto > 700 ms), resetear velocidad
            // residual para que NUNCA quede energía fantasma.
            if (idle) {
                this.pvX = 0; this.pvY = 0;
            } else {
                // Decay agresivo: 10 en lugar de 4. El jitter residual
                // desaparece en ~200 ms en lugar de 2.5 segundos.
                const pvFr = Math.exp(-10 * dt);
                this.pvX *= pvFr; this.pvY *= pvFr;
            }

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
            this.insideAngle += (this.cur.insideRotationSpeed ||
                INSIDE_ROTATION_SPEED) * dt;
            if (this.insideAngle > Math.PI * 2) {
                this.insideAngle -= Math.PI * 2;
            }

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
            const R = (c.size + this.pulse) * c.sceneScale;
            const focal = 1000 / c.persp;
            const dist = c.distance / c.persp;
            // orientación final = autoGroup · inertiaGroup · pointerGroup
            const t = this.time;
            const qStandard = quatFromEulerYXZ(
                AUTO_X_AMP * Math.sin(t * AUTO_X_FREQ),
                this.autoY,
                AUTO_Z_AMP * Math.sin(t * AUTO_Z_FREQ)
            );
            const axis = Math.SQRT1_2;
            const qInside = quatAxisAngle(
                axis,
                -axis,
                0,
                this.insideAngle
            );
            const qAuto = quatSlerp(
                qStandard,
                qInside,
                clamp(c.insideView, 0, 1)
            );
            const M = quatToMat3(quatMul(qAuto, quatMul(this.qInertia, this.qPointer)));
            const m00 = M[0], m01 = M[1], m02 = M[2];
            const m10 = M[3], m11 = M[4], m12 = M[5];
            const m20 = M[6], m21 = M[7], m22 = M[8];

            // escala global sutil: respiración + impulso por velocidad del ratón
            const S = (1 + BREATH_AMP * Math.sin(t * BREATH_SPEED)) * (1 + this.speedBoost);

            const fit = this.fit;
            const cx = this.cx + c.offsetX * this.w;
            const cy = this.cy + c.offsetY * this.h;
            const sceneConfig = SCENES[this.sceneName] || {};
            const profileDotScale = sceneConfig.dotScaleByProfile &&
                sceneConfig.dotScaleByProfile[this.profileName] != null
                ? sceneConfig.dotScaleByProfile[this.profileName]
                : 1;
            const dotBase = c.dot * this.dotFit * profileDotScale;
            const insideBlend = clamp(c.insideView, 0, 1);
            const nearClip = c.nearClip * lerp(
                1,
                this.profile.insideNearClipScale || 1,
                insideBlend
            );
            const maxProjectionScale = c.maxProjectionScale * lerp(
                1,
                this.profile.insideMaxProjectionScale || 1,
                insideBlend
            );
            const depthSizePower = lerp(
                1,
                this.profile.insideDepthSizePower || 1,
                insideBlend
            );
            const depthAlphaPower = lerp(
                2,
                this.profile.insideDepthAlphaPower || 2,
                insideBlend
            );
            const lut = this.lut;
            const visiblePoints = Math.max(1,
                Math.min(this.pts.length, Math.round(this.pts.length * c.density)));

            for (let i = 0; i < visiblePoints; i++) {
                const p = this.pts[i];
                const rx = R + w1.amp * Math.sin(w1.freq * p.lat + w1.phase);
                const ry = R + w2.amp * Math.sin(w2.freq * p.lon + w2.phase);
                const rz = R + w3.amp * Math.sin(w3.freq * p.lat + w3.phase);
                const x = rx * p.cosLat * p.cosLon;
                const y = ry * p.cosLat * p.sinLon;
                const z = rz * p.sinLat;

                // orientación final (grupos compuestos) + escala global.
                // Los vértices siempre se calculan desde su posición original.
                const X = (m00 * x + m01 * y + m02 * z) * S;
                const Y = (m10 * x + m11 * y + m12 * z) * S;
                const Z = (m20 * x + m21 * y + m22 * z) * S;

                const denom = dist + Z;
                if (denom < nearClip) continue;
                const scale = Math.min(
                    focal / denom,
                    maxProjectionScale
                );
                const b = dotBase * Math.pow(scale, depthSizePower);
                if (b <= 0.05) continue;

                ctx.globalAlpha = scale < 1
                    ? Math.pow(scale, depthAlphaPower)
                    : 1;
                ctx.fillStyle = lut[(p.colorT * 255) | 0];
                const bs = Math.max(b, 0.4);
                ctx.fillRect(cx + X * scale * fit - bs / 2, cy + Y * scale * fit - bs / 2, bs, bs);
            }
            ctx.globalAlpha = 1;
        }

        getStats() {
            return {
                scene: this.sceneName,
                profile: this.profileName,
                pointsAvailable: this.pts.length,
                pointsVisible: Math.round(this.pts.length * this.cur.density),
                maxFps: this.maxFps,
                responsiveScale: this.profile.scale,
                lowPowerMode: this.lowPower
            };
        }

        /* Hit test aproximado de la esfera principal. El canvas continúa
           con pointer-events:none para no bloquear enlaces ni botones. */
        containsPoint(clientX, clientY) {
            if (!this.cur || !this.profile || this.sceneName !== 'hero') {
                return false;
            }
            if (this.scrollMorphActive && this.scrollMorphProgress > 0.15) {
                return false;
            }

            const c = this.cur;
            const waveRadius = c.waves.reduce(function (largest, wave) {
                return Math.max(largest, Math.abs(wave.amp));
            }, 0);
            const radius3d = (c.size + waveRadius + this.pulse) *
                c.sceneScale;
            const projection = 1000 / Math.max(1, c.distance);
            const radius = Math.max(
                48,
                radius3d * this.fit * projection * 1.08
            );
            const centerX = this.cx + c.offsetX * this.w;
            const centerY = this.cy + c.offsetY * this.h;
            return Math.hypot(
                clientX - centerX,
                clientY - centerY
            ) <= radius;
        }

        syncCanvasInfo() {
            if (!this.canvas || !this.pts) return;
            this.canvas.dataset.scene = this.sceneName;
            this.canvas.dataset.profile = this.profileName;
            this.canvas.dataset.points = String(this.pts.length);
            this.canvas.dataset.visiblePoints = String(Math.round(
                this.pts.length * this.cur.density
            ));
            this.canvas.dataset.morphProgress = this.scrollMorphActive
                ? this.scrollMorphProgress.toFixed(3)
                : '';
            this.canvas.dataset.maxFps = String(this.maxFps);
        }
    }

    window.ParticleBlob = ParticleBlob;
    window.BLOB_SCENES = SCENES;
    window.PARTICLE_SCENES = SCENES;
})();
