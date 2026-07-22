/* ============================================================
   render-content.js — contenido editable desde data/content.json
   Flujo: fetch del JSON (~5 KB) → render → arranca main.js.
   Si el fetch falla, la página usa el HTML embebido (fallback),
   así que nunca se queda en blanco.
   ============================================================ */
(function () {
    'use strict';

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function render(data) {
        if (!data) return;

        /* --- título y descripción del documento --- */
        if (data.site) {
            if (data.site.title) document.title = data.site.title;
            var md = document.querySelector('meta[name="description"]');
            if (md && data.site.description) md.setAttribute('content', data.site.description);
        }

        /* --- hero --- */
        var intro = document.getElementById('intro');
        if (intro && data.hero && Array.isArray(data.hero.lines)) {
            intro.innerHTML = data.hero.lines
                .map(function (l) { return '<i class="no-wrap" data-split>' + esc(l) + '</i>'; })
                .join('\n');
        }

        /* --- presentación --- */
        var text1 = document.getElementById('text1');
        if (text1 && data.about && Array.isArray(data.about.paragraphs)) {
            text1.innerHTML = data.about.paragraphs
                .map(function (p) { return '<p data-split>' + esc(p) + '</p>'; })
                .join('\n');
        }

        /* --- clientes --- */
        if (data.clients) {
            var coll = document.getElementById('collaborations');
            if (coll && data.clients.title) coll.textContent = data.clients.title;
            var cul = document.querySelector('.customer-clients');
            if (cul && Array.isArray(data.clients.items)) {
                cul.innerHTML = data.clients.items.map(function (c) {
                    if (c.logo) {
                        return '<li><img src="' + esc(c.logo) + '" alt="' + esc(c.name) +
                            '" loading="lazy" decoding="async" /></li>';
                    }
                    return '<li><span class="client-ph" style="' + esc(c.style || '') + '">' +
                        esc(c.name) + '</span></li>';
                }).join('\n');
            }
        }

        /* --- premios --- */
        if (data.awards) {
            var at = document.getElementById('aa-title');
            if (at && data.awards.title) at.textContent = data.awards.title;
            var atx = document.getElementById('award-text');
            if (atx && data.awards.text) atx.textContent = data.awards.text;
            var aul = document.getElementById('aa-loghi');
            if (aul && Array.isArray(data.awards.items)) {
                aul.innerHTML = data.awards.items.map(function (a) {
                    var n = parseInt(a.count, 10) || 0;
                    return '<li><span class="award-badge">' + esc(a.name) + '</span>' +
                        '<span class="not_animated" data-count="' + n + '">' + n + '</span></li>';
                }).join('\n');
            }
        }

        /* --- servicios --- */
        if (data.services) {
            var st = document.getElementById('services');
            if (st && data.services.title) st.textContent = data.services.title;
            var box = document.querySelector('.box-works');
            if (box && Array.isArray(data.services.groups)) {
                box.innerHTML = data.services.groups.map(function (g, i) {
                    return '<div class="work work-' + (i + 1) + '">' +
                        '<h3>' + esc(g.name) + '</h3>' +
                        '<ul id="' + esc(g.id || ('svc-' + (i + 1))) + '">' +
                        (g.items || []).map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') +
                        '</ul></div>';
                }).join('\n');
            }
        }

        /* --- contacto / footer --- */
        if (data.contact) {
            var c = data.contact;
            var ft = document.getElementById('ftitle');
            if (ft && Array.isArray(c.cta)) {
                ft.innerHTML = c.cta
                    .map(function (w) { return '<i class="no-wrap" data-split>' + esc(w) + '</i>'; })
                    .join('\n');
            }
            var addr = document.getElementById('address');
            if (addr && c.address) {
                // el CMS edita texto multilínea: escapar y convertir \n en <br/>
                addr.innerHTML = esc(c.address).replace(/\n/g, '<br/>');
            }
            var mail = document.getElementById('mail');
            if (mail && c.email) { mail.textContent = c.email; mail.href = 'mailto:' + c.email; }
            var phone = document.getElementById('phone');
            if (phone && c.phone) phone.textContent = c.phone;
            var soc = document.querySelector('.footer-box-right ul');
            if (soc && Array.isArray(c.social)) {
                soc.innerHTML = c.social.map(function (s) {
                    return '<li><a href="' + esc(s.url) + '" target="_blank" rel="nofollow" cursor-hover>' +
                        esc(s.name) + '</a></li>';
                }).join('\n');
            }
            var alt = document.querySelector('.contact_alt a');
            if (alt && c.email) { alt.textContent = c.email; alt.href = 'mailto:' + c.email; }
        }
    }

    function boot() {
        var s = document.createElement('script');
        s.src = 'js/main.js';
        document.body.appendChild(s);
    }

    window.__CONTENT__ = null;
    fetch('data/content.json', { cache: 'no-store' })
        .then(function (r) {
            if (!r.ok) throw new Error('http ' + r.status);
            return r.json();
        })
        .then(function (data) {
            window.__CONTENT__ = data;
            render(data);
            boot();
        })
        .catch(function () {
            // fallback: el HTML embebido ya contiene el contenido
            boot();
        });
})();
