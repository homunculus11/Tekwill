document.querySelectorAll('[data-scroll]').forEach((btn) => {
	btn.addEventListener('click', () => {
		const target = btn.getAttribute('data-scroll');
		if (!target) return;
		const el = document.querySelector(target);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	});
});

// Mobile nav toggle
const menuToggle = document.querySelector('.menu-toggle');
const headerDrawer = document.getElementById('header-drawer');
const headerOverlay = document.querySelector('.header-overlay');

const closeMenu = () => {
	document.body.classList.remove('nav-open');
	if (menuToggle) {
		menuToggle.setAttribute('aria-expanded', 'false');
	}
};

if (menuToggle && headerDrawer) {
	menuToggle.addEventListener('click', () => {
		const isOpen = document.body.classList.toggle('nav-open');
		menuToggle.setAttribute('aria-expanded', String(isOpen));
	});

	headerOverlay?.addEventListener('click', closeMenu);
	headerDrawer.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', closeMenu));

	window.addEventListener('resize', () => {
		if (window.innerWidth > 900) {
			closeMenu();
		}
	});
}