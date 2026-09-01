/* ============================================================
   project.js — plantilla reutilizable de detalle
   - Un solo panel de caso para todos los proyectos
   - Vimeo se prepara en segundo plano sin bloquear la página
   - Animación de entrada, revelado de galería y siguiente proyecto
   ============================================================ */
(function () {
    'use strict';

    var fluidCanvas = document.getElementById('fluid-grid');
    if (fluidCanvas) {
        if (typeof FluidGrid === 'function' && FluidGrid.supported()) {
            try {
                window.siteFluidGrid = new FluidGrid(fluidCanvas);
                window.siteFluidGrid.start();
            } catch (error) {
                document.body.classList.add('no-fluid-grid');
            }
        } else {
            /* Sin WebGL2: queda el fondo estático de respaldo. */
            document.body.classList.add('no-fluid-grid');
        }
    }
    if (window.AudioEngine) AudioEngine.bindPage({ ambient: false });

    function esc(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getProjectId() {
        if (typeof URLSearchParams !== 'undefined') {
            return new URLSearchParams(window.location.search).get('id');
        }
        var match = window.location.search.match(/[?&]id=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    function normalizedId(project) {
        return project.id || String(project.title || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function safeExternalUrl(value) {
        return /^https?:\/\//.test(value || '') ? value : '';
    }

    function videoUrl(value) {
        if (!value) return '';
        var raw = String(value);
        if (/^\d{6,}$/.test(raw)) return 'https://vimeo.com/' + raw;
        return /^https:\/\/(?:www\.)?vimeo\.com\//.test(raw) ? raw : '';
    }

    function formatTime(seconds) {
        var value = Math.max(0, Math.floor(Number(seconds) || 0));
        var minutes = Math.floor(value / 60);
        var secs = String(value % 60).padStart(2, '0');
        return minutes + ':' + secs;
    }

    function readTransition() {
        try {
            var value = JSON.parse(
                sessionStorage.getItem('projectTransition') || 'null'
            );
            if (!value || Date.now() - value.timestamp > 12000) return null;
            return value;
        } catch (error) {
            return null;
        }
    }

    function clearTransition() {
        try {
            sessionStorage.removeItem('projectTransition');
        } catch (error) {
            /* No afecta a la página. */
        }
    }

    function removeProjectEntryCover() {
        var cover = document.getElementById('pjEntryCover');
        document.documentElement.classList.remove('is-project-transitioning');
        if (cover && cover.parentNode) cover.parentNode.removeChild(cover);
    }

    function heroMarkup(project) {
        var poster = project.poster || project.image;
        if (poster) {
            return '<img class="pj-hero-backdrop" src="' + esc(poster) +
                '" alt="" aria-hidden="true" decoding="async" />' +
                '<img class="pj-hero-poster" src="' + esc(poster) +
                '" alt="Portada de ' + esc(project.title) +
                '" decoding="async" fetchpriority="high" />';
        }
        return '<div class="pj-hero-placeholder" aria-hidden="true">' +
            esc(project.title) + '</div>';
    }

    function galleryMarkup(project) {
        var gallery = Array.isArray(project.gallery) && project.gallery.length ?
            project.gallery : [
                { caption: 'Composición y dirección visual.' },
                { caption: 'Detalle del sistema gráfico.' },
                { caption: 'Secuencia narrativa del proyecto.' }
            ];

        return gallery.map(function (item, index) {
            var media = item.image ?
                '<img src="' + esc(item.image) + '" alt="' +
                    esc(item.alt || item.caption ||
                        ('Imagen ' + (index + 1) + ' de ' + project.title)) +
                    '" loading="lazy" decoding="async" />' :
                '<div class="pj-gallery-placeholder" aria-hidden="true">' +
                    esc(project.title) + ' · 0' + (index + 1) +
                '</div>';
            var caption = item.caption ?
                '<figcaption>' + esc(item.caption) + '</figcaption>' : '';

            return '<figure class="pj-gallery-item pj-reveal" style="--reveal-delay:' +
                (index * 70) + 'ms">' + media + caption + '</figure>';
        }).join('');
    }

    function metaMarkup(project) {
        var data = [
            ['Cliente', project.client || 'Proyecto propio'],
            ['Rol', project.role || project.category || 'Dirección creativa'],
            ['Año', project.year || '2026']
        ];

        return '<dl class="pj-meta">' + data.map(function (item) {
            return '<div><dt>' + esc(item[0]) + '</dt><dd>' +
                esc(item[1]) + '</dd></div>';
        }).join('') + '</dl>';
    }

    function nextImageMarkup(project) {
        var image = project.image ||
            (Array.isArray(project.gallery) && project.gallery[0] &&
                project.gallery[0].image);
        if (image) {
            return '<img src="' + esc(image) + '" alt="' +
                esc(project.title) + '" loading="lazy" decoding="async" />';
        }
        return '<div class="pj-gallery-placeholder" aria-hidden="true">' +
            esc(project.title) + '</div>';
    }

    function renderProject(project, nextProject) {
        var currentVideo = videoUrl(project.video);
        var external = safeExternalUrl(project.url);
        var nextId = normalizedId(nextProject);
        var action = external ?
            '<a class="pj-pill-btn" href="' + esc(external) +
                '" target="_blank" rel="noopener" cursor-hover>' +
                '<span>' + esc(project.caseLabel || 'ver el proyecto') +
                '</span><span aria-hidden="true">•</span></a>' : '';
        var heroTag = currentVideo ?
            '<button class="pj-hero-trigger" type="button" data-project-video="' +
                esc(currentVideo) + '" aria-label="Reproducir ' +
                esc(project.title) + '">' + heroMarkup(project) + '</button>' :
            '<div class="pj-hero-trigger" aria-hidden="true">' +
                heroMarkup(project) + '</div>';

        container.innerHTML =
            '<section class="pj-project-shell" id="projectShell">' +
                '<a class="pj-close-btn" href="portfolio.html" ' +
                    'aria-label="Cerrar proyecto y volver al Portfolio" ' +
                    'data-project-close cursor-hover>×</a>' +
                '<div class="pj-hero">' + heroTag + '</div>' +
                '<div class="pj-case-content">' +
                    '<header class="pj-case-header pj-reveal">' +
                        '<div class="pj-case-heading">' +
                            '<p class="pj-kicker">' +
                                esc(project.category || 'Proyecto seleccionado') +
                            '</p>' +
                            '<h1 class="pj-case-title">' +
                                esc(project.title) + '</h1>' +
                        '</div>' +
                        '<div class="pj-case-copy">' +
                            '<p class="pj-case-desc">' +
                                esc(project.description || project.subtitle ||
                                    'Proyecto creativo y audiovisual.') +
                            '</p>' +
                            action +
                            metaMarkup(project) +
                        '</div>' +
                    '</header>' +
                    '<div class="pj-gallery" aria-label="Galería de ' +
                        esc(project.title) + '">' +
                        galleryMarkup(project) +
                    '</div>' +
                '</div>' +
            '</section>' +
            '<section class="pj-next-section" id="nextProject">' +
                '<a class="pj-back-link" href="portfolio.html" cursor-hover>' +
                    'volver al Portfolio</a>' +
                '<a class="pj-next-card" href="project.html?id=' +
                    encodeURIComponent(nextId) + '" data-next-id="' +
                    esc(nextId) + '" cursor-hover>' +
                    '<span class="pj-next-label pj-next-label--top">' +
                        'sigue bajando !</span>' +
                    '<div class="pj-next-image">' +
                        nextImageMarkup(nextProject) +
                    '</div>' +
                    '<span class="pj-next-label pj-next-label--bottom">' +
                        'siguiente…</span>' +
                    '<h2 class="pj-next-title">' +
                        esc(nextProject.title) + '</h2>' +
                '</a>' +
                '<div class="pj-next-progress" aria-hidden="true">' +
                    '<span></span></div>' +
            '</section>' +
            playerMarkup(project) +
            '<span class="pj-action-cursor" id="pjActionCursor" ' +
                'aria-hidden="true">play !</span>';

        document.title = (project.title || 'Proyecto') + ' — ESTUDIO';
        bindProject(project);
    }

    function playerIcon(name) {
        var common = '<svg viewBox="0 0 24 24" aria-hidden="true" ' +
            'focusable="false">';
        if (name === 'play') {
            return common + '<path fill="currentColor" d="M8 6.4v11.2L18 12z"/>' +
                '</svg>';
        }
        if (name === 'pause') {
            return common + '<path fill="currentColor" d="M7 6h4v12H7zm6 0h4v12h-4z"/>' +
                '</svg>';
        }
        if (name === 'muted') {
            return common +
                '<path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/>' +
                '<path fill="none" stroke="currentColor" stroke-width="2" ' +
                    'stroke-linecap="round" d="m16 9 5 5m0-5-5 5"/>' +
                '</svg>';
        }
        return common +
            '<path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/>' +
            '<path fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" d="M16 9.5c1.3 1.4 1.3 3.6 0 5m2.5-7.5c2.7 2.8 2.7 7.2 0 10"/>' +
            '</svg>';
    }

    function playerMarkup(project) {
        var poster = project.poster || project.image || '';
        var playerPoster = poster ?
            '<img class="pj-player__poster-media" src="' + esc(poster) +
                '" alt="" aria-hidden="true" />' :
            '<div class="pj-player__poster-media pj-player__poster-media--placeholder" ' +
                'aria-hidden="true">' + esc(project.title || 'Vídeo') + '</div>';
        return '<div class="pj-player" id="pjPlayer" role="dialog" ' +
            'aria-modal="true" aria-label="Reproductor de vídeo" hidden>' +
                '<div class="pj-player__shade"></div>' +
                '<div class="pj-player__stage">' +
                    '<div class="pj-player__video" id="pjVimeoMount">' +
                        '<div class="pj-player__poster" id="pjPlayerPoster" ' +
                            'aria-hidden="true">' + playerPoster + '</div>' +
                    '</div>' +
                    '<p class="pj-player__loading" id="pjPlayerLoading" hidden>' +
                        'Preparando vídeo…</p>' +
                    '<button class="pj-player__surface" id="pjPlayerSurface" ' +
                        'type="button" aria-label="Cerrar reproductor"></button>' +
                '</div>' +
                '<button class="pj-player__close" id="pjPlayerClose" ' +
                    'type="button" aria-label="Cerrar reproductor">×</button>' +
                '<div class="pj-player__controls">' +
                    '<button class="pj-player__button" id="pjPlayerToggle" ' +
                        'type="button" aria-label="Pausar">' +
                        playerIcon('pause') + '</button>' +
                    '<button class="pj-player__button" id="pjPlayerMute" ' +
                        'type="button" aria-label="Silenciar">' +
                        playerIcon('volume') + '</button>' +
                    '<div class="pj-player__timeline">' +
                        '<input class="pj-player__range" id="pjPlayerRange" ' +
                            'type="range" min="0" max="1000" value="0" ' +
                            'aria-label="Progreso del vídeo" />' +
                        '<output class="pj-player__time" id="pjPlayerTime">' +
                            '0:00 / 0:00</output>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="pj-video-preload" id="pjVimeoPreloadMount" ' +
                'aria-hidden="true"></div>';
    }

    var vimeoApiPromise = null;
    var vimeoPreload = null;
    var vimeoPlayer = null;
    var playerDuration = 0;
    var playerTrigger = null;
    var playerCloseTimer = null;
    var playerOpenToken = 0;
    var playerPaused = true;
    var videoAudioRequested = false;
    var videoAudioReady = false;
    var videoPlayConfirmed = false;
    var controlsHideTimer = null;
    var controlsHideDelay = 3000;
    var progressSyncTimer = null;
    var progressSyncToken = 0;
    var playerReadyForPlayback = false;
    var playerPlayRequested = false;
    var playerPauseRequested = false;
    var playerVideoWidth = 16;
    var playerVideoHeight = 9;

    function withTimeout(promise, milliseconds, message) {
        return Promise.race([
            Promise.resolve(promise),
            new Promise(function (_, reject) {
                window.setTimeout(function () {
                    reject(new Error(message || 'La operación tardó demasiado.'));
                }, milliseconds);
            })
        ]);
    }

    function sizePlayerVideo(width, height) {
        var mount = document.getElementById('pjVimeoMount');
        if (!mount) return;

        playerVideoWidth = Number(width) || playerVideoWidth;
        playerVideoHeight = Number(height) || playerVideoHeight;
        var ratio = playerVideoWidth / playerVideoHeight;
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        var fittedWidth = Math.min(viewportWidth, viewportHeight * ratio);
        var fittedHeight = Math.min(viewportHeight, viewportWidth / ratio);

        mount.style.width = Math.round(fittedWidth) + 'px';
        mount.style.height = Math.round(fittedHeight) + 'px';
    }

    function animatePlayerFromTrigger(trigger, reverse) {
        var mount = document.getElementById('pjVimeoMount');
        if (!mount || !mount.animate) return;

        var from = {
            opacity: 0,
            transform: 'scale(0.95)',
            borderRadius: '16px'
        };
        var to = {
            opacity: 1,
            transform: 'scale(1)',
            borderRadius: '0px'
        };

        mount.animate(reverse ? [to, from] : [from, to], {
            duration: reverse ? 250 : 400,
            delay: reverse ? 0 : 100,
            easing: 'ease-in-out',
            fill: 'both'
        });
    }

    function loadVimeoApi() {
        if (window.Vimeo && window.Vimeo.Player) {
            return Promise.resolve(window.Vimeo);
        }
        if (vimeoApiPromise) return vimeoApiPromise;

        vimeoApiPromise = new Promise(function (resolve, reject) {
            var script = document.querySelector(
                'script[src="https://player.vimeo.com/api/player.js"]'
            );
            var settled = false;
            function resolveWhenReady() {
                if (settled) return;
                if (window.Vimeo && window.Vimeo.Player) {
                    settled = true;
                    resolve(window.Vimeo);
                }
            }
            function rejectLoad() {
                if (settled) return;
                settled = true;
                reject(new Error('No se pudo cargar Vimeo.'));
            }
            if (!script) {
                script = document.createElement('script');
                script.src = 'https://player.vimeo.com/api/player.js';
                script.async = true;
                document.head.appendChild(script);
            }
            script.addEventListener('load', resolveWhenReady, { once: true });
            script.addEventListener('error', rejectLoad, { once: true });
            window.setTimeout(rejectLoad, 1800);
            resolveWhenReady();
        });
        return vimeoApiPromise;
    }

    function createVimeoIframe(url, mount, preload) {
        var match = String(url || '').match(
            /vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?(?:\?[^#]*\bh=([a-zA-Z0-9]+))?/
        );
        if (!match) return null;

        var params = [
            'autoplay=' + (preload ? '1' : '0'),
            'muted=' + (preload ? '1' : '0'),
            'autopause=0',
            'controls=0',
            'title=0',
            'byline=0',
            'portrait=0',
            'dnt=1'
        ];
        var privacyHash = match[2] || match[3];
        if (privacyHash) {
            params.push('h=' + encodeURIComponent(privacyHash));
        }

        var iframe = document.createElement('iframe');
        iframe.src = 'https://player.vimeo.com/video/' + match[1] + '?' +
            params.join('&');
        iframe.width = String(mount.clientWidth || window.innerWidth);
        iframe.height = String(mount.clientHeight || window.innerHeight);
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.title = 'Vídeo del proyecto';
        iframe.loading = 'eager';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('data-vimeo-preload', preload ? 'true' : 'false');
        mount.innerHTML = '';
        mount.appendChild(iframe);
        return iframe;
    }

    function prepareVimeo(url) {
        var holder = document.getElementById('pjVimeoPreloadMount');
        if (!holder || !url) return Promise.resolve(null);
        if (vimeoPreload && vimeoPreload.url === url &&
            vimeoPreload.promise) {
            return vimeoPreload.promise;
        }

        holder.innerHTML = '';
        var iframe = createVimeoIframe(url, holder, true);
        if (!iframe) return Promise.resolve(null);

        var state = {
            url: url,
            iframe: iframe,
            player: null,
            ready: false,
            iframeLoaded: false,
            exposed: false,
            promise: null
        };
        var iframeLoadResolve;
        state.iframeReady = new Promise(function (resolve) {
            iframeLoadResolve = resolve;
        });
        iframe.addEventListener('load', function () {
            state.iframeLoaded = true;
            iframeLoadResolve(state);
        }, { once: true });
        window.setTimeout(function () {
            iframeLoadResolve(state);
        }, 1800);
        vimeoPreload = state;
        var apiPreparation = loadVimeoApi()
            .then(function (Vimeo) {
                state.player = new Vimeo.Player(iframe);
                return withTimeout(state.player.ready(), 1800, 'Vimeo no respondió.')
                    .then(function () {
                    state.ready = true;
                    if (state.exposed) return state;
                    return withTimeout(state.player.setVolume(0), 700)
                        .catch(function () {})
                        .then(function () {
                            if (state.exposed) return state;
                            return withTimeout(state.player.play(), 900)
                                .catch(function () {});
                        })
                        .then(function () { return state; });
                });
            })
            .catch(function () {
                state.error = true;
                return state;
            });
        state.readyPromise = apiPreparation.then(function (prepared) {
            if (!prepared || !prepared.player || !prepared.ready) {
                throw new Error('Vimeo no está disponible.');
            }
            return prepared;
        });
        state.promise = Promise.race([
            apiPreparation,
            new Promise(function (resolve) {
                window.setTimeout(function () { resolve(state); }, 1800);
            })
        ]).then(function (prepared) {
            if (prepared && prepared.player && prepared.ready) return prepared;
            return state.iframeReady.then(function () { return state; });
        });
        return state.promise;
    }

    function showPlayerVideo(iframe) {
        var poster = document.getElementById('pjPlayerPoster');
        var loading = document.getElementById('pjPlayerLoading');
        var overlay = document.getElementById('pjPlayer');
        if (iframe) iframe.style.opacity = '1';
        if (poster) poster.hidden = true;
        if (loading) loading.hidden = true;
        if (overlay) overlay.dataset.videoReady = 'true';
    }

    function bindVimeoEvents(player, iframe) {
        if (!player) return;

        var previousHandlers = player.__estudioHandlers || {};
        Object.keys(previousHandlers).forEach(function (eventName) {
            try {
                player.off(eventName, previousHandlers[eventName]);
            } catch (error) {}
        });

        var handlers = {};
        handlers.timeupdate = function (data) {
            if (!playerReadyForPlayback || !videoPlayConfirmed) return;
            showPlayerVideo(iframe);
            updatePlayerProgress(data.seconds, data.duration, data.percent);
        };
        handlers.play = function () {
            if (!playerReadyForPlayback || !playerPlayRequested) return;
            confirmPlayerPlayback(iframe, player);
        };
        handlers.pause = function () {
            if (!playerPauseRequested) return;
            playerPauseRequested = false;
            playerPlayRequested = false;
            videoPlayConfirmed = false;
            playerPaused = true;
            updatePlayButton(true);
            stopProgressSync();
            showPlayerControls();
            if (window.AudioEngine) AudioEngine.setAmbientDucked(false);
        };
        handlers.ended = function () {
            finishPlayerPlayback();
        };
        handlers.volumechange = function (data) {
            var overlay = document.getElementById('pjPlayer');
            var isMuted = Boolean(data.muted) || data.volume === 0;
            if (!videoAudioReady && !videoAudioRequested) return;
            if (overlay) {
                overlay.dataset.volume = String(data.volume || 0);
                overlay.dataset.muted = String(isMuted);
            }
            updateMuteButton(isMuted);
        };

        player.__estudioHandlers = handlers;
        Object.keys(handlers).forEach(function (eventName) {
            player.on(eventName, handlers[eventName]);
        });
    }

    function confirmPlayerPlayback(iframe, player) {
        videoPlayConfirmed = true;
        playerPlayRequested = false;
        playerPauseRequested = false;
        playerPaused = false;
        showPlayerVideo(iframe);
        updatePlayButton(false);
        /* El vídeo debe empezar con un solo clic en la miniatura. La
           barra queda fuera del camino mientras reproduce y reaparece
           al mover el cursor o tocar el reproductor. */
        hidePlayerControls();
        startProgressSync();
        if (videoAudioRequested) {
            ensureVideoAudio(player).catch(function () {});
        }
    }

    function ensureVideoAudio(player) {
        if (!player) return Promise.resolve();
        var unmute = typeof player.setMuted === 'function' ?
            player.setMuted(false) : Promise.resolve();
        var volume = player.setVolume(1);
        return Promise.all([unmute, volume]).then(function () {
            var overlay = document.getElementById('pjPlayer');
            if (overlay) {
                overlay.dataset.volume = '1';
                overlay.dataset.muted = 'false';
            }
            updateMuteButton(false);
        });
    }

    function updatePlayerProgress(seconds, duration, percent) {
        var range = document.getElementById('pjPlayerRange');
        var time = document.getElementById('pjPlayerTime');
        var total = Number(duration) || playerDuration || 0;
        var current = Number(seconds);
        var ratio = Number(percent);

        if (total > 0 && Number.isFinite(current)) {
            ratio = current / total;
        }
        if (!Number.isFinite(ratio)) ratio = 0;
        ratio = Math.min(1, Math.max(0, ratio));

        if (range && !range.matches(':active')) {
            range.value = String(Math.round(ratio * 1000));
            range.style.setProperty('--pj-progress', (ratio * 100) + '%');
        }
        if (time) {
            time.textContent = formatTime(Number.isFinite(current) ? current : 0) +
                ' / ' + formatTime(total);
        }
    }

    function stopProgressSync() {
        ++progressSyncToken;
        if (progressSyncTimer) {
            window.clearTimeout(progressSyncTimer);
            progressSyncTimer = null;
        }
    }

    function startProgressSync() {
        stopProgressSync();
        var token = progressSyncToken;

        function poll() {
            if (token !== progressSyncToken || playerPaused || !vimeoPlayer ||
                typeof vimeoPlayer.getCurrentTime !== 'function') {
                return;
            }

            var activePlayer = vimeoPlayer;
            var durationPromise = playerDuration > 0 ?
                Promise.resolve(playerDuration) : activePlayer.getDuration();
            Promise.all([
                activePlayer.getCurrentTime(),
                durationPromise
            ]).then(function (values) {
                if (token !== progressSyncToken || playerPaused ||
                    activePlayer !== vimeoPlayer) return;
                playerDuration = Number(values[1]) || playerDuration;
                var currentTime = Number(values[0]) || 0;
                updatePlayerProgress(currentTime, playerDuration);
                if (playerDuration > 0 &&
                    currentTime >= playerDuration - 0.25) {
                    finishPlayerPlayback();
                    return;
                }
                progressSyncTimer = window.setTimeout(poll, 250);
            }).catch(function () {
                if (token === progressSyncToken && !playerPaused) {
                    progressSyncTimer = window.setTimeout(poll, 400);
                }
            });
        }

        poll();
    }

    function clearControlsHideTimer() {
        if (controlsHideTimer) {
            window.clearTimeout(controlsHideTimer);
            controlsHideTimer = null;
        }
    }

    function showPlayerControls() {
        var overlay = document.getElementById('pjPlayer');
        if (!overlay) return;
        clearControlsHideTimer();
        overlay.classList.remove('pj-player--controls-hidden');
        if (!playerPaused && !overlay.hidden) {
            controlsHideTimer = window.setTimeout(function () {
                if (!playerPaused && !overlay.hidden) {
                    overlay.classList.add('pj-player--controls-hidden');
                }
            }, controlsHideDelay);
        }
    }

    function hidePlayerControls() {
        var overlay = document.getElementById('pjPlayer');
        if (!overlay) return;
        clearControlsHideTimer();
        overlay.classList.add('pj-player--controls-hidden');
    }

    function finishPlayerPlayback() {
        videoPlayConfirmed = false;
        playerPlayRequested = false;
        playerPauseRequested = false;
        playerPaused = true;
        updatePlayButton(true);
        stopProgressSync();
        updatePlayerProgress(playerDuration, playerDuration, 1);
        showPlayerControls();
        if (window.AudioEngine) AudioEngine.setAmbientDucked(false);
    }

    function updatePlayButton(isPaused) {
        var button = document.getElementById('pjPlayerToggle');
        if (!button) return;
        button.innerHTML = playerIcon(isPaused ? 'play' : 'pause');
        button.setAttribute('aria-label', isPaused ? 'Reproducir' : 'Pausar');
    }

    function setPlayerPlaybackReady(isReady) {
        var button = document.getElementById('pjPlayerToggle');
        if (!button) return;
        button.disabled = !isReady;
        button.setAttribute('aria-disabled', String(!isReady));
    }

    function updateMuteButton(isMuted) {
        var button = document.getElementById('pjPlayerMute');
        if (!button) return;
        button.innerHTML = playerIcon(isMuted ? 'muted' : 'volume');
        button.setAttribute('aria-label', isMuted ?
            'Activar sonido' : 'Silenciar');
    }

    function requestPlayerPlay() {
        if (!vimeoPlayer || !playerReadyForPlayback) {
            playerPlayRequested = true;
            return;
        }

        videoAudioRequested = true;
        videoAudioReady = true;
        videoPlayConfirmed = false;
        playerPlayRequested = true;
        playerPauseRequested = false;
        if (window.AudioEngine) AudioEngine.setAmbientDucked(true);

        ensureVideoAudio(vimeoPlayer).catch(function () {
            updateMuteButton(true);
        });
        var play = vimeoPlayer.play();
        updateMuteButton(false);
        hidePlayerControls();
        Promise.resolve(play).then(function () {
            if (videoAudioRequested && vimeoPlayer) {
                return ensureVideoAudio(vimeoPlayer);
            }
        }).catch(function () {
            if (videoPlayConfirmed) return;
            playerPlayRequested = false;
            playerPaused = true;
            updatePlayButton(true);
            videoAudioRequested = false;
            showPlayerControls();
            if (window.AudioEngine) AudioEngine.setAmbientDucked(false);
        });
    }

    function openPlayer(url, trigger) {
        var overlay = document.getElementById('pjPlayer');
        var mount = document.getElementById('pjVimeoMount');
        var loading = document.getElementById('pjPlayerLoading');
        var poster = document.getElementById('pjPlayerPoster');
        var range = document.getElementById('pjPlayerRange');
        if (!overlay || !mount) return;

        window.clearTimeout(playerCloseTimer);
        clearControlsHideTimer();
        stopProgressSync();
        var openToken = ++playerOpenToken;
        playerTrigger = trigger;
        var actionCursor = document.getElementById('pjActionCursor');
        if (actionCursor) actionCursor.classList.remove('is-visible');
        overlay.classList.remove('is-closing');
        overlay.classList.add('pj-player--controls-hidden');
        overlay.hidden = false;
        overlay.dataset.videoReady = 'false';
        document.body.classList.add('pj-player-open');
        if (poster) poster.hidden = false;
        if (loading) loading.hidden = true;
        if (range) {
            range.value = '0';
            range.style.setProperty('--pj-progress', '0%');
        }
        updateMuteButton(false);
        playerPaused = true;
        playerReadyForPlayback = false;
        /* El clic de la miniatura es también la orden de reproducción. */
        playerPlayRequested = true;
        playerPauseRequested = false;
        vimeoPlayer = null;
        videoAudioRequested = true;
        videoAudioReady = true;
        videoPlayConfirmed = false;
        updatePlayButton(false);
        setPlayerPlaybackReady(false);
        sizePlayerVideo(16, 9);
        var existingIframe = mount.querySelector('iframe');
        if (existingIframe) existingIframe.remove();
        document.getElementById('pjPlayerClose').focus();

        var preparation = vimeoPreload && vimeoPreload.url === url ?
            vimeoPreload.promise : prepareVimeo(url);
        preparation.then(function (state) {
            if (openToken !== playerOpenToken || overlay.hidden) return;
            if (!state || !state.iframe) {
                throw new Error('Vimeo no está disponible.');
            }

            var iframe = state.iframe;
            state.exposed = true;
            if (!state.player || !state.ready) {
                return state.readyPromise;
            }
            return state;
        }).then(function (state) {
            if (openToken !== playerOpenToken || overlay.hidden) return;
            if (!state || !state.iframe || !state.player || !state.ready) {
                throw new Error('El vídeo no terminó de cargar.');
            }

            var iframe = state.iframe;
            mount.appendChild(iframe);
            /* La portada permanece visible hasta que Vimeo confirme el
               primer evento real de reproducción. Así nunca se muestra un
               fotograma congelado durante la preparación del iframe. */
            iframe.style.opacity = '0';
            vimeoPlayer = state.player;
            playerReadyForPlayback = false;
            playerPaused = true;
            updatePlayButton(true);
            animatePlayerFromTrigger(trigger, false);

            /* La precarga ya puede estar reproduciéndose en silencio. No la
               detenemos: al conservar esa reproducción, el primer clic no
               pierde el permiso de reproducción mientras termina la carga. */
            return withTimeout(ensureVideoAudio(vimeoPlayer), 900)
                .then(function () {
                    videoAudioReady = true;
                })
                .catch(function () {
                    overlay.dataset.volume = '1';
                    overlay.dataset.muted = 'false';
                    updateMuteButton(false);
                })
                .then(function () {
                    return withTimeout(vimeoPlayer.setCurrentTime(0), 700);
                })
                .then(function () {
                    return Promise.all([
                        withTimeout(vimeoPlayer.getVideoWidth(), 700),
                        withTimeout(vimeoPlayer.getVideoHeight(), 700)
                    ]);
                })
                .then(function (dimensions) {
                    sizePlayerVideo(dimensions[0], dimensions[1]);
                })
                .catch(function () {
                    return withTimeout(vimeoPlayer.pause(), 700)
                        .catch(function () {})
                        .then(function () {
                            playerPaused = true;
                            updatePlayButton(true);
                            overlay.dataset.volume = '1';
                            overlay.dataset.muted = 'false';
                            updateMuteButton(false);
                        });
                })
                .then(function () {
                    return withTimeout(vimeoPlayer.getDuration(), 700)
                        .catch(function () { return 0; });
                })
                .then(function (duration) {
                    playerDuration = duration || 0;
                    updatePlayerProgress(0, playerDuration, 0);
                    /* Los eventos se enlazan después de preparar el iframe.
                       La portada sigue visible hasta confirmar el primer
                       evento real de reproducción. */
                    bindVimeoEvents(vimeoPlayer, iframe);
                    playerReadyForPlayback = true;
                    setPlayerPlaybackReady(true);
                    if (!playerPlayRequested) return;

                    /* La precarga puede haber empezado antes de enlazar los
                       eventos. En ese caso no llamamos a play() por segunda
                       vez: confirmamos la reproducción ya existente. */
                    return withTimeout(vimeoPlayer.getPaused(), 700)
                        .then(function (isPaused) {
                            if (!isPaused) {
                                confirmPlayerPlayback(iframe, vimeoPlayer);
                                return;
                            }
                            requestPlayerPlay();
                        })
                        .catch(function () {
                            requestPlayerPlay();
                        });
                });
        }).catch(function () {
            if (openToken !== playerOpenToken || overlay.hidden) return;
            if (loading) {
                loading.hidden = false;
                loading.innerHTML =
                    '<a href="' + esc(url) +
                    '" target="_blank" rel="noopener" style="color:#fff">' +
                    'Abrir vídeo en Vimeo</a>';
            }
        });
    }

    function closePlayer() {
        var overlay = document.getElementById('pjPlayer');
        var mount = document.getElementById('pjVimeoMount');
        var holder = document.getElementById('pjVimeoPreloadMount');
        if (!overlay || overlay.hidden) return;

        if (overlay.classList.contains('is-closing')) return;
        ++playerOpenToken;
        clearControlsHideTimer();
        stopProgressSync();
        videoAudioRequested = false;
        videoAudioReady = false;
        videoPlayConfirmed = false;
        playerReadyForPlayback = false;
        playerPlayRequested = false;
        playerPauseRequested = false;
        setPlayerPlaybackReady(false);
        overlay.classList.add('is-closing');
        animatePlayerFromTrigger(playerTrigger, true);
        if (window.AudioEngine) AudioEngine.setAmbientDucked(false);
        if (vimeoPlayer) vimeoPlayer.pause().catch(function () {});

        playerCloseTimer = window.setTimeout(function () {
            var reusable = vimeoPreload &&
                vimeoPreload.player === vimeoPlayer &&
                vimeoPreload.iframe;
            if (reusable && holder) {
                reusable.style.opacity = '0';
                holder.appendChild(reusable);
            } else if (vimeoPlayer) {
                vimeoPlayer.destroy().catch(function () {});
            }
            vimeoPlayer = null;
            if (mount) {
                var mountedIframe = mount.querySelector('iframe');
                if (mountedIframe) mountedIframe.remove();
            }
            overlay.hidden = true;
            overlay.classList.remove('is-closing');
            overlay.dataset.videoReady = 'false';
            document.body.classList.remove('pj-player-open');
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(function () {});
            }
            if (playerTrigger) playerTrigger.focus();
        }, 300);
    }

    function togglePlayer() {
        if (!vimeoPlayer || !playerReadyForPlayback) {
            if (playerPaused) playerPlayRequested = true;
            return;
        }
        if (!playerPaused) {
            playerPlayRequested = false;
            playerPauseRequested = true;
            playerPaused = true;
            updatePlayButton(true);
            stopProgressSync();
            showPlayerControls();
            if (window.AudioEngine) AudioEngine.setAmbientDucked(false);
            vimeoPlayer.pause().catch(function () {});
            return;
        }

        requestPlayerPlay();
    }

    function toggleMute() {
        if (!vimeoPlayer) return;
        videoAudioReady = true;
        showPlayerControls();
        Promise.all([
            vimeoPlayer.getVolume(),
            typeof vimeoPlayer.getMuted === 'function' ?
                vimeoPlayer.getMuted() : Promise.resolve(false)
        ]).then(function (audioState) {
            var shouldEnable = Boolean(audioState[1]) ||
                Number(audioState[0]) === 0;
            videoAudioRequested = shouldEnable;
            var unmute = typeof vimeoPlayer.setMuted === 'function' ?
                vimeoPlayer.setMuted(!shouldEnable) : Promise.resolve();
            return unmute.then(function () {
                return vimeoPlayer.setVolume(shouldEnable ? 1 : 0);
            }).then(function () {
                updateMuteButton(!shouldEnable);
            });
        }).catch(function () {});
    }

    function bindPlayerControls() {
        var overlay = document.getElementById('pjPlayer');
        if (overlay) {
            ['pointermove', 'pointerdown', 'touchstart', 'keydown']
                .forEach(function (eventName) {
                    overlay.addEventListener(eventName, showPlayerControls, {
                        passive: eventName === 'touchstart'
                    });
                });
        }
        document.getElementById('pjPlayerClose')
            .addEventListener('click', closePlayer);
        document.getElementById('pjPlayerSurface')
            .addEventListener('click', closePlayer);
        document.getElementById('pjPlayerToggle')
            .addEventListener('click', togglePlayer);
        document.getElementById('pjPlayerMute')
            .addEventListener('click', toggleMute);
        document.getElementById('pjPlayerRange')
            .addEventListener('input', function (event) {
                if (!vimeoPlayer || !playerDuration) return;
                showPlayerControls();
                vimeoPlayer.setCurrentTime(
                    playerDuration * (Number(event.target.value) / 1000)
                ).catch(function () {});
                event.target.style.setProperty('--pj-progress',
                    (Number(event.target.value) / 10) + '%');
            });
    }

    function transitionRect(element) {
        if (!element) return null;
        var rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    function animateEntry(shell, project) {
        var transition = readTransition();
        clearTransition();
        var reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        if (
            !transition ||
            reducedMotion ||
            !shell ||
            !shell.animate
        ) {
            shell.classList.add('is-ready');
            removeProjectEntryCover();
            return;
        }

        var veil = document.getElementById('pjEntryCover');
        if (!veil) {
            veil = document.createElement('div');
            veil.className = 'pj-page-transition-veil';
            veil.setAttribute('aria-hidden', 'true');
            document.body.appendChild(veil);
        }
        shell.classList.add('is-transition-ready');
        var animation = veil.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], {
            duration: 460,
            easing: 'cubic-bezier(.4,0,.1,1)',
            fill: 'forwards'
        });

        var finish = function () {
            if (veil.parentNode) veil.parentNode.removeChild(veil);
            document.documentElement.classList.remove('is-project-transitioning');
        };
        animation.finished.then(finish).catch(finish);
        window.setTimeout(finish, 560);
    }

    function saveReturnTransition(project, shell) {
        var hero = shell && shell.querySelector('.pj-hero');
        var poster = hero && hero.querySelector('.pj-hero-poster');
        var current = null;
        try {
            current = JSON.parse(
                sessionStorage.getItem('portfolioReturn') || 'null'
            );
        } catch (error) {}

        var state = {
            filter: current && current.filter ? current.filter : 'all',
            scrollY: current && typeof current.scrollY === 'number' ?
                current.scrollY : 0,
            id: normalizedId(project),
            fromRect: transitionRect(hero),
            image: poster ? (poster.currentSrc || poster.src || '') : '',
            timestamp: Date.now()
        };
        try {
            sessionStorage.setItem('portfolioReturn', JSON.stringify(state));
        } catch (error) {
            /* El regreso normal sigue funcionando si el almacenamiento falla. */
        }
    }

    function bindProjectClose(shell, project) {
        var links = Array.from(document.querySelectorAll(
            '[data-project-close], .pj-back-link'
        ));
        if (!links.length || !shell) return;

        links.forEach(function (link) {
            link.addEventListener('click', function (event) {
                event.stopPropagation();
                saveReturnTransition(project, shell);
                if (
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                    !shell.animate
                ) return;

                event.preventDefault();
                var destination = link.href;
                var navigated = false;
                function navigate() {
                    if (navigated) return;
                    navigated = true;
                    window.location.href = destination;
                }
                var veil = document.createElement('div');
                veil.className = 'pj-page-transition-veil pj-page-transition-veil--out';
                veil.setAttribute('aria-hidden', 'true');
                document.body.appendChild(veil);
                var shellAnimation = shell.animate([
                    { opacity: 1, transform: 'translateY(0) scale(1)' },
                    { opacity: 0, transform: 'translateY(0) scale(0.985)' }
                ], {
                    duration: 520,
                    easing: 'cubic-bezier(.4,0,.1,1)',
                    fill: 'both'
                });
                var veilAnimation = veil.animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], {
                    duration: 520,
                    easing: 'cubic-bezier(.4,0,.1,1)',
                    fill: 'forwards'
                });
                veilAnimation.finished.then(navigate).catch(navigate);
                shellAnimation.finished.catch(function () {});
                window.setTimeout(navigate, 600);
            });
        });
    }

    function bindReveals() {
        var elements = Array.from(document.querySelectorAll('.pj-reveal'));
        if (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)
        ) {
            elements.forEach(function (element) {
                element.classList.add('is-visible');
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.16,
            rootMargin: '0px 0px -7% 0px'
        });

        elements.forEach(function (element) {
            observer.observe(element);
        });
    }

    function bindNextProgress() {
        var section = document.getElementById('nextProject');
        var bar = document.querySelector('.pj-next-progress span');
        if (!section || !bar) return;

        function update() {
            var rect = section.getBoundingClientRect();
            var travel = window.innerHeight + rect.height;
            var progress = Math.min(1, Math.max(0,
                (window.innerHeight - rect.top) / travel
            ));
            bar.style.transform = 'scaleY(' + progress + ')';
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    function saveNextTransition(link) {
        var media = link.querySelector('.pj-next-image');
        if (!media) return;
        var rect = media.getBoundingClientRect();
        var image = media.querySelector('img');
        try {
            sessionStorage.setItem('projectTransition', JSON.stringify({
                id: link.getAttribute('data-next-id'),
                sourceRect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                image: image ? (image.currentSrc || image.src) : '',
                timestamp: Date.now()
            }));
        } catch (error) {
            /* La navegación continúa. */
        }
    }

    function bindActionCursor(element, label) {
        var cursor = document.getElementById('pjActionCursor');
        if (!element || !cursor || window.matchMedia('(hover: none)').matches) {
            return;
        }

        function move(event) {
            cursor.style.setProperty('--cursor-x', (event.clientX + 16) + 'px');
            cursor.style.setProperty('--cursor-y', (event.clientY + 16) + 'px');
        }

        element.addEventListener('mouseenter', function (event) {
            cursor.textContent = label;
            move(event);
            cursor.classList.add('is-visible');
        });
        element.addEventListener('mousemove', move);
        element.addEventListener('mouseleave', function () {
            cursor.classList.remove('is-visible');
        });
    }

    function bindProjectCursorZone() {
        var hero = document.querySelector('.pj-hero');
        var actionCursor = document.getElementById('pjActionCursor');
        if (!hero) return;

        var scheduled = false;
        function update() {
            scheduled = false;
            var heroIsVisible = hero.getBoundingClientRect().bottom > 0;
            document.body.classList.toggle('pj-hero-cursor-only', heroIsVisible);
            if (!heroIsVisible && !document.body.classList.contains('pj-player-open') && actionCursor) {
                actionCursor.classList.remove('is-visible');
            }
        }

        function scheduleUpdate() {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(update);
        }

        update();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate, { passive: true });
    }

    function bindProject(project) {
        var shell = document.getElementById('projectShell');
        var heroButton = document.querySelector('[data-project-video]');
        var projectClose = document.querySelector('[data-project-close]');
        var nextLink = document.querySelector('[data-next-id]');
        var playerSurface = document.getElementById('pjPlayerSurface');
        var playerControls = document.querySelector('.pj-player__controls');
        var actionCursor = document.getElementById('pjActionCursor');

        animateEntry(shell, project);
        bindReveals();
        bindNextProgress();
        bindPlayerControls();
        bindProjectClose(shell, project);
        bindProjectCursorZone();
        bindActionCursor(heroButton, 'play !');
        bindActionCursor(projectClose, 'close');
        bindActionCursor(playerSurface, 'close');
        if (playerControls && actionCursor) {
            playerControls.addEventListener('mouseenter', function () {
                actionCursor.classList.remove('is-visible');
            });
        }
        window.addEventListener('resize', function () {
            sizePlayerVideo(playerVideoWidth, playerVideoHeight);
        }, { passive: true });

        if (heroButton) {
            prepareVimeo(heroButton.getAttribute('data-project-video'));
            heroButton.addEventListener('click', function () {
                openPlayer(
                    heroButton.getAttribute('data-project-video'),
                    heroButton
                );
            });
        }

        if (nextLink) {
            nextLink.addEventListener('click', function () {
                saveNextTransition(nextLink);
            });
        }

        document.addEventListener('keydown', function (event) {
            var overlay = document.getElementById('pjPlayer');
            if (!overlay || overlay.hidden) return;
            if (event.key === 'Escape') closePlayer();
            if (
                event.code === 'Space' &&
                event.target.tagName !== 'INPUT' &&
                event.target.tagName !== 'BUTTON'
            ) {
                event.preventDefault();
                togglePlayer();
            }
        });

        if (typeof initCursorHover === 'function') initCursorHover();
    }

    var container = document.getElementById('projectContainer');
    if (!container) return;

    var requestedId = getProjectId();
    fetch('data/content.json', { cache: 'default' })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            var items = (data && data.portfolio || []).filter(function (item) {
                return item.visible !== false;
            });
            if (!items.length) throw new Error('No hay proyectos.');

            var currentIndex = items.findIndex(function (item) {
                return normalizedId(item) === requestedId;
            });
            if (currentIndex < 0) currentIndex = 0;
            renderProject(
                items[currentIndex],
                items[(currentIndex + 1) % items.length]
            );
        })
        .catch(function (error) {
            console.error('Error cargando el proyecto:', error);
            container.innerHTML =
                '<p class="pj-error">No se pudo cargar el proyecto.</p>';
        });
})();
