import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SignIn } from './sign-in';
import { initialState } from '@/app/store/auth/auth.reducer';
import { AuthActions } from '@/app/store/auth/auth.actions';
describe('SignIn', () => {
    let component: SignIn;
    let fixture: ComponentFixture<SignIn>;
    let store: MockStore;
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [SignIn], providers: [provideRouter([]), provideMockStore({ initialState: { auth: initialState } })] }).compileComponents();
        fixture = TestBed.createComponent(SignIn);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        await fixture.whenStable();
    });
    it('renders', () => expect(component).toBeTruthy());
    it('rejects incomplete credentials', () => {
        const dispatch = spyOn(store, 'dispatch');
        component.onSubmit();
        expect(dispatch).not.toHaveBeenCalled();
        expect(component.form.touched).toBeTrue();
    });
    it('dispatches only the credential fields', () => {
        const dispatch = spyOn(store, 'dispatch');
        component.form.setValue({ email: 'reviewer@example.com', password: 'synthetic-password', rememberMe: true });
        component.onSubmit();
        expect(dispatch).toHaveBeenCalledWith(AuthActions.login({ credentials: { email: 'reviewer@example.com', password: 'synthetic-password' } }));
    });
    it('uses explicit synthetic credentials for the demo entry', () => {
        const dispatch = spyOn(store, 'dispatch');
        component.exploreDemo();
        expect(dispatch).toHaveBeenCalledWith(AuthActions.login({ credentials: { email: 'reviewer@example.com', password: 'demo-session' } }));
    });
});
