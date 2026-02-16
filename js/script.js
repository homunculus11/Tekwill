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

const assignEpisodeIds = (items) => {
	if (!Array.isArray(items)) return [];

	let nextEpisodeId = 1;

	return items.map((item) => {
		const title = item?.snippet?.title;
		const isValidEpisode = typeof title === 'string' && title.trim() && !/trailer/i.test(title);

		if (!isValidEpisode) {
			return {
				...item,
				episodeId: null
			};
		}

		const episodeWithId = {
			...item,
			episodeId: nextEpisodeId
		};

		nextEpisodeId += 1;
		return episodeWithId;
	});
};

const getEpisodes = async () => {
	const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
	const cachedTimestamp = readSessionNumber('episodesFetchedAt');

	if (cachedTimestamp && (cachedTimestamp + CACHE_DURATION > Date.now())) {
		const cachedItems = assignEpisodeIds(readSessionJson('episodes', []));
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
		const itemsWithIds = assignEpisodeIds(Array.isArray(data.items) ? data.items : []);
		const fetchedAt = Date.now();

		writeSessionValue('episodes', JSON.stringify(itemsWithIds));
		writeSessionValue('episodesFetchedAt', fetchedAt.toString());
		writeSessionValue('numberOfEpisodes', String(Number.isFinite(data.numberOfEpisodes) ? data.numberOfEpisodes : 0));
	} catch (error) {
		console.error('Error fetching episodes:', error);
	}

	const storedItems = assignEpisodeIds(readSessionJson('episodes', []));
	writeSessionValue('episodes', JSON.stringify(storedItems));

	return {
		items: storedItems,
		lastFetched: readSessionNumber('episodesFetchedAt'),
		numberOfEpisodes: readSessionNumber('numberOfEpisodes', 0)
	};
}

const extractGuestName = (title) => {
	if (!title || typeof title !== 'string') return null;

	const normalizedTitle = title.replace(/\s+/g, ' ').trim();
	if (!normalizedTitle || /trailer/i.test(normalizedTitle)) return null;

	const firstSegment = normalizedTitle.split(':')[0]?.trim();
	if (!firstSegment || firstSegment.length < 2) return null;

	if (/(educheia|podcast|episod)/i.test(firstSegment)) return null;

	return firstSegment;
};

const countUniqueGuests = (items) => {
	if (!Array.isArray(items) || items.length === 0) return 0;

	const guests = new Set();

	for (const item of items) {
		const title = item?.snippet?.title;
		const guestName = extractGuestName(title);
		if (guestName) {
			guests.add(guestName.toLowerCase());
		}
	}

	return guests.size;
};

const buildQuoteSlidesFromEpisodes = (items) => {
	if (!Array.isArray(items)) return [];

	const slides = [];

	for (const item of items) {
		const title = item?.snippet?.title?.replace(/\s+/g, ' ').trim();
		if (!title || /trailer/i.test(title)) continue;

		const guestName = extractGuestName(title);
		const [, topicPartRaw] = title.split(':');
		const topicPart = topicPartRaw?.split('|')[0]?.trim();
		const quoteText = topicPart || title;

		slides.push({
			quote: `„${quoteText}”`,
			author: guestName ? `— ${guestName}` : '— Educheia'
		});

		if (slides.length === 3) {
			break;
		}
	}

	return slides;
};

const renderQuoteCarousel = (items) => {
	const quoteCarousel = document.querySelector('.quote-carousel');
	if (!quoteCarousel) return;

	const fallbackSlides = [
		{ quote: '„Educheia m-a făcut să-mi schimb cursul profesional în 6 luni.”', author: '— Ana, profesor de biologie' },
		{ quote: '„În fiecare episod găsesc o întrebare pe care nu îndrăzneam s-o pun.”', author: '— Vlad, student' },
		{ quote: '„Un spațiu rar în care educația e tratată cu curaj și empatie.”', author: '— Maria, mentor' }
	];

	const slides = buildQuoteSlidesFromEpisodes(items);
	const slidesToRender = (slides.length > 0 ? [...slides, ...fallbackSlides] : fallbackSlides).slice(0, 3);

	quoteCarousel.innerHTML = '';

	slidesToRender.forEach((slide, index) => {
		const figure = document.createElement('figure');
		figure.className = 'quote-slide';
		figure.style.animationDelay = `${index * 4}s`;

		const blockquote = document.createElement('blockquote');
		blockquote.textContent = slide.quote;

		const figcaption = document.createElement('figcaption');
		figcaption.textContent = slide.author;

		figure.append(blockquote, figcaption);
		quoteCarousel.appendChild(figure);
	});
};

const getLatestEpisode = (items) => {
	if (!Array.isArray(items)) return null;

	return items.find((item) => {
		const title = item?.snippet?.title;
		return typeof title === 'string' && title.trim() && !/trailer/i.test(title);
	}) || null;
};

const extractEpisodeTopic = (title) => {
	if (!title || typeof title !== 'string') return null;

	const normalizedTitle = title.replace(/\s+/g, ' ').trim();
	const [, topicPartRaw] = normalizedTitle.split(':');
	const topicPart = topicPartRaw?.split('|')[0]?.trim();
	const topic = topicPart || normalizedTitle;

	if (!topic) return null;

	return topic.charAt(0).toUpperCase() + topic.slice(1);
};

const formatEpisodeDate = (isoDate) => {
	if (!isoDate) return null;
	const parsed = new Date(isoDate);
	if (Number.isNaN(parsed.getTime())) return null;

	return new Intl.DateTimeFormat('ro-RO', {
		day: '2-digit',
		month: 'short'
	}).format(parsed);
};

const renderLatestEpisodeCard = (items) => {
	const latestTitleEl = document.getElementById('latest-episode-title');
	const latestDateEl = document.getElementById('latest-episode-date');
	const latestGuestEl = document.getElementById('latest-episode-guest');

	if (!latestTitleEl || !latestDateEl || !latestGuestEl) return;

	const latestEpisode = getLatestEpisode(items);
	if (!latestEpisode) {
		latestDateEl.textContent = '—';
		latestGuestEl.textContent = 'Invitat special';
		return;
	}

	const rawTitle = latestEpisode?.snippet?.title;
	const topic = extractEpisodeTopic(rawTitle);
	const guest = extractGuestName(rawTitle);
	const publishedAt = latestEpisode?.snippet?.publishedAt || latestEpisode?.contentDetails?.videoPublishedAt;
	const formattedDate = formatEpisodeDate(publishedAt);

	if (topic) {
		latestTitleEl.textContent = `„${topic}”`;
	}

	latestDateEl.textContent = formattedDate || 'Acum';
	latestGuestEl.textContent = guest ? guest : 'Invitat special';
};


getEpisodes()
	.then((data) => {
		const episodeCount = data.numberOfEpisodes ?? '...';
		const guestCount = countUniqueGuests(data.items);
		const episodeCountElement = document.getElementById('nr-of-episodes');
		const guestCountElement = document.getElementById('nr-of-guests');

		if (episodeCountElement) {
			episodeCountElement.textContent = String(episodeCount);
		}

		if (guestCountElement) {
			guestCountElement.textContent = guestCount ? String(guestCount) : '...';
		}

		renderQuoteCarousel(data.items);
		renderLatestEpisodeCard(data.items);
	})
	.catch((error) => {
		console.error('Error loading episodes:', error);
		const episodeCountElement = document.getElementById('nr-of-episodes');
		const guestCountElement = document.getElementById('nr-of-guests');

		if (episodeCountElement) {
			episodeCountElement.textContent = '...';
		}

		if (guestCountElement) {
			guestCountElement.textContent = '...';
		}

		renderQuoteCarousel([]);
		renderLatestEpisodeCard([]);
	});


const redirectToEpisode = (episodeNumber) => {
	window.location.href = `episodes.html/${episodeNumber}`;
};

const fillEpisodeCards = async () => {
	const episodeCards = document.querySelectorAll('.episode-card');
	if (!episodeCards.length) return;

	const episodes = (await getEpisodes()).items.filter((ep) => ep.episodeId !== null);
	if (!episodes) return;

	let currentEpisodeNumber = 1;
	for (const card of episodeCards) {
		const item = episodes[currentEpisodeNumber - 1];
		if (!item) break;

		const titleEl = card.querySelector('.episode-title');
		const numberEl = card.querySelector('.episode-number');
		const guestEl = card.querySelector('.episode-guest');
		const dateEl = card.querySelector('.episode-date');
		const durationEl = card.querySelector('.episode-duration');

		if (titleEl && item.snippet?.title) {
			titleEl.textContent = extractEpisodeTopic(item.snippet.title);
		}

		if (numberEl) {
			numberEl.textContent = `# ${episodes.length - currentEpisodeNumber + 2}`;
		}

		if (guestEl && item.snippet?.title) {
			guestEl.textContent = extractGuestName(item.snippet.title);
		}

		if (dateEl && item.snippet?.publishedAt) {
			dateEl.textContent = formatEpisodeDate(item.snippet.publishedAt);
		}

		if (durationEl && item.contentDetails?.duration) {
			durationEl.textContent = formatDuration(item.contentDetails.duration);
		}

		card.setAttribute('data-episode-number', currentEpisodeNumber);
		currentEpisodeNumber++;
	}
};

fillEpisodeCards();