import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasSession } from '../services/session-storage';
export const guestGuard: CanActivateFn = () => (hasSession() ? inject(Router).createUrlTree(['/']) : true);
