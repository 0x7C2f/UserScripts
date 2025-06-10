// ==UserScript==
// @name         Disable Image Dragging
// @version      0.1
// @description  Disables image dragging.
// @author       You
// @include      *://*.recaptcha.com/*
// @include      *://recaptcha.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stackoverflow.com
// @grant        none
// ==/UserScript==

// register onLoad event with anonymous function
(function (e) {
    var evt = e || window.event,// define event (cross browser)
        imgs,                   // images collection
        i;                      // used in local loop
    // if preventDefault exists, then define onmousedown event handlers
    if (evt.preventDefault) {
        // collect all images on the page
        imgs = document.getElementsByTagName('img');
        // loop through fetched images
        for (i = 0; i < imgs.length; i++) {
            // and define onmousedown event handler
            imgs[i].onmousedown = disableDragging;
        }
    }
});

// disable image dragging
function disableDragging(e) {
    e.preventDefault();
}