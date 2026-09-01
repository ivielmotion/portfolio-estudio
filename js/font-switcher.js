/* ============================================================
   FONT SWITCHER - Sistema de Selección Tipográfica (6 Combinaciones Oficiales)
   1. Manrope + Instrument Serif (Moderna y Elegante)
   2. Space Grotesk + Cormorant Garamond (Futurista y Técnica)
   3. DM Sans + Bodoni Moda (Neutra y Alto Contraste)
   4. Sora + Playfair Display (Contemporánea y Expresiva)
   5. Poppins + EB Garamond (Geométrica y Atemporal)
   6. Plus Jakarta Sans + Fraunces (Sofisticada y Humana)
   ============================================================ */
(function() {
    'use strict';

    const STORAGE_KEY = 'portfolio_typography_option';

    const OPTIONS = [
        { id: 'option-1', name: 'Manrope + Instrument Serif', desc: '01: Moderna y elegante' },
        { id: 'option-2', name: 'Space Grotesk + Cormorant Garamond', desc: '02: Futurista y técnica' },
        { id: 'option-3', name: 'DM Sans + Bodoni Moda', desc: '03: Neutra y alto contraste' },
        { id: 'option-4', name: 'Sora + Playfair Display', desc: '04: Contemporánea y expresiva' },
        { id: 'option-5', name: 'Poppins + EB Garamond', desc: '05: Geométrica y atemporal' },
        { id: 'option-6', name: 'Plus Jakarta Sans + Fraunces', desc: '06: Sofisticada y humana' }
    ];

    function getSelectedOption() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlFont = urlParams.get('font');
        if (urlFont) {
            if (urlFont === 'a') return 'option-1';
            if (urlFont === 'b') return 'option-6';
            const num = parseInt(urlFont, 10);
            if (num >= 1 && num <= 6) return 'option-' + num;
        }

        return localStorage.getItem(STORAGE_KEY) || 'option-1';
    }

    function applyOption(optionId) {
        const body = document.body;
        if (!body) return;

        // Limpiar clases anteriores
        for (let i = 1; i <= 6; i++) {
            body.classList.remove('theme-option-' + i);
        }
        body.classList.remove('theme-option-a', 'theme-option-b');

        body.classList.add('theme-' + optionId);
        localStorage.setItem(STORAGE_KEY, optionId);

        updateWidgetUI(optionId);
    }

    function updateWidgetUI(currentOptionId) {
        const currentOption = OPTIONS.find(o => o.id === currentOptionId) || OPTIONS[0];
        const currentBadge = document.getElementById('ts-current-name');
        if (currentBadge) {
            currentBadge.textContent = currentOption.name;
        }

        OPTIONS.forEach(opt => {
            const btn = document.getElementById('ts-btn-' + opt.id);
            if (btn) {
                if (opt.id === currentOptionId) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                }
            }
        });
    }

    function createSwitcherWidget() {
        if (document.getElementById('typography-switcher-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'typography-switcher-widget';
        widget.className = 'ts-widget';
        widget.setAttribute('role', 'region');
        widget.setAttribute('aria-label', 'Selector de Tipografía');

        const optionsHTML = OPTIONS.map(opt => `
            <button type="button" id="ts-btn-${opt.id}" class="ts-btn" data-option="${opt.id}">
                <span class="ts-btn__badge">${opt.desc.split(':')[0]}</span>
                <span class="ts-btn__name">${opt.name}</span>
                <span class="ts-btn__desc">${opt.desc.split(':')[1]}</span>
            </button>
        `).join('');

        widget.innerHTML = `
            <div class="ts-widget__header">
                <span class="ts-widget__icon">Aa</span>
                <div class="ts-widget__info">
                    <span class="ts-widget__title">Tipografía Oficial (6 Pares)</span>
                    <span id="ts-current-name" class="ts-widget__subtitle">Manrope + Instrument Serif</span>
                </div>
                <button type="button" id="ts-toggle-minimize" class="ts-widget__minbtn" aria-label="Minimizar selector">—</button>
            </div>
            <div class="ts-widget__options" id="ts-options-panel">
                ${optionsHTML}
            </div>
        `;

        document.body.appendChild(widget);

        // Estilos del widget
        const style = document.createElement('style');
        style.id = 'ts-widget-styles';
        style.textContent = `
            .ts-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 99999;
                background: rgba(14, 11, 22, 0.92);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 16px;
                padding: 14px 16px;
                width: 320px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
                font-family: var(--font-ui, system-ui, sans-serif);
                color: #ffffff;
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .ts-widget.is-minimized .ts-widget__options {
                display: none;
            }
            .ts-widget.is-minimized {
                width: auto;
                padding: 10px 14px;
            }
            .ts-widget__header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .ts-widget__icon {
                font-family: var(--font-editorial, Georgia, serif);
                font-size: 22px;
                font-style: italic;
                line-height: 1;
                background: linear-gradient(135deg, var(--brand-pink, #ef216b), var(--brand-violet, #b031f7));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-weight: bold;
            }
            .ts-widget__info {
                display: flex;
                flex-direction: column;
                flex: 1;
            }
            .ts-widget__title {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.55);
            }
            .ts-widget__subtitle {
                font-size: 12px;
                font-weight: 600;
                color: #ffffff;
            }
            .ts-widget__minbtn {
                background: rgba(255, 255, 255, 0.08);
                border: none;
                color: #ffffff;
                border-radius: 50%;
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s ease;
            }
            .ts-widget__minbtn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            .ts-widget__options {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .ts-btn {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 8px 10px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.03);
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                width: 100%;
            }
            .ts-btn:hover {
                background: rgba(255, 255, 255, 0.08);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.2);
            }
            .ts-btn.active {
                background: linear-gradient(135deg, rgba(239, 33, 107, 0.22), rgba(176, 49, 247, 0.22));
                border-color: rgba(176, 49, 247, 0.7);
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(176, 49, 247, 0.2);
            }
            .ts-btn__badge {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                background: rgba(255, 255, 255, 0.12);
                padding: 2px 6px;
                border-radius: 4px;
                margin-bottom: 2px;
            }
            .ts-btn.active .ts-btn__badge {
                background: var(--brand-violet, #b031f7);
                color: #ffffff;
            }
            .ts-btn__name {
                font-size: 12px;
                font-weight: 600;
            }
            .ts-btn__desc {
                font-size: 10px;
                opacity: 0.65;
                margin-top: 1px;
            }
            @media (max-width: 600px) {
                .ts-widget {
                    bottom: 16px;
                    right: 16px;
                    width: calc(100vw - 32px);
                    max-width: 320px;
                }
            }
        `;
        document.head.appendChild(style);

        // Listeners para los 6 botones
        OPTIONS.forEach(opt => {
            const btn = document.getElementById('ts-btn-' + opt.id);
            if (btn) {
                btn.addEventListener('click', function() {
                    applyOption(opt.id);
                });
            }
        });

        const minBtn = document.getElementById('ts-toggle-minimize');
        minBtn.addEventListener('click', function() {
            widget.classList.toggle('is-minimized');
            minBtn.textContent = widget.classList.contains('is-minimized') ? '+' : '—';
        });
    }

    function init() {
        const initialOption = getSelectedOption();
        applyOption(initialOption);
        createSwitcherWidget();
        updateWidgetUI(initialOption);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
