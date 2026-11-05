import { Injectable } from "@angular/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { FirebaseApp, initializeApp } from "firebase/app";
import { GoogleAuthProvider, User, getAuth, onAuthStateChanged, signInWithCredential } from "firebase/auth";
import { environment } from "../../../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    isWeb = false;
    firebase: FirebaseApp;
    loginResponse: unknown;
    refresh_Access_token: boolean | undefined;
	googleUserEmail: string | null | undefined;
    lastError: string | null = null;
    constructor() {
        this.firebase = initializeApp(environment.firebase);
    }

    public async logout() {
		console.log('[LoginService] Logging out user');
        await getAuth(this.firebase).signOut();
        this.refresh_Access_token = undefined;
        this.loginResponse = undefined;
        await SocialLogin.logout({ provider: 'google' }).then(() => console.log('Signed Out')).catch(() => { console.log('Signed Out'); });
    }

    public async refreshToken() {
        const auth = getAuth(this.firebase);
		console.log('[LoginService] Setting up token refresh listener');
        onAuthStateChanged(auth, async (currenUser: User | null) => {
            if (currenUser) {
				await currenUser.getIdToken(true);
				console.log('[LoginService] Current user detected: ', currenUser.email);
				this.googleUserEmail = currenUser.email;
				// Never log authentication tokens, including in development builds.
				this.refresh_Access_token = true;
            } else {
				console.log('[LoginService] User signed out, clearing token');
                this.logout();
            }
        });
    }

    async initialize() {
		console.log('[LoginService] Initializing Social Login');
        try {
            await SocialLogin.initialize({ google: { webClientId: environment.webClientId, mode: 'online' } });
            this.lastError = null;
        } catch {
            this.lastError = 'Accesso Google non disponibile. Riprova più tardi.';
        }
    }

    async loginViaGoogle() {
		console.log('[LoginService] Starting Google login');
        this.lastError = null;
        try {
        const user = await SocialLogin.login({
            provider: 'google',
            options: {
                scopes: ['email', 'profile'],
                forceRefreshToken: true
            }
        });
        if (user) {
			const idToken = 'idToken' in user.result ? user.result.idToken : undefined;
			await this.signInWithGoogle(idToken);
        }
        } catch {
            this.lastError = 'Accesso Google non riuscito. Riprova.';
        }
    }
	
	async loginOffline() {
		console.log('[LoginService] Starting offline login');
	}
	
	
	
	async signInWithGoogle(idToken?: string | null) {
		const googleUser = await signInWithCredential(getAuth(this.firebase), GoogleAuthProvider.credential(idToken));
		console.log('[LoginService] Firebase sign-in successful: ', googleUser.user.email);
		this.googleUserEmail = googleUser.user.email;
		this.refresh_Access_token = true;
	}
}
