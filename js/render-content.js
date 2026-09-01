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
                .map(function (l) {
                    var content = (/<[a-z][\s\S]*>/i.test(l)) ? l : esc(l);
                    return '<i class="no-wrap" data-split>' + content + '</i>';
                })
                .join('\n');
        }

        /* --- clientes --- */
        if (data.clients) {
            var coll = document.getElementById('collaborations');
            if (coll && data.clients.title) coll.textContent = data.clients.title;

            var testimonialTrack = document.getElementById('clientTestimonialsTrack');
            var testimonialCounter = document.getElementById('clientTestimonialsCounter');
            if (testimonialTrack && Array.isArray(data.clients.testimonials) &&
                data.clients.testimonials.length) {
                testimonialTrack.innerHTML = data.clients.testimonials.map(function (item, index) {
                    var active = index === 0;
                    return '<article class="client-testimonial' + (active ? ' is-active' : '') +
                        '" data-testimonial-index="' + index + '" aria-hidden="' +
                        String(!active) + '">' +
                        '<blockquote>' + esc(item.quote || '') + '</blockquote>' +
                        '<footer><strong>' + esc(item.name || '') +
                        '</strong><span>' + esc(item.role || '') +
                        '</span></footer></article>';
                }).join('\n');

                if (testimonialCounter) {
                    testimonialCounter.textContent = '01 / ' +
                        String(data.clients.testimonials.length).padStart(2, '0');
                }
            }

            var cul = document.getElementById('clientLogosTrack');
            if (cul && Array.isArray(data.clients.items)) {
                var logoMarkup = data.clients.items.map(function (c) {
                    if (c.logo) {
                        return '<li><img src="' + esc(c.logo) + '" alt="' + esc(c.name) +
                            '" loading="lazy" decoding="async" /></li>';
                    }
                    return '<li><span class="client-ph" style="' + esc(c.style || '') + '">' +
                        esc(c.name) + '</span></li>';
                }).join('\n');
                cul.innerHTML = logoMarkup;
            }
        }

        /* --- servicios --- */
        if (data.services) {
            var st = document.getElementById('services');
            if (st && data.services.title) st.textContent = data.services.title;
            var box = document.querySelector('.box-works');
            if (box && Array.isArray(data.services.groups)) {
                box.innerHTML = data.services.groups.map(function (g, i) {
                    var titleContent = (/<[a-z][\s\S]*>/i.test(g.name)) ? g.name : esc(g.name);
                    var descContent = (/<[a-z][\s\S]*>/i.test(g.description || '')) ? g.description : esc(g.description || '');
                return '<article class="work work-' + (i + 1) + '">' +
                        '<span class="service-number font-editorial">' + esc(g.number || ('0' + (i + 1) + '.')) + '</span>' +
                        '<h3>' + titleContent + '</h3>' +
                        '<p>' + descContent + '</p>' +
                        (Array.isArray(g.items) && g.items.length ?
                            '<ul class="service-categories" aria-label="Categorías de servicio">' +
                            g.items.map(function (item) {
                                return '<li>' + esc(item) + '</li>';
                            }).join('') +
                            '</ul>' : '') +
                        '</article>';
                }).join('\n');
            }
        }

        /* --- contacto / footer --- */
        if (data.contact) {
            var c = data.contact;
            var ft = document.getElementById('ftitle');
            if (ft && Array.isArray(c.cta)) {
                ft.innerHTML = c.cta
                    .map(function (w) {
                        var content = (/<[a-z][\s\S]*>/i.test(w)) ? w : esc(w);
                        return '<i class="no-wrap" data-split>' + content + '</i>';
                    })
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
        window.__CONTENT_READY__ = true;
        window.dispatchEvent(new CustomEvent('site:content-ready'));
    }

    window.__CONTENT__ = null;
    fetch('data/content.json', { cache: 'no-cache' })
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
