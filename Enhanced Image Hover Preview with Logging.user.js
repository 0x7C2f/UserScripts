// ==UserScript==
// @name         Hover Zoom
// @version      1.2
// @description  Show image/video previews on hover using highest quality sources
// @grant        none
// ==/UserScript==

(() => {
    const debug = false;

    function log(...args) {
        if (debug) console.log('[HoverZoom]', ...args);
    }

    const previewId = 'hover-preview';

    function isImageUrl(url) {
        return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url);
    }

    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg)$/i.test(url);
    }

    function isMediaUrl(url) {
        return isImageUrl(url) || isVideoUrl(url);
    }

    function getBestSrcFromSrcset(srcset) {
        if (!srcset) return null;
        const candidates = srcset.split(',').map(s => s.trim());
        const best = candidates
            .map(src => {
                const [url, width] = src.split(/\s+/);
                return { url, width: parseInt(width) || 0 };
            })
            .sort((a, b) => b.width - a.width)[0];
        return best?.url || null;
    }

    function removePreview() {
        const existing = document.getElementById(previewId);
        if (existing) existing.remove();
    }

    async function showPreview(url, event) {
        removePreview();

        const preview = document.createElement(
            isVideoUrl(url) ? 'video' : 'img'
        );
        preview.id = previewId;
        preview.style.position = 'fixed';
        preview.style.top = '0px'; // temporarily set to avoid layout shift
        preview.style.left = '0px';
        preview.style.maxWidth = 'none';
        preview.style.maxHeight = 'none';
        preview.style.visibility = 'hidden';
        preview.style.zIndex = '999999';
        preview.style.border = '2px solid #222';
        preview.style.borderRadius = '8px';
        preview.style.backgroundColor = '#000';

        if (preview.tagName === 'VIDEO') {
            preview.src = url;
            preview.autoplay = true;
            preview.loop = true;
            preview.muted = true;
            preview.playsInline = true;
        } else {
            preview.src = url;
            preview.alt = 'Preview';
        }

        document.body.appendChild(preview);

        // Wait until image/video metadata is loaded
        await new Promise(resolve => {
            if (preview.tagName === 'VIDEO') {
                preview.addEventListener('loadedmetadata', resolve, {
                    once: true,
                });
            } else {
                preview.onload = resolve;
            }
        });

        const doc = document.documentElement;
        const padding = 20;
        const maxWidth = doc.clientWidth - padding;
        const maxHeight = doc.clientHeight - padding;

        let width = preview.naturalWidth || preview.videoWidth || 300;
        let height = preview.naturalHeight || preview.videoHeight || 200;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;

        preview.style.width = `${width}px`;
        preview.style.height = `${height}px`;

        const x = Math.min(
            event.clientX + 15,
            doc.clientWidth - width - padding
        );
        const y = Math.min(
            event.clientY + 15,
            doc.clientHeight - height - padding
        );

        preview.style.left = `${x}px`;
        preview.style.top = `${y}px`;
        preview.style.visibility = 'visible';
    }

    document.addEventListener('mouseover', async e => {
        const target = e.target.closest('a, img, video, source');
        if (!target) return;

        let url = null;

        if (target.tagName === 'A') {
            if (!isMediaUrl(target.href)) return;
            url = target.href;
        } else if (target.tagName === 'IMG') {
            url = getBestSrcFromSrcset(target.srcset) || target.src;
        } else if (target.tagName === 'SOURCE') {
            url = target.src;
        } else if (target.tagName === 'VIDEO') {
            url = target.currentSrc || target.src;
        }

        if (!url || !isMediaUrl(url)) return;

        try {
            await showPreview(url, e);
        } catch (err) {
            log('Error showing preview:', err);
        }
    });

    document.addEventListener('mouseout', removePreview);
})();
