import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { MenuApiService } from './menu-api.service';
import { environment } from '@/environments/environment';
describe('menu identity scope', () => {
    it('loads navigation for the signed-in user instead of a fixed account', () => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideMockStore({ initialState: { auth: { user: { id: 77 } } } })] });
        const backend = TestBed.inject(HttpTestingController);
        TestBed.inject(MenuApiService).getMenu().subscribe();
        const request = backend.expectOne(environment.apiUrl + '/Menu/GetFullMenu/77');
        request.flush([]);
        backend.verify();
    });
});
