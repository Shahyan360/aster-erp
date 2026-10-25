import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LayoutService } from '@/app/layout/service/layout.service';
import { Store } from '@ngrx/store';
import { selectAuthUser, selectFinancialYear } from '@/app/store/auth/auth.selectors';
import { AuthActions } from '@/app/store/auth/auth.actions';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `<header class="layout-topbar">
        <div class="topbar-left">
            <button class="topbar-icon" type="button" aria-label="Toggle navigation" (click)="layoutService.onMenuToggle()"><i class="pi pi-bars" aria-hidden="true"></i></button>
            <div class="workspace-search">
                <i class="pi pi-search" aria-hidden="true"></i><input aria-label="Search workspace pages" placeholder="Search workspace..." [ngModel]="query()" (ngModelChange)="query.set($event)" (keydown.escape)="query.set('')" autocomplete="off" />
                @if (query().trim()) {
                    <nav class="search-results" aria-label="Matching pages">
                        @for (page of matches(); track page.route) {
                            <a [routerLink]="page.route" (click)="query.set('')">{{ page.label }}<i class="pi pi-arrow-up-right"></i></a>
                        } @empty {
                            <p>No matching pages</p>
                        }
                    </nav>
                }
            </div>
        </div>
        <div class="topbar-right">
            <span class="fiscal-label"><i class="pi pi-calendar" aria-hidden="true"></i> FY {{ year()?.financialYearName }}</span>
            <a routerLink="/documentation" class="topbar-icon" aria-label="Workspace help"><i class="pi pi-question-circle" aria-hidden="true"></i></a>
            <div class="profile-menu">
                <button class="profile-trigger" type="button" aria-label="Account menu" [attr.aria-expanded]="dropdownOpen()" aria-controls="account-menu" (click)="toggleDropdown($event)">
                    <span class="profile-avatar" aria-hidden="true">{{ initials() }}</span
                    ><span class="profile-copy"
                        ><strong>{{ user()?.fullName || 'User' }}</strong
                        ><small>{{ user()?.role || 'Workspace member' }}</small></span
                    ><i class="pi pi-chevron-down" aria-hidden="true"></i>
                </button>
                @if (dropdownOpen()) {
                    <div class="profile-dropdown" id="account-menu">
                        <p>
                            Signed in as<strong>{{ user()?.email || 'user@example.com' }}</strong>
                        </p>
                        <button id="logout-btn" type="button" (click)="logout()"><i class="pi pi-sign-out"></i> Sign out</button>
                    </div>
                }
            </div>
        </div>
    </header>`,
    styles: `
        .topbar-left,
        .topbar-right {
            display: flex;
            align-items: center;
            gap: 1.2rem;
        }
        .topbar-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border: 0;
            background: transparent;
            color: var(--text-color-secondary);
            border-radius: 0.6rem;
            cursor: pointer;
            font-size: 1.1rem;
        }
        .topbar-icon:hover {
            background: var(--surface-hover);
        }
        .workspace-search {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.8rem;
            color: var(--text-color-secondary);
        }
        .workspace-search > input {
            background: transparent;
            border: 0;
            outline: 0;
            font-size: 0.86rem;
            width: 17rem;
            color: var(--text-color);
            padding: 0.6rem 0;
        }
        .search-results {
            position: absolute;
            top: 3rem;
            left: 0;
            min-width: 22rem;
            background: var(--surface-card);
            border: 1px solid var(--surface-border);
            box-shadow: 0 10px 35px #1018281a;
            border-radius: 0.75rem;
            padding: 0.5rem;
            z-index: 1100;
        }
        .search-results a {
            display: flex;
            justify-content: space-between;
            padding: 0.85rem;
            color: var(--text-color);
            font-size: 0.85rem;
            border-radius: 0.4rem;
        }
        .search-results a:hover {
            background: var(--surface-hover);
        }
        .search-results p {
            padding: 0.5rem;
        }
        .fiscal-label {
            font-size: 0.8rem;
            color: var(--text-color-secondary);
            display: flex;
            gap: 0.55rem;
            white-space: nowrap;
        }
        .profile-menu {
            position: relative;
        }
        .profile-trigger {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0;
            background: none;
            border: 0;
            color: var(--text-color);
            cursor: pointer;
        }
        .profile-avatar {
            width: 2.6rem;
            height: 2.6rem;
            background: #eef1ff;
            color: #4056ed;
            display: grid;
            place-items: center;
            border-radius: 50%;
            font-weight: 650;
            font-size: 0.8rem;
        }
        .profile-copy {
            text-align: left;
        }
        .profile-copy strong {
            display: block;
            font-size: 0.82rem;
            font-weight: 600;
        }
        .profile-copy small {
            display: block;
            font-size: 0.7rem;
            color: var(--text-color-secondary);
            margin-top: 0.4rem;
        }
        .profile-trigger > i {
            font-size: 0.7rem;
            color: var(--text-color-secondary);
        }
        .profile-dropdown {
            position: absolute;
            right: 0;
            top: 3.6rem;
            background: var(--surface-card);
            border: 1px solid var(--surface-border);
            border-radius: 0.75rem;
            box-shadow: 0 15px 35px #1018281a;
            width: 17rem;
            padding: 0.5rem;
            z-index: 1100;
        }
        .profile-dropdown p {
            font-size: 0.75rem;
            color: var(--text-color-secondary);
            padding: 0.5rem;
            line-height: 1.6;
        }
        .profile-dropdown strong {
            display: block;
            color: var(--text-color);
            font-size: 0.8rem;
        }
        .profile-dropdown button {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            width: 100%;
            border: 0;
            border-top: 1px solid var(--surface-border);
            background: none;
            padding: 1rem 0.5rem;
            cursor: pointer;
            color: #b42318;
            font-size: 0.85rem;
        }
        @media (max-width: 1150px) {
            .fiscal-label,
            .profile-copy {
                display: none;
            }
            .topbar-left,
            .topbar-right {
                gap: 0.5rem;
            }
            .workspace-search > input {
                width: 14rem;
            }
        }
        @media (max-width: 600px) {
            .workspace-search > input {
                width: 8rem;
            }
            .topbar-right > a {
                display: none;
            }
            .search-results {
                left: -3rem;
                min-width: 18rem;
            }
            .profile-trigger > i {
                display: none;
            }
        }
    `
})
export class AppTopbar {
    readonly layoutService = inject(LayoutService);
    private store = inject(Store);
    readonly user = this.store.selectSignal(selectAuthUser);
    readonly year = this.store.selectSignal(selectFinancialYear);
    readonly dropdownOpen = signal(false);
    readonly query = signal('');
    readonly initials = computed(() =>
        (this.user()?.fullName || 'User')
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
    );
    private readonly pages = [
        { label: 'Overview', route: '/' },
        { label: 'Payment vouchers', route: '/accounts/payment-voucher' },
        { label: 'New payment voucher', route: '/accounts/payment-voucher/new' },
        { label: 'General ledger', route: '/reports/general-ledger' },
        { label: 'Trial balance', route: '/reports/trial-balance' },
        { label: 'Chart of accounts', route: '/accounts/chart-of-account' }
    ];
    readonly matches = computed(() => this.pages.filter((p) => p.label.toLowerCase().includes(this.query().trim().toLowerCase())));
    toggleDropdown(event: Event): void {
        event.stopPropagation();
        this.dropdownOpen.update((v) => !v);
    }
    @HostListener('document:click') closeDropdown(): void {
        this.dropdownOpen.set(false);
    }
    @HostListener('document:keydown.escape') closeMenus(): void {
        this.dropdownOpen.set(false);
        this.query.set('');
    }
    logout(): void {
        this.store.dispatch(AuthActions.logout());
    }
}
