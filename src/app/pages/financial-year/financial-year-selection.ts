import { Component, OnDestroy } from '@angular/core';
import { FinancialYearModalComponent } from '@/app/shared';

/**
 * Full-screen gate shown right after login. It renders nothing but the
 * (blocking) financial-year modal over a branded backdrop, so the user picks a
 * year *before* being redirected into the dashboard.
 */
@Component({
    selector: 'app-financial-year-selection',
    standalone: true,
    imports: [FinancialYearModalComponent],
    template: `
        <div class="fy-gate">
            <div class="fy-gate__brand">
                <span class="fy-gate__logo">Aster ERP</span>
                <p class="fy-gate__hint">Preparing your workspace…</p>
            </div>
            <app-financial-year-modal />
        </div>
    `,
    styles: [
        `
            .fy-gate {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background:
                    radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--primary-color), transparent 80%), transparent),
                    var(--surface-ground, #f8fafc);
            }
            .fy-gate__brand {
                text-align: center;
                opacity: 0.7;
            }
            .fy-gate__logo {
                font-size: 2rem;
                font-weight: 800;
                letter-spacing: 0.04em;
                color: var(--primary-color);
            }
            .fy-gate__hint {
                margin-top: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-color-secondary, #6b7280);
            }
        `,
    ],
})
export class FinancialYearSelection implements OnDestroy {
    ngOnDestroy(): void {
        // Force-clear any layout classes and PrimeNG overflow-blocking styles added to the body
        document.body.classList.remove('p-overflow-hidden', 'blocked-scroll');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }
}
