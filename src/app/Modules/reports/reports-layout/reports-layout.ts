import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface ReportLink {
    label: string;
    icon: string;
    /** Route segment under /reports. */
    route: string;
    /** Placeholder report — points at the ledger for now and skips the active highlight. */
    placeholder?: boolean;
}

@Component({
    selector: 'app-reports-layout',
    imports: [CommonModule, RouterModule],
    templateUrl: './reports-layout.html',
    styleUrl: './reports-layout.scss'
})
export class ReportsLayout {
    reports: ReportLink[] = [
        { label: 'General Ledger', icon: 'pi-book', route: 'general-ledger' },
        { label: 'Trial Balance', icon: 'pi-list', route: 'trial-balance' }
    ];
}
