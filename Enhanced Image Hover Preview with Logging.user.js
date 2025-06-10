// ==UserScript==
// @name         Enhanced Image Hover Preview with Logging
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds optimized image previews with hover enlargement, lazy loading, and console logging for debugging.
// @author       YourName
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
  const VISIBLE_IMAGES = 5;

  function fetchContent(link, onSuccess, retryDelay = 1000, maxRetries = 3) {
    let retries = 0;
    console.log(`[ImageHover] Starting fetch for: ${link}`);

    function doFetch() {
      GM_xmlhttpRequest({
        method: "GET",
        url: link,
        onload: function (response) {
          console.log(`[ImageHover] Fetch response status: ${response.status} for ${link}`);
          if (response.status === 200) {
            let parser = new DOMParser();
            let doc = parser.parseFromString(response.responseText, "text/html");
            console.log(`[ImageHover] Fetch successful for: ${link}`);
            onSuccess(doc);
          } else if (response.status === 429 && retries < maxRetries) {
            retries++;
            console.warn(`[ImageHover] Rate limited. Retrying fetch for ${link} (attempt ${retries}) after ${retryDelay * retries} ms`);
            setTimeout(doFetch, retryDelay * retries);
          } else {
            console.error(`[ImageHover] Failed to fetch ${link} after ${retries} retries`);
          }
        },
        onerror: function (error) {
          console.error(`[ImageHover] Error fetching ${link}:`, error);
        },
      });
    }
    doFetch();
  }

  function optimizeImageUrl(imgSrc) {
    console.log(`[ImageHover] Optimizing image URL: ${imgSrc}`);
    const optimizations = [
      { from: "https://imgtraffic.com/1s/", to: "https://imgtraffic.com/1/" },
      {
        from: /https?:\/\/.*\/images\/.*\.th\.jpg$/,
        to: (url) => url.replace(/\.th\.jpg$/, ".jpg"),
      },
      { from: "https://22pixx.xyz/as/", to: "https://22pixx.xyz/a/" },
      {
        from: "http://imgblaze.net/data_server_",
        to: "https://www.imgopaleno.site/data_server_",
      },
      { from: "/small/small_", to: "/big/" },
    ];

    const optimizedUrl = optimizations.reduce((url, opt) => {
      if (typeof opt.from === "string") {
        return url.replace(opt.from, opt.to);
      } else if (opt.from instanceof RegExp) {
        return opt.from.test(url) ? url.replace(opt.from, opt.to) : url;
      }
      return url;
    }, imgSrc);

    console.log(`[ImageHover] Optimized URL: ${optimizedUrl}`);
    return optimizedUrl;
  }

  function lazyLoadImage(img, src) {
    console.log(`[ImageHover] Setting up lazy loading for image: ${src}`);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log(`[ImageHover] Lazy loading image: ${src}`);
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  }

  function appendImages(linkElement, doc) {
    console.log(`[ImageHover] Appending images for link: ${linkElement.href}`);
    let images = doc.querySelectorAll("#description img");
    if (images.length === 0) {
      console.log("[ImageHover] No images found to append.");
      return;
    }

    let flexContainer = document.createElement("div");
    flexContainer.style.display = "flex";
    flexContainer.style.flexWrap = "wrap";
    flexContainer.style.gap = "10px";
    flexContainer.style.marginTop = "10px";

    images.forEach((img, index) => {
      let imgSrc = optimizeImageUrl(img.getAttribute("data-original") || img.src);
      let clonedImg = document.createElement("img");
      clonedImg.style.maxHeight = "100px";
      clonedImg.style.setProperty("margin", "0", "important");
      clonedImg.style.display = index < VISIBLE_IMAGES ? "block" : "none";

      clonedImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      lazyLoadImage(clonedImg, imgSrc);
      addImagePreviewListeners(clonedImg);

      flexContainer.appendChild(clonedImg);
    });

    if (images.length > VISIBLE_IMAGES) {
      addShowMoreButton(flexContainer, images.length);
    }

    linkElement.parentNode.insertBefore(flexContainer, linkElement.nextSibling);
    console.log(`[ImageHover] Images appended for link: ${linkElement.href}`);
  }

  function addShowMoreButton(container, totalImages) {
    console.log(`[ImageHover] Adding Show More/Less button for ${totalImages} images`);
    const button = document.createElement("button");
    button.textContent = "Show More";
    button.style.marginTop = "10px";
    button.style.cursor = "pointer";
    button.style.padding = "5px";
    button.style.border = "1px solid #ccc";
    button.style.background = "#f0f0f0";
    button.addEventListener("click", () => toggleImageVisibility(container, button));
    container.appendChild(button);
  }

  function toggleImageVisibility(container, button) {
    const images = container.querySelectorAll("img");
    const isShowingMore = button.textContent === "Show Less";
    console.log(`[ImageHover] Toggling images visibility: ${isShowingMore ? "Hide" : "Show"} extra images`);
    images.forEach((img, index) => {
      if (index >= VISIBLE_IMAGES) {
        img.style.display = isShowingMore ? "none" : "block";
      }
    });
    button.textContent = isShowingMore ? "Show More" : "Show Less";
  }

  function addImagePreviewListeners(img) {
    img.addEventListener("mouseover", () => {
      console.log(`[ImageHover] Hovering over image: ${img.src}`);
      showEnlargedImg(img.src);
    });
    img.addEventListener("mousemove", updateEnlargedImgPosition);
    img.addEventListener("mouseout", () => {
      console.log(`[ImageHover] Mouse left image: ${img.src}`);
      removeEnlargedImg();
    });
  }

  function showEnlargedImg(imgSrc) {
    const enlargedImg = document.createElement("img");
    enlargedImg.src = imgSrc;
    enlargedImg.style.position = "fixed";
    enlargedImg.style.width = "500px";
    enlargedImg.style.height = "500px";
    enlargedImg.style.pointerEvents = "none";
    enlargedImg.style.zIndex = 9999;
    enlargedImg.id = "enlargedImg";
    document.body.appendChild(enlargedImg);
    console.log(`[ImageHover] Showing enlarged image: ${imgSrc}`);
  }

  function updateEnlargedImgPosition(e) {
    const enlargedImg = document.getElementById("enlargedImg");
    if (enlargedImg) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const imgWidth = 500;
      const imgHeight = 500;
      const offsetX = 10;
      const offsetY = 10;

      let left = e.clientX + offsetX;
      let top = e.clientY + offsetY;

      if (left + imgWidth > viewportWidth) {
        left = e.clientX - imgWidth - offsetX;
      }
      if (top + imgHeight > viewportHeight) {
        top = e.clientY - imgHeight - offsetY;
      }

      enlargedImg.style.left = left + "px";
      enlargedImg.style.top = top + "px";
    }
  }

  function removeEnlargedImg() {
    const enlargedImg = document.getElementById("enlargedImg");
    if (enlargedImg) {
      document.body.removeChild(enlargedImg);
      console.log("[ImageHover] Removed enlarged image");
    }
  }

  // === INIT: Add listeners to links ===
  console.log("[ImageHover] Initializing script, attaching listeners to all links");
  document.querySelectorAll("a").forEach((link) => {
    link.addEventListener("mouseenter", () => {
      if (!link.dataset.imagesAppended) {
        console.log(`[ImageHover] Hover detected on link: ${link.href}`);
        fetchContent(link.href, (doc) => {
          appendImages(link, doc);
          link.dataset.imagesAppended = "true";
          console.log(`[ImageHover] Images loaded and appended for link: ${link.href}`);
        });
      } else {
        console.log(`[ImageHover] Images already appended for link: ${link.href}`);
      }
    });
  });
})();
