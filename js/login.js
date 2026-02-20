// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const USERNAME_EMAIL_MAP_KEY = 'usernameEmailMap';

const readUsernameEmailMap = () => {
    try {
        const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const resolveLoginEmail = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('@')) return normalized;

    const map = readUsernameEmailMap();
    return map[normalized] || '';
};

// redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = './episodes.html';
    }
});

const loginForm = document.querySelector('.login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = loginForm.user.value.trim();
        const password = loginForm.password.value;
        const email = resolveLoginEmail(user);

        if (!email) {
            alert('Folosește adresa de email sau un username deja înregistrat pe acest browser.');
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // redirect on success, maybe to episodes
            window.location.href = './episodes.html';
        } catch (err) {
            console.error('Login error', err);
            alert(err.message);
        }
    });
}
