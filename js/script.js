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

const formatCompactNumber = (value) => {
	if (!Number.isFinite(value)) return null;

	const absValue = Math.abs(value);
	const units = [
		{ threshold: 1_000_000_000, suffix: 'B' },
		{ threshold: 1_000_000, suffix: 'M' },
		{ threshold: 1_000, suffix: 'K' }
	];

	for (const unit of units) {
		if (absValue >= unit.threshold) {
			const scaled = value / unit.threshold;
			const rounded = Math.abs(scaled) >= 100 ? Math.round(scaled) : Number(scaled.toFixed(1));
			return `${rounded}${unit.suffix}`;
		}
	}

	return String(Math.round(value));
};

const metricAnimations = new WeakMap();

const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

const stopMetricAnimation = (element) => {
	if (!element) return;
	const previousAnimation = metricAnimations.get(element);
	if (previousAnimation) {
		cancelAnimationFrame(previousAnimation);
		metricAnimations.delete(element);
	}
};

const animateMetricValue = (element, targetValue, duration = 1200, onComplete = null) => {
	if (!element) return;

	stopMetricAnimation(element);

	const currentText = (element.textContent || '').trim();
	const currentNumeric = Number.parseFloat(currentText.replace(/,/g, ''));
	const startValue = Number.isFinite(currentNumeric) ? currentNumeric : 0;

	if (!Number.isFinite(targetValue)) {
		element.textContent = '...';
		if (typeof onComplete === 'function') onComplete();
		return;
	}

	if (Math.round(startValue) === Math.round(targetValue)) {
		element.textContent = String(Math.round(targetValue));
		if (typeof onComplete === 'function') onComplete();
		return;
	}

	const animationDuration = Math.max(500, duration);
	const startedAt = performance.now();

	const tick = (now) => {
		const elapsed = now - startedAt;
		const progress = Math.min(elapsed / animationDuration, 1);
		const easedProgress = easeOutCubic(progress);
		const nextValue = startValue + (targetValue - startValue) * easedProgress;

		element.textContent = String(Math.round(nextValue));

		if (progress < 1) {
			const frameId = requestAnimationFrame(tick);
			metricAnimations.set(element, frameId);
			return;
		}

		element.textContent = String(Math.round(targetValue));
		metricAnimations.delete(element);
		if (typeof onComplete === 'function') onComplete();
	};

	const frameId = requestAnimationFrame(tick);
	metricAnimations.set(element, frameId);
};

const setMetricValue = (element, rawValue, fallback = '...') => {
	if (!element) return;
	if (rawValue === null || rawValue === undefined) {
		stopMetricAnimation(element);
		element.textContent = fallback;
		return;
	}

	const textValue = String(rawValue).trim();
	if (!textValue || textValue === '...') {
		stopMetricAnimation(element);
		element.textContent = fallback;
		return;
	}

	const numericValue = Number.parseFloat(textValue.replace(/,/g, ''));
	if (Number.isFinite(numericValue)) {
		animateMetricValue(element, numericValue, 1200, () => {
			if (element.scrollWidth <= element.clientWidth) {
				return;
			}

			const compactValue = formatCompactNumber(numericValue);
			if (compactValue) {
				element.textContent = compactValue;
			}
		});
	} else {
		stopMetricAnimation(element);
		element.textContent = textValue;
		if (element.scrollWidth > element.clientWidth) {
			const maybeNumeric = Number.parseFloat(textValue.replace(/,/g, ''));
			if (Number.isFinite(maybeNumeric)) {
				const compactValue = formatCompactNumber(maybeNumeric);
				if (compactValue) {
					element.textContent = compactValue;
				}
			}
		}
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

const getRecentGuests = (items, limit = 6) => {
	if (!Array.isArray(items)) return [];

	const guests = [];
	const seen = new Set();

	for (const item of items) {
		const rawTitle = item?.snippet?.title;
		if (!rawTitle || /trailer/i.test(rawTitle)) continue;

		const guestName = extractGuestName(rawTitle);
		if (!guestName) continue;

		const normalizedKey = guestName.toLowerCase().trim();
		if (seen.has(normalizedKey)) continue;

		seen.add(normalizedKey);
		const thumbnail = item?.snippet?.thumbnails?.high?.url
			|| item?.snippet?.thumbnails?.medium?.url
			|| item?.snippet?.thumbnails?.default?.url
			|| null;

		guests.push({
			name: guestName,
			episodeTopic: extractEpisodeTopic(rawTitle),
			date: formatEpisodeDate(item?.snippet?.publishedAt || item?.contentDetails?.videoPublishedAt),
			image: thumbnail,
			description: item?.snippet?.description || ''
		});

		if (guests.length >= limit) break;
	}

	return guests;
};

const extractFacebookLink = (description, guestName) => {
	if (typeof description === 'string') {
		const match = description.match(/https?:\/\/(?:www\.)?facebook\.com\/[\w\-.?=&/%]+/i);
		if (match?.[0]) {
			return match[0].replace(/[),.;]+$/, '');
		}
	}

	const query = encodeURIComponent(guestName || 'Educheia');
	return `https://www.facebook.com/search/top/?q=${query}`;
};

const renderRecentGuests = (items) => {
	const guestsGrid = document.getElementById('recent-guests-grid');
	if (!guestsGrid) return;

	const guests = getRecentGuests(items, 4);
	guestsGrid.innerHTML = '';

	if (!guests.length) {
		const emptyState = document.createElement('div');
		emptyState.className = 'guest-empty';
		emptyState.textContent = 'Invitații recenți vor apărea aici în curând.';
		guestsGrid.appendChild(emptyState);
		return;
	}

	for (const guest of guests) {
		const card = document.createElement('a');
		card.className = 'guest-card';
		card.href = extractFacebookLink(guest.description, guest.name);
		card.target = '_blank';
		card.rel = 'noopener noreferrer';

		const media = document.createElement('div');
		media.className = 'guest-media';

		if (guest.image) {
			const image = document.createElement('img');
			image.className = 'guest-image';
			image.src = guest.image;
			image.alt = `Invitat: ${guest.name}`;
			image.loading = 'lazy';
			media.appendChild(image);
		}

		const avatarFallback = document.createElement('div');
		avatarFallback.className = 'guest-avatar-fallback';
		avatarFallback.textContent = (guest.name || '?').charAt(0).toUpperCase();
		media.appendChild(avatarFallback);

		if (guest.image) {
			const imageElement = media.querySelector('.guest-image');
			imageElement?.addEventListener('load', () => {
				avatarFallback.style.display = 'none';
			});

			imageElement?.addEventListener('error', () => {
				avatarFallback.style.display = 'grid';
			});

			if (imageElement?.complete && imageElement.naturalWidth > 0) {
				avatarFallback.style.display = 'none';
			}
		}

		const content = document.createElement('div');
		content.className = 'guest-content';

		const name = document.createElement('h3');
		name.className = 'guest-name';
		name.textContent = guest.name;

		const episode = document.createElement('p');
		episode.className = 'guest-episode';
		episode.textContent = guest.episodeTopic || 'Episod recent';

		const date = document.createElement('p');
		date.className = 'guest-date';
		date.textContent = `Facebook · ${guest.date || 'Profil invitat'}`;

		content.append(name, episode, date);
		card.append(media, content);
		guestsGrid.appendChild(card);
	}
};

const renderRecentGuestsSkeleton = (count = 4) => {
	const guestsGrid = document.getElementById('recent-guests-grid');
	if (!guestsGrid) return;

	guestsGrid.innerHTML = '';

	for (let index = 0; index < count; index++) {
		const card = document.createElement('div');
		card.className = 'guest-card guest-card-skeleton';
		card.setAttribute('aria-hidden', 'true');

		const media = document.createElement('div');
		media.className = 'guest-media';

		const content = document.createElement('div');
		content.className = 'guest-content';

		const name = document.createElement('p');
		name.className = 'guest-name';

		const episode = document.createElement('p');
		episode.className = 'guest-episode';

		const date = document.createElement('p');
		date.className = 'guest-date';

		content.append(name, episode, date);
		card.append(media, content);
		guestsGrid.appendChild(card);
	}
};

const loadingState = {
	episodes: true,
	channel: true
};

const loadingTargets = {
	heroMetrics: document.querySelector('.hero-metrics'),
	episodesGrid: document.querySelector('.episodes-grid'),
	recentGuestsGrid: document.getElementById('recent-guests-grid')
};

const setAriaBusy = (element, isBusy) => {
	if (!element) return;
	element.setAttribute('aria-busy', String(isBusy));
};

const syncLoadingState = () => {
	const isLoading = loadingState.episodes || loadingState.channel;
	document.body.classList.toggle('is-data-loading', isLoading);
	setAriaBusy(loadingTargets.heroMetrics, isLoading);
	setAriaBusy(loadingTargets.episodesGrid, loadingState.episodes);
	setAriaBusy(loadingTargets.recentGuestsGrid, loadingState.episodes);
};

renderRecentGuestsSkeleton();
syncLoadingState();


getEpisodes()
	.then((data) => {
		const episodeCount = data.numberOfEpisodes ?? '...';
		const guestCount = countUniqueGuests(data.items);
		const episodeCountElement = document.getElementById('nr-of-episodes');
		const guestCountElement = document.getElementById('nr-of-guests');

		setMetricValue(episodeCountElement, episodeCount);
		setMetricValue(guestCountElement, guestCount || null);

		renderQuoteCarousel(data.items);
		renderLatestEpisodeCard(data.items);
		renderRecentGuests(data.items);
		fillEpisodeCards(data.items);
	})
	.catch((error) => {
		console.error('Error loading episodes:', error);
		const episodeCountElement = document.getElementById('nr-of-episodes');
		const guestCountElement = document.getElementById('nr-of-guests');

		setMetricValue(episodeCountElement, null);
		setMetricValue(guestCountElement, null);

		renderQuoteCarousel([]);
		renderLatestEpisodeCard([]);
		renderRecentGuests([]);
		fillEpisodeCards([]);
	})
	.finally(() => {
		loadingState.episodes = false;
		syncLoadingState();
	});


const redirectToEpisode = (episodeId) => {
	window.location.href = `episodes.html/${episodeId}`;
};

const fillEpisodeCards = async (data) => {
	const episodeCards = document.querySelectorAll('.episode-card');
	if (!episodeCards.length) return;

	const episodes = data.filter((ep) => ep.contentDetails.videoId !== null);
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

		const playBtn = card.querySelector(`#play-btn-${currentEpisodeNumber}`);
		if (playBtn) {
			playBtn.addEventListener('click', () => redirectToEpisode(item.contentDetails.videoId));
		}

		card.setAttribute('data-episode-number', currentEpisodeNumber);
		currentEpisodeNumber++;
	}
};

const getChannelStats = async () => {
	const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
	const cachedTimestamp = readSessionNumber('channelFetchedAt');

	if (cachedTimestamp && (cachedTimestamp + CACHE_DURATION > Date.now())) {
		const cachedChannel = readSessionJson('channel', []);
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

		writeSessionValue('channel', JSON.stringify(data.channelInfo || []));
		writeSessionValue('channelFetchedAt', fetchedAt.toString());
 	} catch (error) {
		console.error('Error fetching channel:', error);
	}

	const storedChannel = readSessionJson('channel', []);
	writeSessionValue('channel', JSON.stringify(storedChannel));

	return {
		channel: storedChannel,
		lastFetched: readSessionNumber('channelFetchedAt'),
	};
};

getChannelStats()
	.then((data) => {
		const listeners = data.channel.statistics.subscriberCount ?? null;
		const listenersElement = document.getElementById('nr-of-listeners');
		setMetricValue(listenersElement, listeners);

		const floatingBadge = document.querySelector('.floating-badge');
		if (floatingBadge) {
			floatingBadge.textContent = `Top 1 Edu podcast în MD · + ${formatCompactNumber(parseInt(listeners))} ascultări săptămânale`;
		}
	})
	.catch((error) => {
		console.error('Error loading channel stats:', error);
		const listenersElement = document.getElementById('nr-of-listeners');
		setMetricValue(listenersElement, null);
	})
	.finally(() => {
		loadingState.channel = false;
		syncLoadingState();
	});

