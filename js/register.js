// register.js
import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = './episodes.html';
    }
});

const registerForm = document.querySelector('.login-form');

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
            // automatically send new user to episodes page
            window.location.href = './episodes.html';
        } catch (err) {
            console.error('Signup error', err);
            alert(err.message);
        }
    });
}
