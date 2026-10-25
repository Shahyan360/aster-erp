import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormFieldComponent } from '../../../shared';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../store/auth/auth.actions';
import { selectAuthError, selectAuthLoading } from '../../../store/auth/auth.selectors';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { LoginLeftPage } from '../login-left-page/login-left-page';
import { environment } from '@/environments/environment';

@Component({
    selector: 'app-sign-in',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, ButtonModule, CheckboxModule, MessageModule, FormFieldComponent, LoginLeftPage],
    templateUrl: './sign-in.html',
    styleUrl: './sign-in.scss'
})
export class SignIn {
    private fb = inject(FormBuilder);
    private store = inject(Store);
    readonly demo = environment.demoMode;
    loading$ = this.store.select(selectAuthLoading);
    error$ = this.store.select(selectAuthError);
    form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(6)]], rememberMe: [false] });
    get emailControl() {
        return this.form.controls.email;
    }
    get passwordControl() {
        return this.form.controls.password;
    }
    exploreDemo(): void {
        this.store.dispatch(AuthActions.login({ credentials: { email: 'reviewer@example.com', password: 'demo-session' } }));
    }
    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.store.dispatch(AuthActions.login({ credentials: { email: this.form.controls.email.value!, password: this.form.controls.password.value! } }));
    }
}
