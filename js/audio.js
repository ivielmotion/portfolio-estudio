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

    const sounds = {};
    const eventIndexes = {};
    let initialized = false;
    let enabled = true;
    let ambientRequested = false;
    let pageBindingsInstalled = false;
    let activeBlob = null;
    let lastSound = '';
    let lastEvent = '';

    function createSound(name) {
        if (sounds[name] || !SOUND_CONFIG[name]) return sounds[name] || null;

        const cfg = SOUND_CONFIG[name];
        const audio = new Audio(cfg.src);
        audio.volume = cfg.volume;
        audio.loop = Boolean(cfg.loop);
        audio.preload = cfg.loop ? 'auto' : 'none';
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
        createSound(EVENT_SOUNDS.ambient);
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
        ambientRequested = true;
        if (!enabled) return false;
        return playEvent('ambient');
    }

    function stopAmbient() {
        ambientRequested = false;
        const ambientName = EVENT_SOUNDS.ambient;
        const audio = sounds[ambientName];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    function setEnabled(nextEnabled) {
        enabled = Boolean(nextEnabled);
        Object.values(sounds).forEach(function (audio) {
            audio.muted = !enabled;
            if (!enabled && audio.loop) audio.pause();
        });
        if (enabled && ambientRequested) startAmbient();
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
        if (pageBindingsInstalled) return;
        pageBindingsInstalled = true;
        init();
        bindHoverElements(document);

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
                return;
            }
            if (target.closest('#close_form')) {
                playEvent('contactClose');
                return;
            }
            if (target.closest('.pf-play, .pf-project-link')) {
                playEvent('projectOpen');
                return;
            }
            if (isInteractiveTarget(target)) {
                playEvent('genericClick');
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
            if (!ambientRequested || !ambient) return;
            if (document.hidden) ambient.pause();
            else if (enabled) play(ambientName, 'ambient');
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
                lastSound: lastSound,
                lastEvent: lastEvent
            };
        }
    };
})();
