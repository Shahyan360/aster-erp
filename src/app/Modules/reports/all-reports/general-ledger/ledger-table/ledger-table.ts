import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LedgerTransaction } from '../general-ledger.types';

@Component({
    selector: 'app-ledger-table',
    imports: [CommonModule, FormsModule],
    templateUrl: './ledger-table.html',
    styleUrl: './ledger-table.scss',
})
export class LedgerTable {
    transactions = input<LedgerTransaction[]>([]);
    entryCount = input(0);
    searchTerm = input('');
    loading = input(false);

    searchTermChange = output<string>();
}
