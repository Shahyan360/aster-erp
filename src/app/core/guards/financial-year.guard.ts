import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasFinancialYear } from '../services/session-storage';
export const financialYearGuard: CanActivateFn = () => (hasFinancialYear() ? true : inject(Router).createUrlTree(['/select-financial-year']));
export const financialYearSelectionGuard: CanActivateFn = () => (hasFinancialYear() ? inject(Router).createUrlTree(['/']) : true);
