/* ============================================================
   audio.js — Sonido interactivo compartido (HTML5 Audio nativo)

   Para cambiar qué audio usa cada función, edita solo EVENT_SOUNDS.
   Los nombres disponibles están en SOUND_CONFIG y corresponden a
   archivos locales dentro de /sounds.
   ============================================================ */
(function () {
    'use strict';

    const BASE = './sounds/';

    const SOUND_CONFIG = {
        ambient:   { src: BASE + 'ambient.ogg', volume: 0.07125, loop: true },
        hover:     { src: BASE + 'hover.ogg', volume: 0.60 },
        click:     { src: BASE + 'click.ogg', volume: 0.50 },
        spiral:    { src: BASE + 'spiral.ogg', volume: 0.40 },
        list:      { src: BASE + 'list.ogg', volume: 0.40 },
        tick:      { src: BASE + 'tick.ogg', volume: 0.20 },
        longclick: { src: BASE + 'longclick.ogg', volume: 0.50 },
        switch:    { src: BASE + 'switch.ogg', volume: 0.50 },
        close:     { src: BASE + 'close.ogg', volume: 0.70 },
        menuhome:  { src: BASE + 'menu/homelink.ogg', volume: 0.25 },
        menuabout: { src: BASE + 'menu/aboutlink.ogg', volume: 0.25 },
        smiley1:   {
            src: 'https://pacomepertant.com/sounds/smiley/smiley1.ogg',
            volume: 0.20
        },
        smiley2:   {
            src: 'https://pacomepertant.com/sounds/smiley/smiley2.ogg',
            volume: 0.20
        }
    };

    /* Mapa editable: función de la web → nombre del sonido.
       También admite listas, por ejemplo:
       logoClick: ['smiley1', 'smiley2'] */
    const EVENT_SOUNDS = Object.assign({
        ambient: 'ambient',
        logoClick: ['smiley1', 'smiley2'],
        morphExpand: 'spiral',
        morphCollapse: 'list',
        sphereClick: 'switch',
        genericClick: 'click',
        itemHover: 'hover',
        projectOpen: 'longclick',
        contactClose: 'close'
    }, window.SITE_SOUND_MAP || {});

    const AUDIO_STATE_KEY = 'siteAudioContinuity';
    const AMBIENT_FADE_MS = 220;
    const AMBIENT_DUCK_FACTOR = 0.025;

    const sounds = {};
    const eventIndexes = {};
    let initialized = false;
    let enabled = true;
    let ambientRequested = false;
    let pageBindingsInstalled = false;
    let activeBlob = null;
    let lastSound = '';
    let lastEvent = '';
    let ambientDucked = false;
    let ambientFadeToken = 0;
    let interactionFadeToken = 0;
    let navigationPrepared = false;
    let pageAmbientEnabled = true;

    function ambientName() {
        return EVENT_SOUNDS.ambient;
    }

    function ambientConfig() {
        return SOUND_CONFIG[ambientName()] || SOUND_CONFIG.ambient;
    }

    function ambientTargetVolume() {
        const config = ambientConfig();
        return config.volume * (ambientDucked ? AMBIENT_DUCK_FACTOR : 1);
    }

    function readAudioState() {
        try {
            const raw = sessionStorage.getItem(AUDIO_STATE_KEY);
            if (!raw) return null;
            const state = JSON.parse(raw);
            if (!state || typeof state !== 'object') return null;
            return state;
        } catch (error) {
            return null;
        }
    }

    function persistAudioState() {
        const ambient = sounds[ambientName()];
        try {
            sessionStorage.setItem(AUDIO_STATE_KEY, JSON.stringify({
                enabled: enabled,
                ambientRequested: ambientRequested,
                currentTime: ambient && Number.isFinite(ambient.currentTime) ?
                    ambient.currentTime : 0,
                timestamp: Date.now()
            }));
        } catch (error) {
            /* La navegación sigue funcionando aunque el almacenamiento falle. */
        }
    }

    function fadeAmbientTo(target, duration, onComplete) {
        const ambient = sounds[ambientName()];
        if (!ambient) return;

        const token = ++ambientFadeToken;
        const from = ambient.volume;
        const start = performance.now();
        const ms = Math.max(0, Number(duration) || 0);

        function step(now) {
            if (token !== ambientFadeToken) return;
            const progress = ms === 0 ? 1 :
                Math.min(1, Math.max(0, (now - start) / ms));
            ambient.volume = from + ((target - from) * progress);
            if (progress < 1) {
                window.requestAnimationFrame(step);
                return;
            }
            if (typeof onComplete === 'function') onComplete();
        }

        window.requestAnimationFrame(step);
    }

    function fadeInteractionSounds() {
        const active = Object.keys(sounds).filter(function (name) {
            const audio = sounds[name];
            const config = SOUND_CONFIG[name];
            return audio && config && !config.loop && !audio.paused;
        }).map(function (name) {
            return {
                name: name,
                audio: sounds[name],
                from: sounds[name].volume
            };
        });
        if (!active.length) return;

        const token = ++interactionFadeToken;
        const start = performance.now();

        function step(now) {
            if (token !== interactionFadeToken) return;
            const progress = Math.min(1, Math.max(0,
                (now - start) / AMBIENT_FADE_MS));
            active.forEach(function (item) {
                item.audio.volume = item.from * (1 - progress);
            });
            if (progress < 1) {
                window.requestAnimationFrame(step);
                return;
            }
            active.forEach(function (item) {
                item.audio.pause();
                item.audio.currentTime = 0;
                item.audio.volume = SOUND_CONFIG[item.name].volume;
            });
        }

        window.requestAnimationFrame(step);
    }

    function prepareForNavigation() {
        if (navigationPrepared) return;
        navigationPrepared = true;
        ambientDucked = false;
        persistAudioState();

        const ambient = sounds[ambientName()];
        if (ambient && !ambient.paused) {
            fadeAmbientTo(0, AMBIENT_FADE_MS, function () {
                ambient.pause();
                ambient.volume = ambientConfig().volume;
                persistAudioState();
            });
        }
        fadeInteractionSounds();
    }

    function isInternalNavigation(target) {
        const link = target && target.closest('a[href]');
        if (!link || link.hasAttribute('download') || link.target === '_blank') {
            return false;
        }
        try {
            const url = new URL(link.href, window.location.href);
            return url.origin === window.location.origin &&
                url.protocol === window.location.protocol &&
                url.pathname !== window.location.pathname;
        } catch (error) {
            return false;
        }
    }

    function createSound(name) {
        if (sounds[name] || !SOUND_CONFIG[name]) return sounds[name] || null;

        const cfg = SOUND_CONFIG[name];
        const audio = new Audio(cfg.src);
        audio.volume = cfg.volume;
        audio.loop = Boolean(cfg.loop);
        audio.preload = cfg.loop || cfg.src.indexOf('./sounds/') === 0 ?
            'auto' : 'none';
        audio.addEventListener('error', function () {
            if (document.documentElement.dataset.lastSound === name) {
                document.documentElement.dataset.lastSoundStatus = 'error';
            }
        });
        sounds[name] = audio;
        return audio;
    }

    function init() {
        if (initialized) return true;
        const savedState = readAudioState();
        if (savedState) {
            enabled = savedState.enabled !== false;
            ambientRequested = savedState.ambientRequested === true;
        }
        const ambient = createSound(ambientName());
        if (ambient && savedState && Number.isFinite(savedState.currentTime)) {
            try {
                ambient.currentTime = Math.max(0, savedState.currentTime);
            } catch (error) {
                /* El navegador puede esperar a tener metadatos para ajustar el tiempo. */
            }
        }
        initialized = true;
        return true;
    }

    function resolveEventSound(eventName) {
        const configured = EVENT_SOUNDS[eventName];
        if (Array.isArray(configured)) {
            if (!configured.length) return '';
            const index = eventIndexes[eventName] || 0;
            eventIndexes[eventName] = (index + 1) % configured.length;
            return configured[index];
        }
        return configured || '';
    }

    function play(name, eventName) {
        if (!enabled || !name) return false;
        if (!initialized) init();

        const audio = createSound(name);
        if (!audio) {
            console.warn('[Audio] Sonido no configurado:', name);
            return false;
        }

        if (audio.loop && !audio.paused) return true;
        if (!audio.loop) audio.currentTime = 0;

        lastSound = name;
        lastEvent = eventName || '';
        document.documentElement.dataset.lastSound = name;
        document.documentElement.dataset.lastSoundEvent = lastEvent;
        document.documentElement.dataset.lastSoundStatus = 'pending';
        if (lastEvent && lastEvent !== 'ambient') {
            document.documentElement.dataset.lastInteractionSound = name;
            document.documentElement.dataset.lastInteractionEvent = lastEvent;
            document.documentElement.dataset.lastInteractionStatus = 'pending';
        }
        window.dispatchEvent(new CustomEvent('site:sound-play', {
            detail: { name: name, event: lastEvent }
        }));

        const result = audio.play();
        if (result && typeof result.catch === 'function') {
            result.then(function () {
                if (document.documentElement.dataset.lastSound === name) {
                    document.documentElement.dataset.lastSoundStatus =
                        'playing';
                }
                if (eventName && eventName !== 'ambient' &&
                    document.documentElement.dataset.lastInteractionSound ===
                        name) {
                    document.documentElement.dataset.lastInteractionStatus =
                        'playing';
                }
            }).catch(function () {
                if (document.documentElement.dataset.lastSound === name) {
                    document.documentElement.dataset.lastSoundStatus =
                        'blocked';
                }
                if (eventName && eventName !== 'ambient' &&
                    document.documentElement.dataset.lastInteractionSound ===
                        name) {
                    document.documentElement.dataset.lastInteractionStatus =
                        'blocked';
                }
            });
        }
        return true;
    }

    function playEvent(eventName) {
        return play(resolveEventSound(eventName), eventName);
    }

    function startAmbient() {
        if (!pageAmbientEnabled) return false;
        ambientRequested = true;
        if (!enabled) {
            persistAudioState();
            return false;
        }
        if (!initialized) init();

        const ambient = createSound(ambientName());
        if (!ambient) return false;
        if (ambient.paused) ambient.volume = 0;
        const result = play(ambientName(), 'ambient');
        if (result) fadeAmbientTo(ambientTargetVolume(), 360);
        persistAudioState();
        return result;
    }

    function stopAmbient() {
        ambientRequested = false;
        ambientDucked = false;
        const audio = sounds[ambientName()];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = ambientConfig().volume;
        }
        persistAudioState();
    }

    function setAmbientDucked(nextDucked) {
        ambientDucked = Boolean(nextDucked);
        if (!pageAmbientEnabled || !enabled || !ambientRequested) {
            return ambientDucked;
        }
        const ambient = sounds[ambientName()];
        if (ambient && !ambient.paused) {
            fadeAmbientTo(ambientTargetVolume(), AMBIENT_FADE_MS);
        }
        return ambientDucked;
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        Object.values(sounds).forEach(function (audio) {
            audio.muted = !enabled;
            if (!enabled && audio.loop) {
                fadeAmbientTo(0, AMBIENT_FADE_MS, function () {
                    audio.pause();
                    audio.volume = ambientConfig().volume;
                });
            }
        });
        if (enabled && ambientRequested) startAmbient();
        persistAudioState();
        return enabled;
    }

    function isInteractiveTarget(target) {
        return Boolean(target && target.closest(
            'a, button, input, textarea, select, [role="button"], .work'
        ));
    }

    function bindHoverElements(root) {
        (root || document).querySelectorAll('.pf-card, .work')
            .forEach(function (item) {
                if (item.dataset.soundHoverBound === 'true') return;
                item.dataset.soundHoverBound = 'true';
                item.addEventListener('mouseenter', function () {
                    playEvent('itemHover');
                });
            });
    }

    function bindPage(options) {
        activeBlob = options && options.blob ? options.blob : activeBlob;
        pageAmbientEnabled = !(options && options.ambient === false);
        if (pageBindingsInstalled) return;
        pageBindingsInstalled = true;
        init();
        Object.keys(SOUND_CONFIG).forEach(function (name) {
            if (name !== ambientName() &&
                SOUND_CONFIG[name].src.indexOf('./sounds/') === 0) {
                createSound(name);
            }
        });
        bindHoverElements(document);

        window.addEventListener('pagehide', persistAudioState);
        window.addEventListener('beforeunload', persistAudioState);

        if (pageAmbientEnabled && ambientRequested && enabled) {
            window.setTimeout(startAmbient, 0);
        }

        function unlockAudio() {
            startAmbient();
        }

        /* En el primer gesto suena antes el efecto pulsado y, al terminar
           el click, arranca el ambiente. Así no compiten por el desbloqueo. */
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, {
            once: true,
            passive: true
        });
        window.addEventListener('wheel', unlockAudio, {
            once: true,
            passive: true
        });
        window.addEventListener('keydown', unlockAudio, {
            once: true,
            capture: true
        });

        document.addEventListener('click', function (event) {
            const target = event.target instanceof Element
                ? event.target
                : event.target.parentElement;
            if (!target) return;

            if (target.closest('#logo a, .pf-topnav a, .about-topnav a')) {
                playEvent('logoClick');
                if (isInternalNavigation(target)) prepareForNavigation();
                return;
            }
            if (target.closest('#close_form')) {
                playEvent('contactClose');
                return;
            }
            if (target.closest('.pf-play, .pf-project-link')) {
                playEvent('projectOpen');
                if (isInternalNavigation(target)) prepareForNavigation();
                return;
            }
            if (isInteractiveTarget(target)) {
                playEvent('genericClick');
                if (isInternalNavigation(target)) prepareForNavigation();
            }
        });

        document.addEventListener('click', function (event) {
            const target = event.target instanceof Element
                ? event.target
                : event.target.parentElement;
            if (isInteractiveTarget(target)) return;
            if (activeBlob &&
                typeof activeBlob.containsPoint === 'function' &&
                activeBlob.containsPoint(event.clientX, event.clientY)) {
                playEvent('sphereClick');
            }
        });

        window.addEventListener('site:particle-morph', function (event) {
            const direction = event.detail && event.detail.direction;
            if (direction === 'expand') playEvent('morphExpand');
            if (direction === 'collapse') playEvent('morphCollapse');
        });

        document.addEventListener('visibilitychange', function () {
            const ambientName = EVENT_SOUNDS.ambient;
            const ambient = sounds[ambientName];
            if (!pageAmbientEnabled || !ambientRequested || !ambient) return;
            if (document.hidden) {
                persistAudioState();
                fadeAmbientTo(0, AMBIENT_FADE_MS, function () {
                    ambient.pause();
                    ambient.volume = ambientConfig().volume;
                    persistAudioState();
                });
            } else if (enabled) {
                startAmbient();
            }
        });
    }

    window.AudioEngine = {
        init: init,
        play: play,
        playEvent: playEvent,
        bindPage: bindPage,
        bindHoverElements: bindHoverElements,
        startAmbient: startAmbient,
        stopAmbient: stopAmbient,
        setEnabled: setEnabled,
        setAmbientDucked: setAmbientDucked,
        prepareForNavigation: prepareForNavigation,
        toggle: function () { return setEnabled(!enabled); },
        setEventSound: function (eventName, soundName) {
            EVENT_SOUNDS[eventName] = soundName;
            eventIndexes[eventName] = 0;
        },
        get enabled() { return enabled; },
        get events() { return EVENT_SOUNDS; },
        get sounds() { return SOUND_CONFIG; },
        get state() {
            return {
                initialized: initialized,
                ambientRequested: ambientRequested,
                pageAmbientEnabled: pageAmbientEnabled,
                ambientDucked: ambientDucked,
                ambientPlaying: Boolean(
                    sounds[ambientName()] && !sounds[ambientName()].paused
                ),
                ambientVolume: sounds[ambientName()] ?
                    sounds[ambientName()].volume : null,
                lastSound: lastSound,
                lastEvent: lastEvent
            };
        }
    };
})();
