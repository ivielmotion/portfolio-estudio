/* ============================================================
   Cursor personalizado compartido (index.html + portfolio.html)
   Punto instantáneo + círculo con retardo (~100 ms), blend
   difference. Los tamaños base se leen del CSS (dotB/circB).
   ============================================================ */
(function () {
    'use strict';

    var cursorEl = document.querySelector('.cursor');
    if (!cursorEl) return;

    var fine = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 459;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!fine || reduced) {
        cursorEl.style.display = 'none';
        document.body.style.cursor = 'auto';
        return;
    }

    var dot = cursorEl.querySelector('.cursor-dot');
    var circle = cursorEl.querySelector('.cursor-circle');
    var dotB = dot.getBoundingClientRect();
    var circB = circle.getBoundingClientRect();
    var mouse = { x: -100, y: -100 };
    var lastDot = { x: -100, y: -100 };
    var lastCirc = { x: -100, y: -100 };
    var scale = 1, lastScale = 1, opacity = 1, lastOpacity = 1;
    var raf = 0;

    window.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        requestRender();
    }, { passive: true });

    function lerp(a, b, n) { return (1 - n) * a + n * b; }
    function requestRender() {
        if (!raf) raf = requestAnimationFrame(render);
    }

    function render() {
        raf = 0;
        lastDot.x = lerp(lastDot.x, mouse.x - (dotB.width / lastScale) / 2, 1);
        lastDot.y = lerp(lastDot.y, mouse.y - (dotB.height / lastScale) / 2, 1);
        lastCirc.x = lerp(lastCirc.x, mouse.x - (circB.width * lastScale) / 2, 0.15);
        lastCirc.y = lerp(lastCirc.y, mouse.y - (circB.height * lastScale) / 2, 0.15);
        lastScale = lerp(lastScale, scale, 0.15);
        lastOpacity = lerp(lastOpacity, opacity, 0.1);
        dot.style.transform = 'translateX(' + lastDot.x + 'px) translateY(' + lastDot.y + 'px)';
        circle.style.transform = 'translateX(' + lastCirc.x + 'px) translateY(' + lastCirc.y + 'px)';
        circle.style.width = (circB.width * lastScale) + 'px';
        circle.style.height = (circB.height * lastScale) + 'px';
        circle.style.opacity = lastOpacity;
        dot.style.width = (dotB.width / lastScale) + 'px';
        dot.style.height = (dotB.height / lastScale) + 'px';

        var moving = Math.abs(lastCirc.x - (mouse.x - (circB.width * lastScale) / 2)) > 0.15 ||
            Math.abs(lastCirc.y - (mouse.y - (circB.height * lastScale) / 2)) > 0.15 ||
            Math.abs(lastScale - scale) > 0.01 ||
            Math.abs(lastOpacity - opacity) > 0.01;
        if (moving) requestRender();
    }
    requestRender();

    document.querySelectorAll('a, button, [cursor-hover], #ftitle, #close_form, #edit_button, .contact_submit').forEach(function (link) {
        link.addEventListener('mouseenter', function () { scale = 2; requestRender(); });
        link.addEventListener('mouseleave', function () { scale = 1; requestRender(); });
        link.addEventListener('click', function () {
            lastScale = 1;
            lastOpacity = 0;
            requestRender();
        });
    });
})();
