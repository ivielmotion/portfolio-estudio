/* ============================================================
   portfolio.js — página de trabajos
   - Fondo: retícula fluida de puntos de marca (FluidGrid)
   - Mantiene el Portfolio y sus filtros
   - Abre cada trabajo en la plantilla reutilizable project.html
   - Guarda el origen de la tarjeta para la transición de escalado
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
    if (window.AudioEngine) AudioEngine.bindPage({});

    function esc(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function projectId(project) {
        return project.id || String(project.title || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function card(project, index) {
        var id = projectId(project);
        var title = esc(project.title || 'Sin título');
        var formats = ['portrait', 'tall', 'square'];
        var format = formats.indexOf(project.format) >= 0 ?
            project.format : 'portrait';
        var projectUrl = 'project.html?id=' + encodeURIComponent(id);
        var revealDelay = Math.min(index * 70, 420);
        var revealDirection = index % 2 ? ' pf-reveal--reverse' : '';
        var media = project.image ?
            '<img src="' + esc(project.image) + '" alt="' + title +
                '" loading="lazy" decoding="async" />' :
            '<div class="pf-placeholder" aria-hidden="true">' +
                esc((project.title || '?').charAt(0)) + '</div>';

        return '<article class="pf-card pf-reveal' + revealDirection +
            ' pf-card--' + format + '" data-project-id="' + esc(id) +
            '" style="--reveal-delay:' + revealDelay + 'ms">' +
                '<a class="pf-project-link" href="' + projectUrl +
                    '" data-project-link="' + esc(id) + '" cursor-hover>' +
                    '<div class="pf-media">' +
                        media +
                        '<span class="pf-open-mark" aria-hidden="true">↗</span>' +
                    '</div>' +
                '</a>' +
                '<h2 class="pf-title">' +
                    '<a href="' + projectUrl + '" data-project-link="' +
                        esc(id) +
                        '" style="color:inherit;text-decoration:none;" cursor-hover>' +
                        title +
                    '</a>' +
                '</h2>' +
            '</article>';
    }

    function desiredColumns() {
        if (window.innerWidth <= 640) return 1;
        if (window.innerWidth <= 790) return 2;
        return 4;
    }

    function rectData(element) {
        if (!element) return null;
        var rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    function mediaSource(element) {
        var image = element && element.querySelector('img');
        return image ? (image.currentSrc || image.src || '') : '';
    }

    function saveTransition(link) {
        var cardElement = link.closest('.pf-card');
        if (!cardElement) return;
        var media = cardElement.querySelector('.pf-media');

        var state = {
            id: link.getAttribute('data-project-link'),
            sourceRect: rectData(media),
            image: mediaSource(media),
            timestamp: Date.now()
        };

        try {
            sessionStorage.setItem('projectTransition', JSON.stringify(state));
            sessionStorage.setItem('portfolioReturn', JSON.stringify({
                filter: activeFilter,
                scrollY: window.scrollY,
                id: state.id
            }));
        } catch (error) {
            /* La navegación sigue funcionando si el almacenamiento está bloqueado. */
        }

        cardElement.classList.add('is-opening');
        document.body.classList.add('pf-navigating');
    }

    function bindCards() {
        if (window.AudioEngine) AudioEngine.bindHoverElements(grid);

        grid.querySelectorAll('[data-project-link]').forEach(function (link) {
            link.addEventListener('click', function (event) {
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                ) return;

                saveTransition(link);
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    return;
                }

                event.preventDefault();
                var href = link.href;
                var veil = document.createElement('div');
                veil.className = 'pf-page-transition-veil pf-page-transition-veil--out';
                veil.setAttribute('aria-hidden', 'true');
                document.body.appendChild(veil);
                var animation = veil.animate([
                    { opacity: 0 },
                    { opacity: 1 }
                ], {
                    duration: 500,
                    easing: 'cubic-bezier(.4,0,.1,1)',
                    fill: 'forwards'
                });
                var navigated = false;
                var navigate = function () {
                    if (navigated) return;
                    navigated = true;
                    window.location.href = href;
                };
                animation.finished.then(navigate).catch(navigate);
                window.setTimeout(function () {
                    navigate();
                }, 580);
            });
        });
    }

    var portfolioItems = [];
    var renderedColumns = 0;
    var activeFilter = 'all';
    var returnState = null;
    var returningFromProject = false;
    var revealObserver = null;

    try {
        returnState = JSON.parse(sessionStorage.getItem('portfolioReturn') || 'null');
        if (returnState && returnState.filter) activeFilter = returnState.filter;
        returningFromProject = !!returnState;
    } catch (error) {
        returnState = null;
    }

    function renderGrid(items) {
        if (!items.length) {
            grid.innerHTML =
                '<p class="pf-status">Todavía no hay proyectos en esta categoría.</p>';
            renderedColumns = desiredColumns();
            return;
        }

        var count = desiredColumns();
        var columns = Array.from({ length: count }, function () { return []; });

        items.forEach(function (item, index) {
            columns[index % count].push(card(item, index));
        });

        grid.innerHTML = columns.map(function (column) {
            return '<div class="pf-column">' + column.join('\n') + '</div>';
        }).join('\n');
        renderedColumns = count;
        bindReveals(returningFromProject);
        bindCards();
    }

    function bindReveals(immediate) {
        if (revealObserver) {
            revealObserver.disconnect();
            revealObserver = null;
        }

        var elements = Array.from(grid.querySelectorAll('.pf-reveal'));
        if (
            immediate ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !('IntersectionObserver' in window)
        ) {
            elements.forEach(function (element) {
                element.classList.add('is-visible');
            });
            return;
        }

        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.16,
            rootMargin: '0px 0px -7% 0px'
        });

        elements.forEach(function (element) {
            revealObserver.observe(element);
        });
    }

    function filteredItems() {
        if (activeFilter === 'all') return portfolioItems;
        return portfolioItems.filter(function (item) {
            return Array.isArray(item.tags) &&
                item.tags.indexOf(activeFilter) >= 0;
        });
    }

    function syncFilterButtons() {
        document.querySelectorAll('.pf-filter').forEach(function (button) {
            var selected = button.getAttribute('data-filter') === activeFilter;
            button.classList.toggle('is-active', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }

    document.querySelectorAll('.pf-filter').forEach(function (button) {
        button.addEventListener('click', function () {
            activeFilter = button.getAttribute('data-filter') || 'all';
            syncFilterButtons();
            renderGrid(filteredItems());
        });
    });

    function renderContact(contact) {
        if (!contact) return;
        var email = contact.email || 'hola@tumarca.com';
        var phone = contact.phone || '+00 000 000 000';
        var mailHref = 'mailto:' + email;
        var phoneHref = 'tel:' + phone.replace(/[^\d+]/g, '');

        document.getElementById('pfContactCta').setAttribute('href', mailHref);
        document.getElementById('pfContactMail').textContent = email;
        document.getElementById('pfContactMail').setAttribute('href', mailHref);
        document.getElementById('pfContactPhone').textContent = phone;
        document.getElementById('pfContactPhone').setAttribute('href', phoneHref);
        document.getElementById('pfContactAddress').textContent =
            contact.address || '';

        var socials = Array.isArray(contact.social) ? contact.social : [];
        document.getElementById('pfContactSocial').innerHTML = socials
            .filter(function (item) {
                return item && /^https?:\/\//.test(item.url || '');
            })
            .map(function (item) {
                return '<a href="' + esc(item.url) +
                    '" target="_blank" rel="noopener nofollow" cursor-hover>' +
                    esc(item.name || 'Red social') + '</a>';
            }).join('');
    }

    function restorePortfolioPosition(done) {
        var finish = typeof done === 'function' ? done : function () {};
        if (!returnState || typeof returnState.scrollY !== 'number') {
            finish();
            return;
        }
        var storedY = returnState && typeof returnState.scrollY === 'number' ?
            returnState.scrollY : 0;
        var targetY = Math.abs(storedY) < 80 ? 0 : storedY;
        function place() {
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, targetY);
        }

        place();
        requestAnimationFrame(place);
        window.setTimeout(place, 160);
        /* La posición queda fijada al instante; el scroll suave global se
           recupera después para los enlaces de ancla. */
        window.setTimeout(function () {
            document.documentElement.style.scrollBehavior = '';
        }, 320);
        try {
            sessionStorage.removeItem('portfolioReturn');
        } catch (error) {
            /* No bloquea la restauración visual. */
        }
        finish();
    }

    var grid = document.getElementById('pfGrid');
    grid.innerHTML = '<p class="pf-status">Cargando proyectos…</p>';

    fetch('data/content.json', { cache: 'default' })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            portfolioItems = (data && data.portfolio || []).filter(function (item) {
                return item.visible !== false;
            });
            renderContact(data && data.contact);

            if (!portfolioItems.length) {
                grid.innerHTML =
                    '<p class="pf-status">Todavía no hay proyectos publicados.</p>';
                releasePortfolioReturnCover();
                return;
            }

            if (
                activeFilter !== 'all' &&
                !portfolioItems.some(function (item) {
                    return Array.isArray(item.tags) &&
                        item.tags.indexOf(activeFilter) >= 0;
                })
            ) {
                activeFilter = 'all';
            }

            syncFilterButtons();
            renderGrid(filteredItems());
            restorePortfolioPosition(function () {
                returningFromProject = false;
            });
            releasePortfolioReturnCover();
        })
        .catch(function () {
            grid.innerHTML =
                '<p class="pf-status">No se pudo cargar el contenido.</p>';
            releasePortfolioReturnCover();
        });

    function releasePortfolioReturnCover() {
        var cover = document.getElementById('pfReturnCover');
        if (!cover || !document.documentElement.classList.contains(
            'is-portfolio-returning'
        )) return;

        function removeCover() {
            document.documentElement.classList.remove(
                'is-portfolio-returning'
            );
            if (cover.parentNode) cover.parentNode.removeChild(cover);
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            removeCover();
            return;
        }

        /* La vuelta usa un fundido corto sobre la tarjeta ya recuperada.
           Evitamos duplicar la imagen en dos capas durante el cambio de
           página, que era lo que producía la superposición extraña. */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var coverAnimation = cover.animate([
                    { opacity: 1 },
                    { opacity: 0 }
                ], {
                    duration: 440,
                    easing: 'cubic-bezier(.4,0,.1,1)',
                    fill: 'forwards'
                });
                coverAnimation.finished.then(removeCover).catch(removeCover);
                window.setTimeout(removeCover, 560);
            });
        });
        /* La capa se retira siempre, aunque una animación no finalice. */
        window.setTimeout(removeCover, 680);
    }

    var resizeQueued = false;
    window.addEventListener('resize', function () {
        if (resizeQueued || !portfolioItems.length) return;
        resizeQueued = true;
        requestAnimationFrame(function () {
            resizeQueued = false;
            if (desiredColumns() !== renderedColumns) {
                renderGrid(filteredItems());
            }
        });
    });
})();
