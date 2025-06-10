// ==UserScript==
// @name         Auto Scale Chart
// @version      0.1
// @match        *://*.tradingview.com/*
// @grant        none
// @license MIT
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener('click', function(e) {
        // Prevent the default action if needed
        // e.preventDefault();

        // Find the active chart container
        let activeChart = document.querySelector('.chart-widget');

        if (activeChart) {
            // Find the "Auto (fits data to screen)" button within the active chart
            let autoButton = activeChart.querySelector('button[data-tooltip="Auto (fits data to screen)"]');

            if (autoButton) {
                // Click the "Auto" button
                autoButton.click();

            } else {
                console.log('Auto button not found in the active chart');
            }
        } else {
            console.log('No active chart found');
        }
    });
})();
