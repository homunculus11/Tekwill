import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const USERNAME_EMAIL_MAP_KEY = 'usernameEmailMap';
const AUTH_RENDER_FALLBACK_MS = 1200;

const isSrcPage = () => window.location.pathname.replaceAll('\\', '/').includes('/src/');

const getRoute = (page) => {
    if (isSrcPage()) {
        if (page === 'home') return '../index.html';
        return `./${page}.html`;
    }

    if (page === 'home') return './index.html';
    return `./src/${page}.html`;
};

const getDisplayName = (user) => {
    const fromProfile = typeof user?.displayName === 'string' ? user.displayName.trim() : '';
    if (fromProfile) return fromProfile;

    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (!email) return 'Contul meu';
    return email.split('@')[0] || 'Contul meu';
};

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getInitials = (label) => {
    const normalized = String(label || '').trim();
    if (!normalized) return 'U';

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return normalized.slice(0, 2).toUpperCase();
};

const renderGuestActions = (container) => {
    container.innerHTML = `
        <a href="${getRoute('login')}" id="login-btn" class="account-link">Login</a>
        <a href="${getRoute('register')}" id="signup-btn" class="account-link">Signup</a>
    `;
    container.removeAttribute('data-auth-state');
};

const renderUserActions = (container, user) => {
    const displayName = getDisplayName(user);
    const email = user?.email || 'Utilizator autentificat';
    const initials = getInitials(displayName);
    const safeDisplayName = escapeHtml(displayName);
    const safeEmail = escapeHtml(email);
    const safeInitials = escapeHtml(initials);

    container.innerHTML = `
        <a href="${getRoute('account')}" class="account-chip" title="Gestionează contul" aria-label="Deschide pagina contului">
            <span class="account-avatar" aria-hidden="true">${safeInitials}</span>
            <span class="account-meta">
                <span class="account-name">${safeDisplayName}</span>
                <span class="account-email">${safeEmail}</span>
            </span>
        </a>
        <button type="button" id="login-btn" class="account-logout" aria-label="Logout">Logout</button>
    `;

    container.setAttribute('data-auth-state', 'authenticated');

    const logoutBtn = container.querySelector('.account-logout');
    logoutBtn?.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Se deconectează...';

        try {
            await signOut(auth);
            const goTo = isSrcPage() ? './login.html' : './src/login.html';
            window.location.href = goTo;
        } catch (error) {
            console.error('Logout failed', error);
            logoutBtn.disabled = false;
            logoutBtn.textContent = 'Logout';
            alert('Nu am putut face logout. Încearcă din nou.');
        }
    });
};

const saveUsernameEmailAlias = (user) => {
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    const displayName = typeof user?.displayName === 'string' ? user.displayName.trim() : '';

    if (!email || !displayName) return;

    try {
        const raw = localStorage.getItem(USERNAME_EMAIL_MAP_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[displayName.toLowerCase()] = email;
        localStorage.setItem(USERNAME_EMAIL_MAP_KEY, JSON.stringify(parsed));
    } catch {
        return;
    }
};

const initAccountNav = () => {
    const container = document.getElementById('header-btns');
    if (!container) return;

    container.classList.add('auth-pending');
    let hasRendered = false;

    const finalizeRender = () => {
        if (hasRendered) return;
        hasRendered = true;
        container.classList.remove('auth-pending');
    };

    const fallbackId = window.setTimeout(() => {
        if (hasRendered) return;
        renderGuestActions(container);
        finalizeRender();
    }, AUTH_RENDER_FALLBACK_MS);

    onAuthStateChanged(auth, (user) => {
        window.clearTimeout(fallbackId);

        if (!user) {
            renderGuestActions(container);
            finalizeRender();
            return;
        }

        saveUsernameEmailAlias(user);
        renderUserActions(container, user);
        finalizeRender();
    }, () => {
        window.clearTimeout(fallbackId);
        renderGuestActions(container);
        finalizeRender();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccountNav);
} else {
    initAccountNav();
}