// register.js
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const USERNAME_EMAIL_MAP_KEY = 'usernameEmailMap';

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

// redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = './episodes.html';
    }
});

const registerForm = document.querySelector('.register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = registerForm.username.value.trim();
        const email = registerForm.email.value.trim();
        const password = registerForm.password.value;
        const confirm = registerForm.confirm.value;

        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(auth.currentUser, { displayName: username });
            persistUsernameAlias(username, email);
            // automatically send new user to episodes page
            window.location.href = './episodes.html';
        } catch (err) {
            console.error('Signup error', err);
            alert(err.message);
        }
    });
}
