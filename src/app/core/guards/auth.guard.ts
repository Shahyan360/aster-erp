import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasSession } from '../services/session-storage';
export const authGuard: CanActivateFn = () => (hasSession() ? true : inject(Router).createUrlTree(['/auth/login']));
