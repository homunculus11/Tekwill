// register.js
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    getRedirectResult,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const USERNAME_EMAIL_MAP_KEY = 'usernameEmailMap';
const googleProvider = new GoogleAuthProvider();
const REDIRECT_PATH = './episodes.html';

const persistUsernameAlias = (username, email) => {
    if (!username || !email) return;

    try {
        const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[String(username).trim().toLowerCase()] = String(email).trim().toLowerCase();
        localStorage.setItem(USERNAME_EMAIL_MAP_KEY, JSON.stringify(parsed));
    } catch {
        return;
    }
};

const getFriendlyAuthError = (err) => {
    const code = err?.code || '';

    if (code === 'auth/unauthorized-domain') {
        return 'Domeniu neautorizat pentru Google Sign-In. Adaugă domeniul curent în Firebase Console → Authentication → Settings → Authorized domains.';
    }

    if (code === 'auth/email-already-in-use') {
        return 'Adresa de email este deja folosită.';
    }

    if (code === 'auth/weak-password') {
        return 'Parola este prea slabă. Folosește cel puțin 6 caractere.';
    }

    if (code === 'auth/popup-closed-by-user') {
        return 'Ai închis fereastra Google înainte să finalizezi autentificarea.';
    }

    if (code === 'auth/network-request-failed') {
        return 'Conexiune indisponibilă. Verifică internetul și încearcă din nou.';
    }

    return err?.message || 'A apărut o eroare de autentificare.';
};

const shouldFallbackToRedirect = (err) => {
    const code = err?.code || '';
    return code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported';
};

const setPendingState = (button, isPending, pendingLabel) => {
    if (!button) return;

    if (!button.dataset.defaultLabel) {
        button.dataset.defaultLabel = button.textContent.trim();
    }

    button.disabled = isPending;
    button.textContent = isPending ? pendingLabel : button.dataset.defaultLabel;
};

try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
        persistUsernameAlias(redirectResult.user.displayName, redirectResult.user.email);
        window.location.href = REDIRECT_PATH;
    }
} catch (err) {
    console.error('Google redirect signup error', err);
    alert(getFriendlyAuthError(err));
}

// redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = REDIRECT_PATH;
    }
});

const registerForm = document.querySelector('.register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const username = registerForm.username.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const confirm = registerForm.confirm.value;

        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        try {
            setPendingState(submitButton, true, 'Signing Up...');
            await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(auth.currentUser, { displayName: username });
            persistUsernameAlias(username, email);
            window.location.href = REDIRECT_PATH;
        } catch (err) {
            console.error('Signup error', err);
            alert(getFriendlyAuthError(err));
        } finally {
            setPendingState(submitButton, false, 'Signing Up...');
        }
    });
}

const googleRegisterButton = document.querySelector('.btn-google');

if (googleRegisterButton) {
    googleRegisterButton.addEventListener('click', async () => {
        if (window.location.protocol === 'file:') {
            alert('Google Sign-In nu funcționează din file://. Rulează aplicația pe localhost.');
            return;
        }

        try {
            setPendingState(googleRegisterButton, true, 'Connecting...');
            const result = await signInWithPopup(auth, googleProvider);
            persistUsernameAlias(result.user.displayName, result.user.email);
            window.location.href = REDIRECT_PATH;
        } catch (err) {
            if (shouldFallbackToRedirect(err)) {
                try {
                    await signInWithRedirect(auth, googleProvider);
                    return;
                } catch (redirectErr) {
                    console.error('Google redirect start error', redirectErr);
                    alert(getFriendlyAuthError(redirectErr));
                }
            } else {
                console.error('Google signup error', err);
                alert(getFriendlyAuthError(err));
            }
        } finally {
            setPendingState(googleRegisterButton, false, 'Connecting...');
        }
    });
}
