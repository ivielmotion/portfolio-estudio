/* ============================================================
   Carruseles de recomendaciones y logotipos de la sección clientes.
   ============================================================ */
(function () {
    'use strict';

    function initClientCarousels() {
        var root = document.querySelector('.client-testimonials');
        var track = document.getElementById('clientTestimonialsTrack');
        if (root && track && root.dataset.carouselReady !== 'true') {
            root.dataset.carouselReady = 'true';

            var slides = Array.from(track.querySelectorAll('.client-testimonial'));
            var counter = document.getElementById('clientTestimonialsCounter');
            var progress = document.getElementById('clientTestimonialsProgress');
            var current = 0;
            var timer = null;
            var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            function showSlide(index) {
                if (!slides.length) return;
                current = (index + slides.length) % slides.length;
                slides.forEach(function (slide, slideIndex) {
                    var active = slideIndex === current;
                    slide.classList.toggle('is-active', active);
                    slide.setAttribute('aria-hidden', String(!active));
                });
                if (counter) {
                    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' +
                        String(slides.length).padStart(2, '0');
                }
                if (progress) {
                    progress.style.width = ((current + 1) / slides.length * 100) + '%';
                }
            }

            function stopAutoPlay() {
                if (timer) window.clearInterval(timer);
                timer = null;
            }

            function startAutoPlay() {
                stopAutoPlay();
                if (!reduced && slides.length > 1) {
                    timer = window.setInterval(function () {
                        showSlide(current + 1);
                    }, 8500);
                }
            }

            root.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    showSlide(current - 1);
                    startAutoPlay();
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    showSlide(current + 1);
                    startAutoPlay();
                }
            });

            var pointerStartX = 0;
            var pointerStartY = 0;
            var pointerActive = false;

            function finishPointer(event) {
                if (!pointerActive) return;
                pointerActive = false;
                var deltaX = event.clientX - pointerStartX;
                var deltaY = event.clientY - pointerStartY;
                if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
                    showSlide(current + (deltaX < 0 ? 1 : -1));
                }
                startAutoPlay();
            }

            root.addEventListener('pointerdown', function (event) {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                pointerStartX = event.clientX;
                pointerStartY = event.clientY;
                pointerActive = true;
                stopAutoPlay();
                if (root.setPointerCapture) root.setPointerCapture(event.pointerId);
            });
            root.addEventListener('pointerup', finishPointer);
            root.addEventListener('pointercancel', function () {
                pointerActive = false;
                startAutoPlay();
            });

            root.addEventListener('mouseenter', stopAutoPlay);
            root.addEventListener('mouseleave', startAutoPlay);
            root.addEventListener('focusin', stopAutoPlay);
            root.addEventListener('focusout', function (event) {
                if (!root.contains(event.relatedTarget)) startAutoPlay();
            });

            showSlide(0);
            startAutoPlay();
        }

        var logos = document.getElementById('clientLogosTrack');
        if (logos && logos.dataset.loopReady !== 'true') {
            logos.dataset.loopReady = 'true';
            var originals = Array.from(logos.children);
            originals.forEach(function (item) {
                var copy = item.cloneNode(true);
                copy.setAttribute('aria-hidden', 'true');
                logos.appendChild(copy);
            });
        }
    }

    if (window.__CONTENT_READY__) initClientCarousels();
    else window.addEventListener('site:content-ready', initClientCarousels, { once: true });
})();
