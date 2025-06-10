// ==UserScript==
// @name         1337x - Combined Enhancements 2025 (v9) - TEST
// @namespace    http://tampermonkey.net/
// @version      2025.1
// @description  Adds a column with torrent and magnet links, extends titles, adds images, full width site
// @author       sharmanhall
// @contributor  darkred, NotNeo, barn852, French Bond
// @match        *://*.1337x.to/*
// @match        *://*.1337x.to/torrent/*
// @match        *://*.1337x.to/torrent/*
// @match        *://*.1337x.to/*
// @match        *://*.1337x.ws/torrent/*
// @match        *://*.1337x.eu/torrent/*
// @match        *://*.1337x.eu/*
// @match        *://*.1337x.se/torrent/*
// @match        *://*.1337x.is/*
// @match        *://*.1337x.is/torrent/*
// @match        *://*.1337x.gd/*
// @match        *://*.1337x.gd/torrent/*
// @match        *://*.x1337x.cc/*
// @match        *://*.x1337x.cc/torrent/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=1337x.to
//
//    Thanks to:
//    - French Bond: modified original script taken from https://greasyfork.org/en/scripts/479974-1337x-ux-enhancement
//    - darkred: modified original script taken from https://greasyfork.org/en/scripts/479974-1337x-ux-enhancement
//    - NotNeo: most of the CSS used is taken from this script: https://greasyfork.org/en/scripts/373230-1337x-magnet-torrent-links-everywhere .
//    - barn852 for his contribution here: https://greasyfork.org/en/scripts/420754-1337x-torrent-and-magnet-links/discussions/96026
//
// Official mirrors list: https://1337x.to/about
//
// @downloadURL https://update.greasyfork.org/scripts/483602/1337x%20-%20Combined%20Enhancements%202024.user.js
// @updateURL https://update.greasyfork.org/scripts/483602/1337x%20-%20Combined%20Enhancements%202024.meta.js
// ==/UserScript==

const VISIBLE_IMAGES = 4; // Number of images to show initially

(function () {
  'use strict';


  // Configuration

  let config = {

    showThumbnails: GM_getValue('showThumbnails', true)

  };



  // Add configuration UI

  function addConfigUI() {

    const configDiv = document.createElement('div');

    configDiv.style.position = 'fixed';

    configDiv.style.top = '10px';

    configDiv.style.right = '10px';

    configDiv.style.zIndex = '9999';

    configDiv.style.backgroundColor = '#f0f0f0';

    configDiv.style.padding = '10px';

    configDiv.style.border = '1px solid #ccc';

    configDiv.style.borderRadius = '5px';



    const thumbnailToggle = document.createElement('input');

    thumbnailToggle.type = 'checkbox';

    thumbnailToggle.id = 'thumbnailToggle';

    thumbnailToggle.checked = config.showThumbnails;



    const label = document.createElement('label');

    label.htmlFor = 'thumbnailToggle';

    label.textContent = 'Show Thumbnails';



    thumbnailToggle.addEventListener('change', function() {

      config.showThumbnails = this.checked;

      GM_setValue('showThumbnails', config.showThumbnails);

      location.reload();

    });



    configDiv.appendChild(thumbnailToggle);

    configDiv.appendChild(label);

    document.body.appendChild(configDiv);

  }

  // Add a column with torrent and magnet links
  function appendColumn() {
    const allTables = document.querySelectorAll('.table-list-wrap');
    const isSeries = window.location.href.includes('/series/');
    const title = 'ml&nbsp;dl';

    allTables.forEach((table) => {
      const headersCellsInitial = table.querySelectorAll(`.table-list > thead > tr:not(.blank) > th:nth-child(1),
                                                          .table-list > tbody > tr:not(.blank) > td:nth-child(1)`);
      headersCellsInitial.forEach((cell, index) => {
        if (index === 0 && !isSeries) {
          cell.insertAdjacentHTML('afterend', `<th>` + title + `</th>`);
        } else {
          cell.insertAdjacentHTML('afterend', `<td>` + title + `</td>`);
        }
      });

      const headersCellsNew = table.querySelectorAll(`.table-list > thead > tr:not(.blank) > th:nth-child(2),
                                                      .table-list > tbody > tr:not(.blank) > td:nth-child(2)`);
      headersCellsNew.forEach((cell, index) => {
        cell.classList.add('coll-1b');
        if (index === 0 && !isSeries) {
          cell.innerHTML = title;
        } else {
          cell.classList.add('dl-buttons');

          let href;
          if (!isSeries){
            href = headersCellsInitial[index].firstElementChild.nextElementSibling.href;
          } else {
            href = headersCellsInitial[index].firstElementChild.href;
          }

          cell.innerHTML = `<a class="list-button-magnet" data-href=" ${href} "href="javascript:void(0)" title="ml via xhr"><i class="flaticon-magnet"></i></a>`;
          cell.innerHTML += `<a class="list-button-dl" data-href="     ${href} "href="javascript:void(0)" title="dl via xhr"><i class="flaticon-torrent-download"></i></a>`;
        }
      });
    });
  }

  function addClickListeners(links, type){
    links.forEach((link) => {
      link.addEventListener('click', function(){
        let href = this.getAttribute('href');
        if (href === 'javascript:void(0)') {
          let tLink = this.getAttribute('data-href');

          var xhr = new XMLHttpRequest();
          xhr.open('GET', tLink, true);
          xhr.onload = function () {
            let container = document.implementation.createHTMLDocument().documentElement;
            container.innerHTML = xhr.responseText;

            let retrievedLink = (type === 'ml') ? container.querySelector('a[href^="magnet:"]') : container.querySelector('.dropdown-menu > li > a');

            if (retrievedLink) {
              link.setAttribute('href', retrievedLink.href.replace('http:', 'https:'));
              link.click();
            }
          };
          xhr.send();
        }
      }, false);
    });
  }

  function createColumn(){
    appendColumn();
    addClickListeners(document.querySelectorAll('.list-button-magnet'), 'ml' );
    addClickListeners(document.querySelectorAll('.list-button-dl'), 'dl' );
  }

  // List all torrent links on the page
  function listTorrentLinks() {
    return document.querySelectorAll('.table-list a[href^="/torrent/"]');
  }

  // Clean the page title to get the torrent title
  function cleanTitle(title) {
    if (title.startsWith('Download ')) {
      title = title.substring('Download '.length);
    }
    let pipeIndex = title.indexOf(' Torrent |');
    if (pipeIndex !== -1) {
      title = title.substring(0, pipeIndex);
    }
    return title;
  }

  // Modify the H1 content on torrent pages
  function modifyH1ContentOnTorrentPages() {
    if (window.location.pathname.startsWith('/torrent/')) {
      let h1Element = document.querySelector('.box-info-heading h1');
      if (h1Element) {
        h1Element.textContent = cleanTitle(document.title);
      }
    }
  }

// Process the link to update the title and add download buttons and images
function processLink(link) {
  fetchContent(link, (doc) => {
    let torrentLink = doc.querySelector("a[href*='itorrents.org/torrent/']");
    let magnetLink = doc.querySelector("a[href^='magnet:?']");

    updateLinkTitle(link, doc);
    appendImages(link, doc);
    // Pass the links in the correct order
    addDownloadButtons(link, torrentLink, magnetLink);
  });
}



  // Update the link title
  function updateLinkTitle(link, doc) {
    let title = cleanTitle(doc.querySelector('title').innerText);
    link.innerText = title;
  }

// Add download buttons next to the link
function addDownloadButtons(link, torrentLink, magnetLink) {
  let buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.alignItems = 'center';
  buttonsContainer.style.gap = '5px';
  buttonsContainer.style.marginTop = '10px';

  // Torrent button
  let torrentButton = document.createElement('a');
  torrentButton.href = torrentLink ? torrentLink.href.replace('http:', 'https:') : '#';
  torrentButton.title = 'Download torrent file';
  torrentButton.innerHTML = '<i id="DLT" class="flaticon-torrent-download" style="color: #89ad19; font-size: 16px"></i>';

  // Magnet button
  let magnetButton = document.createElement('a');
  magnetButton.href = magnetLink ? magnetLink.href : '#';
  magnetButton.title = 'Download via magnet';
  magnetButton.innerHTML = '<i id="DLM" class="flaticon-magnet" style="color: #da3a04; font-size: 16px"></i>';

 buttonsContainer.appendChild(torrentButton);
  buttonsContainer.appendChild(magnetButton);

  link.after(buttonsContainer);
}

// Modify this function to update or replace existing download buttons
  function updateDownloadButtons() {
    document.querySelectorAll('.table-list-wrap .table-list tbody tr').forEach(row => {
      let torrentPageLink = row.querySelector('.coll-1.name a').getAttribute('href');
      let fullTorrentPageLink = `https://1337x.to${torrentPageLink}`;

      fetchContent(fullTorrentPageLink, (doc) => {
        let torrentLink = doc.querySelector("a[href*='itorrents.org/torrent/']");
        let magnetLink = doc.querySelector("a[href^='magnet:?']");

        let dlButtonsCell = row.querySelector('.coll-1b.dl-buttons');
        if (dlButtonsCell) {
          // Check if buttons already exist and update them or create new ones
          updateOrCreateButtons(dlButtonsCell, torrentLink, magnetLink);
        }
      });
    });
  }

  function updateOrCreateButtons(dlButtonsCell, torrentLink, magnetLink) {
    let existingButtons = dlButtonsCell.querySelectorAll('a');
    if (existingButtons.length === 2) {
      // Update existing buttons
      existingButtons[0].href = torrentLink ? torrentLink.href.replace('http:', 'https:') : '#';
      existingButtons[1].href = magnetLink ? magnetLink.href : '#';
    } else {
      // Create new buttons
      dlButtonsCell.innerHTML = createButtonHTML(torrentLink, magnetLink);
    }
  }


// Function to create HTML for download and magnet buttons
function createButtonHTML(torrentLink, magnetLink) {
  let torrentButtonHTML = torrentLink ? `<a href="${torrentLink.href.replace('http:', 'https:')}" title="Download torrent file"><i class="flaticon-torrent-download" style="color: #89ad19; font-size: 16px"></i></a>` : '';
  let magnetButtonHTML = magnetLink ? `<a href="${magnetLink.href}" title="Download via magnet"><i class="flaticon-magnet" style="color: #da3a04; font-size: 16px"></i></a>` : '';
  // Place the torrent button first and the magnet button second
  return `<div style="display: flex; align-items: center; gap: 5px; margin-top: 10px;">${torrentButtonHTML}${magnetButtonHTML}</div>`;
}

// Function to fetch content of a link with rate limiting
function fetchContent(link, onSuccess, retryDelay = 1000, maxRetries = 3) {
  let retries = 0;

  function doFetch() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: link,
      onload: function(response) {
        if (response.status === 200) {
          let parser = new DOMParser();
          let doc = parser.parseFromString(response.responseText, 'text/html');
          onSuccess(doc);
        } else if (response.status === 429 && retries < maxRetries) {
          retries++;
          setTimeout(doFetch, retryDelay * retries);
        } else {
          console.error(`Failed to fetch ${link} after ${retries} retries`);
        }
      },
      onerror: function(error) {
        console.error(`Error fetching ${link}:`, error);
      }
    });
  }

  doFetch();
}


// Function to optimize image URL
function optimizeImageUrl(imgSrc) {
  const optimizations = [
    { from: 'https://imgtraffic.com/1s/', to: 'https://imgtraffic.com/1/' },
    { from: /https?:\/\/.*\/images\/.*\.th\.jpg$/, to: (url) => url.replace(/\.th\.jpg$/, '.jpg') },
    { from: 'https://22pixx.xyz/as/', to: 'https://22pixx.xyz/a/' },
    { from: 'http://imgblaze.net/data_server_', to: 'https://www.imgopaleno.site/data_server_' },
    { from: '/small/small_', to: '/big/' }
  ];

  return optimizations.reduce((url, opt) => {
    if (typeof opt.from === 'string') {
      return url.replace(opt.from, opt.to);
    } else if (opt.from instanceof RegExp) {
      return opt.from.test(url) ? url.replace(opt.from, opt.to) : url;
    }
    return url;
  }, imgSrc);
}

// Function to lazy load images
function lazyLoadImage(img, src) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        img.src = src;
        observer.unobserve(img);
      }
    });
  });
  observer.observe(img);
}
/*
// Append images related to the torrent
function appendImages(link, doc) {
  let images = doc.querySelectorAll('#description img');
  if (images.length === 0) return;

  let flexContainer = document.createElement('div');
  flexContainer.style.display = 'flex';
  flexContainer.style.flexWrap = 'wrap';
  flexContainer.style.gap = '10px';
  flexContainer.style.marginTop = '10px';

  images.forEach((img, index) => {
    let imgSrc = optimizeImageUrl(img.getAttribute('data-original') || img.src);

    let clonedImg = document.createElement('img');
    clonedImg.style.maxHeight = '100px';
    clonedImg.style.setProperty('margin', '0', 'important');
    clonedImg.style.display = index < VISIBLE_IMAGES ? 'block' : 'none';

    // Use a placeholder initially
    clonedImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // Lazy load the actual image
    lazyLoadImage(clonedImg, imgSrc);

    flexContainer.appendChild(clonedImg);

    // Add event listeners for image preview
    addImagePreviewListeners(clonedImg);
  });

  // Add "Show More/Less" button if necessary
  if (images.length > VISIBLE_IMAGES) {
    addShowMoreButton(flexContainer, images.length);
  }

  link.parentNode.insertBefore(flexContainer, link.nextSibling);
}
    */

// Function to add image preview listeners
function addImagePreviewListeners(img) {
  img.addEventListener('mouseover', () => showEnlargedImg(img.src));
  img.addEventListener('mousemove', updateEnlargedImgPosition);
  img.addEventListener('mouseout', removeEnlargedImg);
}

// Function to add "Show More/Less" button
function addShowMoreButton(container, imageCount) {
  let showMoreButton = document.createElement('button');
  showMoreButton.textContent = 'Show More';
  showMoreButton.onclick = () => toggleImageVisibility(container, showMoreButton);
  container.appendChild(showMoreButton);
}

// Function to toggle image visibility
function toggleImageVisibility(container, button) {
  const images = container.querySelectorAll('img');
  const isShowingMore = button.textContent === 'Show Less';
  images.forEach((img, index) => {
    if (index >= VISIBLE_IMAGES) {
      img.style.display = isShowingMore ? 'none' : 'block';
    }
  });
  button.textContent = isShowingMore ? 'Show More' : 'Show Less';
}

// Functions for enlarged image preview (showEnlargedImg, updateEnlargedImgPosition, removeEnlargedImg) remain the same

  // Call the function to update download buttons
  updateDownloadButtons();

  // Append images related to the torrent
// Append images related to the torrent

 function appendImages(link, doc) {
  let images = doc.querySelectorAll('#description img');
  if (images.length > 0) {
    let flexContainer = document.createElement('div');
    flexContainer.style.display = 'flex';
    flexContainer.style.flexWrap = 'wrap';
    flexContainer.style.gap = '10px';
    flexContainer.style.marginTop = '10px';
    let clonedImages = []; // Array to store cloned images
    images.forEach((img, index) => {
      let clonedImg = img.cloneNode(true);

      // Use 'data-original' if it exists, else use 'src'
      let imgSrc = img.getAttribute('data-original') || img.src;
      if (imgSrc.includes('https://imgtraffic.com/1s/')) {
        imgSrc = imgSrc.replace('https://imgtraffic.com/1s/', 'https://imgtraffic.com/1/');
      }
      // Check if the src matches the specific pattern and replace 'th.jpg' with '.jpg'
      if (imgSrc.includes('https://pilot007.org/images/')) {
          imgSrc = imgSrc.replace(/.th\.jpg$/, '.jpg');
      }
      // Check if the src matches the specific pattern and replace 'th.jpg' with '.jpg'
      if (imgSrc.includes('https://13xpics.space/images/')) {
          imgSrc = imgSrc.replace(/.th\.jpg$/, '.jpg');
      }
      // Check if the src matches the specific pattern and replace 'th.jpg' with '.jpg'
      if (imgSrc.includes('https://37xpics.space/images/')) {
          imgSrc = imgSrc.replace(/.th\.jpg$/, '.jpg');
      }
        // Check if the src matches the pattern like https://<anything>/images/<anything>.th.jpg and replace '.th.jpg' with '.jpg'
        if (/https?:\/\/.*\/images\/.*\.th\.jpg$/.test(imgSrc)) {
            imgSrc = imgSrc.replace(/\.th\.jpg$/, '.jpg');
        }
  // Replace 'https://22pixx.xyz/as/' with 'https://22pixx.xyz/a/'
  if (imgSrc.includes('https://22pixx.xyz/as/')) {
      imgSrc = imgSrc.replace('https://22pixx.xyz/as/', 'https://22pixx.xyz/a/');
  }
  // Replace 'http://imgblaze.net/...' with 'https://www.imgopaleno.site/...' and adjust the path
  if (imgSrc.includes('http://imgblaze.net/data_server_')) {
      imgSrc = imgSrc.replace('http://imgblaze.net/data_server_', 'https://www.imgopaleno.site/data_server_')
                     .replace('/small/small_', '/big/');
  }
  // Replace 'https://imgdrive.net/images/small/' with 'https://imgdrive.net/images/big/'
  //if (imgSrc.includes('https://imgdrive.net/images/small/')) {
  //    imgSrc = imgSrc.replace('/small/', '/big/');
  //}
      clonedImg.src = imgSrc;
      clonedImg.style.maxHeight = '100px';
      clonedImg.style.setProperty('margin', '0', 'important');
      clonedImg.style.display = index < VISIBLE_IMAGES ? 'block' : 'none';
      flexContainer.appendChild(clonedImg);
      clonedImages.push(clonedImg); // Store the cloned image
    });

    // Add "Show More/Less" button if there are more than VISIBLE_IMAGES images
    if (images.length > VISIBLE_IMAGES) {
      let showMoreButton = document.createElement('button');
      showMoreButton.textContent = 'Show More';

      showMoreButton.onclick = function () {
        // Toggle visibility of additional images
        let isShowingMore = showMoreButton.textContent === 'Show Less';
        clonedImages.forEach((img, index) => {
          if (index >= VISIBLE_IMAGES) {
            img.style.display = isShowingMore ? 'none' : 'block';
          }
        });
        showMoreButton.textContent = isShowingMore ? 'Show More' : 'Show Less';
      };



      clonedImages.forEach((clonedImg) => {
        // Mouseover event to show enlarged image
        clonedImg.addEventListener('mouseover', function () {
          showEnlargedImg(clonedImg.src);
        });

        // Mousemove event to update the position of the enlarged image
        clonedImg.addEventListener('mousemove', updateEnlargedImgPosition);

        // Mouseout event to remove enlarged image
        clonedImg.addEventListener('mouseout', function () {
          removeEnlargedImg();
        });
      });

      flexContainer.appendChild(showMoreButton);
    }

    link.parentNode.insertBefore(flexContainer, link.nextSibling);
  }
}

 // Function to show an enlarged image
  function showEnlargedImg(imgSrc) {
    const enlargedImg = document.createElement('img');
    enlargedImg.src = imgSrc;
    enlargedImg.style.position = 'fixed';
    enlargedImg.style.width = '500px';
    enlargedImg.style.height = '500px';
    enlargedImg.style.pointerEvents = 'none'; // Ignore pointer events
    enlargedImg.id = 'enlargedImg';
    document.body.appendChild(enlargedImg);
  }

  // Function to update the position of the enlarged image
  function updateEnlargedImgPosition(e) {
    const enlargedImg = document.getElementById('enlargedImg');
    if (enlargedImg) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const imgWidth = 500; // Width of the enlarged image
      const imgHeight = 500; // Height of the enlarged image
      const offsetX = 10; // Horizontal offset from the cursor
      const offsetY = 10; // Vertical offset from the cursor

      let leftPosition = e.clientX + offsetX;
      let topPosition = e.clientY + offsetY;

      // Adjust position if the image goes out of the viewport
      if (leftPosition + imgWidth > viewportWidth) {
        leftPosition = e.clientX - imgWidth - offsetX;
      }
      if (topPosition + imgHeight > viewportHeight) {
        topPosition = e.clientY - imgHeight - offsetY;
      }

      enlargedImg.style.left = leftPosition + 'px';
      enlargedImg.style.top = topPosition + 'px';
    }
  }

  // Function to remove enlarged image
  function removeEnlargedImg() {
    const enlargedImg = document.getElementById('enlargedImg');
    if (enlargedImg) {
      document.body.removeChild(enlargedImg);
    }
  }



  // Function calls
  createColumn();
  replaceLinkTextWithTitlesAndAppendImages();
  modifyH1ContentOnTorrentPages();

  // Replace the link text with the title and append images
  function replaceLinkTextWithTitlesAndAppendImages() {
    let torrentLinks = listTorrentLinks();
    torrentLinks.forEach(processLink);
  }

  // Inject custom CSS to remove max-width on container
  function injectCustomCSS() {
    GM_addStyle('.container { max-width: none !important; }');
  // Custom CSS
  GM_addStyle(`
    main.container, div.container {
      max-width: 1450px;
    }

    .list-button-magnet > i.flaticon-magnet {
      font-size: 13px;
      color: #da3a04
    }

    .list-button-dl > i.flaticon-torrent-download {
      font-size: 13px;
      color: #89ad19;
    }

    table.table-list td.dl-buttons {
      border-left: 1px solid #f6f6f6;
      border-right: 1px solid #c0c0c0;
      padding-left: 2.5px;
      padding-right: 2.5px;
      text-align: center !important;
      position: relative;
      display: table-cell !important; /* proper height of cell on multiple row torrent name */
      width: 6%;
    }

    td.dl-buttons > a,
    td.dl-buttons > a:hover,
    td.dl-buttons > a:visited,
    td.dl-buttons > a:link,
    td.dl-buttons > a:active {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
      display: inline-block !important;
      margin: 0 2px;
    }

    table.table-list td.coll-1b {
      border-right: 1px solid silver;
    }

    .table-list > thead > tr > th:nth-child(2),
    .table-list > thead > tr > td:nth-child(2) {
      text-align: center;
    }

    .container { max-width: none !important; }
  `);
  }

  injectCustomCSS();
})();
