// State
let episodes = [];
let originalEpisodes = []; // Store original fetch for sorting
let sortOrder = 'desc'; // 'desc' (newest first) or 'asc' (oldest first)
let scrollContainer, stickyWrapper, horizontalTrack, timelineFillBottom, cards, scrollHint;
let maxScroll = 0;
let windowHeight = window.innerHeight;
let isScrolling = false;
let snapTimeout;

// Player State
let playerState = {
    isOpen: false,
    mode: 'video', // 'video' | 'audio'
    currentEpisode: null
};

// Utils
const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
        return dateString;
    }
};

const init = async () => {
    // 1. Fetch Episodes
    try {
        if (typeof getEpisodes === 'function') {
            const data = await getEpisodes();
            const rawItems = (data && data.items) ? data.items : [];
            
            // Normalize Data
            originalEpisodes = rawItems.map(item => {
                 const snippet = item.snippet || item;
                 return {
                     videoId: (snippet.resourceId && snippet.resourceId.videoId) || item.videoId,
                     title: snippet.title,
                     description: snippet.description,
                     publishedAt: snippet.publishedAt,
                     thumbnails: snippet.thumbnails,
                     dateObj: new Date(snippet.publishedAt)
                 };
            });
            
            // Default Sort: Newest First
            episodes = [...originalEpisodes].sort((a, b) => b.dateObj - a.dateObj);

        } else {
            throw new Error('getEpisodes not available');
        }
    } catch (e) {
        console.warn('API fetch failed or function missing, using fallbacks.', e);
        originalEpisodes = Array.from({ length: 8 }).map((_, i) => ({
            videoId: "jNQXAC9IVRw",
            title: `Perspective Digitale: Episodul ${i + 1}`,
            description: "O discuție despre viitorul tehnologiei și impactul inteligenței artificiale în educație.",
            publishedAt: new Date().toISOString(),
            dateObj: new Date()
        }));
        episodes = [...originalEpisodes];
    }

    // 2. Render Cards
    renderCards();
    
    // 3. Setup Scroll Logic
    setupScroll();

    // 4. Setup Player
    setupPlayer();
    
    // 5. Check URL
    checkUrlForEpisode();
    
    // 6. Setup Controls (Sort & Jump)
    setupControls();
};

const setupControls = () => {
    const sortBtn = document.getElementById('sort-btn');
    const sortLabel = document.getElementById('sort-label');
    const jumpBtn = document.getElementById('scroll-jump-btn');
    
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
            
            // Update Label & Icon Rotation
            if (sortOrder === 'desc') {
                sortLabel.textContent = 'Cele mai noi';
                sortBtn.querySelector('svg').style.transform = 'rotate(0deg)';
            } else {
                sortLabel.textContent = 'Cele mai vechi';
                sortBtn.querySelector('svg').style.transform = 'rotate(180deg)';
            }
            
            // Sort Data
            episodes.sort((a, b) => {
                return sortOrder === 'desc' ? b.dateObj - a.dateObj : a.dateObj - b.dateObj;
            });
            
            // Re-render
            renderCards();
            // Reset Scroll
            window.scrollTo({ top: 0, behavior: 'instant' });
            updateScroll();
        });
    }
    
    if (jumpBtn) {
        jumpBtn.addEventListener('click', () => {
            const containerHeight = scrollContainer.getBoundingClientRect().height;
            const scrollDistance = containerHeight - windowHeight;
            
            // Check current position to decide where to jump
            const currentScroll = window.scrollY;
            const target = currentScroll < (scrollDistance / 2) ? scrollDistance : 0;
            
            // Update button text logic for next click?
            // User asked for "To End" button. Let's make it toggle or contextual?
            // Or just "To End". Since native scroll bar is hidden, maybe "To Start" is useful too.
            
            window.scrollTo({
                top: target,
                behavior: 'smooth'
            });
            
            // Update text after a delay or based on scroll? Maybe keep it simple.
        });
    }
};

const renderCards = () => {
    horizontalTrack = document.getElementById('horizontal-track');
    if (!horizontalTrack) return;

    horizontalTrack.innerHTML = ''; // Clear

    episodes.forEach((ep, index) => {
        // Thumbnail logic
        let imageUrl = '../images/logo-light.png';
        if (ep.thumbnails) {
            imageUrl = ep.thumbnails.maxres?.url || ep.thumbnails.high?.url || ep.thumbnails.medium?.url;
        } else if (ep.videoId) {
            imageUrl = `https://img.youtube.com/vi/${ep.videoId}/hqdefault.jpg`;
        }
        
        // Use index for numbering display, but respect sort order
        // If sorting desc (newest first), display numbers N down to 1?
        // Or just "Episodul X" from title if available? 
        // Let's stick to simple logic: 
        const displayNum = sortOrder === 'desc' ? (episodes.length - index) : (index + 1);

        const card = document.createElement('div');
        card.className = 'episode-card group';
        card.dataset.index = index;
        card.dataset.id = ep.videoId;
        
        // Add more top padding inside card or track to center it better?
        // The track has pt-20 now.
        
        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${imageUrl}" alt="${ep.title}" class="card-image" loading="lazy">
                <div class="card-content">
                    <span class="episode-number">Episodul ${displayNum}</span>
                    <h3 class="episode-title">${ep.title}</h3>
                    <div class="episode-meta">
                        <span>${formatDate(ep.publishedAt)}</span>
                    </div>
                </div>
                
                <!-- Play Overlay -->
                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                   <button class="w-24 h-24 rounded-full bg-primary text-slate-900 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform shadow-[0_0_30px_rgba(88,199,214,0.6)]">
                        <svg class="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </button>
                </div>
            </div>
            
            <!-- Audio Wave Animation (Injected via JS when active) -->
            <div class="audio-wave">
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
                <span class="wave-bar"></span>
            </div>
        `;
        
        card.addEventListener('click', () => openPlayer(ep));
        horizontalTrack.appendChild(card);
    });

    cards = document.querySelectorAll('.episode-card');
};

const setupScroll = () => {
    scrollContainer = document.getElementById('scroll-container');
    timelineFillBottom = document.getElementById('timeline-fill-bottom'); // Updated ID
    scrollHint = document.getElementById('scroll-hint');
    
    if (!scrollContainer) return;

    window.addEventListener('resize', () => {
        windowHeight = window.innerHeight;
        updateScroll();
    });

    // Throttled scroll handling for performance
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                updateScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
        
        // Hide scroll hint on first scroll - Faster fade
        if (window.scrollY > 20 && scrollHint && scrollHint.style.opacity !== '0') {
            scrollHint.style.transition = 'opacity 0.2s ease';
            scrollHint.style.opacity = '0';
        }
        
        handleSnap();
    });
    
    updateScroll();
};


const handleSnap = () => {
    clearTimeout(snapTimeout);
    
    // Only snap if we are distinctly within the scroll container bounds
    // We want to avoid snapping if the user is transitioning in/out of the section.
    const rect = scrollContainer.getBoundingClientRect();
    const containerHeight = rect.height;
    const scrollDistance = containerHeight - windowHeight;
    
    // Check if we are in the "active sticky" region.
    // Sticky is active roughly when rect.top <= 0 and rect.bottom >= windowHeight.
    // However, we want to allow smooth exit/entry.
    
    // Defining margins in pixels where we disable snapping
    const snapMargin = 100; // 100px buffer zone at top and bottom

    // If rect.top is > -snapMargin, we are near the start (scrolling up to header). Don't snap.
    if (rect.top > -snapMargin) return;
    
    // If rect.bottom < windowHeight + snapMargin, we are near the end (scrolling down to footer). Don't snap.
    // rect.bottom = rect.top + containerHeight
    // So if (rect.top + containerHeight) < windowHeight + snapMargin
    if (rect.bottom < windowHeight + snapMargin) return;

    snapTimeout = setTimeout(() => {
        // ... (rest of logic same as before)
        
        // Output from previous turn ends here, I need to complete the function body I'm replacing
        
        // Current progress (0 to 1) based on scroll
        // progress = -rect.top / scrollDistance
        // We need to match this to the nearest card center.
        
        // 1. Calculate target translations for all cards to be centered
        const viewportWidth = window.innerWidth;
        const trackWidth = horizontalTrack.scrollWidth;
        const maxTranslate = trackWidth - viewportWidth; 
        
        // Current translation
        const currentProgress = Math.max(0, Math.min(1, -rect.top / scrollDistance));
        const currentTranslate = -(currentProgress * maxTranslate);

        let closestCardIndex = 0;
        let minDistance = Infinity;
        let targetProgress = 0;

        cards.forEach((card, index) => {
            // Calculate where this card's center is in the track
            const cardLeft = card.offsetLeft;
            const cardWidth = card.offsetWidth;
            const cardCenter = cardLeft + (cardWidth / 2);
            
            // To center this card, we need a translation X such that:
            // cardCenter + X = viewportWidth / 2
            // So X = (viewportWidth / 2) - cardCenter
            
            // However, X is constrained between 0 and -maxTranslate.
            // Actually, usually X is negative (sliding left).
            // Let's call requiredTranslate the value we need.
            let requiredTranslate = (viewportWidth / 2) - cardCenter;
            
            // Clamp it to legal bounds [ -maxTranslate, 0 ]
            // Note: maxTranslate is positive number representing magnitude.
            // transform is negative.
            // So range is [-maxTranslate, 0]
            requiredTranslate = Math.max(-maxTranslate, Math.min(0, requiredTranslate));
            
            // What "progress" does this correspond to?
            // currentTranslate = -(progress * maxTranslate)
            // progress = -currentTranslate / maxTranslate
            let cardProgress = -requiredTranslate / maxTranslate;
            
            // Check if this card is closest to current scroll state
            const dist = Math.abs(cardProgress - currentProgress);
            if (dist < minDistance) {
                minDistance = dist;
                closestCardIndex = index;
                targetProgress = cardProgress;
            }
        });

        // Calculate the absolute scroll position target
        const absoluteContainerTop = window.scrollY + rect.top; // Valid property of the element in doc
        const snapScrollY = absoluteContainerTop + (targetProgress * scrollDistance);

        // Snap
        if (Math.abs(window.scrollY - snapScrollY) > 5) {
            window.scrollTo({
                top: snapScrollY,
                behavior: 'smooth'
            });
        }

    }, 150);
};

const updateScroll = () => {
    if (!scrollContainer || !horizontalTrack) return;

    const rect = scrollContainer.getBoundingClientRect();
    const containerTop = rect.top;
    const containerHeight = rect.height;
    
    // Calculate progress: 0 when container starts entering viewport (or hits top), 1 when it ends.
    // Sticky starts when rect.top <= 0.
    // Sticky ends when rect.bottom <= windowHeight.
    
    const scrollDistance = containerHeight - windowHeight;
    let progress = -containerTop / scrollDistance;
    
    // Clamp progress 0 to 1
    progress = Math.max(0, Math.min(1, progress));

    // Move Track
    // We want to transform the track to the left.
    // Max translation = trackWidth - viewportWidth
    // To center the last card, we subtract viewportWidth but might need adjustment based on gaps/padding.
    // Better: Calculate total scrollable width
    
    // Center the first card initially:
    // It is centered by CSS defaults (flexbox centering in HTML?), or we align it.
    // Let's assume standard left-to-right scroll.
    
    const trackWidth = horizontalTrack.scrollWidth;
    const viewportWidth = window.innerWidth;
    
    // We want to scroll until the *last* card is centered or fully visible.
    // Actually, let's map it so card N is centered at progress N/Total.
    
    // Total translation needed to see the last card.
    // If cards are `70vw`, and we have 5 cards + gaps.
    // We want the last card to be centered.
    // Center of last card is at: (Width - cardWidth/2 - paddingRight) approx?
    // Let's just scroll the full width minus one screen width (plus some margin).
    
    const maxTranslate = trackWidth - viewportWidth; 
    
    // Refined Progress Mapping for Centering
    // We can just translate linearly. 
    // To ensure "snapping" visuals align with "snapping" scroll, linear is best.

    const translateX = -(progress * maxTranslate);
    
    if (rect.top <= 0 && rect.bottom >= windowHeight) {
        horizontalTrack.style.transform = `translate3d(${translateX}px, 0, 0)`;
    } else if (rect.top > 0) {
        horizontalTrack.style.transform = `translate3d(0, 0, 0)`;
    } else {
        horizontalTrack.style.transform = `translate3d(${-maxTranslate}px, 0, 0)`;
    }

    // Update Timeline Fill (Bottom)
    const percentage = `${progress * 100}%`;
    if (timelineFillBottom) timelineFillBottom.style.width = percentage;

    // Active Card & Snapping Visuals
    // Find centered card based on translation
    const currentTranslate = Math.abs(translateX);
    const centerPoint = currentTranslate + (viewportWidth / 2);
    
    cards.forEach(card => {
        const cardLeft = card.offsetLeft;
        const cardWidth = card.offsetWidth;
        const cardCenter = cardLeft + (cardWidth / 2);
        
        // Check distance to visual center
        const dist = Math.abs(centerPoint - cardCenter);
        const isClose = dist < (cardWidth / 1.5); // Threshold

        if (isClose) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // Parallax Header Opacity & Scroll Hint
    const header = document.getElementById('section-header');
    if (header) {
        // "fade out instantly" - start fade at 0, end at 0.05
        const fadeEnd = 0.05;
        if (progress > fadeEnd) {
            header.style.opacity = '0';
        } else {
            // Map 0 -> 1 to fadeEnd -> 0
            const opacity = 1 - (progress / fadeEnd);
            header.style.opacity = Math.max(0, opacity).toString();
        }
     
        if (progress > 0) {
            header.style.pointerEvents = 'none';
        } else {
             // header.style.pointerEvents = 'auto'; // It's pointer-events-none in CSS anyway essentially
        }
    }
    
    // Also fade out buttons/controls if needed? No, user wants controls.
};

// --- PLAYER ---

let youtubePlayer;

const setupPlayer = () => {
    // Inject YouTube API if not present
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Close Button
    document.getElementById('close-player')?.addEventListener('click', closePlayer);
    
    // Mode Toggles
    document.getElementById('mode-video')?.addEventListener('click', () => setPlayerMode('video'));
    document.getElementById('mode-audio')?.addEventListener('click', () => setPlayerMode('audio'));

    // Keyboard 'Escape'
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && playerState.isOpen) closePlayer();
    });
};

const openPlayer = (episode) => {
    playerState.isOpen = true;
    playerState.currentEpisode = episode;
    
    const modal = document.getElementById('player-modal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('scale-95');
    modal.classList.add('scale-100');
    
    // Update Content
    document.getElementById('player-title').textContent = episode.title;
    document.getElementById('player-desc').textContent = episode.description || ''; // Assuming desc
    document.getElementById('player-date').textContent = formatDate(episode.publishedAt);
    
    // Update URL hash without reload
    history.pushState(null, null, `#${episode.videoId}`); // Or specific ID scheme

    loadYoutubeVideo(episode.videoId);
};

const closePlayer = () => {
    playerState.isOpen = false;
    
    const modal = document.getElementById('player-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('scale-95');
    modal.classList.remove('scale-100');

    // Stop Video
    if (youtubePlayer && youtubePlayer.stopVideo) {
        youtubePlayer.stopVideo();
    }
    
    // Clean URL
    history.pushState(null, null, window.location.pathname);
};

const loadYoutubeVideo = (videoId) => {
    if (window.YT && window.YT.Player) {
        if (youtubePlayer) {
            youtubePlayer.loadVideoById(videoId);
        } else {
            youtubePlayer = new YT.Player('youtube-player-container', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'autoplay': 1,
                    'rel': 0
                },
                events: {
                    'onStateChange': onPlayerStateChange
                }
            });
        }
    } else {
        // Retry if API not ready
        setTimeout(() => loadYoutubeVideo(videoId), 100);
    }
};

const setPlayerMode = (mode) => {
    playerState.mode = mode;
    
    const visualizer = document.getElementById('audio-visualizer');
    const container = document.getElementById('youtube-player-container');
    const btnVideo = document.getElementById('mode-video');
    const btnAudio = document.getElementById('mode-audio');

    if (mode === 'audio') {
        visualizer.classList.replace('hidden', 'flex');
        // We generally keep the player running but hidden or small to keep audio.
        // YouTube policy requires the player to be visible. So we can't fully hide it or set display:none.
        // We can overlay the visualizer on top with slight transparency or make player very small (pixel).
        // Best UX for compliance: Keep player visible but maybe covered?
        // Actually, opacity 0 or visibility hidden pauses execution in some browsers to save resources.
        // Let's just overlay the 'Audio Mode' graphic ON TOP of the video.
        // YouTube API allows 'listening' to videos.
        
        btnAudio.classList.add('active', 'bg-primary', 'text-slate-900');
        btnAudio.classList.remove('text-text-muted', 'hover:text-white', 'hover:bg-white/5');
        
        btnVideo.classList.remove('active', 'bg-primary', 'text-slate-900');
        btnVideo.classList.add('text-text-muted');
        
    } else {
        visualizer.classList.replace('flex', 'hidden');
        
        btnVideo.classList.add('active', 'bg-primary', 'text-slate-900');
        btnVideo.classList.remove('text-text-muted');
        
        btnAudio.classList.remove('active', 'bg-primary', 'text-slate-900');
        btnAudio.classList.add('text-text-muted');
    }
};

const onPlayerStateChange = (event) => {
    // Handle auto-next?
};

const checkUrlForEpisode = () => {
    const hash = window.location.hash.substring(1); // Remove #
    if (hash && episodes.length > 0) {
        const titleMatch = episodes.find(e => e.videoId === hash);
        if (titleMatch) {
            openPlayer(titleMatch);
        }
    }
};

// Run Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
