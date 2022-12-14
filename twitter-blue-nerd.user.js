// ==UserScript==
// @name        @chaoticvibing Twitter Blue Nerd - twitter.com
// @namespace   Violentmonkey Scripts
// @match       *://*.twitter.com/*
// @grant       none
// @version     1.6.0
// @author      @chaoticvibing - GH @busybox11
// @description 11/9/2022, 11:45:28 PM
// @updateURL    https://raw.githubusercontent.com/0x7C2f/UserScripts/main/twitter-blue-nerd.user.js
// @downloadURL  https://raw.githubusercontent.com/0x7C2f/UserScripts/main/twitter-blue-nerd.user.js
// ==/UserScript==

// YOU'RE FREE TO DO WHATEVER YOU WANT WITH THIS SCRIPT BUT IF YOU DO MAKE SOMETHING
// PLEASE MAKE SURE TO MENTION ME SOMEWHERE - I hope you'll understand why :)
// Also https://paypal.me/busybox11 because I am broke
// Commissions on https://uncove.com/busybox11

/*
 * INSTRUCTIONS
 *
 * - Install a userscript browser extension
 *     (I used ViolentMonkey https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag,
 *     but you can use any extension you want, such as tampermonkey, it should work fine)
 *     FIREFOX USERS: It seems to work better with TamperMonkey: https://addons.mozilla.org/fr/firefox/addon/tampermonkey/
 * - Import the script
 *     On ViolentMonkey, click on the extension icon, then gear icon (Open dashboard)
 *     There should be a plus icon on the top left hand corner, click on it and select Install from URL
 *     Use this URL: https://gist.githubusercontent.com/busybox11/53c76f57a577a47a19fab649a76f18e3/raw/twitterblue-nerd.js
 * It should now work and update by itself
 *
 */

/*
 * DISCLAIMER
 *
 * I made this in a rush because of a challenge I convinced myself to do in reply to a tweet:
 * https://twitter.com/Quinten0508/status/1590464705822224384?s=20&t=R_KhoR4a-_3fI4n4mbmmGA
 * It might have horrible performance and it could not be reliable as I've tested this very quickly
 * on some places I could find Twitter blue checkmarks, but I haven't made much research on it.
 * At least it runs fine on my Ryzen 9 5900HS laptop and I don't see any noticeable frame drops
 * on my 165Hz QHD display since I made this script, which might be a sign it's not impacting much.
 * (I don't care anyway, fell free to modify it if it isn't)
 *
 */

// 1.1.0 ALSO UPDATE ON HEADER OF PROFILE
// 1.1.1 AUTO UPDATE
// 1.1.2 Better handling of verified notifications
// 1.1.3 Better error logging
// 1.2.0 INITIAL VERY WIP FIREFOX SUPPORT
// 1.2.1 Misc code quality changes
// 1.3.0 MADE IT WORK WITH THEORETICALLY ALL NOTIFICATIONS
// 1.4.0 ALSO SHOW ON PROFILE VERIFICATION POPUP
// 1.5.0 WIP SHOULD WORK ON ALL LANGUAGES
// 1.6.0 PATH-BASED BLUE CHECK DETECTION

// STOLEN FROM https://twitter.com/shadowbIood/status/1590462560515473409?s=20&t=AmfQmmFgdpKOsPqnoawjVQ
const nerdtick = `
<path d="M89 48C89 42.28 85.48 37.32 80.24 34.64C82.08 29.08 81.04 23.04 77 19C72.96 14.96 66.92 13.92 61.36 15.76C58.72 10.52 53.72 7 48 7C42.28 7 37.32 10.52 34.68 15.76C29.08 13.92 23.04 14.96 19 19C14.96 23.04 13.96 29.08 15.8 34.64C10.56 37.32 7 42.28 7 48C7 53.72 10.56 58.68 15.8 61.36C13.96 66.92 14.96 72.96 19 77C23.04 81.04 29.08 82.04 34.64 80.24C37.32 85.48 42.28 89 48 89C53.72 89 58.72 85.48 61.36 80.24C66.92 82.04 72.96 81.04 77 77C81.04 72.96 82.08 66.92 80.24 61.36C85.48 58.68 89 53.72 89 48Z" fill="#FFCC4D"/>
<path d="M80 47C80 64.6729 65.6729 79 48 79C30.3271 79 16 64.6729 16 47C16 29.3271 30.3271 15 48 15C65.6729 15 80 29.3271 80 47Z" fill="#FFCC4D"/>
<path d="M64.4846 57.0069C64.1681 56.7207 63.6952 56.7029 63.3557 56.9554C63.2864 57.0069 56.3832 62.1109 47.889 62.1109C39.4161 62.1109 32.4899 57.0069 32.4224 56.9554C32.0828 56.7029 31.6099 56.7243 31.2935 57.0069C30.9788 57.2914 30.9077 57.7607 31.1264 58.1234C31.3557 58.5056 36.8455 67.4443 47.889 67.4443C58.9326 67.4443 64.4241 58.5056 64.6517 58.1234C64.8704 57.7589 64.801 57.2914 64.4846 57.0069Z" fill="#664500"/>
<path d="M47.8892 62.2729C47.6261 62.2729 47.3719 62.2533 47.1123 62.2444V70.2729H48.6661V62.2427C48.4065 62.2516 48.1523 62.2729 47.8892 62.2729Z" fill="#65471B"/>
<path d="M55.0003 61.2222C55.0288 61.2151 52.4225 61.8942 50.6519 62.0862C50.0012 62.1609 49.3416 62.2196 48.6661 62.2427V70.2729H51.4448C53.4003 70.2729 55.0003 68.6729 55.0003 66.7173V64.4738V61.2222Z" fill="white"/>
<path d="M40.7781 61.2222C40.7496 61.2151 43.3559 61.8942 45.1265 62.0862C45.7772 62.1609 46.4368 62.2196 47.1123 62.2427V70.2729H44.3336C42.3781 70.2729 40.7781 68.6729 40.7781 66.7173V64.4738V61.2222Z" fill="white"/>
<path d="M64.4846 57.0069C64.1681 56.7207 63.6952 56.7029 63.3557 56.9554C63.3041 56.9945 59.3397 59.9207 53.7361 61.3465C52.9486 61.5456 50.4224 62.1109 47.8944 62.1109C45.3628 62.1109 42.8295 61.5456 42.0419 61.3465C36.4384 59.9207 32.4757 56.9945 32.4224 56.9554C32.0846 56.7029 31.6099 56.7207 31.2935 57.0069C30.9788 57.2914 30.9077 57.7589 31.1281 58.1234C31.2988 58.4114 34.4775 63.5758 40.7779 66.0896V62.838C40.7495 62.8309 43.3557 63.51 45.1264 63.702C45.777 63.7767 46.4366 63.8354 47.1121 63.8585V63.8603C47.3717 63.8692 47.6259 63.8887 47.889 63.8887C48.1521 63.8887 48.4064 63.8692 48.6677 63.8603V63.8585C49.3415 63.8354 50.001 63.7767 50.6517 63.702C52.4224 63.51 55.0286 62.8309 55.0001 62.838V66.0896C61.3006 63.5758 64.4792 58.4114 64.6517 58.1234C64.8704 57.7589 64.801 57.2914 64.4846 57.0069Z" fill="#65471B"/>
<path d="M63.3323 39.9317C63.3323 42.9788 61.6647 45.45 59.606 45.45C57.5492 45.45 55.8816 42.9788 55.8816 39.9317C55.8816 36.8846 57.5492 34.4135 59.606 34.4135C61.6647 34.4135 63.3323 36.8846 63.3323 39.9317Z" fill="#65471B"/>
<path d="M70.9184 38.1545C70.7068 39.8505 70.1451 44.4034 68.6695 45.5038C67.4891 46.3838 64.4704 47.0007 62.2926 47.0007H62.2908C60.3246 47.0007 58.4455 46.4994 57.0037 45.6798C54.6517 44.3412 54.3015 40.5918 54.1646 38.6274C54.0882 37.5465 53.8517 35.3385 55.6384 34.2398C57.6562 32.9989 61.7931 32.9136 63.0251 32.9136C65.7148 32.9136 68.3442 33.406 70.2286 34.0478C71.4162 34.4532 71.0535 37.0754 70.9184 38.1545ZM41.9815 38.6043C41.8428 40.5687 41.4944 44.3412 39.1424 45.6798C37.6988 46.4994 35.8215 47.0007 33.8535 47.0007H33.8517C31.674 47.0007 28.6553 46.3838 27.4748 45.5038C25.9993 44.4034 25.4393 39.8736 25.226 38.1794C25.0908 37.1003 24.73 34.462 25.9157 34.0567C27.802 33.4149 30.4295 32.9136 33.1193 32.9136C34.3513 32.9136 38.4899 32.99 40.5059 34.2309C42.2926 35.3296 42.0562 37.5234 41.9815 38.6043ZM80.882 32.1154C80.578 31.8185 75.6295 32.6025 73.6579 31.598C69.5904 29.5252 59.3113 27.5234 52.6197 32.2647C51.9033 32.7732 48.9095 32.8585 48.0722 32.8212C47.2366 32.8585 44.2411 32.7732 43.5246 32.2647C36.8348 27.5234 26.5539 29.5252 22.4882 31.598C20.5148 32.6025 15.5664 31.8185 15.2642 32.1154C14.8233 32.5403 14.8251 34.2416 15.2642 34.6665C15.7015 35.0914 20.89 35.582 21.3255 36.8585C21.7646 38.1349 21.7682 45.6727 25.2615 48.2772C28.5291 50.7163 36.1557 51.4505 40.9895 48.702C45.2082 46.302 45.0588 41.2532 45.8322 38.2469C46.1077 37.1732 46.8846 36.6327 48.0722 36.6327C49.2615 36.6327 50.0366 37.1732 50.3122 38.2469C51.0855 41.2532 50.938 46.302 55.1548 48.702C59.9886 51.4505 67.6153 50.7163 70.8846 48.2772C74.3779 45.6727 74.3815 38.1349 74.8188 36.8585C75.2544 35.582 80.4428 35.0914 80.8802 34.6665C81.3211 34.2416 81.3211 32.5403 80.882 32.1154Z" fill="#292F33"/>
<path d="M32.8126 39.9317C32.8126 42.9788 34.4802 45.45 36.5388 45.45C38.5957 45.45 40.2633 42.9788 40.2633 39.9317C40.2633 36.8846 38.5957 34.4135 36.5388 34.4135C34.4802 34.4135 32.8126 36.8846 32.8126 39.9317Z" fill="#65471B"/>
`

let regularVerifiedPath = 'svg path[d^="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"]'

const regulartick = `
<g><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"></path></g>
`

// STOLEN FROM https://stackoverflow.com/questions/70507318/how-to-get-react-element-props-from-html-element-with-javascript
function getReactProps(parent, target) {
    // INITIAL VERY WIP FIREFOX HANDLING
    parent = (window.chrome) ? parent : parent.wrappedJSObject;
    target = (window.chrome) ? target : target.wrappedJSObject;

    const keyof_ReactProps = Object.keys(parent).find(k => k.startsWith("__reactProps$"));
    const symof_ReactFragment = Symbol.for("react.fragment");

    //Find the path from target to parent
    let path = [];
    let elem = target;
    while (elem !== parent) {
        let index = 0;
        for (let sibling = elem; sibling != null;) {
            if (sibling[keyof_ReactProps]) index++;
            sibling = sibling.previousElementSibling;
        }
        path.push({ child: elem, index });
        elem = elem.parentElement;
    }
    //Walk down the path to find the react state props
    let state = elem[keyof_ReactProps];
    for (let i = path.length - 1; i >= 0 && state != null; i--) {
        //Find the target child state index
        let childStateIndex = 0, childElemIndex = 0;
        while (childStateIndex < state.children.length) {
            let childState = state.children[childStateIndex];
            if (childState instanceof Object) {
                //Fragment children are inlined in the parent DOM element
                let isFragment = childState.type === symof_ReactFragment && childState.props.children.length;
                childElemIndex += isFragment ? childState.props.children.length : 1;
                if (childElemIndex === path[i].index) break;
            }
            childStateIndex++;
        }
        let childState = state.children[childStateIndex] ?? (childStateIndex === 0 ? state.children : null);
        state = childState?.props;
        elem = path[i].child;
    }
    return state;
}


function updateBlueTick(elem, props) {
  if (props.isBlueVerified) {
    elem.setAttribute('viewBox', '0 0 96 96')
    elem.innerHTML = nerdtick
  } else {
    elem.setAttribute('viewBox', '0 0 24 24')
    elem.innerHTML = regulartick
  }
}

function bluetickHandling(bluetick) {
  let propsElem = getReactProps(bluetick.parentElement, bluetick)

  if (propsElem.children !== undefined) {
    const props = propsElem.children[0][0].props
    if (props.isBlueVerified !== undefined) {
      updateBlueTick(bluetick, props)
    } else {
      // VERY HACKY FIX DO BETTER NEXT TIME
      const otherProps = propsElem.children[0][propsElem.children[0].length - 1].props
      updateBlueTick(bluetick, otherProps)
    }
  } else {
    const propsElemParent = getReactProps(bluetick.parentElement.parentElement.parentElement, bluetick.parentElement.parentElement)
    const propsParent = propsElemParent.children[0][0].props
    updateBlueTick(bluetick, propsParent)
  }
}

function handleMutation(mutations) {
  try {
    for (let mutation of mutations) {
      for (let elem of mutation.addedNodes) {
        // SVG PATH DETECTION
        // Thanks GH @artesea - https://gist.github.com/busybox11/53c76f57a577a47a19fab649a76f18e3?permalink_comment_id=4366043#gistcomment-4366043
        // Author of this snippet
        const blueticksPath = elem.querySelectorAll(regularVerifiedPath)
        try {
          for (let bluetick of blueticksPath) {
            if (bluetick !== null) {
              bluetickHandling(bluetick.parentElement.parentElement)
            }
          }
        } catch(e) {sc.log(e)}

        // GENERAL TWEETS WIP
        // Class-based implementation
        // Temporary, now deprecated in favor of SVG Path detection
        /* const blueticksClass = elem.querySelectorAll('.r-13v1u17.r-4qtqp9.r-yyyyoo.r-1xvli5t')
        try {
          for (let bluetick of blueticksClass) {
            if (bluetick !== null) {
              bluetickHandling(bluetick)
            }
          }
        } catch(e) {sc.log(e)} */

        // PROFILE POPUPS
        const profileBlueticks = elem.querySelectorAll('.css-1dbjc4n.r-xoduu5.r-1pcd2l5')
        try {
          for (let profileBluetick of profileBlueticks) {
            if (profileBluetick !== null) {
              if (profileBluetick.lastChild.firstChild.innerText.includes('Twitter Blue')) {
                updateBlueTick(profileBluetick.firstChild, {isBlueVerified: true, isVerified: false})
              }
            }
          }
        } catch(e) {sc.log(e)}

        // ENGLISH SPECIFIC
        /* const blueticksEng = elem.querySelectorAll('[aria-label="Verified account"]')
        try {
          for (let bluetick of blueticksEng) {
            if (bluetick !== null) {
              bluetickHandling(bluetick)
            }
          }
        } catch(e) {sc.log(e)} */
      }
    }
  } catch(e) {}
}

const sc = {
  log: (msg) => {
    console.log('[nerdtick]', msg)
  }
}

const observer = new MutationObserver(handleMutation)
observer.observe(document, { childList: true, subtree: true })

x1.00