/* ============================================================
   ESTUDIO — orquestación de la experiencia
   - división de textos en letras/palabras con retardo escalonado
   - director de escenas del blob ligado al scroll
   - alternancia de tema claro/oscuro
   - reveals por sección (una sola vez)
   - contadores de premios con dígitos que ciclan
   - cursor personalizado (punto + círculo, blend difference)
   - botón magnético con anillo de texto rotatorio
   - overlay de contacto expansivo desde el punto de clic
   - tintes sociales del fondo
   ============================================================ */
(function () {
    'use strict';

    function startMain() {
    if (window.__MAIN_STARTED__) return;
    window.__MAIN_STARTED__ = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const body = document.body;

    /* ---------- 1. División de textos en spans (preservando clases e hijos) ---------- */
    function splitElement(el) {
        const childNodes = Array.from(el.childNodes);
        if (!childNodes.length) return;

        const isWordOnly = el.hasAttribute('data-split-words');
        const defaultClass = el.className || '';
        el.textContent = '';
        const frag = document.createDocumentFragment();

        function processTextNode(text, cls) {
            const words = text.split(/(\s+)/);
            words.forEach((w) => {
                if (/^\s+$/.test(w)) {
                    frag.appendChild(document.createTextNode(' '));
                } else if (w.length) {
                    if (isWordOnly) {
                        const s = document.createElement('span');
                        s.textContent = w;
                        if (cls) s.className = cls;
                        frag.appendChild(s);
                    } else {
                        const wrap = document.createElement('span');
                        wrap.style.whiteSpace = 'nowrap';
                        wrap.style.display = 'inline-block';
                        if (cls) wrap.className = cls;
                        for (const ch of w) {
                            const s = document.createElement('span');
                            s.textContent = ch;
                            if (cls) s.className = cls;
                            wrap.appendChild(s);
                        }
                        frag.appendChild(wrap);
                    }
                }
            });
        }

        childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node.textContent, defaultClass);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const combinedClass = [defaultClass, node.className].filter(Boolean).join(' ');
                processTextNode(node.textContent, combinedClass);
            }
        });

        el.appendChild(frag);
    }

    document.querySelectorAll('[data-split]').forEach(splitElement);

    function setDelay(el, start) {
        const spans = el.querySelectorAll('span');
        let i = 0;
        spans.forEach((s) => {
            // solo spans hoja (letras/palabras), no contenedores
            if (s.children.length === 0) {
                s.style.transitionDelay = ((i * 30) + start) + 'ms';
                i++;
            }
        });
    }

    setDelay(document.getElementById('intro'), 0);
    setDelay(document.getElementById('services'), 100);
    setDelay(document.getElementById('collaborations'), 100);
    setDelay(document.getElementById('ftitle'), 400);

    document.querySelectorAll('.work').forEach((work, i) => {
        work.style.transitionDelay = (400 + (i * 140)) + 'ms';
    });

    /* ---------- 2. Blob ---------- */
    const blob = new ParticleBlob(document.getElementById('blob_container'));
    window.siteParticles = blob;
    blob.start();
    const sceneController = new ParticleSceneController(blob);
    window.siteParticleScenes = sceneController;
    sceneController.start();
    if (window.AudioEngine) AudioEngine.bindPage({ blob: blob });

    /* ---------- 3. Utilidades de viewport ---------- */
    function isInViewport(elem) {
        if (!elem) return false;
        const b = elem.getBoundingClientRect();
        return (
            b.top >= 0 && b.left >= 0 &&
            b.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            b.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    const dHero = document.getElementById('delegato-hero');
    const dClientes = document.getElementById('delegato-clientes');
    const dServicios = document.getElementById('delegato-servicios');
    const dFooter = document.getElementById('delegato-footer');

    /* ---------- 4. Director de scroll ---------- */
    const revealed = new WeakSet();
    function reveal(el) {
        if (!el || revealed.has(el)) return;
        revealed.add(el);
        el.classList.add('animated');
    }

    function onScroll() {
        const hero = isInViewport(dHero);
        const clientes = isInViewport(dClientes);
        const servicios = isInViewport(dServicios);
        const footer = isInViewport(dFooter);

        // reveals (una sola vez)
        if (clientes) {
            reveal(document.getElementById('collaborations'));
            reveal(document.querySelector('.client-testimonials'));
            reveal(document.querySelector('.customer-clients'));
        }
        if (servicios) {
            reveal(document.getElementById('services'));
            document.querySelectorAll('.work').forEach(reveal);
        }
        if (footer) {
            reveal(document.getElementById('ftitle'));
            reveal(document.querySelector('.footer-box-center'));
            reveal(document.getElementById('address'));
            reveal(document.querySelector('.footer-box-right'));
        }
    }

    let scrollUpdateQueued = false;
    function requestScrollUpdate() {
        if (scrollUpdateQueued) return;
        scrollUpdateQueued = true;
        requestAnimationFrame(() => {
            scrollUpdateQueued = false;
            onScroll();
        });
    }
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate);

    // arranque: hero visible con entrada escalonada
    reveal(document.getElementById('intro'));
    onScroll();

    // hook de prueba/SEO: #scroll=1200 posiciona la página tras cargar
    const scrollMatch = location.hash.match(/scroll=(\d+)/);
    if (scrollMatch) {
        setTimeout(() => {
            window.scrollTo({ top: parseInt(scrollMatch[1], 10), behavior: 'auto' });
            onScroll();
            sceneController.update(false);
            requestAnimationFrame(onScroll);
            document.title = 'H' + document.documentElement.scrollHeight + ' Y' + window.scrollY;
        }, 400);
    }

    /* ---------- 6. Cursor personalizado ---------- */
    // El cursor vive en js/cursor.js (compartido con portfolio.html)

    /* ---------- 7. Overlay de contacto ---------- */
    const overlay = document.querySelector('.contact_overlay');
    const panel = document.getElementById('contact_panel');

    function openContact(x, y) {
        overlay.style.top = (y - 60) + 'px';
        overlay.style.left = (x - 60) + 'px';
        body.style.overflow = 'hidden';
        overlay.classList.add('opened');
        setTimeout(() => {
            panel.classList.add('animated');
            panel.setAttribute('aria-hidden', 'false');
        }, 300);
    }
    function closeContact() {
        panel.classList.remove('animated');
        panel.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            overlay.classList.remove('opened');
            body.style.overflowY = 'inherit';
        }, 100);
    }
    window.closeContactForm = closeContact;

    document.getElementById('ftitle').addEventListener('click', (e) => openContact(e.clientX, e.clientY));
    document.getElementById('edit_button').addEventListener('click', (e) => openContact(e.clientX, e.clientY));
    document.getElementById('edit_button').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openContact(window.innerWidth - 200, window.innerHeight - 200);
    });
    document.getElementById('ftitle').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openContact(window.innerWidth / 2, window.innerHeight / 2);
    });
    document.getElementById('close_form').addEventListener('click', closeContact);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContact(); });

    // envío: abre el cliente de correo con el contenido del formulario
    document.getElementById('contact_form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const subject = encodeURIComponent('Nuevo proyecto — ' + f.nombre.value);
        const bodyTxt = encodeURIComponent(f.mensaje.value + '\n\n— ' + f.nombre.value + ' (' + f.email.value + ')');
        const to = (window.__CONTENT__ && window.__CONTENT__.contact && window.__CONTENT__.contact.email) || 'hola@tumarca.com';
        window.location.href = 'mailto:' + to + '?subject=' + subject + '&body=' + bodyTxt;
    });

    /* ---------- 8. Botón magnético ---------- */
    const elm = document.getElementById('edit_button');
    if (elm && !reduced) {
        // Repulsión: solo trabaja cuando realmente ocurre scroll.
        let currentPixel = window.pageYOffset;
        const delta = window.innerWidth < 480 ? 0 : 5;
        function updateScrollButton() {
            const newPixel = window.pageYOffset;
            const diff = newPixel - currentPixel;
            const speed = diff * delta;
            elm.style.top = -speed + 'px';
            currentPixel = newPixel;
            requestAnimationFrame(() => { elm.style.top = '0px'; });
        }
        if (delta) {
            window.addEventListener('scroll', updateScrollButton, { passive: true });
        }

        // Atracción magnética: se calcula solo cuando se mueve el puntero.
        let cX = -9999, cY = -9999, magneticQueued = false;
        function updateMagnetic() {
            magneticQueued = false;
            const bound = elm.getBoundingClientRect();
            const diagonal = Math.sqrt(bound.width * bound.width + bound.height * bound.height);
            const centerX = bound.width / 2 + bound.x;
            const centerY = bound.height / 2 + bound.y;
            const distance = Math.sqrt(Math.pow(centerX - cX, 2) + Math.pow(centerY - cY, 2));
            const diffX = cX - centerX;
            const diffY = cY - centerY;
            const maxDistance = (diagonal + distance) / 2;
            if (distance < maxDistance) {
                const percent = 1 - (distance / maxDistance);
                elm.style.transform = 'translate(' + Math.round(diffX * percent) + 'px, ' + Math.round(diffY * percent) + 'px)';
            } else {
                elm.style.transform = '';
            }
        }
        document.addEventListener('mousemove', (e) => {
            cX = e.clientX;
            cY = e.clientY;
            if (!magneticQueued) {
                magneticQueued = true;
                requestAnimationFrame(updateMagnetic);
            }
        }, { passive: true });
        document.addEventListener('mouseleave', () => {
            elm.style.transform = '';
        });
    }

    /* ---------- 9. Tintes sociales ---------- */
    const social = document.querySelectorAll('.footer-box-right li a');
    const tints = ['tint-fb', 'tint-ig', 'tint-tiktok'];
    social.forEach((a, i) => {
        a.addEventListener('mouseover', () => body.classList.add(tints[i] || ''));
        a.addEventListener('mouseout', () => body.classList.remove(tints[i] || ''));
    });

    const editBtn = document.getElementById('edit_button');
    const cursor = document.querySelector('.cursor');
    editBtn.addEventListener('mouseover', () => cursor.classList.add('cursor_onbutton'));
    editBtn.addEventListener('mouseout', () => cursor.classList.remove('cursor_onbutton'));

    /* ---------- 10. Logo: volver arriba ---------- */
    document.querySelector('#logo a').addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });

    }

    if (window.__CONTENT_READY__) startMain();
    else window.addEventListener('site:content-ready', startMain, { once: true });
})();
