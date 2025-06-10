// ==UserScript==
// @name          Tradingview Skip Ads (desktop and mobile)
// @description   Trying to skip Cyber Monday sale, Black Friday sale, Easter sale and ads with a "Decline offer", "Competition started" or "The Leap is on" in them
// @author        Konf
// @namespace     https://greasyfork.org/users/424058
// @icon          https://www.google.com/s2/favicons?sz=64&domain=tradingview.com
// @version       5.1.0
// @match         https://www.tradingview.com/*
// @require       https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js#sha512-wkU3qYWjenbM+t2cmvw2ADRRh4opbOYBjkhrPGHV7M6dcE/TR0oKpoDkWXfUs3HrulI2JFuTQyqPLRih1V54EQ==
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// @grant         GM_unregisterMenuCommand
// @run-at        document-start
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/519311/Tradingview%20Skip%20Ads%20%28desktop%20and%20mobile%29.user.js
// @updateURL https://update.greasyfork.org/scripts/519311/Tradingview%20Skip%20Ads%20%28desktop%20and%20mobile%29.meta.js
// ==/UserScript==

/* jshint esversion: 11 */

(function() {
  'use strict';

  (function main() {
    if (!document.documentElement) return setTimeout(main);

    const stats = GM_getValue('adSkipStats', {});
    let menuCommandId = null;

    updateMenuCommand();

    document.arrive('div.tv-dialog__modal-body',
      { existing: true },
      (modal) => {
        for (const span of modal.querySelectorAll('span')) {
          if (span.textContent.toLowerCase() === 'cyber monday') {
            modal.querySelector('div.tv-dialog__close').click();
            incrementStat('Cyber Monday');
            break;
          }

          if (
            span.textContent.toLowerCase().includes('black friday')
          ) {
            modal.querySelector('div.tv-dialog__close').click();
            incrementStat('Black Friday');
            break;
          }
        }
      }
    );

    document.arrive('div[data-dialog-name="gopro"]',
      { existing: true },
      (modal) => {
        if (findAndDeclineOffer(modal)) incrementStat('Go pro offer');
      }
    );

    document.arrive('div[data-dialog-name="gopro-mobile"]',
      { existing: true },
      (modal) => {
        if (findAndDeclineOffer(modal)) incrementStat('Go pro mobile offer');

        for (const p of modal.querySelectorAll('p')) {
          if (p.textContent.toLowerCase() === 'competition started') {
            modal.querySelector('button[aria-label="Close"]').click();
            incrementStat('Competition started');
            break;
          } else if (p.textContent.toLowerCase() === 'the leap is on') {
            modal.querySelector('button[class*=closeButton-]').click();
            incrementStat('The Leap is on');
            break;
          }
        }
      }
    );

    document.arrive('div.banner-WnHzIH9Q',
      { existing: true },
      (popup) => {
        popup
          .closest('div.tv-dialog__modal-container')
          .querySelector('.tv-dialog__close')
          .click();

        incrementStat('Black Friday №2');
      }
    );

    document.arrive('p[class*=title-] > span[class*=gradient-]',
      { existing: true },
      (titlePart) => {
        if (titlePart.textContent.toLowerCase() !== 'easter sale') return;

        titlePart
          .closest('div[class*=modal-]')
          .querySelector('button[class*=closeButton-]')
          .click();

        incrementStat('Full page Easter Sale');
      }
    );

    document.arrive('div[class*=header-] > p[class*=title-]',
      { existing: true },
      (title) => {
        if (!title.textContent.toLowerCase().startsWith('easter sale')) return;

        const popupContainer = title.closest('div[class*=toastGroup-]');

        popupContainer.style.display = 'none';
        popupContainer.querySelector('div[class*=closeButton-] > button').click();

        incrementStat('Small Easter Sale popup');
      }
    );

    // utils ----------------------------------------------------------

    function findAndDeclineOffer(goProModal) {
      for (const span of goProModal.querySelectorAll('span')) {
        if (span.textContent.toLowerCase() === 'decline offer') {
          span.parentElement.click();

          return true;
        }
      }
    }

    function incrementStat(adType) {
      stats[adType] = (stats[adType] || 0) + 1;
      GM_setValue('adSkipStats', stats);
      updateMenuCommand();
    }

    function showStats() {
      alert(
        'Total skipped ads history:\n' +
        JSON.stringify(GM_getValue('adSkipStats', {}), null, 2)
      );
    }

    function updateMenuCommand() {
      if (menuCommandId !== null) GM_unregisterMenuCommand(menuCommandId);

      menuCommandId = GM_registerMenuCommand(
        `Show skipped ads (${Object.values(stats).reduce((a, b) => a + b, 0)})`, showStats
      );
    }

    // ---------------------------------------------------------- utils
  })();  
})();
