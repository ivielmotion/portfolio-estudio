/* ============================================================
   portfolio.js — página de trabajos
   - Arranca el blob (escena hero, tema oscuro permanente)
   - Lee data/content.json y pinta la cuadrícula de proyectos
   - Vídeos con facade: el iframe solo se crea al hacer clic
     (regla de RENDIMIENTO.md: 0 iframes en la carga inicial)
   ============================================================ */
(function () {
    'use strict';

    /* ---------- blob --- */
    var blob = new ParticleBlob(document.getElementById('blob_container'));
    blob.start();
    blob.setScene('hero');
    document.body.classList.add('dark');

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---------- extraer ID de Vimeo (URL completa o ID suelto) ---------- */
    function vimeoId(video) {
        if (!video) return null;
        var m = String(video).match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (m) return m[1];
        m = String(video).match(/^\d{6,}$/);
        return m ? m[0] : null;
    }

    /* ---------- tarjeta de proyecto ---------- */
    function card(p) {
        var title = esc(p.title || 'Sin título');
        var year = esc(p.year || '');
        var vid = vimeoId(p.video);
        var hasUrl = p.url && /^https?:\/\//.test(p.url);

        var media;
        if (p.image) {
            media = '<img src="' + esc(p.image) + '" alt="' + title +
                '" loading="lazy" decoding="async" />';
        } else {
            media = '<div class="pf-placeholder" aria-hidden="true">' +
                esc((p.title || '?').charAt(0)) + '</div>';
        }
        if (vid) {
            media += '<button class="pf-play" data-vimeo="' + vid + '" aria-label="Reproducir vídeo">' +
                '<span>▶</span></button>';
        }

        var links = '';
        if (hasUrl) {
            links += '<a href="' + esc(p.url) + '" target="_blank" rel="noopener" cursor-hover>ver sitio →</a>';
        }
        if (vid) {
            links += '<button data-vimeo="' + vid + '" cursor-hover>ver vídeo</button>';
        }

        return '<article class="pf-card">' +
            '<div class="pf-media">' + media + '</div>' +
            '<div class="pf-info">' +
            '<h2>' + title + '</h2>' +
            '<span class="pf-year">' + year + '</span>' +
            (links ? '<div class="pf-links">' + links + '</div>' : '') +
            '</div></article>';
    }

    /* ---------- facade → iframe al hacer clic ---------- */
    function activateVideo(btn) {
        var vid = btn.getAttribute('data-vimeo');
        if (!vid) return;
        var media = btn.closest('.pf-media');
        if (!media) return;
        media.innerHTML = '<iframe src="https://player.vimeo.com/video/' + vid +
            '?autoplay=1&title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" ' +
            'allowfullscreen loading="lazy" title="Vídeo de Vimeo"></iframe>';
    }

    /* ---------- carga del contenido ---------- */
    var grid = document.getElementById('pfGrid');
    grid.innerHTML = '<p class="pf-status">Cargando proyectos…</p>';

    fetch('data/content.json', { cache: 'no-store' })
        .then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
        })
        .then(function (data) {
            var items = (data && data.portfolio || []).filter(function (p) { return p.visible !== false; });

            // email de contacto en el pie
            if (data && data.contact && data.contact.email) {
                var mail = document.getElementById('pfMail');
                mail.textContent = data.contact.email;
                mail.href = 'mailto:' + data.contact.email;
            }

            if (!items.length) {
                grid.innerHTML = '<p class="pf-status">Todavía no hay proyectos publicados.</p>';
                return;
            }
            grid.innerHTML = items.map(card).join('\n');

            // activar vídeos (delegación simple)
            grid.querySelectorAll('[data-vimeo]').forEach(function (btn) {
                btn.addEventListener('click', function () { activateVideo(btn); });
            });
        })
        .catch(function () {
            grid.innerHTML = '<p class="pf-status">No se pudo cargar el contenido.</p>';
        });
})();
