// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

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

        // Firebase sign-in accepts email; if user typed username try to map
        const email = user.includes('@') ? user : `${user}@example.com`;

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
