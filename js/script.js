document.querySelectorAll('[data-scroll]').forEach((btn) => {
	btn.addEventListener('click', () => {
		const target = btn.getAttribute('data-scroll');
		if (!target) return;
		const el = document.querySelector(target);
		if (el) {
			const header = document.querySelector('.site-header');
			const headerHeight = header ? header.getBoundingClientRect().height : 0;
			const extraOffset = 12;
			const targetTop = el.getBoundingClientRect().top + window.scrollY - headerHeight - extraOffset;

			window.scrollTo({
				top: Math.max(targetTop, 0),
				behavior: 'smooth'
			});
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

const readSessionValue = (key) => {
	try {
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
};

const writeSessionValue = (key, value) => {
	try {
		sessionStorage.setItem(key, value);
	} catch {
		return;
	}
};

const readSessionNumber = (key, fallback = null) => {
	const value = readSessionValue(key);
	if (value === null) return fallback;

	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
};

const readSessionJson = (key, fallback) => {
	const value = readSessionValue(key);
	if (!value) return fallback;

	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
};

const getEpisodes = async () => {
	const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
	const cachedTimestamp = readSessionNumber('episodesFetchedAt');

	if (cachedTimestamp && (cachedTimestamp + CACHE_DURATION > Date.now())) {
		const cachedItems = readSessionJson('episodes', []);
		writeSessionValue('episodes', JSON.stringify(cachedItems));

		return {
			items: cachedItems,
			lastFetched: cachedTimestamp,
			numberOfEpisodes: readSessionNumber('numberOfEpisodes', 0)
		};
	}

	try {
		const response = await fetch('https://tekwill-serverless.orletchi-bogdan2009.workers.dev/episodes');
		if (!response.ok) {
			throw new Error(`Episodes request failed: ${response.status}`);
		}

		const data = await response.json();
		const fetchedAt = Date.now();

		writeSessionValue('episodes', JSON.stringify(data.items || []));
		writeSessionValue('episodesFetchedAt', fetchedAt.toString());
		writeSessionValue('numberOfEpisodes', String(Number.isFinite(data.numberOfEpisodes) ? data.numberOfEpisodes : 0));
	} catch (error) {
		console.error('Error fetching episodes:', error);
	}

	const storedItems = readSessionJson('episodes', []);
	writeSessionValue('episodes', JSON.stringify(storedItems));

	return {
		items: storedItems,
		lastFetched: readSessionNumber('episodesFetchedAt'),
		numberOfEpisodes: readSessionNumber('numberOfEpisodes', 0)
	};
};

const extractGuestName = (title) => {
	if (!title || typeof title !== 'string') return null;

	const normalizedTitle = title.replace(/\s+/g, ' ').trim();
	if (!normalizedTitle || /trailer/i.test(normalizedTitle)) return null;

	const firstSegment = normalizedTitle.split(':')[0]?.trim();
	if (!firstSegment || firstSegment.length < 2) return null;

	if (/(educheia|podcast|episod)/i.test(firstSegment)) return null;

	return firstSegment;
};

const getChannelStats = async () => {
	const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	const cachedTimestamp = readSessionNumber('channelFetchedAt');

	if (cachedTimestamp && (cachedTimestamp + CACHE_DURATION > Date.now())) {
		const cachedChannel = readSessionJson('channel', {});
		writeSessionValue('channel', JSON.stringify(cachedChannel));

		return {
			channel: cachedChannel,
			lastFetched: cachedTimestamp,
		};
	}

	try {
		const response = await fetch('https://tekwill-serverless.orletchi-bogdan2009.workers.dev/channel');
		if (!response.ok) {
			throw new Error(`Episodes request failed: ${response.status}`);
		}

		const data = await response.json();
		const fetchedAt = Date.now();

		writeSessionValue('channel', JSON.stringify(data.channelInfo || {}));
		writeSessionValue('channelFetchedAt', fetchedAt.toString());
	} catch (error) {
		console.error('Error fetching channel:', error);
	}

	const storedChannel = readSessionJson('channel', {});
	writeSessionValue('channel', JSON.stringify(storedChannel));

	return {
		channel: storedChannel,
		lastFetched: readSessionNumber('channelFetchedAt'),
	};
};