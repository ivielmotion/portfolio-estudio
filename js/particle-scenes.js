/* ============================================================
   Control de escenas por scroll.
   Lee exclusivamente PARTICLE_CONFIG.scroll y llama al motor.
   ============================================================ */
(function () {
    'use strict';

    class ParticleSceneController {
        constructor(particles, options) {
            this.particles = particles;
            this.options = options || window.PARTICLE_CONFIG.scroll;
            this.entries = [];
            this.activeIndex = -1;
            this.activeThemeIndex = -1;
            this.linkedMorphActive = false;
            this.linkedProgress = null;
            this.linkedDirection = '';
            this.queued = false;
            this._requestUpdate = this.requestUpdate.bind(this);
        }

        emitMorph(direction) {
            window.dispatchEvent(new CustomEvent('site:particle-morph', {
                detail: { direction: direction }
            }));
        }

        start() {
            this.entries = this.options.entries.map(function (entry) {
                return {
                    config: entry,
                    element: document.querySelector(entry.marker)
                };
            }).filter(function (entry) {
                return entry.element;
            });

            window.addEventListener('scroll', this._requestUpdate, { passive: true });
            window.addEventListener('resize', this._requestUpdate);
            this.update(true);
        }

        requestUpdate() {
            if (this.queued) return;
            this.queued = true;
            requestAnimationFrame(() => {
                this.queued = false;
                this.update(false);
            });
        }

        update(immediate) {
            if (!this.entries.length) return;

            const configuredLine = this.options.activationLine;
            const activationLine = typeof configuredLine === 'number'
                ? configuredLine
                : configuredLine[this.particles.profileName];
            const activationY = window.scrollY +
                window.innerHeight * activationLine;
            const configuredThemeLine = this.options.themeActivationLine ||
                configuredLine;
            const themeActivationLine = typeof configuredThemeLine === 'number'
                ? configuredThemeLine
                : configuredThemeLine[this.particles.profileName];
            const themeActivationY = window.scrollY +
                window.innerHeight * themeActivationLine;
            let nextIndex = 0;
            let nextThemeIndex = 0;

            for (let i = 0; i < this.entries.length; i++) {
                const markerY = window.scrollY +
                    this.entries[i].element.getBoundingClientRect().top;
                if (markerY <= activationY) nextIndex = i;
                else break;
            }

            for (let i = 0; i < this.entries.length; i++) {
                const markerY = window.scrollY +
                    this.entries[i].element.getBoundingClientRect().top;
                if (markerY <= themeActivationY) nextThemeIndex = i;
                else break;
            }

            const linkedProfiles = this.options.linkedMorph;
            const linked = linkedProfiles &&
                linkedProfiles[this.particles.profileName];
            let linkedHandled = false;

            if (linked) {
                const startY = window.innerHeight * linked.startViewport;
                const endY = window.innerHeight * linked.endViewport;
                const scrollY = window.scrollY || window.pageYOffset || 0;

                if (scrollY <= endY) {
                    const progress = Math.max(0, Math.min(1,
                        (scrollY - startY) / Math.max(1, endY - startY)
                    ));
                    if (!immediate && this.linkedProgress != null) {
                        const progressDelta = progress - this.linkedProgress;
                        if (progressDelta > 0.002 &&
                            this.linkedDirection !== 'expand') {
                            this.emitMorph('expand');
                            this.linkedDirection = 'expand';
                        } else if (progressDelta < -0.002 &&
                            this.linkedDirection !== 'collapse') {
                            this.emitMorph('collapse');
                            this.linkedDirection = 'collapse';
                        }
                    }
                    this.linkedProgress = progress;
                    this.particles.setSceneProgress(
                        linked.from,
                        linked.to,
                        progress,
                        linked.smoothness,
                        linked.pulseScale,
                        linked.pulseExtra
                    );
                    this.activeIndex = progress >= 1 ? 1 : 0;
                    this.linkedMorphActive = true;
                    linkedHandled = true;
                } else {
                    /* Un gesto rápido puede saltar el final del rango. */
                    nextIndex = Math.max(nextIndex, 1);
                    if (this.linkedMorphActive) {
                        this.particles.setScene(linked.to, true);
                        this.activeIndex = 1;
                        this.linkedMorphActive = false;
                    }
                }
            } else if (this.linkedMorphActive) {
                /* Al pasar de móvil a PC se abandona el modo enlazado. */
                this.linkedMorphActive = false;
                this.particles.setScene(
                    this.entries[nextIndex].config.scene,
                    true
                );
                this.activeIndex = nextIndex;
            }

            if (!linkedHandled &&
                (nextIndex !== this.activeIndex || immediate)) {
                const previousIndex = this.activeIndex;
                if (!immediate && previousIndex >= 0) {
                    if (previousIndex === 0 && nextIndex > 0) {
                        this.emitMorph('expand');
                    } else if (previousIndex > 0 && nextIndex === 0) {
                        this.emitMorph('collapse');
                    }
                }
                this.activeIndex = nextIndex;
                this.particles.setScene(
                    this.entries[nextIndex].config.scene,
                    immediate
                );
            }

            if (nextThemeIndex !== this.activeThemeIndex || immediate) {
                this.activeThemeIndex = nextThemeIndex;
                document.body.classList.toggle(
                    'dark',
                    Boolean(this.entries[nextThemeIndex].config.dark)
                );
            }
        }

        stop() {
            window.removeEventListener('scroll', this._requestUpdate);
            window.removeEventListener('resize', this._requestUpdate);
        }
    }

    window.ParticleSceneController = ParticleSceneController;
})();
