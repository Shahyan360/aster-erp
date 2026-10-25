import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';
import { isApiRequest } from './api-request';

// No automatic write retries: a timed-out payment may already have been saved.
export const apiReliabilityInterceptor: HttpInterceptorFn = (req, next) => (isApiRequest(req.url) ? next(req).pipe(timeout({ each: 30000 })) : next(req));
