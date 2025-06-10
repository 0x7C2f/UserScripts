// ==UserScript==
// @name         Facebook Clutter Remover
// @namespace    facebook_clutter_remover
// @version      0.4
// @description  Removes clutter from facebook home feed
// @author       navchandar
// @match        https://www.facebook.com/*
// @match        http://www.facebook.com/*
// @run-at       document-end
// @license      MIT
// @grant        none
// @copyright    2020, navchandar (https://openuserjs.org/users/navchandar)
// @homepage     https://navchandar.github.io/
// @homepage     https://github.com/navchandar/
// @homepageURL  https://navchandar.github.io/
// @contributionURL https://paypal.me/navchandar
// @contributionAmount $1.00
// @downloadURL  https://openuserjs.org/install/navchandar/Facebook_Clutter_Remover.user.js
// @updateURL    https://openuserjs.org/meta/navchandar/Facebook_Clutter_Remover.meta.js
// @supportURL   https://openuserjs.org/scripts/navchandar/Facebook_Clutter_Remover/issues
// @setupURL     https://openuserjs.org/install/navchandar/Facebook_Clutter_Remover.user.js
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsSAAALEgHS3X78AAABVklEQVRYw82XsQrCMBCGC0V9BUfp0tXNTVd9AAkFZ/sU+gi+iXRWwcGl4OggCo5dRToU3fQqV4kStXdpaQLfEnq5P+nl7mJZ9GEDLtAHPGSAc7ZV0qgDAgiAGLh/IcZvBNpoj3RHPhD9cPqNCG3Zp+IAIcPxJyGuRRpd4FyA84wzrpnbeVKg84wkjwin4J2rTsL5FXBhic7lmFAGps9c8AAskF1OG191z6lX7QYMP9YZEa7oW54QjJ1PFKc4ItgL2TBgCGihbRNYAmtgT7AP5OCLGQIaaN9jxk6cBaNLTK8bpIYC2tLckSgi9f2sZHkNZn/yyJQoIK2oz3JalIA5UYBHFXABTkh2jTrS3JUjoM8MIt0gfP0Ct0IBrhHXkJuIdAUEuqlYV4DQLUY6AiJV00otxysswVuGAN/IhqTylsyIptSIttyIh4kcmOOqnmZGPE5Lf54/AFauqgcSVxgpAAAAAElFTkSuQmCC
// ==/UserScript==

//Logo by Daniel Bruce https://iconscout.com/contributors/daniel-bruce

(function () {
  'use strict';

  var elemsToRemove = [
    '(//div[@role="navigation"]/div)[5]',
    '//div[@role="navigation"]/div/div',
    '(//div[@role="navigation"])[3]',
    '(//div[@role="complementary"]/div)[1]',
    '(//div[@role="complementary"]/div)[2]',
    '//div[@role="complementary"]/div/div',
    '//div[@role="complementary"]',
    '//div[@aria-label="Stories"]',
    '//div[@data-pagelet="VideoChatHomeUnit"]',
    '//*[text()="People you may know"]//..//..//..//..//div[contains(@style, "border")]',
    '(//*[@aria-label="Close"]//..//..//..//parent::div[contains(@style, "border")])[1]',
    '//*[text()="People you may know"]//..//..//..//..//..//div',
    '//*[text()="Friend Requests"]//..//..//..//..//..//div'
  ];

  document.getElementsByXPath = function (t) {
    for (var e = new Array, n = this.evaluate(t, this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null), s = 0; s < n.snapshotLength; s++) e.push(n.snapshotItem(s));
    return e
  };

  function waitForElementToDisplayWithXpath(t, e) {
    document.getElementByXPath = function (t) {
      var e = this.evaluate(t, this, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      if (e.snapshotLength > 0) return e.snapshotItem(0)
    }, null == document.getElementByXPath(t) ? setTimeout(function () {
      waitForElementToDisplayWithXpath(t, e)
    }, e) : console.log(t + " found")
  }

  waitForElementToDisplayWithXpath("//div[contains(@data-pagelet, 'Feed') or contains(@data-pagelet, 'page')]", 5000);
  waitForElementToDisplayWithXpath("//div[@role='navigation']", 5000);

  function rem(element) {
    element.remove()
  }

  function remove(xpath) {
    var elems = document.getElementsByXPath(xpath);
    if (elems != null && elems.length > 0) {
      elems.forEach(rem)
    }
  }

  function deleteElems() {
    elemsToRemove.forEach(remove);
  }

  setInterval(deleteElems, 3000);

})();
