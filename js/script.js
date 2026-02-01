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

const form = document.querySelector('.newsletter-form');
if (form) {
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const input = form.querySelector('input[type="email"]');
		const email = input?.value.trim();
		if (!email) return;
		form.reset();
		const button = form.querySelector('button');
		if (button) {
			const original = button.textContent;
			button.textContent = 'You are in!';
			button.disabled = true;
			setTimeout(() => {
				button.textContent = original;
				button.disabled = false;
			}, 2200);
		}
	});
}
