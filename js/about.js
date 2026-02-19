const progressBar = document.getElementById('reading-progress');
const parallaxNodes = [...document.querySelectorAll('[data-parallax]')];
const revealNodes = [...document.querySelectorAll('[data-reveal]')];
const timelineSteps = [...document.querySelectorAll('[data-step]')];
const counterNodes = [...document.querySelectorAll('[data-counter]')];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function updateReadingProgress() {
	if (!progressBar) {
		return;
	}

	const scrollable = document.documentElement.scrollHeight - window.innerHeight;
	const progress = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
	progressBar.style.transform = `scaleX(${progress})`;
}

function updateParallax() {
	if (prefersReducedMotion || !parallaxNodes.length) {
		return;
	}

	const viewportHeight = window.innerHeight || 1;

	parallaxNodes.forEach((node) => {
		const speed = Number(node.dataset.parallax || 0);
		const rect = node.getBoundingClientRect();
		const elementCenter = rect.top + rect.height / 2;
		const viewportCenter = viewportHeight / 2;
		const distance = elementCenter - viewportCenter;
		const offsetY = -distance * speed;

		node.style.transform = `translate3d(0, ${offsetY}px, 0)`;
	});
}

function updateActiveTimelineStep() {
	if (!timelineSteps.length) {
		return;
	}

	const focusLine = window.innerHeight * 0.38;
	let activeStep = timelineSteps[0];
	let minDistance = Number.POSITIVE_INFINITY;

	timelineSteps.forEach((step) => {
		const rect = step.getBoundingClientRect();
		const center = rect.top + rect.height / 2;
		const distance = Math.abs(center - focusLine);

		if (distance < minDistance) {
			minDistance = distance;
			activeStep = step;
		}
	});

	timelineSteps.forEach((step) => {
		step.classList.toggle('is-active', step === activeStep);
	});
}

function animateCounter(node) {
	const target = Number(node.dataset.counter || 0);
	const duration = 1100;
	const startTime = performance.now();

	const tick = (now) => {
		const elapsed = now - startTime;
		const progress = clamp(elapsed / duration, 0, 1);
		const eased = 1 - (1 - progress) * (1 - progress);
		const value = Math.round(target * eased);

		node.textContent = value.toString();

		if (progress < 1) {
			window.requestAnimationFrame(tick);
		} else {
			node.textContent = target.toString();
		}
	};

	window.requestAnimationFrame(tick);
}

if (revealNodes.length) {
	const revealObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
	);

	revealNodes.forEach((node) => revealObserver.observe(node));
}

if (counterNodes.length) {
	const counterObserver = new IntersectionObserver(
		(entries, observer) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) {
					return;
				}

				animateCounter(entry.target);
				observer.unobserve(entry.target);
			});
		},
		{ threshold: 0.5 },
	);

	counterNodes.forEach((node) => counterObserver.observe(node));
}

function onScrollFrame() {
	updateReadingProgress();
	updateParallax();
	updateActiveTimelineStep();
}

let rafLocked = false;

function handleScroll() {
	if (rafLocked) {
		return;
	}

	rafLocked = true;

	window.requestAnimationFrame(() => {
		onScrollFrame();
		rafLocked = false;
	});
}

window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', onScrollFrame);

onScrollFrame();
