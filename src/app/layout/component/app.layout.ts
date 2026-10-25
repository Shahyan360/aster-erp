import { environment } from '@/environments/environment';
import { DemoStore } from '@/app/demo/demo-store';
import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import { LoaderComponent } from '@/app/shared';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, AppConfigurator, RouterModule, LoaderComponent, ToastModule, ConfirmDialogModule],
    template: `<div class="layout-wrapper" [ngClass]="containerClass()">
        <a href="#main-content" class="skip-link">Skip to main content</a><app-topbar></app-topbar>
        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
            <main class="layout-main" id="main-content" tabindex="-1">
                @if (demo) {
                    <aside class="demo-banner" aria-label="Portfolio demo notice">
                        <span><strong>Portfolio sandbox</strong> · Synthetic data. Saves are simulated in this tab.</span><button type="button" (click)="resetDemo()">Reset sample data</button>
                    </aside>
                }
                <router-outlet></router-outlet>
            </main>
        </div>
        <div class="layout-mask"></div>
        <app-loader />
        <p-toast position="top-right" />
        <p-confirmdialog />
        <!-- Hidden: applies the persisted theme (primary/surface) on boot. -->
        <app-configurator />
    </div> `
})
export class AppLayout implements OnInit {
    readonly demo = environment.demoMode;
    private demoStore = inject(DemoStore);
    resetDemo(): void {
        this.demoStore.reset();
        window.location.assign('/');
    }
    layoutService = inject(LayoutService);

    constructor() {
        effect(() => {
            const state = this.layoutService.layoutState();
            if (state.mobileMenuActive) {
                document.body.classList.add('blocked-scroll');
            } else {
                document.body.classList.remove('blocked-scroll');
            }
        });
    }

    ngOnInit(): void {
        // Clear any leftover overflow styles or scroll classes applied during login or financial year selection
        document.body.classList.remove('blocked-scroll');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    containerClass = computed(() => {
        const config = this.layoutService.layoutConfig();
        const state = this.layoutService.layoutState();
        return {
            'layout-overlay': config.menuMode === 'overlay',
            'layout-static': config.menuMode === 'static',
            'layout-static-inactive': state.staticMenuDesktopInactive && config.menuMode === 'static',
            'layout-overlay-active': state.overlayMenuActive,
            'layout-mobile-active': state.mobileMenuActive
        };
    });
}
