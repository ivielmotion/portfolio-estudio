/* ============================================================
   about.js — página independiente de presentación del estudio.
   El contenido se lee desde data/content.json, sin depender de los
   clientes ni de los logotipos del Home.
   ============================================================ */
(function () {
    'use strict';

    var blobContainer = document.getElementById('blob_container');
    if (typeof ParticleBlob === 'function' && blobContainer) {
        var blob = new ParticleBlob(blobContainer);
        window.siteParticles = blob;
        var scene = window.PARTICLE_CONFIG && window.PARTICLE_CONFIG.pages
            ? window.PARTICLE_CONFIG.pages.aboutScene
            : 'portfolio';
        blob.setScene(scene || 'portfolio', true);
        blob.start();
        if (window.AudioEngine) AudioEngine.bindPage({ blob: blob });
    }

    function esc(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element && value) element.textContent = value;
    }

    function renderFacts(items) {
        var target = document.getElementById('aboutFacts');
        if (!target || !Array.isArray(items) || !items.length) return;
        target.innerHTML = items.map(function (item) {
            return '<li><span>' + esc(item.label) + '</span><strong>' +
                esc(item.value) + '</strong></li>';
        }).join('');
    }

    function renderPrinciples(items) {
        var target = document.getElementById('aboutPrinciples');
        if (!target || !Array.isArray(items) || !items.length) return;
        target.innerHTML = items.map(function (item, index) {
            var number = item.number || ('0' + (index + 1) + '.');
            return '<article><span class="about-principle__number">' +
                esc(number) + '</span><h3>' + esc(item.title) + '</h3><p>' +
                esc(item.text) + '</p></article>';
        }).join('');
    }

    function renderContact(contact) {
        if (!contact) return;
        var email = contact.email || 'hola@tumarca.com';
        var phone = contact.phone || '+00 000 000 000';
        var mailHref = 'mailto:' + email;
        var mail = document.getElementById('aboutContactMail');
        var phoneElement = document.getElementById('aboutContactPhone');
        var address = document.getElementById('aboutContactAddress');
        var cta = document.getElementById('aboutContactCta');
        var social = document.getElementById('aboutContactSocial');

        if (cta) cta.href = mailHref;
        if (mail) {
            mail.textContent = email;
            mail.href = mailHref;
        }
        if (phoneElement) {
            phoneElement.textContent = phone;
            phoneElement.href = 'tel:' + phone.replace(/[^\d+]/g, '');
        }
        if (address) address.innerHTML = esc(contact.address || '').replace(/\n/g, '<br />');
        if (social) {
            social.innerHTML = (Array.isArray(contact.social) ? contact.social : [])
                .filter(function (item) { return item && /^https?:\/\//.test(item.url || ''); })
                .map(function (item) {
                    return '<a href="' + esc(item.url) + '" target="_blank" rel="noopener nofollow" cursor-hover>' +
                        esc(item.name || 'Red social') + '</a>';
                }).join('');
        }
    }

    fetch('data/content.json', { cache: 'default' })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            var about = data && data.about;
            if (!about) return;
            setText('aboutEyebrow', about.eyebrow);
            setText('aboutTitleSans', about.titleSans);
            setText('aboutTitleEditorial', about.titleEditorial);
            setText('aboutIntro', about.intro);
            setText('aboutBio', about.bio);
            renderFacts(about.facts);
            renderPrinciples(about.principles);
            renderContact(data.contact);
        })
        .catch(function () {
            /* El HTML incluye un contenido inicial para no dejar la página vacía. */
        });
})();
