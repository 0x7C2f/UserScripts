// ==UserScript==
// @name         Hover Zoom with Media-only Link Preview & Smart Positioning (Preload Size)
// @author      0x7C2f
// @version      1.6
// @grant        none
// ==/UserScript==

(() => {
    const debug = false;

    function log(...args) {
        if (debug) console.log('[HoverZoom]', ...args);
    }

    const imgurCache = {};
    const imgurContentTypes = [
        { ext: 'mp4', type: 'video/mp4' },
        { ext: 'gif', type: 'image/gif' },
        { ext: 'jpg', type: 'image/jpeg' },
        { ext: 'png', type: 'image/png' },
    ];

    function isMediaUrl(url) {
        return /\.(jpe?g|png|gif|mp4|webm|gifv)$/i.test(url);
    }

    function isImgurPageUrl(url) {
        return /^https?:\/\/imgur\.com\/([A-Za-z0-9]+)$/.test(url);
    }

    function getImgurId(url) {
        const match = url.match(/^https?:\/\/imgur\.com\/([A-Za-z0-9]+)$/);
        return match ? match[1] : null;
    }

    async function resolveImgurDirectUrl(imgurId) {
        if (imgurCache[imgurId]) return imgurCache[imgurId];
        for (const { ext, type } of imgurContentTypes) {
            const testUrl = `https://i.imgur.com/${imgurId}.${ext}`;
            try {
                const response = await fetch(testUrl, { method: 'HEAD' });
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes(type)) {
                        imgurCache[imgurId] = testUrl;
                        return testUrl;
                    }
                }
            } catch (e) {
                log(`HEAD failed for ${testUrl}`, e);
            }
        }
        return null;
    }

    function getFullImgurUrl(url) {
        return url.replace(
            /i\.imgur\.com\/([a-zA-Z0-9]{5,7})_[a-z]\.(jpg|png|gif)/,
            'i.imgur.com/$1.$2'
        );
    }

    let previewEl = null;

    function removePreview() {
        if (previewEl) {
            previewEl.remove();
            previewEl = null;
        }
    }

    document.addEventListener('mousemove', e => {
        if (!previewEl) return;

        const offset = 15;
        const { offsetWidth, offsetHeight } = previewEl;

        let left = e.clientX + offset;
        let top = e.clientY;

        if (left + offsetWidth > window.innerWidth) {
            left = window.innerWidth - offsetWidth - 10;
        }
        if (top + offsetHeight > window.innerHeight) {
            top = window.innerHeight - offsetHeight - 10;
        }

        previewEl.style.left = `${left}px`;
        previewEl.style.top = `${top}px`;
    });

    async function preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () =>
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error('Image failed to load: ' + url));
            img.src = url;
        });
    }

    async function preloadVideo(url) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.src = url;
            video.onloadedmetadata = () => {
                resolve({ width: video.videoWidth, height: video.videoHeight });
            };
            video.onerror = () => reject(new Error('Video failed to load: ' + url));
        });
    }

    async function showPreview(url) {
        removePreview();

        if (isImgurPageUrl(url)) {
            const id = getImgurId(url);
            if (id) url = (await resolveImgurDirectUrl(id)) || url;
        }

        url = getFullImgurUrl(url);
        const isVideo = /\.(mp4|webm)$/i.test(url);

        let dims;
        try {
            dims = isVideo ? await preloadVideo(url) : await preloadImage(url);
        } catch {
            log('Failed to preload media:', url);
            return;
        }

        if (!dims || !dims.width || !dims.height) {
            log('Invalid media dimensions:', url);
            return;
        }

        const maxWidth = window.innerWidth / 2;
        const maxHeight = window.innerHeight - 20;
        const scale = Math.min(
            1,
            maxWidth / dims.width,
            maxHeight / dims.height
        );
        const width = dims.width * scale;
        const height = dims.height * scale;

        const el = document.createElement(isVideo ? 'video' : 'img');
        el.id = 'hover-preview';
        el.style.position = 'fixed';
        el.style.left = '0';
        el.style.top = '0';
        el.style.zIndex = '999999';
        el.style.pointerEvents = 'none';
        el.style.border = '2px solid #222';
        el.style.borderRadius = '8px';
        el.style.backgroundColor = '#000';
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;

        if (isVideo) {
            el.src = url;
            el.autoplay = true;
            el.loop = true;
            el.muted = true;
            el.playsInline = true;
        } else {
            el.src = url;
            el.alt = 'Preview';
            el.draggable = false;
        }

        previewEl = el;
        document.body.appendChild(el);
    }

    document.addEventListener('mouseover', async e => {
        const target = e.target.closest('a, img, video, source');
        if (!target) return;

        let url = null;
        if (target.tagName === 'A') {
            url = target.href;
        } else if (target.tagName === 'IMG' || target.tagName === 'SOURCE') {
            url = target.src;
        } else if (target.tagName === 'VIDEO') {
            url = target.currentSrc || target.src;
        }

        if (!url) return;

        if (!isMediaUrl(url) && !isImgurPageUrl(url)) return;

        try {
            await showPreview(url);
        } catch (err) {
            log('Error showing preview:', err);
        }
    });

    document.addEventListener('mouseout', removePreview);
})();
