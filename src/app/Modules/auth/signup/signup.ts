import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginLeftPage } from '../login-left-page/login-left-page';
@Component({ selector: 'app-signup', standalone: true, imports: [RouterLink, LoginLeftPage], templateUrl: './signup.html', styleUrl: '../sign-in/sign-in.scss' })
export class Signup {}
