import { Injectable } from "@angular/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, User, getAuth, onAuthStateChanged, signInWithCredential } from "firebase/auth";
import { environment } from "../../../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    isWeb = false;
    firebase: any;
    loginResponse: any;
    refresh_Access_token: any;
	googleUserEmail: any;
    constructor() {
        this.firebase = initializeApp(environment.firebase);
    }

    public async logout() {
		console.log('[LoginService] Logging out user');
        await getAuth(this.firebase).signOut();
        this.refresh_Access_token = undefined;
        this.loginResponse = undefined;
        await SocialLogin.logout({ provider: 'google' }).then(() => console.log('Signed Out')).catch((e: any) => { console.log('Signed Out'); });
    }

    public async refreshToken() {
        const auth = getAuth(this.firebase);
		console.log('[LoginService] Setting up token refresh listener');
        onAuthStateChanged(auth, async (currenUser: User | null) => {
            if (currenUser) {
                const idToken = await currenUser.getIdToken(true);
				console.log('[LoginService] Current user detected: ', currenUser.email);
				this.googleUserEmail = currenUser.email;
                console.log('[LoginService] Token refreshed: ', idToken);
                this.refresh_Access_token = idToken;
            } else {
				console.log('[LoginService] User signed out, clearing token');
                this.logout();
            }
        });
    }

    async initialize() {
		console.log('[LoginService] Initializing Social Login');
        await SocialLogin.initialize({
            google: {
                webClientId: environment.webClientId,
                mode: 'online'
            }
        });
    }

    async loginViaGoogle() {
		console.log('[LoginService] Starting Google login');
        const user: any = await SocialLogin.login({
            provider: 'google',
            options: {
                scopes: ['email', 'profile'],
                forceRefreshToken: true
            }
        });
		console.log('[LoginService] Google login response: ', user);
        if (user) {
            this.loginResponse = JSON.stringify(user.result, null, 2);
            console.log(this.loginResponse);
			this.signInWithGoogle(user.result.idToken);
        }
    }
	
	async loginOffline() {
		console.log('[LoginService] Starting offline login');
	}
	
	
	
	async signInWithGoogle(idToken: string) {
		const googleUser = await signInWithCredential(getAuth(this.firebase), GoogleAuthProvider.credential(idToken));
		console.log('[LoginService] Firebase sign-in successful: ', googleUser.user.email);
		this.googleUserEmail = googleUser.user.email;
		this.refresh_Access_token = await googleUser.user.getIdToken();
		console.log('[LoginService] Access token obtained: ', this.refresh_Access_token);
	}
}