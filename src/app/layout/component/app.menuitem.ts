import { Component, computed, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { LayoutService } from '@/app/layout/service/layout.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: '[app-menuitem]',
    imports: [CommonModule, RouterModule, RippleModule],
    template: `
        @if (root() && isVisible()) {
            <div class="layout-menuitem-root-text" [class.font-bold]="containsActiveRoute()">{{ item().label }}</div>
        }

        @if ((!hasRouterLink() || hasChildren()) && isVisible()) {
            <a
                [attr.href]="item().url"
                [attr.aria-label]="item().label"
                [attr.role]="hasChildren() ? 'button' : null"
                [attr.aria-expanded]="hasChildren() ? isActive() : null"
                (keydown.enter)="itemClick($event)"
                (keydown.space)="itemClick($event)"
                (click)="itemClick($event)"
                class="menu_item_list"
                [ngClass]="item().class"
                [attr.target]="item().target"
                tabindex="0"
                pRipple
            >
                @if (item().icon) {
                    <i [ngClass]="item().icon" class="pi layout-menuitem-icon"></i>
                }
                <span class="layout-menuitem-text" [class.font-bold]="containsActiveRoute()">{{ item().label }}</span>
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-left layout-submenu-toggler"></i>
                }
            </a>
        }

        @if (hasRouterLink() && !hasChildren() && isVisible()) {
            <a
                (click)="itemClick($event)"
                [ngClass]="[item().class || '', !item().icon ? 'menu_item_link' : '']"
                [routerLink]="item().routerLink"
                [attr.aria-label]="item().label"
                routerLinkActive="active-route"
                [routerLinkActiveOptions]="item().routerLinkActiveOptions || { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }"
                [fragment]="item().fragment"
                [queryParamsHandling]="item().queryParamsHandling"
                [preserveFragment]="item().preserveFragment"
                [skipLocationChange]="item().skipLocationChange"
                [replaceUrl]="item().replaceUrl"
                [state]="item().state"
                [queryParams]="item().queryParams"
                [attr.target]="item().target"
                tabindex="0"
                pRipple
            >
                @if (item().icon) {
                    <i [ngClass]="item().icon" class="pi layout-menuitem-icon"></i>
                }
                <span class="layout-menuitem-text" [class.font-bold]="containsActiveRoute()">{{ item().label }}</span>
                @if (hasChildren()) {
                    <i class="pi pi-fw pi-angle-left layout-submenu-toggler"></i>
                }
            </a>
        }

        <!-- Expanded sidebar and flyout children use the normal inline submenu. -->
        @if (hasChildren() && isVisible() && shouldRenderInlineSubmenu()) {
            <ul [animate.enter]="initialized() ? 'p-submenu-enter' : null" [animate.leave]="'p-submenu-leave'" [class.layout-root-submenulist]="root()">
                @for (child of item().items; track child?.label) {
                    <li app-menuitem [item]="child" [parentPath]="fullPath()" [root]="false" [inFlyout]="inFlyout()" [class]="child['badgeClass']"></li>
                }
            </ul>
        }

        <!-- Collapsed sidebar opens only the clicked/hovered parent as a flyout panel. -->
        @if (hasChildren() && isVisible() && shouldRenderFlyoutSubmenu()) {
            <div class="menu-flyout" [animate.enter]="initialized() ? 'p-flyout-enter' : null" [animate.leave]="'p-flyout-leave'">
                <div class="px-4 py-2 mb-1.5 border-b border-gray-100 text-[0.8rem] font-bold text-gray-800 uppercase tracking-wider">
                    {{ item().label }}

                    <ul class="menu-flyout__list">
                        @for (child of item().items; track child?.label) {
                            <li app-menuitem [item]="child" [parentPath]="fullPath()" [root]="false" [inFlyout]="true" [class]="child['badgeClass']"></li>
                        }
                    </ul>
                </div>
            </div>
        }
    `,
    host: {
        '[class.active-menuitem]': 'isActive()',
        '[class.layout-root-menuitem]': 'root()',
        '(mouseenter)': 'onItemMouseEnter()',
        '(mouseleave)': 'onItemMouseLeave()'
    },
    styles: [
        `
            .p-submenu-enter {
                animation: p-animate-submenu-expand 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }

            .p-submenu-leave {
                animation: p-animate-submenu-collapse 450ms cubic-bezier(0.86, 0, 0.07, 1) forwards;
            }

            .p-flyout-enter {
                animation: p-animate-flyout-in 160ms ease-out forwards;
            }

            .p-flyout-leave {
                animation: p-animate-flyout-out 120ms ease-in forwards;
            }

            .menu_item_link {
                font-size: 0.8rem;
                padding: 0.6rem;
            }

            @keyframes p-animate-flyout-in {
                from {
                    opacity: 0;
                    transform: translateX(-6px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes p-animate-flyout-out {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-6px);
                }
            }

            @keyframes p-animate-submenu-expand {
                from {
                    max-height: 0;
                    overflow: hidden;
                }
                to {
                    max-height: 1000px;
                    overflow: visible;
                }
            }

            @keyframes p-animate-submenu-collapse {
                from {
                    max-height: 1000px;
                    overflow: hidden;
                }
                to {
                    max-height: 0;
                    overflow: hidden;
                }
            }
        `
    ]
})
export class AppMenuitem {
    layoutService = inject(LayoutService);

    router = inject(Router);

    item = input<any>(null);

    root = input<boolean>(false);

    /** True for recursive menu items rendered inside a collapsed-sidebar flyout. */
    inFlyout = input<boolean>(false);

    parentPath = input<string | null>(null);

    isVisible = computed(() => this.item()?.visible !== false);

    hasChildren = computed(() => this.item()?.items && this.item()?.items.length > 0);

    hasRouterLink = computed(() => !!this.item()?.routerLink);

    fullPath = computed(() => {
        const item = this.item();
        const itemPath = item?.path || item?.routerLink?.[0] || item?.url;

        if (itemPath) {
            const parent = this.parentPath();
            return parent && !itemPath.startsWith(parent) ? `${parent}|${itemPath}` : itemPath;
        }

        const label = item?.label?.toString().toLowerCase().replace(/\s+/g, '-');
        if (!label) {
            return this.parentPath();
        }

        return this.parentPath() ? `${this.parentPath()}|${label}` : label;
    });

    isActive = computed(() => {
        const activePath = this.layoutService.layoutState().activePath;
        return activePath?.startsWith(this.fullPath() ?? '') ?? false;
    });

    /** Current router URL (path only), kept in sync so derived state recomputes on navigation. */
    currentUrl = signal<string>(this.stripUrl(this.router.url));

    /**
     * True when the active route lives anywhere in this item's subtree. Drives the
     * submenu open state directly from the URL, so deep-linking / refreshing keeps the
     * containing groups expanded (groups without their own route can't self-activate otherwise).
     */
    containsActiveRoute = computed(() => this.subtreeMatchesUrl(this.item(), this.currentUrl()));

    initialized = signal<boolean>(false);

    constructor() {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.currentUrl.set(this.stripUrl(this.router.url));
                if (this.item()?.routerLink) {
                    this.updateActiveStateFromRoute();
                }
                this.autoExpandForRoute();
            });
    }

    /**
     * Open this group when the active route lives in its subtree. Seeds `activePath`
     * (the normal expand mechanism) so deep-link / refresh auto-expands the containing
     * groups, while still leaving them collapsible via click afterwards.
     */
    private autoExpandForRoute(): void {
        if (this.hasChildren() && !this.root() && this.containsActiveRoute()) {
            this.layoutService.layoutState.update((val) => ({ ...val, activePath: this.fullPath() }));
        }
    }

    isCollapsedRail(): boolean {
        // Flyout children should expand inline; only top-level rail items create flyouts.
        if (this.inFlyout()) {
            return false;
        }

        const state = this.layoutService.layoutState();
        const desktopCollapsed = this.layoutService.isDesktop() && state.staticMenuDesktopInactive;
        const mobileCollapsed = this.layoutService.isMobile() && !state.mobileMenuActive;
        return desktopCollapsed || mobileCollapsed;
    }

    shouldRenderInlineSubmenu(): boolean {
        // Normal menu expansion is used when the sidebar is open, or for children inside a flyout.
        return this.hasChildren() && this.isVisible() && (this.root() || this.isActive()) && !this.isCollapsedRail();
    }

    shouldRenderFlyoutSubmenu(): boolean {
        // Collapsed rail keeps the sidebar narrow and renders the active branch as a side panel.
        return this.hasChildren() && this.isVisible() && this.isActive() && this.isCollapsedRail();
    }

    onItemMouseEnter() {
        // 2. Ignore if it has no children or isn't a collapsed rail
        if (!this.hasChildren() || !this.isCollapsedRail()) {
            return;
        }

        this.layoutService.layoutState.update((val) => ({
            ...val,
            activePath: this.fullPath(),
            menuHoverActive: true
        }));
    }

    onItemMouseLeave() {
        if (!this.hasChildren() || !this.isCollapsedRail()) {
            return;
        }

        this.layoutService.layoutState.update((val) => ({
            ...val,
            activePath: this.parentPath(),
            menuHoverActive: false
        }));
    }

    /** Strip query string / fragment so route matching compares paths only. */
    private stripUrl(url: string): string {
        return url.split('?')[0].split('#')[0];
    }

    /** Recursively check whether `url` matches this item's routerLink or any descendant's. */
    private subtreeMatchesUrl(item: any, url: string): boolean {
        if (!item) return false;
        const link = item.routerLink?.[0];
        if (link && (url === link || url.startsWith(link + '/'))) return true;
        return (item.items ?? []).some((child: any) => this.subtreeMatchesUrl(child, url));
    }

    ngOnInit() {
        if (this.item()?.routerLink) {
            this.updateActiveStateFromRoute();
        }
        this.autoExpandForRoute();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.initialized.set(true);
        });
    }

    updateActiveStateFromRoute() {
        const item = this.item();
        if (!item?.routerLink) return;

        const isRouteActive = this.router.isActive(item.routerLink[0], {
            paths: 'exact',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored'
        });

        if (isRouteActive) {
            const parentPath = this.parentPath();
            if (parentPath) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: parentPath
                }));
            }
        }
    }

    itemClick(event: Event) {
        const item = this.item();

        if (item?.disabled) {
            event.preventDefault();
            return;
        }

        if (item?.command) {
            item.command({ originalEvent: event, item: item });
        }

        if (this.hasChildren()) {
            event.preventDefault();

            // In collapsed rail mode, clicking toggles just this item's flyout.
            if (this.isCollapsedRail()) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: this.isActive() ? this.parentPath() : this.fullPath(),
                    menuHoverActive: !this.isActive()
                }));
                return;
            }

            if (this.isActive()) {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: this.parentPath()
                }));
            } else {
                this.layoutService.layoutState.update((val) => ({
                    ...val,
                    activePath: this.fullPath(),
                    menuHoverActive: true
                }));
            }
        } else {
            this.layoutService.layoutState.update((val) => ({
                ...val,
                overlayMenuActive: false,
                staticMenuMobileActive: false,
                mobileMenuActive: false,
                menuHoverActive: false
            }));
        }
    }
}
