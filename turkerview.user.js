// ==UserScript==
// @name         TurkerViewJS
// @namespace    https://turkerview.com/mturk-scripts/
// @version      11.0.4
// @updateURL    https://raw.githubusercontent.com/0x7C2f/UserScripts/main/turkerview.user.js
// @downloadURL  https://raw.githubusercontent.com/0x7C2f/UserScripts/main/turkerview.user.js
// @description  Imports Turkerview.com functionality into mTurk.
// @author       ChrisTurk
// @contrib      Kadauchi - hijacked coloring functions that I then mangled, his were clean.
// @contrib      Slothbear - tons of bugfixes when I fail to test stuff in the real-world
// @contrib      SalemBeats - this jerk demands proper coding design structure.. pfft
// @include      /^http(s)?://worker\.mturk\.com/
// @exclude      https://worker.mturk.com/direct_deposit*
// @exclude      https://worker.mturk.com/payment_schedule*
// @exclude		 https://worker.mturk.com/?finder_beta
// @exclude      https://worker.mturk.com/?hit_forker
// @exclude      https://worker.mturk.com/requesters/PandaCrazy/projects
// @exclude		 https://worker.mturk.com/?filters[search_term]=pandacrazy=on
// @grant        GM_log
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://code.jquery.com/jquery-3.1.0.min.js
// @require		 https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require		 https://use.fontawesome.com/fd61435f75.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.19.4/moment.min.js
// @require		 https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.14/moment-timezone.min.js
// @require      https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js
// @resource      customCSS https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css
// @run-at document-end
// ==/UserScript==


let settings = {};

var settingsDB;
function initTVDB(){

    try {
        if (mturksuite) return;
    }
    catch (e) {}
    const request = indexedDB.open(`turkerview`, 1);

    request.onerror = function(event){
        console.log(`TVJS could not open indexedDB`, event.target.errorCode);
    }

    request.onsuccess = function(event){
        settingsDB = event.target.result;

        var transaction = settingsDB.transaction([`turkerview`]);
        var objectStore = transaction.objectStore(`turkerview`);
        var request = objectStore.get(`settings`);

        request.onsuccess = function(evented){
            if (!request.result){
                let check_old_api_key = localStorage.getItem(`turkerview_api_key`) || null;
                var settings = {
                    key: `settings`,
                    api_key: check_old_api_key
                }

                var apiObjectStore = settingsDB.transaction(`turkerview`, `readwrite`).objectStore(`turkerview`);
                apiObjectStore.add(settings);

                initSetting();
                return;
            }

            if (request.result['api_key'] != null) initSetting(request.result['api_key']);
            else initSetting()
        }
    };

    request.onupgradeneeded = function(event){
        var db = event.target.result;
        var objectStore = db.createObjectStore(`turkerview`, { keyPath: `key` });

        objectStore.transaction.oncomplete = function(event){

            let check_old_api_key = localStorage.getItem(`turkerview_api_key`) || null;
            var settings = {
                key: `settings`,
                api_key: check_old_api_key
            }

            var apiObjectStore = db.transaction(`turkerview`, `readwrite`).objectStore(`turkerview`);
            apiObjectStore.add(settings);
        }

    };
}


function initSetting(db_info = null){

    ls_tv_api_key = localStorage.getItem('turkerview_api_key') || null;
    settings = JSON.parse(localStorage.getItem('tv-settings')) || null;
    if (settings === null){
        settings = {
            version: 2,
            titlebar_wage_display: true,
            display_requester_ratings: true,
            display_hit_ratings: true,
            disable_return_reviews: false,
            show_return_favicon: true,
            tv_api_key: (db_info != null) ? db_info : ls_tv_api_key,
            return_warning_levels: {
                underpaid: 'high',
                broken: 'high',
                screener: 'high',
                tos: 'high',
                writing: 'high',
                downloads: 'high',
                extraordinary_measures: 'high'
            },
            last_sync: null
        }
        commitSettings();
    } else if (settings.version === undefined){
        settings.version = 2;
        settings.show_return_favicon = true;
        settings.display_requester_ratings = true;
        settings.display_hit_ratings = true;
        settings.disable_return_reviews = false;
        settings.tv_api_key = (db_info != null) ? db_info : ls_tv_api_key,
        settings.return_warning_levels = {};
        settings.return_warning_levels.underpaid = 'high';
        settings.return_warning_levels.broken = 'high';
        settings.return_warning_levels.screener = 'high';
        settings.return_warning_levels.tos = 'high';
        settings.return_warning_levels.writing = 'high';
        settings.return_warning_levels.downloads = 'high';
        settings.return_warning_levels.extraordinary_measures = 'high';
        settings.last_sync = null;
    } else if (db_info != null){
        settings.tv_api_key = db_info
    } else if (ls_tv_api_key != null){
        settings.tv_api_key = ls_tv_api_key
    }

    ViewHeaders = new Headers([
        ['X-VIEW-KEY', settings.tv_api_key],
        ['X-APP-KEY', 'TurkerViewJS'],
        ['X-APP-VER', ver] //SemVer
    ]);

    //settings are loaded, its safe to start the script
    initTVJS();
}

function changeSettings(){
    let the_api_key = $('input[name=tv_api_key]').val();
    if (settings.tv_api_key != the_api_key && the_api_key != null && the_api_key != '' && the_api_key.length == 40){
        var store_settings = {
            key: `settings`,
            api_key: the_api_key
        }
        var transaction = settingsDB.transaction([`turkerview`], `readwrite`);
        var objectStore = transaction.objectStore(`turkerview`);
        var request = objectStore.put(store_settings);

        request.onsuccess = function(event){
            //console.log('put settings:', request.result);
        }

        $('#api_connect').show(500);
        ViewHeaders = new Headers([
            ['X-VIEW-KEY', $('input[name=tv_api_key]').val()],
            ['X-APP-KEY', 'TurkerViewJS'],
            ['X-APP-VER', ver] //SemVer
        ]);
    }
    settings.titlebar_wage_display = $('input[name=display_titlebar_wage]').is(':checked') ? true : false;
    settings.show_return_favicon = $('input[name=show_return_favicon]').is(':checked') ? true : false;
    settings.display_mturk_ratings = $('input[name=display_mturk_ratings]').is(':checked') ? true : false;
    settings.display_requester_ratings = $('input[name=display_requester_ratings]').is(':checked') ? true : false;
    settings.display_hit_ratings = $('input[name=display_hit_ratings]').is(':checked') ? true : false;
    settings.enable_quick_reviews = $('input[name=enable_quick_reviews]').is(':checked') ? true : false;
    settings.disable_return_reviews = $('input[name=disable_return_reviews]').is(':checked') ? true : false;
    settings.tv_api_key = !$('input[name=tv_api_key]').val() ? null : $('input[name=tv_api_key]').val();
    settings.return_warning_levels = {}
    settings.exp_returners = $('input[name=exp_returners]').is(':checked') ? true : false;
    settings.rr_screener_min = $('select[name=rr_screener_min]').val();
    settings.return_warning_levels.underpaid = $('select[name=return_underpaid_warn_lvl]').val();
    settings.return_warning_levels.broken = $('select[name=return_broken_warn_lvl]').val();
    settings.return_warning_levels.screener = $('select[name=return_screener_warn_lvl]').val();
    settings.return_warning_levels.tos = $('select[name=return_tos_warn_lvl]').val();
    settings.return_warning_levels.writing = $('select[name=return_writing_warn_lvl]').val();
    settings.return_warning_levels.downloads = $('select[name=return_downloads_warn_lvl]').val();
    settings.return_warning_levels.extraordinary_measures = $('select[name=return_extraordinary_warn_lvl]').val();
    settings.last_sync = settings.last_sync ? settings.last_sync : null;

    commitSettings()
}

function commitSettings(){
    localStorage.setItem('tv-settings', JSON.stringify(settings));
    localStorage.setItem('ztv-settings', JSON.stringify(settings)); //duplicate for testing exporting
    localStorage.setItem('turkerview_api_key', settings.tv_api_key);
}

let tvAgreement = (localStorage.getItem('tv-agree') == 'true') || false;
let tvQualified = (localStorage.getItem('tv-qual-2') == 'true') ? true : (localStorage.getItem('tv-qual-2') == 'false') ? false : null;
let hideReviewedFromTable = (localStorage.getItem('tv-hide-reviewed') == 'true') || false;
let viewData = [];
let hitData = [];
let react = [];
moment.tz.add("America/Los_Angeles|PST PDT PWT PPT|80 70 70 70|010102301010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010|-261q0 1nX0 11B0 1nX0 SgN0 8x10 iy0 5Wp1 1VaX 3dA0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1a00 1fA0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1cN0 1cL0 1cN0 1cL0 s10 1Vz0 LB0 1BX0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 1cN0 1fz0 1a10 1fz0 1cN0 1cL0 1cN0 1cL0 1cN0 1cL0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|15e6");
const today = moment.tz('America/Los_Angeles').format('YYYY-MM-DD');
const queue = new RegExp('/worker\.mturk\.com\/tasks');
const windowHREF = window.location.href;
const ver = GM_info.scriptMetaStr.match(/version.*?(\d+.*)/)[1];

let ViewHeaders = new Headers([
    ['X-VIEW-KEY', settings.tv_api_key],
    ['X-APP-KEY', 'TurkerViewJS'],
    ['X-APP-VER', ver] //SemVer
]);

const hourlyFormat = (hourly) => {
    let color = 'rgba(255, 0, 0, ';
    if (hourly >= 10.00) { color = 'rgba(0, 128, 0, '; }
    else if (hourly >= 7.25) { color = 'rgba(255, 165, 0, '; }
    else if (hourly === '<i class="fa fa-minus"></i>') { color = 'rgba(128, 128, 128, '; }
    return color;
};
const iconImage = (hourly) => {
    let url = 'https://turkerview.com/assets/images/tv-unrated.png'

    if (hourly == null) url = 'https://turkerview.com/assets/images/tv-unrated.png';
    else if (hourly < 7.25) url = 'https://turkerview.com/assets/images/tv-red.png';
    else if (hourly < 10.50) url = 'https://turkerview.com/assets/images/tv-orange.png';
    else url = 'https://turkerview.com/assets/images/tv-green.png';

    return url;
};
const confidence = (ratings_count) => {
    let cOpacity = '0.5';
    if (ratings_count >= 10) { cOpacity = '1'; }
    else if (ratings_count >= 5) { cOpacity = '0.75'; }
    else if (ratings_count >= 1) { cOpacity = '0.5'; }
    return cOpacity;
};
const payFormat = (pay) => {
    let payFA = '<i class="fa fa-thumbs-o-down" style="color: red;"></i> Very bad';
    if (pay >= 4.25) { payFA = '<i class="fa fa-thumbs-o-up" style="color: green;"></i> Generous'; }
    else if (pay >= 3.5) { payFA = '<i class="fa fa-thumbs-o-up" style="color: green;"></i> Good'; }
    else if (pay >= 2.5) { payFA = '<i class="fa fa-handshake-o" style="color: orange;"></i> Fair'; }
    else if (pay >= 1.5) { payFA = '<i class="fa fa-thumbs-o-down" style="color: red;"></i> Low'; }
    else if (pay === null) { payFA = '<i class="fa fa-minus" style="color: grey;"></i> Unrated'; }
    return payFA;
};
const classMap = total_reports => total_reports == 0 ? 'text-muted' :
    total_reports < 3 ? 'text-warning' : 'text-danger';

$(document).ready(function(){
    initTVDB();
});


let syncing = false;
function initTVJS(){
    if (!settings.install_date) settings.install_date = moment.tz('America/Los_Angeles');
    commitSettings();
    if (tvQualified == null) checkQual('get');

    if ($('ol.hit-set-table').length) {
        if ($('.mturk-alert-content:contains(something is not right)').length > 0){
            $('.mturk-alert-content:contains(something is not right)').append(`<p class="p-b-0 m-b-0" style="margin-top: 0.5rem;"><strong>If you just came from contacting a requester using TurkerView or a manual contact link you can ignore this warning, your message went through just fine!</strong></p>`)
        }

        waitForKeyElements ( '.requester-column:eq(0)', getRIDs);
    }

    let api_announcement = (!settings.tv_api_key || settings.tv_api_key === "" || settings.tv_api_key.length != 40) ? `<i class="fa fa-warning" style="color: #f39c12;"></i> ` : `<img src="https://turkerview.com/assets/images/tv-green.png" style="max-width: 16px; max-height: 16px; display: none;">`;
    if ($('ul.nav.navbar-nav').length){
        $('ul.nav.navbar-nav:first').find('.nav-item:last').after(`<li class="nav-item"><a id="nav-tv" class="nav-link" href="#">${api_announcement}TurkerView</a></li>`);
    } else {
        $('a:contains(HIT Details)')
        $('a.navbar-brand').after(`<div class="navbar-divider hidden-xs-down"></div><ul class="nav navbar-nav hidden-xs-down"><li class="nav-item"><a id="nav-tv" class="nav-link" href="#">${api_announcement}TurkerView</a></li></ul>`);
    }

    $('body').on('click', '#nav-tv', function(){
        //don't call the modal unless we need it
        if (settings.last_sync){
            let diff = moment.tz('America/Los_Angeles').diff(moment(settings.last_sync), 'seconds');

            if (diff > 1800 && !/projects.*assignment_id/.test(windowHREF)){
                if (diff > 129600) settings.install_date = moment.tz('America/Los_Angeles');
                else cycleAASync();
            }
        }
        if (!$('#tvDashModal').length){
            initTurkerView();
            initReviews();

            $('input[name=display_titlebar_wage], input[name=display_mturk_ratings], input[name=display_requester_ratings], input[name=disable_return_reviews], input[name=display_hit_ratings], input[name=show_return_favicon], input[name=tv_api_key], input[name=exp_returners], select[name=rr_screener_min], select[name*=return_]').on('change keyup', function(){
                changeSettings();
            });

            $('input[name=enable_quick_reviews]').on('change', function(){
                changeSettings();
                fillTable();
            })

            fillTable();
        }
        else {
            $('#tv-table').find('tbody').html('');
            fillTable();
            $('body').addClass('global-modal-open modal-open');
            $('#tvDashModal, #tv-dash-modal-backdrop').show();

        }
    });

    if (/https:\/\/worker\.mturk\.com\/tasks/.test(windowHREF)){
        getRIDs();
    } else if (/https:\/\/worker\.mturk\.com\/contact_requester/.test(windowHREF)){
        contactPage();
    } else if (/projects.*assignment_id/.test(windowHREF)){
        trackingTask();
    } else if (/projects.*\/tasks/.test(windowHREF)){
        let assignmentData = $('.project-detail-bar').find('[data-react-class="require(\'reactComponents/common/ShowModal\')[\'default\']"]').data('react-props').modalOptions;
        let assignableHitsCount = assignmentData.assignableHitsCount;
        let hit_set_id = document.querySelectorAll('form[action*="projects/')[0].action.match(/projects\/([A-Z0-9]+)\/tasks/)[1];
        let rid = assignmentData['contactRequesterUrl'].match(/requester_id%5D=(.*?)&/)[1];
        let title = assignmentData['projectTitle'];
        let reward = assignmentData['monetaryReward']['amountInDollars'];
        getHitReturnData(hit_set_id, assignableHitsCount);
        getDetailedHitData(rid, reward, title, assignableHitsCount, hit_set_id);
    } else if (/dashboard/.test(windowHREF)){

        /* Let's get some stats */
        let surveyWorkTime = 0;
        let surveyPE = 0;
        let batchWorkTime = 0;
        let batchPE = 0;
        let totalPE = 0;
        let trackedWorkTime = 0;
        let requesterBreakdownTableHtml = ``;
        Object.keys(localStorage)
            .forEach(function(key){
                if (/^tv_/.test(key)) {
                    let json = JSON.parse(localStorage.getItem(key));

                    if (json['date'] != today) return;

                    let reviewButton = ``;
                    if (json['reviewId'] == null){
                        reviewButton = `<a class="btn btn-primary btn-sm btn-review" data-toggle="tooltip" data-title="Leave a review on TurkerView!" data-hitKey="${escape(key)}">Review</a>`;
                    } else if (json['reviewId'] != null){
                        reviewButton = `<a href="https://turkerview.com/reviews/edit.php?id=${json['reviewId']}" target="_blank" class="btn btn-default btn-sm" data-hitKey="${escape(key)}" data-toggle="tooltip" data-title="Edit Review (Takes you to TurkerView)">Edit</a>`;
                    }

                    if (json['times'].length == 1){
                        surveyWorkTime += json['completionTime'];
                        surveyPE += json['reward'];
                        trackedWorkTime += json['completionTime'];

                        requesterBreakdownTableHtml += `
<div class="col-xs-4" style="overflow: hidden; white-space: nowrap;">${json['requester']}</div>
<div class="col-xs-2 text-xs-right">${json['times'].length}</div>
<div class="col-xs-2 text-xs-right">${moment().startOf('day').seconds((json['completionTime']/1000)).format('H:mm:ss')}</div>
<div class="col-xs-2 text-xs-right">$${((3600/(json['completionTime']/1000))*json['reward']).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr</div>
<div class="col-xs-2 text-xs-right">$${json['reward'].toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
<div class="col-xs-1" style="display: none;">${reviewButton}</div>`;

                        return;
                    }

                    /* Use Median Values on Batches */
                    let mind;
                    let arr = json['times'];
                    mind = Math.floor(median(filterOutliers(arr))/1000);
                    if (!mind) mind = Math.floor(median(arr)/1000);

                    //batchWorkTime += mind*(arr.length);
                    batchPE += json['reward']*(arr.length);

                    let batch_work_time = 0;
                    let batch_earned = 0;
                    json['times'].forEach(time => {
                        batchWorkTime += time/1000;
                        trackedWorkTime += time;
                        batch_work_time += time;
                        batch_earned += json['reward'];
                    });

                    requesterBreakdownTableHtml += `
<div class="col-xs-4" style="overflow: hidden; white-space: nowrap;">${json['requester']}</div>
<div class="col-xs-2 text-xs-right">${json['times'].length}</div>
<div class="col-xs-2 text-xs-right">${moment().startOf('day').seconds((batch_work_time/1000)).format('H:mm:ss')}</div>
<div class="col-xs-2 text-xs-right">$${((3600/(batch_work_time/1000))*batch_earned).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr</div>
<div class="col-xs-2 text-xs-right">$${batch_earned.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
<div class="col-xs-1" style="display: none;">${reviewButton}</div>`;

                    /* Calculate the hourly based on every single individual HIT */
                    /* We're not going to use this for now, I think overall it'll be less accurate since wild swings in completion times will throw things off
                    json['times'].forEach(function(time){
                        workTime += time;
                        pe += json['reward'];
                    });
                    */
                }
            });

        totalPE = surveyPE+batchPE;

        let overall_wages = ((3600/(trackedWorkTime/1000))*totalPE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        overall_wages = Number(overall_wages) ? `$${overall_wages}/hr` : `-`;

        let trackedFormatted = moment().startOf('day').seconds(Math.floor(trackedWorkTime/1000)).format('H:mm:ss');

        let daily_survey_hourly = ((3600/(surveyWorkTime/1000))*surveyPE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        daily_survey_hourly = Number(daily_survey_hourly) ? `$${daily_survey_hourly}/hr` : `-`;
        let daily_batch_hourly =  ((3600/(batchWorkTime))*batchPE).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        daily_batch_hourly = Number(daily_batch_hourly) ? `$${daily_batch_hourly}/hr` : `-`;
        if ($('.row.m-b-sm:contains(Projected Earnings)').length){
            //Dashboard Enhancer present, just append
            $('.row.m-b-sm:contains(Projected Earnings)').after(`
<div class="row m-b-sm">
    <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Tracked Time</strong></div>
    <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${trackedFormatted}</div>
</div>
<div class="row m-b-sm">
    <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Overall Wages</strong></div>
    <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${overall_wages.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
</div>
<div class="row m-b-sm">
    <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Batch Wages</strong></div>
    <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${daily_batch_hourly}</div>
</div>
<div class="row m-b-sm">
    <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Survey Wages</strong></div>
    <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${daily_survey_hourly}</div>
</div>`);
        } else{

            /* Rebuild the entire PE dash >.> Y U NO HAVE DASH ENHANCER??? */
            $('.col-xs-12.col-md-4.col-md-push-8').prepend(`
<div class="row m-b-xl">
    <div class="col-xs-12">
        <h2 class="m-b-md">Today's Activity</h2>
        <div class="row">
            <div class="col-xs-12">
                <div class="border-gray-lightest p-a-sm">
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Tracked Earnings</strong></div>
                        <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">$${totalPE.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </div>
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Tracked Time</strong></div>
                        <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${trackedFormatted}</div>
                    </div>
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Overall Wages</strong></div>
                        <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${overall_wages.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </div>
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Batch Wages</strong></div>
                        <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${daily_batch_hourly}</div>
                    </div>
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7"><strong>Survey Wages</strong></div>
                        <div class="col-xs-5 col-sm-6 col-lg-5 text-xs-right">${daily_survey_hourly}</div>
                    </div>
                    <div class="row m-b-sm">
                        <div class="col-xs-7 col-sm-6 col-lg-7">
                            <span class="expand-requester-breakdown-button">
                                <a class="table-expand-collapse-button" href="#" style="display: block; text-align: center;"><i class="fa fa-plus-circle"></i>
                                    <span class="button-text">Show Requesters</span>
                                </a>
                            </span>
                        </div>
                        <div class="col-xs-5 col-sm-6 col-lg-5">
                            <span class="collapse-requester-breakdown-button">
                                <a class="table-expand-collapse-button" href="#" style="display: block; text-align: center;"><i class="fa fa-minus-circle"></i>
                                    <span class="button-text">Hide Requesters</span>
                                </a>
                            </span>
                        </div>
                    </div>
                    <!-- Requester Breakdown Table -->
                    <div id="requester-breakdown" class="row m-b-sm" style="display: none;">
                        <div class="col-xs-4"><strong>Requester</strong></div>
                        <div class="col-xs-2 text-xs-right"><strong>Submitted</strong></div>
                        <div class="col-xs-2 text-xs-right"><strong>Time</strong></div>
                        <div class="col-xs-2 text-xs-right"><strong>Wages</strong></div>
                        <div class="col-xs-2 text-xs-right"><strong>Earned</strong></div>
                        <div class="col-xs-1 text-xs-right" style="display: none;"><strong>Review</strong></div>
                        ${requesterBreakdownTableHtml}
                    </div>
                    
                    
                </div>
            </div>
        </div>
    </div>
</div>
`)
            $('.expand-requester-breakdown-button').click(function(){
                $('#requester-breakdown').slideDown(250);
            });
            $('.collapse-requester-breakdown-button').click(function(){
                $('#requester-breakdown').slideUp(250);
            });

            /*
            initTurkerView();
            initReviews();

            $('input[name=display_titlebar_wage], input[name=display_requester_ratings], input[name=disable_return_reviews], input[name=display_hit_ratings], input[name=show_return_favicon], input[name=tv_api_key], select[name*=return_]').on('change keyup', function(){
                changeSettings();
            });

            fillTable();
            */

        }

        $('.result-count-info').append(`<span id="tv-aa-sync" style="cursor: pointer; margin-left: 5px;"><i class="fa fa-refresh"></i> Sync TV Review Approvals</span>`);

        $('#tv-aa-sync').click(function(){
            if (syncing) return;
            syncing = true;
            $('#tv-aa-sync').addClass('text-muted').html(`<i class="fa fa-refresh fa-spin"></i> Syncing`);
            cycleAASync();
        })

        setInterval(dashWatcher, 900000);

        function dashWatcher(){
            let diff = moment.tz('America/Los_Angeles').diff(moment(settings.last_sync), 'seconds');

            if (diff > 7200 || !settings.last_sync){
                if (diff > 129600) {
                    settings.install_date = moment.tz('America/Los_Angeles');
                    settings.last_sync = moment.tz('America/Los_Angeles');
                    commitSettings();
                    cycleAASync();
                }
                else cycleAASync();
            }
        }

        let diff = moment.tz('America/Los_Angeles').diff(moment(settings.last_sync), 'seconds');

        if (diff > 900 || !settings.last_sync){
            if (diff > 129600) {
                settings.install_date = moment.tz('America/Los_Angeles');
                settings.last_sync = moment.tz('America/Los_Angeles');
                commitSettings();
                cycleAASync();
            }
            else cycleAASync();


        } //else console.log('we wont send another hit status request for '+(900 - diff)+' seconds..');

        $(document).on('click', '.btn-update-rejection', function(){
            $(this).attr('disabled', true);
            let json = JSON.parse(localStorage.getItem($(this).attr('id')));

            let postObject = {
                fast_rating_5: [], fast_rating_4: [], fast_rating_3: [], fast_rating_2: [], fast_rating_1: [],
                rejection_ids: [{ review_id: json.reviewId, requester_feedback: json.feedback, requester_name: json.requester }]
            }
            let postData = new FormData();
            postData.append('data', JSON.stringify(postObject));

            fetch(`https://turkerview.com/api/v2/reviews/update/status/`, {
                method: 'POST',
                body: postData,
                headers: ViewHeaders
            }).then(res => {
                if (!res.ok) throw res;

                return res.json()
            }).then(res => {
                if ($('#rejection-thanks').length == 0) $(this).closest('table').before(`<p>Thank you!</p><p>Thank you for sharing your experience with this requester. If you need help getting the rejections overturned please drop by the current <a href='https://forum.turkerview.com/forums/daily-mturk-hits-threads.2/' target='_blank'>Daily Thread</a></p>`);
            }).catch(ex => {
                console.log(ex);
                alert(`Sorry, TVJS couldn't communicate your rejection to TV! Let CT know we saw this exception: ${ex} - also available in console (F12)`)
            });
        });

        checkQual('react');
        if (settings.tv_api_key == null || settings.tv_api_key == '' || settings.tv_api_key.length != 40){
            $('h1:contains(Overview)').before(tvApiAlert());
        }
    }

    /* TurkerView Bridge */
    if (/status_details/.test(windowHREF)){
        console.log(`bridge status page`);

        waitForKeyElements('.hit-status-details:eq(0)', bridgeStatusPage);
    }
}

let lastDay = '';
function cycleAASync(){
    if (!settings.tv_api_key || settings.tv_api_key.length != 40) {
        settings.last_sync = moment.tz('America/Los_Angeles');
        syncing = false;
        commitSettings();
        return;
    }

    let newtoday = moment(today).tz('America/Los_Angeles', true);
    let installdate = moment(settings.install_date).tz('America/Los_Angeles', true);
    let installDiff = newtoday.startOf('day').diff(installdate.startOf('day'), 'days');

    let datesWithReviews = [];

    Object.keys(localStorage)
        .forEach(function(key){
            if (/^tv_/.test(key)) {
                let json = JSON.parse(localStorage.getItem(key));

                let sizeEst = (JSON.stringify(json).length*16)/(8*1024);
                /* Let's clean up old data or data we no longer have use for so we can keep localstorage clean for the user */
                /*
                 Single record HITs are <400 len, ~.75kb in size so we could store up to 6,000 without overflowing localstorage, we should never get close to that.
                 A massive Forker / Overwatch / etc install complicates this immensely, so lets be stingy with what TV is storing to avoid any possible complications while still getting good AA data
                 */
                let days = moment(today).tz('America/Los_Angeles', true).diff(moment(json['date']).tz('America/Los_Angeles', true), 'days');

                if (days > 7 && !json.reviewId){
                    //This record is too old to be reviewed & doesn't have a review id, its safe to remove it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 3 && json.reviewId && ( (json.hit_status == 1 && json.task_count == 1) || json.approved == json.task_count ) ){

                    //This record is too old to be edited from TVJS, it has been reviewed & we already uploaded the approval time no need to keep it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 10 && json.reviewId && sizeEst > 5){
                    //This record is simply too big to keep longer than 10 days, this should be incredibly rare to invoke, but adds a very important safety net around the user's limited local storage length
                    localStorage.removeItem(key);
                    return;
                } else if (days > 4 && !json.times){
                    //This record is from prior to TVJS10, we should remove it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 31){
                    //Its been too long, lets move on with our lives.
                    localStorage.removeItem(key);
                    return;
                }


                if (json.hit_stauts == 1 && json.task_count == 1) return; //filter out hits we already know the AA time of. don't filter rejections, we need to know if they overturn
                if (json.fast && json.approved == json.task_count) return; //only count approvals here, if there are rejections we should check to see if they overturn

                if (!datesWithReviews.includes(json['date'])) datesWithReviews.push(json['date']);
            }
        });

    datesWithReviews.sort(function(a,b){return new Date(a).getTime() - new Date(b).getTime()}).reverse();

    let yesterday = moment(today).tz('America/Los_Angeles', true).subtract(1, 'days').format('YYYY-MM-DD');
    let startSubtract = 1;
    let startCooldown = 0;
    let installWait = -1;
    let days_scanned = 0;

    /* we'll always check the last two days IF(!) there are reviews, just in case */
    if (datesWithReviews.includes(today)) {
        days_scanned++;
        startCooldown += 1500;
        checkHitStatus(today, 50);
        lastDay = today;
    }

    if (datesWithReviews.includes(yesterday)) {
        days_scanned++;
        startCooldown += 1500;
        setTimeout(function(){ checkHitStatus(yesterday); }, startCooldown);
        lastDay = yesterday
    }



    for (let i = 0; i < 32; i++){
        startSubtract++;
        installWait++;

        let dateFormatted = moment(today).tz('America/Los_Angeles', true).subtract(startSubtract, 'days').format('YYYY-MM-DD');
        if (!datesWithReviews.includes(dateFormatted)) continue;

        days_scanned++;
        lastDay = dateFormatted;
        startCooldown += 1500;
        setTimeout(function(){ checkHitStatus(dateFormatted); }, startCooldown);
    }

    if (days_scanned == 0){
        syncing = false;
        if ($('#tv-aa-sync').hasClass('text-muted')) $('#tv-aa-sync').removeClass('text-muted').html(`<i class="fa fa-refresh"></i> Done!`);
        settings.last_sync = moment.tz('America/Los_Angeles');
        commitSettings();
    }

    if (datesWithReviews.length === 0){
        console.log('no reviews');
        syncing = false;
        settings.last_sync = moment.tz('America/Los_Angeles');
        commitSettings();
        $('#tv-aa-sync').removeClass('text-muted').html(`<i class="fa fa-refresh"></i> Done!`);
    }
}

async function checkHitStatus(date, page_limit = 50){
//console.log('checking...',date);
    let statusHits = [];
    let paidPages = 1;
    let approvedPages = 1;
    let rejectedPages = 1;
    let ps = [];


    const workHistory = await Promise.all([
        fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Approved&format=json`).then(res => res.json()).then(res => {
            approvedPages = Math.ceil(res.total_num_results/20);
            res.results.forEach(hit => {
                statusHits.push(hit)
            });
            for (i = 2; i < page_limit; i++){
                if (i > approvedPages) break;
                let x = fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Approved&format=json&page_number=${i}`).then(res => res.json()).then(res => {
                    res.results.forEach(hit => {
                        statusHits.push(hit)
                    })
                });
                ps.push(x)
            }
        }),
        fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Paid&format=json`).then(res => res.json()).then(res => {
            paidPages = Math.ceil(res.total_num_results/20);
            res.results.forEach(hit => {
                statusHits.push(hit)
            });
            for (i = 2; i < page_limit; i++){
                if (i > paidPages) break;
                let x = fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Paid&format=json&page_number=${i}`).then(res => res.json()).then(res => {
                    res.results.forEach(hit => {
                        statusHits.push(hit)
                    })
                });
                ps.push(x)
            }
        }),
        fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Rejected&format=json`).then(res => res.json()).then(res => {
            rejectedPages = Math.ceil(res.total_num_results/20);
            res.results.forEach(hit => {
                statusHits.push(hit)
            });
            for (i = 2; i < page_limit; i++){
                if (i > rejectedPages) break;
                let x = fetch(`https://worker.mturk.com/status_details/${date}?utf8=âœ“&assignment_state=Rejected&format=json&page_number=${i}`).then(res => res.json()).then(res => {
                    res.results.forEach(hit => {
                        statusHits.push(hit)
                    })
                });
                ps.push(x)
            }
        })
    ]);

    const pageHistory = await Promise.all(ps);

    let diff = moment(today).diff(date, 'days');

    let newtoday = moment(today).tz('America/Los_Angeles', true);

    let installdate = moment(settings.install_date).tz('America/Los_Angeles', true);
    let installDiff = newtoday.startOf('day').diff(installdate.startOf('day'), 'days');

    let submitday = moment(date).tz('America/Los_angeles', true);
    let submitDiff = newtoday.startOf('day').diff(submitday.startOf('day'), 'days'); //# of days since hit was submitted

    let syncDate = moment(settings.last_sync).tz('America/Los_Angeles', true);
    let syncDiff = newtoday.startOf('day').diff(syncDate.startOf('day'), 'days'); //# of days since last sync

    //console.log(`Installed: ${installDiff} days ago, submitted: ${submitDiff} days ago, synced ${syncDiff} days ago`);

    /* Rules:
        1) Install diff should be less than days since HIT was submitted (if we submit a HIT 7 days ago, but only installed for 2 days, we don't know when it approved, don't mark fast)
        2) Sync diff should be less than 1,5 days to reliably track fast approval
        3) Use checkDiff to mark fast according to the old rules
     */

    let str = `tv_${date}`;
    let keyTest = new RegExp("^"+str);
    // 5 == good (~1day AA), 1 == bad (15-30 day)
    let fast_rating_5 = [];
    let fast_rating_4 = [];
    let fast_rating_3 = [];
    let fast_rating_2 = [];
    let fast_rating_1 = [];
    let approved_ids = [];
    let rejected_reviews = [];
    let new_rejections = [];
    let new_overturned_rejections = [];
    let temp_object = {fast5: [], fast4: [], fast3: [], fast2: [], fast1: []};

    let batches = [];

    Object.keys(localStorage).forEach(function(key){
        if (keyTest.test(key)) {
            let json = JSON.parse(localStorage.getItem(key));

            /* The only thing this does is upload a copy of a record we already have, we only do this if we're not confident our server will process the original request, look to remove. */
            if (json.reviewId && json.fast){
                if (json.fast == 5) temp_object.fast5.push(json.reviewId);
                else if (json.fast == 4) temp_object.fast4.push(json.reviewId);
                else if (json.fast == 3) temp_object.fast3.push(json.reviewId);
                else if (json.fast == 2) temp_object.fast2.push(json.reviewId);
                else if (json.fast == 1) temp_object.fast1.push(json.reviewId);

                return; //don't need to look for this, we've already marked it for AA
            }

            //we need to keep track of:
            // total task_count that we're scraping, as well as the max we should get to for a particular review
            //when task_count == 1 make sure the assignment_id matches up

            statusHits.forEach(function(hitResult){
                /* We use this since status pages don't store group_id but we still group reviews by that string, ugh */
                if (hitResult.requester_id != json.rid) return;
                if (hitResult.title != json.title) return;
                if (hitResult.reward.amount_in_dollars != json.reward) return;


                /* Process Batch Records */
                if (json.task_count > 1 && json.assignment_id == hitResult.assignment_id){
                    //we want to handle these differently, we'll update the approved/rejected count and if it equals the total submitted we'll let TV know we're done w/ this record
                    let t_approved = 0;
                    let t_rejected = 0;
                    let rejection_feedback = [];
                    let one_feedback = null;

                    statusHits.forEach(function(hit){
                       //loop through them all, see if we can get an approved/rejected count == task_count [ie, no pending left]
                        if (hit.requester_id != json.rid) return;
                        if (hit.title != json.title) return;
                        if (hit.reward.amount_in_dollars != json.reward) return;

                        if (hit.state == "Rejected") {
                            t_rejected++;
                            json.feedback = hit.requester_feedback;
                            if (!rejection_feedback.includes(hit.requester_feedback)) rejection_feedback.push(hit.requester_feedback);
                            one_feedback = hit.requester_feedback;
                        }
                        else if (hit.state == "Approved" || hit.state == "Paid") t_approved++;

                    });


                    //if (t_rejected > 0 && t_approved > 0) json.hit_status = null;
                    if (json.approved >= 1 && !json.fast){
                        if (installDiff <= submitDiff && syncDiff <= 2 && submitDiff < 2) {
                            json.fast = 5;
                        }
                        else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 4) {
                            json.fast = 4;
                        }
                        else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 8) {
                            json.fast = 3;
                        }
                        else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 15) {
                            json.fast = 2;
                        }
                        else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 32) {
                            json.fast = 1;
                        }
                    }

                    let mind;
                    /* Batch results*/
                    if (json['multi'] == true && json['times']){
                        let arr = json['times'];
                        mind = Math.floor(median(filterOutliers(arr))/1000);
                        if (!mind) mind = Math.floor(median(arr)/1000);
                    } else mind = Math.floor(json['completionTime'] / 1000);

                    if ((t_approved + t_rejected) >= json.task_count && (t_approved != json.approved && t_rejected == 0) ){
                        //the rejections might overturn, so we'll need to keep syncing this

                        json.task_count = (t_approved + t_rejected);
                        json.approved = t_approved;
                        json.rejected = t_rejected;

                        let record = {
                            requester_id: json.rid,
                            task_count: json.task_count,
                            approved: json.approved,
                            rejected: json.rejected,
                            feedback: one_feedback,
                            tracked_completion: mind,
                            fast: json.fast ? json.fast : null,
                            review_id: json.reviewId
                        };

                        if (json.reviewId) batches.push(record);
                    }


                    localStorage.setItem(key, JSON.stringify(json));
                    return;
                }
                /* End Batch Processing */

                /* For one-off HITs, since we're matching title/rid/reward, we need to check the assignment_id here to make sure it's correct */
                /* This prevents issues with requesters who use the same title/etc for two different surveys [Andy's $5 HITs w/ multiple in one day] */
                if (hitResult.assignment_id != json.assignment_id) return; //make sure we only update the correct record for 1-off HITs

                //if the hit_status is already set, don't overwrite it.
                if (json.fast) return;
                if (json.fast) return; //we've already handled this, should never get here tbh
                if (json.hit_status == -1 && hitResult.state == "Rejected") return; //we know this is rejected, only way we'll do anything more w/ it is if it overturns
                if (json.hit_status == 1) return; //we've already marked this as approved


                if (hitResult.state == "Rejected"){
                    //change the state to rejected, then return so we don't update _fast rating
                    json.hit_status = -1;
                    json.feedback = hitResult.requester_feedback;
                    if (json.reviewId) rejected_reviews.push(json.reviewId);
                    localStorage.setItem(key, JSON.stringify(json));
                    if(json.reviewId) new_rejections.push({key: key, date: json.date, requester_name: json.requester, tasks: json.task_count, title: json.title, reviewId: json.reviewId, feedback: json.feedback})
                    return;
                }

                /* This was previously marked as rejected & is no longer rejected [we would have returned earlier if it was], safe to mark as overturned */
                if (json.hit_status == -1) {
                    if(json.reviewId) new_overturned_rejections.push({key: key, date: json.date, requester_name: json.requester, tasks: json.task_count, title: json.title, reviewId: json.reviewId, feedback: json.feedback})
                }

                /* We know this is approved for sure, we only retrieve approved/paid/rejected results from the status pages */
                json.hit_status = 1;

                if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff < 2) {
                    json.fast = 5;
                    if (json.reviewId) fast_rating_5.push(json.reviewId);
                }
                else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 4) {
                    json.fast = 4;
                    if (json.reviewId) fast_rating_4.push(json.reviewId);
                }
                else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 8) {
                    json.fast = 3;
                    if (json.reviewId) fast_rating_3.push(json.reviewId);
                }
                else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 15) {
                    json.fast = 2;
                    if (json.reviewId) fast_rating_2.push(json.reviewId);
                }
                else if (installDiff >= submitDiff && syncDiff <= 2 && submitDiff <= 32) {
                    json.fast = 1;
                    if (json.reviewId) fast_rating_1.push(json.reviewId);
                } else {
                    //we don't know the AA time, just upload the approval info
                    if (json.reviewId) approved_ids.push(json.reviewId);
                }

                localStorage.setItem(key, JSON.stringify(json));

            })
        }
    });


    if (batches.length > 0) {

        let batch_uploads = {
            batches: batches
        };
        let batchData = new FormData();
        batchData.append('data', JSON.stringify(batch_uploads));


        fetch(`https://turkerview.com/api/v2/reviews/update/batch/`, {
            method: 'POST',
            body: batchData,
            headers: ViewHeaders
        }).then(res => {
            if (!res.ok) throw res;
            //console.log(res);
            return res.json();
        }).then(res => {
            //we actually don't need to do anything with this, relic from testing
            //console.log(res);
        }).catch(ex => {
            console.log('ex: '+ex);
        });
    }

    if (fast_rating_5.length > 0 || fast_rating_4.length > 0 || fast_rating_3.length > 0 || fast_rating_2.length > 0 || fast_rating_1.length > 0 || approved_ids.length > 0){
        let postObject = {
            fast_rating_5: fast_rating_5,
            fast_rating_4: fast_rating_4,
            fast_rating_3: fast_rating_3,
            fast_rating_2: fast_rating_2,
            fast_rating_1: fast_rating_1,
            approved_ids: approved_ids
        }

        postObject.fast_rating_5 = postObject.fast_rating_5.concat(temp_object.fast5);
        postObject.fast_rating_4 = postObject.fast_rating_4.concat(temp_object.fast4);
        postObject.fast_rating_3 = postObject.fast_rating_3.concat(temp_object.fast3);
        postObject.fast_rating_2 = postObject.fast_rating_2.concat(temp_object.fast2);
        postObject.fast_rating_1 = postObject.fast_rating_1.concat(temp_object.fast1);

        let postData = new FormData();
        postData.append('data', JSON.stringify(postObject));

        fetch(`https://turkerview.com/api/v2/reviews/update/status/`, {
            method: 'POST',
            body: postData,
            headers: ViewHeaders
        }).then(res => {
            if (!res.ok) throw res;
            //console.log(res);
            return res.json();
        }).then(res => {
            //we actually don't need to do anything with this, relic from testing
            //console.log(res);
        }).catch(ex => {
            console.log('ex: '+ex);
        });

    }

    if(new_rejections.length > 0) {
        let divTable = '';
        new_rejections.forEach(rejection => {
            divTable += `
<tr>
    <td class="text-xs-right col-xs-1"><a href="https://worker.mturk.com/status_details/${rejection['date']}?utf8=âœ“&assignment_state=Rejected" target="_blank">${rejection['date']}</a></td>
    <td class="text-xs-right col-xs-3">${rejection['requester_name']}</td>
    <td class="text-xs-right col-xs-6">${rejection['title']}</td>
    <td class="text-xs-right col-xs-1">${rejection['tasks']}</td>
    <td class="text-xs-right col-xs-1"><button type="button" id="${rejection['key']}" class="btn btn-danger btn-sm btn-update-rejection">Update</button></td>
</tr>
<tr><td><strong>Reason: </strong>${rejection['feedback']}</td></tr>`;
        });
        $('#MainContent').prepend(`
<div class="alert alert-danger">
    <h4>TurkerView has detected new rejections!</h4>
    <table style="width: 100%; margin-top: 8px;">
        <thead>
            <tr>
                <th class="text-xs-right col-xs-1">Date</th>
                <th class="text-xs-right col-xs-3">Requester</th>
                <th class="text-xs-right col-xs-6">HIT Title</th>
                <th class="text-xs-right col-xs-1">Submitted</th>
                <th class="text-xs-right col-xs-1">Review</th>
            </tr>
        </thead>
        <tbody>
            ${divTable}
        </tbody>
    </table>
</div>`);
    }

    if (new_overturned_rejections.length > 0){
        let divTable = '';
        new_overturned_rejections.forEach(rejection => {
            divTable += `
<tr>
    <td class="text-xs-right col-xs-1"><a href="https://worker.mturk.com/status_details/${rejection['date']}?utf8=âœ“&assignment_state=Rejected" target="_blank">${rejection['date']}</a></td>
    <td class="text-xs-right col-xs-3">${rejection['requester_name']}</td>
    <td class="text-xs-right col-xs-6">${rejection['title']}</td>
    <td class="text-xs-right col-xs-1">${rejection['tasks']}</td>
    <td class="text-xs-right col-xs-1"><a href="https://turkerview.com/reviews/edit.php?id=${rejection['reviewId']}" target="_blank" class="btn btn-success btn-sm">Edit</a></td>
</tr>
<tr><td><strong>Reason: </strong>${rejection['feedback']}</td></tr>`;
        });
        $('#MainContent').prepend(`
<div class="alert alert-success">
    <h4>TurkerView has detected new overturned rejections!</h4>
    <p>We updated the status of the HIT in your review, if you have anything else to add please visit the website :)</p>
    <table style="width: 100%; margin-top: 8px;">
        <thead>
            <tr>
                <th class="text-xs-right col-xs-1">Date</th>
                <th class="text-xs-right col-xs-3">Requester</th>
                <th class="text-xs-right col-xs-6">HIT Title</th>
                <th class="text-xs-right col-xs-1">Submitted</th>
                <th class="text-xs-right col-xs-1">Review</th>
            </tr>
        </thead>
        <tbody>
            ${divTable}
        </tbody>
    </table>
</div>`);
    }

    if (settings){
        settings.last_sync = moment.tz('America/Los_Angeles');
        commitSettings();
    }
    if (date == lastDay) {
        syncing = false;
        $('#tv-aa-sync').removeClass('text-muted').html(`<i class="fa fa-refresh"></i> Done!`);
    }
}

function checkQual(method){
    localStorage.removeItem('tv-qual');
    switch (method){
        case 'get':
            $.get('https://worker.mturk.com/dashboard?format=json').done(function(json){

                let approved = json['hits_overview']['approved'];
                let approval_rate = json['hits_overview']['approval_rate'];

                let rejection_impact = {
                    approved: json['hits_overview']['approved'],
                    approval_rate: json['hits_overview']['approval_rate'],
                    pending: json['hits_overview']['pending'],
                    rejected: json['hits_overview']['rejected']
                }

                //localStorage.setItem('tv-rejection-object', JSON.stringify(rejection_impact)); //on second thought, we don't need this skip & come back to it if that changes for rejection warnings
                localStorage.setItem('tv-app-range', closestApprovalTotal(approved));
                localStorage.setItem('tv-app-rate', closestApprovalPercentage(approval_rate/100));
                tvQualified = true;
                localStorage.setItem('tv-qual-2', true);
            });
            break;
        case 'react':
            let approved = parseInt($('#dashboard-hits-overview').find('div.row:contains(Approved):first').children('div:not(:contains(Approved))').text().replace(/,/g, ''));
            let approval_rate = parseFloat($('#dashboard-hits-overview').find('div.row:contains(Approval Rate):first').children('div:not(:contains(Approval Rate))').text().replace(/%/g, ''));

            localStorage.setItem('tv-app-range', closestApprovalTotal(approved));
            localStorage.setItem('tv-app-rate', closestApprovalPercentage(approval_rate/100));
            tvQualified = true;
            localStorage.setItem('tv-qual-2', true);
            break;
    }

}

function closestApprovalTotal(num) {
    var arr = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    var curr = arr[0];
    var diff = Math.abs (num - curr);
    for (var val = 0; val < arr.length; val++) {
        var newdiff = Math.abs (num - arr[val]);
        if (newdiff < diff) {
            diff = newdiff;
            curr = arr[val];
        }
    }
    return curr;
}

function closestApprovalPercentage(num) {
    var arr = [0.5, 0.75, 0.85, 0.90, 0.95, 0.98, 0.99, 0.995, 1];
    var curr = arr[0];
    var diff = Math.abs (num - curr);
    for (var val = 0; val < arr.length; val++) {
        var newdiff = Math.abs (num - arr[val]);
        if (newdiff < diff) {
            diff = newdiff;
            curr = arr[val];
        }
    }
    return curr;
}

var pauseDT;
var pausedElapsedTime = 0;
var paused = false;
var hourlyTracker;

function trackingTask(){

    let userActive = false;
    //window.addEventListener('mousemove', checkWindowFocus);
    //$(window).on('mousemove keydown', checkWindowFocus);

    function checkWindowFocus() {
        userActive = true;
        //console.log('user is in the window');
        window.removeEventListener('mousemove', checkWindowFocus);
        $(window).off('mousemove keydown');
        let now = moment.tz('America/Los_Angeles');
        pausedElapsedTime += moment(now).diff(moment(then));
        hourlyTracker = setInterval(hourlyDoHicky, 2500 );
    }


    //accepted hit work page, need to log the opening time + submission time
    let returned = 0;
    let assignmentData = $('.project-detail-bar').find('[data-react-class="require(\'reactComponents/common/ShowModal\')[\'default\']"]').data('react-props').modalOptions;
    let assignableHitsCount = assignmentData.assignableHitsCount;
    let requester = assignmentData['requesterName'];
    let rid = assignmentData['contactRequesterUrl'].match(/requester_id%5D=(.*?)&/)[1];
    let title = assignmentData['projectTitle'];
    let reward = assignmentData['monetaryReward']['amountInDollars'];
    let hit_set_id = document.querySelectorAll('form[action*="projects/')[0].action.match(/projects\/([A-Z0-9]+)\/tasks/)[1];
    let hitKey = 'tv_'+today+"_"+hit_set_id;
    let assignment_id = window.location.href.match(/assignment_id=([A-Z0-9]+)/)[1];

    let then = moment.tz('America/Los_Angeles');

    $('.detail-bar-label:contains(Requester)').next().append(`[ <a href="https://turkerview.com/requesters/${rid}-${slugify(requester)}" target="_blank">TV Profile</a> ]`);

    $('form[action*="rtrn"]').submit(function(e){
        returned = 1;
    });

    //$('div.row.h4').children('.col-xs-7').append(`<div id="hourlyContainer" class="pull-right" style="display: inline; text-align: center !important; opacity: 0.65;"><span id="hourlyPause" title="This will pause the timer for your hourly wage, use this when taking a break or otherwise not working on the HIT." class="hidden-xs-down pull-right" data-toggle="tooltip" data-placement="bottom" style="cursor: pointer; position: sticky;">Pause Hourly</span><span id="tvHourlyValue" class="hidden-xs-down pull-right" style="margin-right: 5px;">...</span></div>`);

    let new_amt_goal = $('div.row.h4').children().length == 3 ? true : false;

    if (new_amt_goal){
        //new goal bars
        let hits_completed = $('.daily-progress-bar:eq(0)').text().replace(/ \/ /, '').trim();
        let hits_goal = $('.worker-history-goal-input:eq(0)').attr('placeholder');

        let reward_earned = $('.daily-progress-bar:eq(1)').text().replace(/ \/ /, '').trim();
        let reward_goal = $('.worker-history-goal-input:eq(1)').attr('placeholder');

        $('div.row.h4').children('.col-md-6').html(``);
        $('div.row.h4').children('.col-md-6').append(`<span id="hijacked-goals" class="hidden-xs-down" style="opacity: 0.65">${hits_completed} / ${hits_goal} HITs Completed <span style="padding-right: 8px;"></span> ${reward_earned} / ${reward_goal} Reward Earned </span><div id="hourlyContainer" class="pull-right" style="display: inline; text-align: center !important; opacity: 0.65;"><span id="hourlyPause" title="This will pause the timer for your hourly wage, use this when taking a break or otherwise not working on the HIT." class="hidden-xs-down pull-right" data-toggle="tooltip" data-placement="bottom" style="cursor: pointer; position: sticky;">Pause Hourly</span><span id="tvHourlyValue" class="hidden-xs-down pull-right" style="margin-right: 5px;">...</span></div>`);
    } else{
        $('div.row.h4').children('.col-xs-7').append(`<div id="hourlyContainer" class="pull-right" style="display: inline; text-align: center !important; opacity: 0.65;"><span id="hourlyPause" title="This will pause the timer for your hourly wage, use this when taking a break or otherwise not working on the HIT." class="hidden-xs-down pull-right" data-toggle="tooltip" data-placement="bottom" style="cursor: pointer; position: sticky;">Pause Hourly</span><span id="tvHourlyValue" class="hidden-xs-down pull-right" style="margin-right: 5px;">...</span></div>`);
    }




    if ($('iframe').length > 0){
        $('iframe').before(`<div id="hourlySticky" class="h4" style="position: fixed; top: 56px; right: 50px; z-index: 9999; display: inline; float: right;"></div>`);
    }else{
        //no iframe HIT
        $('body').before(`<div id="hourlySticky" class="h4" style="position: fixed; top: 56px; right: 50px; z-index: 9999; display: inline; float: right;"></div>`);
    }


    let position = 0;
    let iframePositionTop = $('iframe').length > 0 ? $('iframe').offset().top : 80;
    $(window).on('scroll', function(){
        var doc = document.documentElement;
        var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

        if (top > 20 && position == 0){
            let moveThis = $('#hourlyContainer').detach();
            $('#hourlySticky').prepend(moveThis);
            position = 1;
        } else if (top < 20 && position == 1) {
            let moveThis = $('#hourlyContainer').detach();
            if (new_amt_goal) $('div.row.h4').children('.col-md-6').append(moveThis);
            else $('div.row.h4').children('.col-xs-7').append(moveThis);
            position = 0;
        }
        if (top > 20 && top < iframePositionTop){
            let pixelOffset = iframePositionTop - top;
            $('#hourlySticky').css('top', (pixelOffset+26)+'px');
        } else if (top > 20){
            $('#hourlySticky').css('top', '56px');
        }
    });

    $('iframe').on('load', function(){
        //if we want to move to frame-load hourly tracking use this
    });

    $(document).on('click', '#hourlyPause', function(){
        if (paused == false){
            clearInterval(hourlyTracker);
            paused = true;
            pauseDT = moment.tz('America/Los_Angeles');
            let currentPausedTime = pausedElapsedTime;

            let now = moment.tz('America/Los_Angeles');
            let interval = moment(now).diff(moment(then));

            if (reward != 0.00 && reward != '0.00'){
                let currentHourlyWage = (3600/((interval - currentPausedTime)/1000))*reward;
                $('#tvHourlyValue').text(`$${currentHourlyWage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr`);
                if (currentHourlyWage >= 12.50) $('#tvHourlyValue').removeClass('text-danger, text-warning').addClass('text-success');
                else if (currentHourlyWage >= 7.25) $('#tvHourlyValue').removeClass('text-danger, text-success').addClass('text-warning');
                else $('#tvHourlyValue').removeClass('text-success, text-warning').addClass('text-danger');
            }

            let total_sec = (interval - currentPausedTime)/1000;
            let min = Math.floor(total_sec/60);
            let sec = (total_sec%60).toFixed(0);
            $('#hourlyPause').text(`Unpause Hourly [${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}]`).css('color', 'red');
        } else{
            paused = false;
            setInterval(hourlyDoHicky, 1000);
            let now = moment.tz('America/Los_Angeles');
            pausedElapsedTime += moment(now).diff(moment(pauseDT));

            let currentPausedTime = pausedElapsedTime;
            let interval = moment(now).diff(moment(then));

            let total_sec = (interval - currentPausedTime)/1000;
            let min = Math.floor(total_sec/60);
            let sec = (total_sec%60).toFixed(0);
            $('#hourlyPause').text(`Pause Hourly [${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}]`).css('color', '');
        }
    });

    let badHourly = false;
    let original_document_title = document.title;

    hourlyTracker = setInterval(hourlyDoHicky, 1000);

    function hourlyDoHicky(){
        let currentPausedTime = pausedElapsedTime;
        //update hourly every so often
        if (paused) return;
        //if (!userActive) return;

        let now = moment.tz('America/Los_Angeles');
        let interval = moment(now).diff(moment(then));
        let docTitle = '';
        if (reward != 0.00 && reward != '0.00'){
            let currentHourlyWage = (3600/((interval - currentPausedTime)/1000))*reward;
            $('#tvHourlyValue').text(`$${currentHourlyWage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr`);
            docTitle = `$${currentHourlyWage.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}/hr`;
            if (currentHourlyWage >= 12.50) $('#tvHourlyValue').removeClass('text-danger, text-warning').addClass('text-success');
            else if (currentHourlyWage >= 7.25) $('#tvHourlyValue').removeClass('text-danger, text-success').addClass('text-warning');
            else $('#tvHourlyValue').removeClass('text-success, text-warning').addClass('text-danger');

            if (currentHourlyWage <= 7.25 & !badHourly && !localStorage.getItem('mts-return-reviews')){
                badHourly = true;
                if ($('.me-bar').find('#hourlyPause').length == 0) $('#hourlyContainer').append(`<br><a class="text-warning tv-return-warn" style="margin-right: 5px; cursor: pointer;">[ Review & Return ]</a>`);
                else $('#hourlyContainer').prepend(`<a class="text-warning tv-return-warn pull-right" style="margin-right: 5px; cursor: pointer;">[ Review & Return ]</a>`);
            }
        }
        let total_sec = (interval - currentPausedTime)/1000;
        let min = Math.floor(total_sec/60);
        let sec = (total_sec%60).toFixed(0);
        $('#hourlyPause').text(`Pause Hourly [${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}]`);
        if (settings.titlebar_wage_display) document.title = docTitle + ` [${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}] ` + original_document_title;
    }

    $(window).on('message', receiveMessage);

    function receiveMessage(e) {
        let msg = JSON.stringify(e.originalEvent.data);
        if (msg.indexOf("assignmentId") == -1) return;
        //we can parse the assignment id from the message if it becomes risky but for now lets just trust worker not to post messages other than submission.. lol
        //let message = JSON.parse(e.originalEvent.data); //we can do message['assignmentId'] or something here if need be.

        let now = moment.tz('America/Los_Angeles');
        let ms = moment(now).diff(moment(then));
        if (paused){
            pausedElapsedTime += moment(now).diff(moment(pauseDT));
        }
        ms = ms - pausedElapsedTime;

        let submittedObject = {
            date: today,
            requester: requester,
            rid: rid,
            title: title,
            hit_set_id: hit_set_id,
            task_count: 1,
            reward: reward,
            completionTime: ms,
            times: [ms],
            assignment_id: assignment_id,//we'll only use this for rejection overturn requests, its not uploaded w/ normal reviews & isn't available for upload yet
            submitTime: now,
            multi: false,
            reviewed: false,
            reviewId: null
        };
        if (!localStorage.getItem(hitKey)){
            localStorage.setItem(hitKey, JSON.stringify(submittedObject));
        } else{
            let previousRecord = JSON.parse(localStorage.getItem(hitKey));
            previousRecord['multi'] = true;
            previousRecord["task_count"]++;
            previousRecord['times'].push(ms);
            localStorage.setItem(hitKey, JSON.stringify(previousRecord));
        }
    }

    if ($('iframe').length == 0){
        //no iframe, rebuild the TV object when user clicks submit
        $('div[data-react-class*=SubmitAssignedTaskSubmissionForm]').find('.btn.btn-primary').click(function(){
            let now = moment.tz('America/Los_Angeles');
            let ms = moment(now).diff(moment(then));
            if (paused){
                pausedElapsedTime += moment(now).diff(moment(pauseDT));
            }
            ms = ms - pausedElapsedTime;

            let submittedObject = {
                date: today,
                requester: requester,
                rid: rid,
                title: title,
                hit_set_id: hit_set_id,
                task_count: 1,
                reward: reward,
                completionTime: ms,
                times: [ms],
                assignment_id: assignment_id,//we'll only use this for rejection overturn requests, its not uploaded w/ normal reviews & isn't available for upload yet
                submitTime: now,
                multi: false,
                reviewed: false,
                reviewId: null
            };
            if (!localStorage.getItem(hitKey)){
                localStorage.setItem(hitKey, JSON.stringify(submittedObject));
            } else{
                let previousRecord = JSON.parse(localStorage.getItem(hitKey));
                previousRecord['multi'] = true;
                previousRecord["task_count"]++;
                previousRecord['times'].push(ms);
                localStorage.setItem(hitKey, JSON.stringify(previousRecord));
            }
        });
    }

    if (settings.disable_return_reviews) return;
    if (localStorage.getItem('mts-return-reviews')) return; //lets start deferring to mts for things.

    let tvReturnModal = `
<div class="modal fade in" id="tvReturnModal" style="display: none;">
    <div id="tv-return-dialog" class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button id="tv-return-modal-close" type="button" class="close" data-dismiss="modal"><svg class="close-icon" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                <h2 class="modal-title">Submit a TurkerView Return Report</h2>
            </div>
            <div class="modal-body">
                <div id="return-review-alert" class="alert alert-dismissable alert-success hide">
                        <button type="button" class="close" data-dismiss="alert">Ã—</button>
                        <h4>Thank you!</h4>
                        <p>Your review for has been added!</p>
                </div>
                <form id="tv-return-review" action="https://turkerview.com/api/v2/returns/submit/" method="POST">
                    <script>
                        let minCommentLength = 20;
                        
                        $('input[name=underpaid]').change(function(){
                            if ($(this).is(':checked')) $('#progressest').show();
                            else {
                                $('#progressest').hide();
                                $('#progressSelect').prop('selectedIndex', 0);
                                $('#estVal').text('');
                            }
                        });
                        
                        $('#progressSelect').change(function(){
                            let estimated_progress = $(this).val();
                            if (estimated_progress == "Unsure") {
                                $('#estVal').text('');
                                return;
                            }
                            let reward = $('input[name=reward]').val();
                            let elapsed_work_time = $('input[name=elapsed_work_time]').val();
                            let estimated_completion_time = elapsed_work_time/estimated_progress;
                            let ect = estimated_completion_time/1000;
                            let min = Math.floor(ect/60);
                            let sec = Math.floor(ect%60);
                            let estimated_hourly = (3600/(estimated_completion_time/1000)) * reward;
                            $('#estVal').text(min + ":"+sec + "s / $" + (estimated_hourly).toFixed(2) + "/hr");
                        });
                        
                        $('input[name=tos]').change(function(){
                            if ($(this).is(':checked')) $('#tos_toggle').show();
                            else {
                                $('#tos_toggle').hide();
                                $('input[name=tos_type]').prop('checked', false)
                            }
                        });
                        
                        $('input[name=writing]').change(function(){
                            if ($(this).is(':checked')) $('#writing_toggle').show();
                            else {
                                $('#writing_toggle').hide();
                                $('input[name=writing_type]').prop('checked', false)
                            }
                        });
                        
                        $('input[name=downloads]').change(function(){
                            if ($(this).is(':checked')) $('#downloads_toggle').show();
                            else {
                                $('#downloads_toggle').hide();
                                $('input[name=downloads_type]').prop('checked', false)
                            }
                        });
                        
                        $('input[name=em]').change(function(){
                            if ($(this).is(':checked')) $('#em_toggle').show();
                            else {
                                $('#em_toggle').hide();
                                $('input[name=em_type]').prop('checked', false)
                            }
                        });
                        
                        $('textarea[name=comment]').on("input", function(){
                            let currentLength = $(this).val().length;
                            $('#comment-length').text('Please be descriptive so other workers can better understand your review, currently at ' + currentLength + '/' + minCommentLength +' minimum characters');
                            
                        });
                        
                        $('#tv-return-review').find('input').change(function(){
                            if ($('input[name=tos_type][value=9]').is(':checked') || 
                                $('input[name=writing_type][value=9]').is(':checked') ||
                                $('input[name=downloads_type][value=9]').is(':checked') ||
                                $('input[name=em_type][value=9]').is(':checked') ||
                                $('input[name=underpaid]').is(':checked') ||
                                $('input[name=broken]').is(':checked')
                                ) {
                                
                                $('textarea[name=comment]').attr('minlength', minCommentLength).prop('required', true);
                                $('#comment-required, #comment-length').show();
                                return;
                            }
                            
                            $('textarea[name=comment]').removeAttr('minlength').removeAttr('required');
                            $('#comment-required, #comment-length').hide();
                            
                        });
                        
                    </script>
                    <div class="row" style="margin-bottom: .7rem;">
                        <div class="col-xs-12 text-muted">
                        <h3 id="return-wage-est" style="text-align: center;"></h3>
                        </div>
                    </div>
                    <div class="row">
                    <h2>Reason for returning?</h2>
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="underpaid"> Underpaid</label><small> - use this if the HIT isn't worth the time involved to finish it.</small>
                            <p id="progressest" style="display: none; padding-left: 30px;">Progress Estimate: 
                            <select name="progressSelect" id="progressSelect">
                                <option>Unsure</option>
                                <option value=".075">5-10% Complete</option>
                                <option value=".175">10-25% Complete</option>
                                <option value=".375">25-50% Complete</option>
                                <option value=".625">50-75% Complete</option>
                                <option value=".875">75-100% Complete</option>
                            </select>
                            <span id="estVal"></span>
                            </p>
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="broken"> Broken</label><small> - the HIT cannot be completed - do NOT use this for no survey code.</small>
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="unpaid_screener"> Unpaid Screener</label><small> - use this if you were screened out without compensation.</small>
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="tos"> ToS Violation</label>
                            <div id="tos_toggle" style="padding-left: 30px; display: none;">
                                <label style="display: block;"><input type="radio" value="1" name="tos_type"> Personally Identifiable Information (PII) Minor <small>(Email, Zip, Company Name)</small></label>
                                <label style="display: block;"><input type="radio" value="2" name="tos_type"> Personally Identifiable Information (PII) Major <small>(Full Name, Phone #, SSN)</small></label>
                                <label style="display: block;"><input type="radio" value="3" name="tos_type"> SEO/Referral/Review Fraud</label>
                                <label style="display: block;"><input type="radio" value="4" name="tos_type"> Phishing/Malicious Activity</label>
                                <label style="display: block;"><input type="radio" value="9" name="tos_type"> Misc/Other</label>
                            </div>
                            
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="writing"> Writing</label><small> - use if this HIT requires annoying "write about a time when" prompts.</small>
                            <div id="writing_toggle" style="padding-left: 30px; display: none;">
                                <label style="display: block;"><input type="radio" value="1" name="writing_type"> Experiential Writing <small>"Write about a time when..."</small></label>
                                <label style="display: block;"><input type="radio" value="9" name="writing_type"> Misc/Other</label>
                                <p style="font-size: 85%; margin-left: 20px;">While Misc/Other requires writing usually copying the writing prompt is enough to get the point across to other users (please try not to disclose survey content, though!)</p>
                            </div>
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="downloads"> Downloads / Installs</label>
                            <div id="downloads_toggle" style="padding-left: 30px; display: none;">
                                <label style="display: block;"><input type="radio" value="1" name="downloads_type"> Inquisit <small> - use if this HIT utilizes the unpopular Inquisit plugin.</small></label>
                                <label style="display: block;"><input type="radio" value="2" name="downloads_type"> Browser Extension</label>
                                <label style="display: block;"><input type="radio" value="3" name="downloads_type"> Phone/Tablet Apps</label>
                                <label style="display: block;"><input type="radio" value="9" name="downloads_type"> Misc/Other</label>
                            </div>
                        </div>
                        
                        <div class="col-xs-12 text-muted form-group">
                            <label><input type="checkbox" name="em"> Extraordinary Measures</label>
                            <div id="em_toggle" style="padding-left: 30px; display: none;">
                                <label style="display: block;"><input type="radio" value="1" name="em_type"> Phone Calls</label>
                                <label style="display: block;"><input type="radio" value="2" name="em_type"> Webcam/Face requirements</label>
                                <label style="display: block;"><input type="radio" value="9" name="em_type"> Misc/Other</label>
                            </div>
                        </div>
                        
                    </div>
                    <div class="row">
                        <div class="col-xs-12 text-muted">
                        <h2>Comment</h2>
                        <textarea name="comment" rows="4" style="width: 100%;" placeholder="Leave a comment..."></textarea>
                        <span id="comment-required" style="display: none;" class="text-danger">* Required<small class="text-muted"> - Please leave at least a short note with your review to help other workers avoid the same problem.</small></span>
                        <p id="comment-length" style="display: none;" class="text-muted"></p>
                        </div>
                    </div>
                    <input type="hidden" name="group_id" value="${hit_set_id}">
                    <input type="hidden" name="requester_id" value="${rid}">
                    <input type="hidden" name="reward" value="${reward}">
                    <input type="hidden" name="elapsed_work_time">
                    <input type="hidden" name="version" value="${ver}">
                    <input type="hidden" name="app_range" value="${localStorage.getItem('tv-app-range') || null}">
                    <input type="hidden" name="app_rate" value="${localStorage.getItem('tv-app-rate') || null}">
                    <div class="row" style="margin-bottom: 0">
                        <div class="col-xs-12 text-muted">
                        <button type="submit" class="btn btn-primary pull-right">Submit Data & Return HIT</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<div id="tv-return-modal-backdrop" class="modal-backdrop fade in" style="display: none;"></div>`;

    $('footer').after(tvReturnModal);

    $('#tv-return-modal-backdrop, #tv-return-modal-close, #tvReturnModal').on('click', function(){
        $('#tv-return-modal-backdrop, #tvReturnModal').hide();
        $('body').removeClass('global-modal-open modal-open');
    });

    $('#tv-return-dialog').click(function(e){
        e.stopPropagation();
    });

    let inputForm = document.getElementById(`tv-return-review`);

    inputForm.addEventListener(`submit`, function(event){
        event.preventDefault();

        $('#tv-return-review').find('button[type=submit]').attr('disabled', true).prepend('<i class="fa fa-spinner fa-pulse"></i> ');
        var formData = new FormData(inputForm);

        fetch(inputForm.action, {
            method: `POST`,
            body: formData,
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response

            return response.json();
        }).then(response => {

            if (response.class != 'success') $('#tv-return-review').find('button[type=submit]').removeAttr('disabled').find('i').remove();
            const noticeAlert = document.getElementById(`return-review-alert`);
            noticeAlert.classList.remove(`alert-success`);
            noticeAlert.classList.remove(`alert-warning`);
            noticeAlert.classList.remove(`alert-danger`);
            noticeAlert.classList.add(`alert-${response.class}`);
            noticeAlert.classList.remove(`hide`);
            noticeAlert.innerHTML = response.html;

            if (response.status == 'success'){
                setTimeout(function(){
                    let form = document.querySelectorAll(`form[action*="rtrn"]`)[0].submit();
                }, 250)
            } else inputForm.querySelector(`button[type=submit]`).disabled = false;

        }).catch(exception => {
            console.log(exception);
        });

    });


    /*
    $('#tv-return-review').submit(function(e){
        e.preventDefault();

        $('#tv-return-review').find('button[type=submit]').attr('disabled', true).prepend('<i class="fa fa-spinner fa-pulse"></i> ');
        var url = $(this).attr('action');
        $.ajax({
            type: 'POST',
            url: url,
            data: $(this).serialize(),
            xhrFields: {
                withCredentials: true
            },
            dataType: 'text',
            success: function(data){
                if (/Your review was added/.test(data)){
                    $('#return-review-alert').removeClass('alert-success alert-warning alert-danger hide').addClass('alert-success');
                    $('#return-review-alert').find('h4').text('Thank you!');
                    $('#return-review-alert').find('p').text('For letting other workers know this wasnnt a good HIT!');
                    $('form[action*="rtrn"]').submit();
                } else{
                    //$('#return-review-failure').removeClass('hide');
                    //if (data.indexOf('Duplicate entry') > -1) $('#return-review-failure').children('p').text("You've already returned & reviewed this HIT.");
                    //else $('#return-review-failure').children('p').html(data);

                    $('#return-review-alert').removeClass('alert-success alert-warning alert-danger hide').addClass('alert-danger');
                    $('#return-review-alert').find('h4').text('Error!');
                    $('#return-review-alert').find('p').text(data);
                    $('#tv-return-review').find('button[type=submit]').attr('disabled', false).find('i').remove();
                }
            },
            error: function(data){
                console.log(data);
            }
        });
    });
    */


    $('button:contains(Return)').parent('form').before(`<a class="btn btn-warning tv-return-warn" style="margin-right: 5px;">Review & Return</a>`);

    $(document).on('click', '.tv-return-warn', function(){
        let currentPausedTime = pausedElapsedTime;
        if (paused){
            let now = moment.tz('America/Los_Angeles');
            currentPausedTime += moment(now).diff(moment(pauseDT));
        }
        let now = moment.tz('America/Los_Angeles');
        let interval = moment(now).diff(moment(then));
        let currentHourlyWage;
        let tempcolor = '';
        if (reward != 0.00 && reward != '0.00'){
            currentHourlyWage = (3600/((interval - currentPausedTime)/1000))*reward;
            $('#tvHourlyValue').text(`$${currentHourlyWage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr`);
            if (currentHourlyWage >= 12.50) tempcolor = 'text-success';
            else if (currentHourlyWage >= 7.25) tempcolor = 'text-warning';
            else tempcolor = 'text-danger';
        }
        let total_sec = (interval - currentPausedTime)/1000;
        let min = Math.floor(total_sec/60);
        let sec = (total_sec%60).toFixed(0);
        $('#return-wage-est').html(`Current Work Time: ${min < 10 ? '0' : ''}${min}min, ${sec < 10 ? '0' : ''}${sec}sec @ <span class="${tempcolor}">$${currentHourlyWage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/hr</span>`);

        $('input[name=elapsed_work_time]').val((interval - currentPausedTime));
        $('body').addClass('global-modal-open modal-open');
        $('#tvReturnModal, #tv-return-modal-backdrop').show();
    });

    location.assign(`javascript:$('#hourlyPause').tooltip();void(0)`);
    getHitReturnData(hit_set_id, assignableHitsCount);

    getDetailedHitData(rid, reward, title, assignableHitsCount, hit_set_id);

}

function getDetailedHitData(requester_id, reward, title, assignableHitsCount, hit_set_id){
    const postData = {
        requester_id: requester_id,
        reward: reward,
        title: title
    };

    /* Check for cached data first */
    let found_in_storage = false;

    console.log('get detailed data');
    Object.keys(localStorage)
        .forEach(function(key){
            if (/^tvjs-hit-review/.test(key)) {
                let json = JSON.parse(localStorage.getItem(key));
                let now = moment.tz('America/Los_Angeles');
                let difference_ms = moment(now).diff(moment(json['date']));
                if (difference_ms > 450000){
                    localStorage.removeItem(key); // delete after 7 minutes
                    return;
                }
                if (json['hit_set_id'] != hit_set_id) return;

                found_in_storage = true;

                buildAndAppend(json);
            }
        });

    if (found_in_storage) return;

    fetch('https://view.turkerview.com/v1/hits/hit/', {
        method: 'POST',
        headers: ViewHeaders,
        body: JSON.stringify(postData)
    }).then(response => {
        if (!response.ok) throw response;

        console.log(response);
        return response.json();
    }).then(json => {
        console.log(json);
        if (assignableHitsCount > 10){
            json['date'] = moment.tz('America/Los_Angeles');
            json['hit_set_id'] = hit_set_id;
            localStorage.setItem('tvjs-hit-review-'+hit_set_id, JSON.stringify(json));
        }
        $('body').append(buildAndAppend(json));
    }).catch(ex => {
        console.log(ex);
        apiExceptionHandler(ex);
    });


}

function returnHitDetailDataModal(json){
    return `
<div id="taskReviewDataModal" class="modal fade in" tabindex="-1" role="dialog" style="margin-top: 2rem; display: none;">
   <div id="taskReviewDataDialog" class="modal-dialog" role="document">
      <div class="modal-content">
         <div class="modal-header">
            <button id="taskReviewDataCloseButton" type="button" class="close" data-dismiss="modal" aria-label="Close">
               <svg class="close-icon" viewBox="0 0 9.9 10.1">
                  <g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round">
                     <path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5"></path>
                  </g>
               </svg>
            </button>
            <h2 class="modal-title">TurkerView HIT Details (${json.total_reviews})</h2>
         </div>
         <div class="modal-body project-details no-footer">
         <div class="alert alert-warning" style="font-size: 0.857rem; display: ${settings.tv_api_key.length == 40 ? `none` : `block`}">
            <h3>You need a valid TurkerView Auth Key</h3>
            <p>Please <a href="https://turkerview.com/account/api" target="_blank">register & claim your <strong>free</strong> API Key</a> by Feb 7th.</p>
        </div>
            <div class="row" style="text-align: center;">
               <div class="col-xs-12">
                  <h3>Overall Average Hourly</h3>
                  <h2 class="text-${json.avg_class}">$${(Number(json.avg_hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
                  <h3>${moment.utc(json.avg_comp*1000).format('HH:mm:ss')}</h3>
               </div>
            </div>
            
            <div class="row" style="text-align: center;">
               <div class="col-xs-6">
                  <h3>Minimum Hourly</h3>
                  <span class="text-${json.min_class}"><i class="fa fa-caret-down text-danger"></i> $${(Number(json.min_hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
               </div>
               <div class="col-xs-6">
                  <h3>Maximum Hourly</h3>
                  <span class="text-${json.max_class}"><i class="fa fa-caret-up text-success"></i> $${(Number(json.max_hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
               </div>
            </div>
            
            <div class="row" style="text-align: center;">
                <h3 class="text-warning">Times are grouped by worker's speed across a variety of tasks and they may not be in order of speed on <em>this</em> particular HIT.</h3>
               <div class="col-xs-1"></div>
               <div class="col-xs-2">
                  <h3>Careful</h3>
                  <span class="text-${json.user_splits.careful.class}">$${(Number(json.user_splits.careful.hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small class="text-muted">/hr</small></span>
                  <h3>${moment.utc(json.user_splits.careful.time*1000).format('HH:mm:ss')}</h3>
                  <h3 style="display: ${json.user_group == 1 ? `block` : `none`}"><i class="fa fa-arrow-up"></i></h3>
               </div>
               <div class="col-xs-2">
                  <h3>Relaxed</h3>
                  <span class="text-${json.user_splits.relaxed.class}">$${(Number(json.user_splits.relaxed.hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small class="text-muted">/hr</small></span>
                  <h3>${moment.utc(json.user_splits.relaxed.time*1000).format('HH:mm:ss')}</h3>
                  <h3 style="display: ${json.user_group == 2 ? `block` : `none`}"><i class="fa fa-arrow-up"></i></h3>
               </div>
               <div class="col-xs-2">
                  <h3>Average</h3>
                  <span class="text-${json.user_splits.average.class}">$${(Number(json.user_splits.average.hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small class="text-muted">/hr</small></span>
                  <h3>${moment.utc(json.user_splits.average.time*1000).format('HH:mm:ss')}</h3>
                  <h3 style="display: ${json.user_group == 3 ? `block` : `none`}"><i class="fa fa-arrow-up"></i></h3>
               </div>
               <div class="col-xs-2">
                  <h3>Fast</h3>
                  <span class="text-${json.user_splits.fast.class}">$${(Number(json.user_splits.fast.hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small class="text-muted">/hr</small></span>
                  <h3>${moment.utc(json.user_splits.fast.time*1000).format('HH:mm:ss')}</h3>
                  <h3 style="display: ${json.user_group == 4 ? `block` : `none`}"><i class="fa fa-arrow-up"></i></h3>
               </div>
               <div class="col-xs-2">
                  <h3>Proficient</h3>
                  <span class="text-${json.user_splits.proficient.class}">$${(Number(json.user_splits.proficient.hourly)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<small class="text-muted">/hr</small></span>
                  <h3>${moment.utc(json.user_splits.proficient.time*1000).format('HH:mm:ss')}</h3>
                  <h3 style="display: ${json.user_group == 5 ? `block` : `none`}"><i class="fa fa-arrow-up"></i></h3>
               </div>
               <div class="col-xs-1"></div>
               <div class="col-xs-12" style="display: ${json.user_group == 0 ? `block` : `none`}"><h3 class="text-warning">You don't have enough reviews to display a work group! Consider leaving reviews in order to enable grouping.</h3></div>
            </div>
            <div class="row">
                <div class="col-xs-12">
                <h2>Work Groups</h2>
                <ul class="text-muted">
                    <li><h3 class="text-muted">Careful - Careful readers tend to take their time, about an average worker with less than 5,000 HITs completed</h3></li>
                    <li><h3 class="text-muted">Relaxed - these workers most often move at a pace you'd expect for someone who has completed 5,000-10,000 HITs</h3></li>
                    <li><h3 class="text-muted">Average - these are workers who tend to stay close to the average / middle of the pack of workers on TV.</h3></li>
                    <li><h3 class="text-muted">Fast - Workers who have completed thousands of tasks & likely use faster computers with organized workflows</h3></li>
                    <li><h3 class="text-muted">Proficient - These workers tend to have tens of thousands of HITs under their belt along with special scripts & keybinds to complete work faster.</h3></li>
                </ul>
                    <h3 class="text-muted"><i class="fa fa-arrow-up"></i> - Your group (users you're most likely to have a completion time close to) - you'll need to leave 50+ reviews before this starts becoming reliable</h3>
                </div>
            </div>
            
            <div class="row m-t-lg m-b-0" style="text-align: center;">
               <div class="col-xs-6"><a href="https://turkerview.com/requesters/${json.requester_id}" target="_blank">Overview</a></div>
               <div class="col-xs-6"><a href="https://turkerview.com/requesters/${json.requester_id}/reviews" target="_blank">Reviews</a></div>
            </div>
         </div>
      </div>
   </div>
</div>
<div id="taskReviewDataBackdrop" class="modal-backdrop fade in" style="display: none;"></div>
    `;
}

/* Detailed HIT Record Functions */

function showTaskReviewData(){
    document.getElementById(`taskReviewDataModal`).style.display = `block`;
    document.getElementById(`taskReviewDataBackdrop`).style.display = `block`;
    document.querySelector(`body`).classList.add(`global-modal-open`);
    document.querySelector(`body`).classList.add(`modal-open`);
}

function hideTaskReviewData(){
    document.getElementById(`taskReviewDataModal`).style.display = `none`;
    document.getElementById(`taskReviewDataBackdrop`).style.display = `none`;
    document.querySelector(`body`).classList.remove(`global-modal-open`);
    document.querySelector(`body`).classList.remove(`modal-open`);
}

function taskHourlyTVClass(hourly) {
    if (hourly == null) return `unrated`;

    if (hourly > 10.50) return `mts-green`;
    if (hourly > 7.25) return `mts-orange`;
    if (hourly > 0.0) return `mts-red`;
    return `unrated`;
}

function buildAndAppend(json, assignableHitsCount){
    if (json.avg_hourly === null) return;

    document.querySelector(`body`).insertAdjacentHTML(`beforeend`, returnHitDetailDataModal(json));

    let file = taskHourlyTVClass(json.avg_hourly);

    document.querySelectorAll(`.work-pipeline-action`).forEach(el => {
        el.insertAdjacentHTML(`afterbegin`, `<a class="btn btn-secondary tv-task-review-data" href="#" style="margin-right: 5px;"><img src="https://turkerview.com/assets/images/tv-${file}.png" style="max-height: 14px;"></img></a>`);
    })

    document.querySelectorAll(`.task-project-title`).forEach(el => {
        el.insertAdjacentHTML(`afterbegin`, `<div class="tv-task-review-data" style="display: inline-block; margin-right: 4px; cursor: pointer;"><img src="https://turkerview.com/assets/images/tv-${file}.png" style="max-height: 16px;"></img></div>`);
    })

    document.getElementById(`taskReviewDataModal`).addEventListener(`click`, function(){
        hideTaskReviewData()
    })

    document.getElementById(`taskReviewDataCloseButton`).addEventListener(`click`, function(){
        hideTaskReviewData()
    })

    document.querySelectorAll(`.tv-task-review-data`).forEach(el => {
        el.addEventListener(`click`, function(){
            showTaskReviewData();
        })
    })

    document.getElementById(`taskReviewDataDialog`).addEventListener(`click`, function(e){
        e.stopPropagation();
    });
}

function getHitReturnData(group_id, assignableHitsCount){
    //run through localstorage.keys for stored data
    //if it exists for this hit, check the datetime and if its less than a few hours old go ahead & just use it
    //make sure to delete old data [ie, >1 day old]
    //if it doesn't exist, go ahead & make a call to tv to retrieve it
    //if >15 or so tasks, go ahead & store it in case its a batch
    let found_in_storage = false;
    Object.keys(localStorage)
        .forEach(function(key){
            if (/^tv-return-data/.test(key)) {
                let json = JSON.parse(localStorage.getItem(key));
                let now = moment.tz('America/Los_Angeles');
                let difference_ms = moment(now).diff(moment(json['date']));
                if (difference_ms > 450000){
                    localStorage.removeItem(key);
                    return;
                }
                if (json['group_id'] != group_id) return;

                found_in_storage = true;

                parseBuildReturnWarnings(json);
            }
        });

    if (found_in_storage) return;

    let exp = settings.exp_returners ? '&exp=true' : '';
    fetch(`https://view.turkerview.com/v1/returns/retrieve/?hit_set_id=${group_id}${exp}`, {
        method: 'GET',
        cache: 'no-cache',
        headers: ViewHeaders
    }).then(response => {
        if (!response.ok) throw response;

        return response.json();
    }).then(data => {
        let reward = 0;
        let total_time_in_ms = 0;
        let underpaid_total = 0;
        let broken_total = 0;
        let unpaid_screener_total = 0;
        let screened_time_total = 0;
        let tos_total = 0;
        let writing_total = 0;
        let downloads_total = 0;
        let em_total = 0;
        let comments = [];
        for (i = 0; i < data.length; i++){
            let localUserIgnore = JSON.parse(localStorage.getItem('tv-return-ignore-list')) || [];
            //if (localUserIgnore.includes(data[i].user_id)) continue;


            if (data[i].unpaid_screener == 1 && (data[i].elapsed_work_time/1000) < settings.rr_screener_min) continue;

            reward = data[i].reward;
            total_time_in_ms += data[i].elapsed_work_time;
            underpaid_total += data[i].underpaid;
            broken_total += data[i].broken;
            unpaid_screener_total += data[i].unpaid_screener;
            tos_total += data[i].tos;
            writing_total += data[i].writing;
            downloads_total += data[i].downloads;
            em_total += data[i].extraordinary_measures;

            let comment_prefix = '';
            if (data[i].underpaid == 1){
                //user said this was underpaid, throw their hourly @ time of return at the beginning of their comment

                let hourly = (3600/(data[i].elapsed_work_time/1000))*(parseFloat(reward)).toFixed(2);
                comment_prefix = `[Marked Underpaid @ $${hourly.toFixed(2)}/hr]<br>`;
            }

            if (data[i].unpaid_screener == 1){
                //user said this was underpaid, throw their hourly @ time of return at the beginning of their comment
                screened_time_total += data[i].elapsed_work_time;

                let time_in_seconds = data[i].elapsed_work_time/1000;
                let min = Math.floor(time_in_seconds/60);
                let sec = (time_in_seconds%60).toFixed(0);
                comment_prefix += `[Screened out @${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}]<br>`;
            }

            if (data[i].tos == 1) comment_prefix += `${tosMap.get(data[i].tos_type)}<br>`;

            if (data[i].writing == 1) comment_prefix += `${writingMap.get(data[i].writing_type)}<br>`;
            if (data[i].downloads == 1) comment_prefix += `${downloadsMap.get(data[i].downloads_type)}<br>`;
            if (data[i].extraordinary_measures == 1) comment_prefix += `${emMap.get(data[i].em_type)}<br>`;

            let comment_object = {
                user_id: data[i].user_id,
                username: data[i].username,
                date: data[i].date,
                tos_type: data[i].tos_type,
                comment: comment_prefix + data[i].comment }
            comments.push(comment_object);
        }

        let objectToStore = {
            group_id: group_id,
            date: moment.tz('America/Los_Angeles'),
            reward: reward,
            total_time_in_ms: total_time_in_ms,
            underpaid_total: underpaid_total,
            broken_total: broken_total,
            unpaid_screener_total: unpaid_screener_total,
            unpaid_screener_time: screened_time_total,
            tos_total: tos_total,
            writing_total: writing_total,
            downloads_total: downloads_total,
            em_total: em_total,
            comments: comments
        };

        parseBuildReturnWarnings(objectToStore);

        if (assignableHitsCount >= 10){
            //lets store this in case its a batch.
            localStorage.setItem('tv-return-data-'+group_id, JSON.stringify(objectToStore));
        }
    }).catch(ex => {
        apiExceptionHandler(ex);
    });

}

function parseBuildReturnWarnings(json){
    if (json['broken_total'] + json['underpaid_total'] + json['unpaid_screener_total'] + json['tos_total'] + json['writing_total'] + json['downloads_total'] == 0) return;

    let x = Number(json['broken_total']) + Number(json['underpaid_total']) + Number(json['unpaid_screener_total']) + Number(json['tos_total']) + Number(json['writing_total']) + Number(json['downloads_total']);

    $('.tv-return-warning-data-launcher').append()
    let high_alert = [];
    let medium_alert = [];
    let low_alert = [];
    for(var warning_level in settings.return_warning_levels){
        if (settings.return_warning_levels.hasOwnProperty(warning_level)){
            if (settings.return_warning_levels[warning_level] == 'high') high_alert.push(warning_level);
            else if (settings.return_warning_levels[warning_level] == 'medium') medium_alert.push(warning_level);
            else if (settings.return_warning_levels[warning_level] == 'low') low_alert.push(warning_level);
        }
    }

    let highest_warning_class = 'hidden';

    //low
    if (json["underpaid_total"] > 0 && low_alert.indexOf("underpaid") > -1) highest_warning_class = 'text-muted';
    else if (json["broken_total"] > 0 && low_alert.indexOf("broken") > -1) highest_warning_class = 'text-muted';
    else if (json["unpaid_screener_total"] > 0 && low_alert.indexOf("screener") > -1) highest_warning_class = 'text-muted';
    else if (json["tos_total"] > 0 && low_alert.indexOf("tos") > -1) highest_warning_class = 'text-muted';
    else if (json["writing_total"] > 0 && low_alert.indexOf("writing") > -1) highest_warning_class = 'text-muted';
    else if (json["downloads_total"] > 0 && low_alert.indexOf("downloads") > -1) highest_warning_class = 'text-muted';
    else if (json["em_total"] > 0 && low_alert.indexOf("extraordinary_measures") > -1) highest_warning_class = 'text-muted';

    //med
    if (json["underpaid_total"] > 0 && medium_alert.indexOf("underpaid") > -1) highest_warning_class = 'text-warning';
    else if (json["broken_total"] > 0 && medium_alert.indexOf("broken") > -1) highest_warning_class = 'text-warning';
    else if (json["unpaid_screener_total"] > 0 && medium_alert.indexOf("screener") > -1) highest_warning_class = 'text-warning';
    else if (json["tos_total"] > 0 && medium_alert.indexOf("tos") > -1) highest_warning_class = 'text-warning';
    else if (json["writing_total"] > 0 && medium_alert.indexOf("writing") > -1) highest_warning_class = 'text-warning';
    else if (json["downloads_total"] > 0 && medium_alert.indexOf("downloads") > -1) highest_warning_class = 'text-warning';
    else if (json["em_total"] > 0 && medium_alert.indexOf("extraordinary_measures") > -1) highest_warning_class = 'text-warning';

    //high
    if (json["underpaid_total"] > 0 && high_alert.indexOf("underpaid") > -1) highest_warning_class = 'text-danger';
    else if (json["broken_total"] > 0 && high_alert.indexOf("broken") > -1) highest_warning_class = 'text-danger';
    else if (json["unpaid_screener_total"] > 0 && high_alert.indexOf("screener") > -1) highest_warning_class = 'text-danger';
    else if (json["tos_total"] > 0 && high_alert.indexOf("tos") > -1) highest_warning_class = 'text-danger';
    else if (json["writing_total"] > 0 && high_alert.indexOf("writing") > -1) highest_warning_class = 'text-danger';
    else if (json["downloads_total"] > 0 && high_alert.indexOf("downloads") > -1) highest_warning_class = 'text-danger';
    else if (json["em_total"] > 0 && high_alert.indexOf("extraordinary_measures") > -1) highest_warning_class = 'text-danger';


    if (settings.show_return_favicon){
        let href = 'https://worker.mturk.com/favicon.ico';
        if (highest_warning_class == 'text-muted') href = 'null';
        else if (highest_warning_class == 'text-warning') href = 'null';
        else if (highest_warning_class == 'text-danger') href = 'null';
        var favicon = document.querySelector("link[rel*='icon']") || document.createElement('link');
        favicon.type = 'image/x-icon';
        favicon.rel = 'shortcut icon';
        favicon.href = href;
        //document.getElementsByTagName('head')[0].appendChild(favicon);
    }


    $('.work-pipeline-action').prepend(`<a ${highest_warning_class == 'hidden' ? 'style="display: none;"' : ''} class="btn btn-danger tv-return-warning-data-launcher" href="#" style="margin-right: 5px;"><i class="fa fa-fw fa-warning"></i> ${x}</a>`);
    //$('.task-project-title').before(`<div ${highest_warning_class == 'hidden' ? 'style="display: none;"' : ''}><i class="fa fa-warning ${highest_warning_class} tv-return-warning-data-launcher" style="cursor: pointer; padding-right: 3px;"></i></div>`);

    document.querySelectorAll(`.task-project-title`).forEach(el => {
        el.insertAdjacentHTML(`afterbegin`, `<div ${highest_warning_class == 'hidden' ? 'style="display: none;"' : 'style="display: inline-block;"'}><i class="fa fa-warning ${highest_warning_class} tv-return-warning-data-launcher" style="cursor: pointer; padding-right: 3px;"> (${x})</i></div>`);
    })

    $('#hourlyContainer').append(`<i class="fa fa-warning fa-fw ${highest_warning_class} pull-right tv-return-warning-data-launcher" style="line-height: 1rem; cursor: pointer; ${highest_warning_class == 'hidden' ? 'display: none;' : ''}" data-toggle="tooltip" data-title="Oh no!"></i>`);

    let brokenClass = classMap(json['broken_total']);
    let underpaidClass = classMap(json['underpaid_total']);
    let screenerClass = classMap(json['unpaid_screener_total']);
    let tosClass = classMap(json['tos_total']);
    let writingClass = classMap(json['writing_total']);
    let downloadsClass = classMap(json['downloads_total'])
    let emClass = classMap(json['em_total']);

    let unpaid_screening_html = `<span class="text-muted">No users have reported being screened out without payment for this HIT.</span>`;
    if (json['unpaid_screener_total'] > 0){
        let average_ms_screened = json['unpaid_screener_time']/json['unpaid_screener_total'];
        let time_in_seconds = average_ms_screened/1000;
        let min_screen = Math.floor(time_in_seconds/60);
        let sec_screen = (time_in_seconds%60).toFixed(0);
        unpaid_screening_html = `<span class="text-warning">${json['unpaid_screener_total'] == 1 ? `1 user has` : `${json['unpaid_screener_total']} users have`} spent an average of <span class="text-danger">${min_screen}m:${sec_screen}s</span> on the screening questions.</span>`;
    }

    let commentHTML = '';
    if (json['comments'].length == 0) commentHTML = `<span class="text-muted">No user comments exist for this HIT</span>`;

    let no_comment_userlist = `<small class="text-muted">Users who did not comment: `;
    for(i = 0; i < json['comments'].length; i++){
        if (json['comments'][i]['comment'] == "") {
            no_comment_userlist += `<a href="https://turkerview.com/users/?user=${json['comments'][i]['user_id']}" target="_blank">${json['comments'][i]['username']}</a> [ <a class="text-danger" style="cursor: pointer;" onclick="ignoreUser(${json['comments'][i]['user_id']}, '${json['comments'][i]['username']}')"><i class="fa fa-ban"></i></a> ], `;
            continue;
        }
        commentHTML += `
            <p style="margin-bottom: 0;">${moment(json['comments'][i]['date'], 'X').fromNow()} <a href="https://turkerview.com/users/?user=${json['comments'][i]['user_id']}" target="_blank">${json['comments'][i]['username']}</a> [ <a class="text-danger" style="cursor: pointer;" onclick="ignoreUser(${json['comments'][i]['user_id']}, '${json['comments'][i]['username']}')"><i class="fa fa-ban"></i></a> ]</small> said: </p>
            <blockquote class="blockquote" style="font-size: .85rem; margin-left: 15px;">${json['comments'][i]['comment']}</blockquote>`;
    }
    no_comment_userlist = no_comment_userlist.slice(0, -2);
    no_comment_userlist += `</small>`;

    let tvReturnWarningDataModal = `
<div class="modal fade in" id="tvReturnWarningDataModal" style="display: none;">
    <div id="tv-return-warning-data-dialog" class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button id="tv-return-warning-data-modal-close" type="button" class="close" data-dismiss="modal"><svg class="close-icon" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                <h2 class="modal-title">TurkerView Return Warning Report</h2>
            </div>
            <div class="modal-body">
                <div class="alert alert-warning" style="${($('iframe').attr('src').includes('/evaluation/endor')) ? '' :'display: none;'}">
                    <h4>We're on Endor</h4>
                    <p>This HIT is from a Google Requester (Endor) - they often limit the # of HITs workers can complete which is confusing & gets reported as broken. Generally, they are "safe" to work for so consider checking their full TV profile!</p>
                </div>
                <div id="return-review-warning" class="alert alert-dismissable alert-warning" role="alert" style="display: none;">
                        <button type="button" id="close-return-review-warning" class="close" data-dismiss="alert">Ã—</button>
                        <h4>Heads Up!</h4>
                        <p>While we make every effort to ensure data on TurkerView is accurate & high-quality this feature is new & highly experimental! Make sure to preview comments/user profiles to make sure data is accurate & make a more informed decision :)</p>
                </div>
                <div id="return-ignore-user-failure" class="alert alert-dismissable alert-danger hide">
                        <button type="button" class="close" data-dismiss="alert">Ã—</button>
                        <h4>No Bueno!</h4>
                        <p>You couldn't ignore the user!</p>
                </div>
                <div class="row">
                <h3>Reasons for returning</h3>
                    <div class="row">
                    <div class="col-xs-12 text-muted">
                        <div class="col-xs-3" style="text-align: center;">
                            <h1 class="${brokenClass}" style="margin-bottom: 0;">${json['broken_total']}</h1>
                            <small class="text-muted">Broken Returns</small>
                        </div>
                        <div class="col-xs-3" style="text-align: center;">
                            <h1 class="${underpaidClass}" style="margin-bottom: 0;">${json['underpaid_total']}</h1>
                            <small class="text-muted">Underpaid Returns</small>
                        </div>
                        <div class="col-xs-3" style="text-align: center;">
                            <h1 class="${screenerClass}" style="margin-bottom: 0;">${json['unpaid_screener_total']}</h1>
                            <small class="text-muted">Unpaid Screener Reports</small>
                        </div>
                        <div class="col-xs-3" style="text-align: center;">
                            <h1 class="${tosClass}" style="margin-bottom: 0;">${json['tos_total']}</h1>
                            <small class="text-muted">TOS Violations</small>
                        </div>
                    </div>
                    </div>
                    <div>
                        <div class="col-xs-12 text-muted">
                            <div class="col-xs-4" style="text-align: center;">
                                <h1 class="${writingClass}" style="margin-bottom: 0;">${json['writing_total']}</h1>
                                <small class="text-muted">Writing Returns</small>
                            </div>
                            <div class="col-xs-4" style="text-align: center;">
                                <h1 class="${downloadsClass}" style="margin-bottom: 0;">${json['downloads_total']}</h1>
                                <small class="text-muted">Downloads Warnings</small>
                            </div>
                            <div class="col-xs-4" style="text-align: center;">
                                <h1 class="${emClass}" style="margin-bottom: 0;">${json['em_total']}</h1>
                                <small class="text-muted">Extraordinary Measures Warnings</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                <h3>Unpaid Screening Data</h3>
                    <div class="col-xs-12 text-muted">
                    ${unpaid_screening_html}
                    </div>
                </div>
                <div class="row" style="margin-bottom: 0">
                <h3>User Comments</h3>
                    <div class="col-xs-12 text-muted">
                    ${commentHTML}
                    ${no_comment_userlist}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
function ignoreUser(user_id, username){
        if (!confirm("Are you sure you want to ignore " + username + "? All of their return reviews will be hidden from you & not displayed at all.")) return;
        
        fetch('https://turkerview.com/api/v1/users/ignore/?user_id='+user_id, {
            method: 'GET',
            headers: {
                'Access-Control-Allow-Headers': 'Access-Control-Allow-Headers'
            },
            credentials: 'include'
        }).then(res => {
            if (!res.ok) throw res;
            return res.json();
        }).then(res => {
            let localUserIgnore = JSON.parse(localStorage.getItem('tv-return-ignore-list')) || [];
            if (!localUserIgnore.includes(user_id)) localUserIgnore.push(user_id);    
            localStorage.setItem('tv-return-ignore-list', JSON.stringify(localUserIgnore));
            $('#return-review-warning').show().find('p').html('You have ignored '+username+'. You can undo this operation in your <a href="https://turkerview.com/users/preferences/" target="_blank" style="text-decoration: underline;">user preferences</a>.');
        })
        .catch(responseError => {
            if (responseError.status == 401) $('#return-ignore-user-failure').show().find('p').html('You could not ignore this user as you are not logged in to <a href="https://turkerview.com" target="_blank" style="text-decoration: underline;">TurkerView</a>. If you visit the site & are already logged in you need to enabled third party cookies: <a href="https://forum.turkerview.com/posts/952316/" target="_blank" style="text-decoration: underline;">Chrome</a> | <a href="https://forum.turkerview.com/posts/967296/" target="_blank" style="text-decoration: underline;">FireFox</a>');
            if (responseError.status == 422) $('#return-ignore-user-failure').show().find('p').html('Oh no, if we have to put up with you so do you. You may not ignore yourself.');
            if (responseError.status == 409) {
                let localUserIgnore = JSON.parse(localStorage.getItem('tv-return-ignore-list')) || [];
                if (!localUserIgnore.includes(user_id)) localUserIgnore.push(user_id);
                localStorage.setItem('tv-return-ignore-list', JSON.stringify(localUserIgnore));
                $('#return-ignore-user-failure').show().find('p').html('Looks like you have already ignored '+username+'. We re-added them to your local cache.');
            }
        });
    }
</script>
<div id="tv-return-warning-data-modal-backdrop" class="modal-backdrop fade in" style="display: none;"></div>`;

    $('footer').after(tvReturnWarningDataModal);

    $('.close').click(function(){
        $(this).parent().hide();
    });

    $('#tv-return-warning-data-modal-backdrop, #tv-return-warning-data-modal-close, #tvReturnWarningDataModal').on('click', function(){
        $('#tv-return-warning-data-modal-backdrop, #tvReturnWarningDataModal').hide();
        $('body').removeClass('global-modal-open modal-open');
    });

    $('#tv-return-warning-data-dialog').click(function(e){
        e.stopPropagation();
    });

    $('.tv-return-warning-data-launcher').click(function(){
        $('body').addClass('global-modal-open modal-open');
        $('#tvReturnWarningDataModal, #tv-return-warning-data-modal-backdrop').show();
    });


}

function contactPage(){
    if (window.location.href.includes('TURKERVIEW')){
        //lets give folks a warning they're going to see an error
        $('strong:contains(Subject)').prepend(`
<div id="contact-error-warning" class="alert alert-warning">
    <h4>Heads Up from TurkerView!</h4>
    <p>After you send your message MTurk will give you a warning on the next page saying "something is not right" - it's a glitch in their routing from manual contact links but <u>your message to the requester goes through just fine</u>!</p>
</div>`);
    }

    let contact_requester_id = $('#hit_type_message_requester_id').length > 0 ? $('#hit_type_message_requester_id').val() : null;

    if (contact_requester_id == null) {
        contact_requester_id = window.location.href.match(/requester_id=([A-Z0-9]+)/)[1];
    }

    Object.keys(localStorage)
        .forEach(function(key){
            if (/^tv_/.test(key)) {
                let json = JSON.parse(localStorage.getItem(key));

                if (json.rid != contact_requester_id) return;
                json.contacted = true;
                localStorage.setItem(key, JSON.stringify(json));
            }
        });
}

/* TurkerView Bridge */
var passablemde = null;
function bridgeStatusPage(){
    var newCSS = GM_getResourceText("customCSS");
    GM_addStyle(newCSS);
    document.querySelector(`footer`).insertAdjacentHTML(`afterEnd`, bridgeRejectionForm());

    var simplemde = new SimpleMDE({ element: document.getElementById("message") });
    passablemde = simplemde;

    /* We NEED the worker's id if they want to file a dispute so we can help the requester identify which HIT to overturn */
    /* Worker IDs, as of ~2018, are no longer associated with the Amazon.com profile, making that research that says they were (and thus dangerous to store/use) null & void */
    /* The researchers might do the responsible thing and update that paper, but they're too busy blowing NSF funding in Hawaii */
    /* No one show this to Badger, she'll make me take it out */
    /* That means you, slothbro */
    let worker_id = document.querySelector(`.copyable-content`).textContent;
    /* This will not be used unless the worker files a dispute, we attach it now but perhaps we could just append it to the form at generation, makes no functional difference */

    document.querySelectorAll(`.status-column`).forEach(col => {
        if (!col.textContent.includes(`Rejected`)) return;

        /* Unset the height so we can expand the content, must be done on mobile & desktop view */
        col.parentElement.style.height = `unset`;

        if (col.nextSibling != null)col.nextSibling.insertAdjacentHTML(`beforeEnd`, `<span style="display: block; text-align: center;"><a href="#" class="text-danger dispute-rejection">Dispute Rejection</a></span>`);
        else col.lastChild.insertAdjacentHTML(`afterEnd`, `<a href="#" class="text-danger dispute-rejection">Dispute</a>`);
    });

    document.getElementById(`bridgeClickBlocker`).addEventListener(`click`, function(e){
        e.stopPropagation();
    });

    document.querySelectorAll(`.dispute-rejection`).forEach(a => {
        a.addEventListener(`click`, function(){
            showBridgeRejectionModal(a);
        });
    });

    document.querySelectorAll(`.bridgeRejectionClose, #bridgeRejectionModal`).forEach(el => {
        el.addEventListener(`click`, hideBridgeRejectionModal);
    });


    document.querySelector(`input[name=save_template`).addEventListener(`click`, function(e){
        //if checked, focus input and popup a tooltip explaining the rules for a label
        let check_state = e.target.checked;
        if (check_state){
            document.querySelector(`input[name=template_label]`).disabled = false;
            document.querySelector(`input[name=template_label]`).focus();

        } else{
            document.querySelector(`input[name=template_label]`).value = ``;
            document.querySelector(`input[name=template_label]`).disabled = true;
        }
    });

    document.getElementById(`bridgeSubmitRejectionForm`).addEventListener(`click`, function(e){
        e.preventDefault();

        let save_template = document.querySelector(`input[name=save_template`).checked;

        if (save_template){
            let label_length = document.querySelector(`input[name=template_label]`).value.length;
            if (label_length < 3){
                alert(`Template label length must be greater than 3 characters`);
                return;
            }
        }

        document.getElementById(`bridgeSubmitRejectionForm`).disabled = `true`;
        document.getElementById(`bridgeSubmitRejectionForm`).innerHTML = `<i class="fa fa-spinner fa-pulse"></i> Submitting`;
        document.querySelector(`textarea[name=message]`).value = simplemde.value();
        var reviewForm = document.getElementById('bridgeRejectionForm');
        var formData = new FormData(reviewForm);

        fetch('https://turkerview.com/api/v2/bridge/rejections/submit/', {
            method: 'POST',
            body: formData,
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(response => {
            console.log(response);

            if (response.error == 'duplicate'){
                alert(`Your submission could not be processed. We only allow 1 submission per assignment, or 1 submission per requester per day (to avoid SPAM)`);
                return;
            } else if (response.error){
                alert(`Your submissions could not be processed. Please try again.`);
                document.getElementById(`bridgeSubmitRejectionForm`).disabled = `false`;
                document.getElementById(`bridgeSubmitRejectionForm`).innerHTML = `Submit`;
                return;
            }

            let message_title = `Rejection Overturn Request`;
            let message_to_requester = `${response.data.requester_name},

I noticed a rejected HIT I submitted to your account on ${response.data.submission_date}. A lot of requesters don't understand the full impact a rejection has on a worker account, so I wanted to get in touch to ask you to review the work and consider overturning the rejection.

MTurk's contact form doesn't allow for formatting and has limited space, so I've used a third party tool to generate a page which also has documentation and helpful requester resources to help overturn the rejection, you can access the page for this rejected HIT here:

${response.case_url}

Thank you for your time!

---------------------------------
* This form letter was generated using TurkerView.com's Rejection Dispute System. Please respond as you see fit, multiple emails should be responded to individually as users are unique & may not communicate with each other.`;

            window.location.href = `https://worker.mturk.com/contact_requester/assignment_messages/new?assignment_message%5Bassignment_id%5D=${response.data.assignment_id}&assignment_message%5Bsubject%5D=${encodeURIComponent(message_title)}&completed_date=${response.data.submission_date}&hit_id=${response.data.hit_id}&requester_id=${response.data.requester_id}&requester_name=${encodeURIComponent(response.data.requester_name)}&assignment_message[body]=${encodeURIComponent(message_to_requester)}`;

        }).catch(exception => {
            console.log(exception);
            const noticeAlert = document.getElementById('bridge-rejection-alert');
            noticeAlert.insertAdjacentHTML('afterBegin', `<h3>That's not good!</h3><p>We hit a major error that isn't handled by the server, please send details to CT:</p><p>${exception}</p>`);
            window.scrollTo(0,0);
            document.getElementById(`bridgeSubmitRejectionForm`).disabled = `false`;
        });
    })

}
const alert_classes = [`alert-success`, `alert-warning`, `alert-danger`];
const body_modal_classes = [`global-modal-open`, `modal-open`];
function showBridgeRejectionModal(a){
    document.getElementById(`bridgeRejectionForm`).reset();

    let parent_row = a.closest(`li`);

    /* I hate everything about trying to select assignment_id */
    /* Like the Worker ID, we will not use this data unless the worker files the dispute, it's not really sensitive data */
    let assignment_id = parent_row.querySelector(`.desktop-row`).querySelector(`.action-column`).querySelector(`a[href*="/contact_requester/"`).href.match(/assignment_id%5D=([A-Z0-9]+)/)[1];
    let hit_status_json = JSON.parse(parent_row.closest(`div`).getAttribute(`data-react-props`));
    let hit_data = hit_status_json.bodyData.filter(function(d) { return d.assignment_id == assignment_id });

    /* Generate Form Data */
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=requester_name]`).value = hit_data[0].requester_name;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=requester_id]`).value = hit_data[0].requester_id;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=requester_feedback]`).value = hit_data[0].requester_feedback;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=assignment_id]`).value = hit_data[0].assignment_id;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=hit_id]`).value = hit_data[0].hit_id;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=hit_title]`).value = hit_data[0].title;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=reward]`).value = hit_data[0].reward;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=state]`).value = hit_data[0].state;
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=submission_date]`).value = window.location.href.match(/status_details\/([0-9-]+)/)[1];
    document.getElementById(`bridgeRejectionForm`).querySelector(`input[name=worker_id`).value = document.querySelector(`.copyable-content`).textContent;
    /* End Form Data */
    document.getElementById(`bridge-rejection-alert`).classList.remove(...alert_classes);
    document.querySelector(`body`).classList.add(...body_modal_classes);
    document.querySelectorAll(`#bridgeRejectionModal, #bridgeRejectionModalBackdrop`).forEach(el => el.style.display = `block`);

    fetch('https://view.turkerview.com/docs/bridge/rejections/', {
        method: 'GET',
        headers: ViewHeaders
    }).then(response => {
        if (!response.ok) throw response;

        return response.json();
    }).then(response => {
        console.log(response);
        template_html = ``;

        response.system_templates.forEach(template => {
            passable_templates.push(template);
            template_html += `<a href="#" class="rejection-template label label-primary" style="margin: 0 2px 0 2px">${template['tag']}</a>`
        });

        response.user_templates.forEach(template => {
            passable_templates.push(template);
            template_html += `<a href="#" class="rejection-template label label-success" style="margin: 0 2px 0 2px">${template['tag']}</a>`
        });

        console.log('temps', passable_templates);

        document.getElementById(`rejection-templates`).innerHTML = `<h3><small>Templates</small></h3>${template_html}`;
        document.querySelectorAll(`.rejection-template`).forEach(template => {
            template.addEventListener(`click`, fillRejectionTemplate);
        });
    }).catch(exception => {
        console.log(exception);
        document.getElementById(`rejection-templates`).innerHTML = `<small class="text-danger">Couldn't retrieve templates, sorry!</small>`
    });
}
var passable_templates = [];
function hideBridgeRejectionModal(){
    document.querySelector(`body`).classList.remove(...body_modal_classes);
    document.querySelectorAll(`#bridgeRejectionModal, #bridgeRejectionModalBackdrop`).forEach(el => el.style.display = `none`);
}

function bridgeRejection(){

}

function fillRejectionTemplate(event){
    document.querySelector(`input[name=template_label]`).value = ``;
    document.querySelector(`input[name=template_label]`).disabled = true;
    document.querySelector(`input[name=save_template`).checked = false;
    document.querySelector(`input[name=save_template`).disabled = true;
    let template = passable_templates.find(t => t.tag == event.target.innerText);

    passablemde.value(template.message)
}

function bridgeRejectionForm(){
    return `
<div class="modal fade in" id="bridgeRejectionModal" style="display: none;">
    <div class="modal-dialog">
        <div id="bridgeClickBlocker" class="modal-content">
            <div class="modal-header">
                <button type="button" class="close bridgeRejectionClose" data-dismiss="modal"><svg class="close-icon" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                <h2 class="modal-title">TurkerView Bridge | Rejection<span class="pull-right"></h2>
            </div>
            <div class="modal-body">
                <div id="bridge-rejection-alert" class="alert alert-dismissable alert-success hide">
                </div>
                <form id="bridgeRejectionForm" method="post" action="https://turkerview.com/bridge.php">
                <!-- Requester Info -->
                <div class="row">
                    <div class="col-xs-7">
                        <h3>Requester Name</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="requester_name" id="requester_name" required="" placeholder="Requester Name" readonly>
                    </div>
                    <div class="col-xs-5">
                        <h3>Requester ID</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="requester_id" id="requester_id" required="" placeholder="Requester ID" readonly>
                    </div>
                </div>
                <!-- HIT Info -->
                <div class="row">
                    <div class="col-xs-12">
                        <h3>Requester's Rejection Feedback</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="requester_feedback" id="requester_feedback" required="" placeholder="Feedback" readonly>
                        <input type="hidden" name="worker_id" id="worker_id" readonly="readonly">
                        <input type="hidden" name="assignment_id" id="assignment_id" readonly="readonly">
                        <input type="hidden" name="hit_id" id="hit_id" readonly="readonly">
                        <input type="hidden" name="hit_title" id="hit_title" readonly="readonly">
                        <input type="hidden" name="reward" id="reward" readonly="readonly">
                        <input type="hidden" name="submission_date" id="submission_date" readonly="readonly">
                        <input type="hidden" name="state" id="state" readonly="readonly">
                    </div>
                </div>
                
                <!-- Message -->
                <div class="row">
                    <div class="col-xs-12">
                        <h3>Message</h3>
                        <p><small>We'll display this to the requester in <strong>our system</strong>, you can use <a href="https://simplemde.com/markdown-guide" target="_blank">Markdown</a> syntax to display a properly formatted message to the requester.</small>
                        <br><small class="text-warning">Be polite and professional!</small>
                        <div id="rejection-templates" style="position: relative; height: 30px;"><div class="loading"></div></div>
                        </p>
                        <style>
                        
.loading,
.loading::before,
.loading::after {
	position: absolute;
	top: 50%;
	left: 50%;
	border: 1px solid rgba(24,188,156, 0.2);
	border-left-color: rgba(24,188,156, 0.7);
	-webkit-border-radius: 999px;
	-moz-border-radius: 999px;
	border-radius: 999px;
}

.loading {
	margin: -25px 0 0 -25px;
	height: 25px;
	width: 25px;
	-webkit-animation: animation-rotate 2000ms linear infinite;
	-moz-animation: animation-rotate 2000ms linear infinite;
	-o-animation: animation-rotate 2000ms linear infinite;
	animation: animation-rotate 2000ms linear infinite;
}

.loading::before {
	content: "";
	margin: -11px 0 0 -11px;
	height: 22px;
	width: 22px;
	-webkit-animation: animation-rotate 2000ms linear infinite;
	-moz-animation: animation-rotate 2000ms linear infinite;
	-o-animation: animation-rotate 2000ms linear infinite;
	animation: animation-rotate 2000ms linear infinite;
}

.loading::after {
	content: "";
	margin: -14px 0 0 -14px;
	height: 28px;
	width: 28px;
	-webkit-animation: animation-rotate 4000ms linear infinite;
	-moz-animation: animation-rotate 4000ms linear infinite;
	-o-animation: animation-rotate 4000ms linear infinite;
	animation: animation-rotate 4000ms linear infinite;
}

@-webkit-keyframes animation-rotate {
	100% {
		-webkit-transform: rotate(360deg);
	}
}

@-moz-keyframes animation-rotate {
	100% {
		-moz-transform: rotate(360deg);
	}
}

@-o-keyframes animation-rotate {
	100% {
		-o-transform: rotate(360deg);
	}
}

@keyframes animation-rotate {
	100% {
		transform: rotate(360deg);
	}
}
</style>
                        <textarea class="form-control input-sm" rows="4" name="message" id="message"></textarea>
                    </div>
                    <div class="col-xs-12">
                        <h3><small>Save Message As Template (optional)</small></h3>
                        <div style="display: flex">
                            <div class="col-sm-6 input-group" style="display: flex; flex-direction: column; justify-content: center;"><label style="margin-bottom: 0;"><input type="checkbox" name="save_template"> Save As A Template</label></div>
                            <div class="col-sm-6" style="display: flex; flex-direction: column; justify-content: center;"><input type="text" name="template_label" class="form-control" placeholder="Choose a label for quick selection" maxlength="64"></div>
                        </div>
                        
                    </div>
                </div>
                
                <!-- Submission -->
                <div class="row">
                    <div class="col-xs-7">
                        <div class="form-group hide"><h3><input type="checkbox" class="input-sm"> Elevate to IRB if necessary/possible</h3></div>
                    </div>
                    <div class="col-xs-5">
                        <button type="submit" id="bridgeSubmitRejectionForm" class="btn btn-success pull-right">Submit</button>
                    </div>
                </div>
                </form>
                
            </div>
        </div>
    </div>
</div>
<div id="bridgeRejectionModalBackdrop" class="modal-backdrop fade in bridgeRejectionClose" style="display: none;"></div>`;
}

let runOnce = 0;
function getRIDs(){

    if (runOnce > 0) return;

    runOnce++;
    $('.desktop-row').each(function(){
        let thisRow = $(this);
        let requester_id = thisRow.find('a[href*="/requesters/"]').attr('href').match(/requesters\/(.*?)\//)[1]
        if (settings.display_requester_ratings != false) thisRow.find('a[href*="/requesters/"]').before(`<div class="tv-container" style="display: inline-block;"><span class="turkerview" title="" style="cursor: pointer; height: 18px; width: 18px; background-image: url('https://turkerview.com/assets/images/tv-unrated.png'); background-size: cover; background-position-y: 3px; background-repeat: no-repeat; opacity: 0.25;"></span></div>`);
        if (settings.display_hit_ratings != false) thisRow.find('.project-name-column').prepend(`<div class="tv-container" style="display: inline-block;"><span class="turkerview" title="" style="cursor: pointer; height: 18px; width: 18px; background-image: url('https://turkerview.com/assets/images/tv-unrated.png'); background-size: cover; background-position-y: 3px; background-repeat: no-repeat; opacity: 0.25;"></span></div>`);


        var popoverHTML = buildDefaultPopover(requester_id);
        thisRow.children('.requester-column').find('.tv-container').append(popoverHTML);
    })
    let rids = [];
    let hitKeys = [];

    //return; //testing what happens if no response from tv (might happen first few days of new setup)
    react = $('ol').parent('div').data('react-props').bodyData;

    $.each(react, function(i, v) {
        //quick fix for queue since data is nested 2 deep in the array.
        if (queue.test(windowHREF)){
            if ($.inArray(v.project.requester_id, rids) === -1) rids.push(v.project.requester_id);
            hitKeys.push(v.project.requester_id.concat(v.project.monetary_reward.amount_in_dollars.toFixed(2), v.project.title));
        } else {
            if ($.inArray(v.requester_id, rids) === -1) rids.push(v.requester_id);
            hitKeys.push(v.requester_id.concat(v.monetary_reward.amount_in_dollars, v.title));
        }

    });

    if (rids.length === 0) return;

    //fetch requester data
    if (settings.display_requester_ratings != false){
        fetch(`https://view.turkerview.com/v1/requesters/?requester_ids=${rids.join(',')}`, {
            method: 'GET',
            cache: 'no-cache',
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(json => {
            viewData = json;
            buttonUp(viewData.requesters, react);
        }).catch(ex => {
            apiExceptionHandler(ex);
        });
    }


    //fetch hit data
    if (settings.display_hit_ratings != false){
        fetch('https://view.turkerview.com/v1/hits/', {
            method: 'POST',
            headers: ViewHeaders,
            body: JSON.stringify(hitKeys)
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(json => {
            hitData = json;
            buttonHitUp(hitData, react)
        }).catch(ex => {
            console.log(ex);
            apiExceptionHandler(ex);
        });
    }


}

function apiExceptionHandler(exception){
    /*
     Current exceptions that should be handled [code: message]
     401: invalidUserAuthKey - no or incorrect user api key provided, notify user to register and/or check their API key on TurkerView (free for ~2-3hrs of usage/day)
     401: invalidApplicationKey - no or incorrect application identifier provided, please register your application w/ TurkerView (its free)
     403: dailyLimitExceeded - user has run out of free API calls, stop sending requests & notify user to upgrade or wait until tomorrow

     Exception text can be accessed with ex.statusText
     */

    if ($('#tvjs-view-error').length > 0) return;
    if (exception.statusText == 'invalidUserAuthKey') $('#MainContent').prepend(`
<div id="tvjs-view-error" class="alert alert-danger">
    <h4>Your TurkerView API Key is invalid.</h4>
    <p>You can claim your free API key (or support the site with a subscription!) from your <a href="https://turkerview.com/account/api/" target="_blank" style="text-decoration: underline;">TurkerView account API dashboard.</a></p>
</div>`);
    else if (exception.statusText == 'dailyLimitExceeded') $('#MainContent').prepend(`
<div id="tvjs-view-error" class="alert alert-danger">
    <h4>Your TurkerView API Key has hit its free limit.</h4>
    <p>Please upgrade to a subscription plan from your <a href="https://turkerview.com/account/api/" target="_blank" style="text-decoration: underline;">TurkerView account API dashboard</a>.</p>
</div>`);
}

function buttonUp(viewData, react){
    //lets lock ourselves into the desktop mode and see if anyone complains about TVJS not working on mobile
    let noData = `<i class="fa fa-minus" style="color: rgba(128, 128, 128, 1);"></i> No Data`;
    $('.table-row-popover__content').css('display', 'none');

    console.log(react);
    $('.desktop-row').each(function(rowNum){
        let thisRow = $(this);
        let rid = !react[rowNum].project ? react[rowNum].requester_id : react[rowNum].project.requester_id;
        let row_reward = !react[rowNum].project ? react[rowNum].monetary_reward.amount_in_dollars : react[rowNum].project.monetary_reward.amount_in_dollars;
        let user_html = ``;

        if (viewData[rid] && viewData[rid].wages.user_average.wage !== null){
            user_html = `<div style="display: flex;">
            <div style="flex: 1;">
                <span class="tv-td">Pay Rate:</span>
            </div>
            <div style="flex: 1;">
                <span class="tv-td"><span class="text-${viewData[rid].wages.user_average.class}">$</i>${viewData[rid].wages.user_average.wage}<span style="font-size: 85%;"> / hr</span></span></span>
            </div>
        </div>`;
        } else {
            user_html = `<p class="text-muted" style="text-align: center;">You haven't reviewed this requester!</p><p style="text-align: center; margin-bottom: 0;"><a href="http://turkerview.com/review.php" target="_blank">Learn How!</a></p> `
        }


        let params = {
            reviewCount: viewData[rid] ? viewData[rid].reviews : 0,
            userReviewCount: viewData[rid] ? viewData[rid].user_reviews : 0,
            hourly: (viewData[rid] && viewData[rid].wages.average.wage !== null) ? `<span class="text-${viewData[rid].wages.average.class}">$</i>${viewData[rid].wages.average.wage}<span style="font-size: 85%;"> / hr</span></span>` : noData,
            pay: viewData[rid] ? `<span class="text-${viewData[rid].ratings.pay.class}">${viewData[rid].ratings.pay.text} <i class="fa ${viewData[rid].ratings.pay.faicon}"></i></span>` : noData,
            approval: viewData[rid] ? `<span class="text-${viewData[rid].ratings.fast.class}">${viewData[rid].ratings.fast.text}</span>` : noData,
            comm: viewData[rid] ? `<span class="text-${viewData[rid].ratings.comm.class}">${viewData[rid].ratings.comm.text}</span>` : noData,
            rname: !react[rowNum].project ? react[rowNum].requester_name : react[rowNum].project.requester_name,
            rid: rid,
            title: !react[rowNum].project ? react[rowNum].title : react[rowNum].project.title,
            reward: !react[rowNum].project ? react[rowNum].monetary_reward.amount_in_dollars : react[rowNum].project.monetary_reward.amount_in_dollars,
            rejections: !viewData[rid] ? '<i class="fa fa-minus" style="color: rgba(128, 128, 128, 1);"></i> No Data' :
                viewData[rid].rejections === 0 ? '<i class="fa fa-check" style="color: rgba(0, 128, 0, 1);"></i> No Rejections' : '<i class="fa fa-times" style="color: rgba(255, 0, 0, 1);"></i> Rejected Work',
            blocks: !viewData[rid] ? '<i class="fa fa-minus" style="color: rgba(128, 128, 128, 1);"></i> No Data' :
                viewData[rid].blocks === 0 ? '<i class="fa fa-check" style="color: rgba(0, 128, 0, 1);"></i> No Blocks' : '<i class="fa fa-times" style="color: rgba(255, 0, 0, 1);"></i> Blocks Reported',
            user_data: {
                html_template: user_html,
                hourly: (viewData[rid] && viewData[rid].wages.user_average.wage !== null) ? `<span class="text-${viewData[rid].wages.user_average.class}">$</i>${viewData[rid].wages.user_average.wage}<span style="font-size: 85%;"> / hr</span></span>` : noData
            },
            requester_info: queue.test(windowHREF) ? null : react[rowNum].requesterInfo
        };
        let opacity = viewData[rid] ? confidence(viewData[rid].reviews) : '0.5';

        let hourlyAvgForIcon = (viewData[rid] && viewData[rid].wages.average.wage) ? viewData[rid].wages.average.wage : null;
        thisRow.children('.requester-column').find('.turkerview').css('background-image', `url(${iconImage(hourlyAvgForIcon)})`).css('opacity', `1`);
        var popoverHTML = buildVIEWPopover(params);
        thisRow.children('.requester-column').find('.tv-container').append(popoverHTML);
        thisRow.children('.requester-column').find('.tv-popover-placeholder').remove();
        if (!queue.test(windowHREF)) thisRow.children('.requester-column').find('.tv-container').before(`<i class="fa text-muted fa-amazon mturk-requester-info" style="${settings.display_mturk_ratings == false ? 'display: none;' : ``}"></i>`);


        //rejections? blocks?
        if (params.rejections.indexOf('Rejected Work') >= 0) {
            thisRow.find('.requester-column').find('.tv-container:last').after(`<i style="cursor: pointer; font-size: inherit; color: rgba(255, 0, 0, 0.25); margin: 0;" class="fa fa-exclamation-circle tv-rejection-btn turkerview tv-tooltip" data-toggle="tooltip" data-title="Rejections Reported! Click for more info." data-requester_id="${rid}" data-reward="${row_reward}"></i>`);
        }
        if (params.blocks.indexOf('Blocks Reported') >= 0) thisRow.find('.requester-column').find('.tv-container:last').after(`<i style="font-size: inherit; color: rgba(255, 0, 0, 0.25); margin: 0" class="fa fa-exclamation-triangle turkerview tv-tooltip" data-toggle="tooltip" data-title="Account Blocks Reported!"></i>`);
    }); //end row loop

    //ugly hack to get around sandboxing
    location.assign("javascript:$('.tv-tooltip').tooltip();void(0)");

    $('.tv-rejection-btn').click(function(e) {
        e.stopPropagation();
        let btn = $(this);

        $('body').addClass('global-modal-open modal-open');
        $('body').append(rejectionReportModal());

        $('#tv-rejection-wrapper').addClass('in');
        $('#tv-rejection-wrapper, #tv-rejection-modal-close').click(function(){
            $('body').removeClass('global-modal-open modal-open');
            $('#tv-rejection-wrapper').remove();
        });

        $('#tv-rejection-wrapper').find('.modal-dialog').click(function(e){
            e.stopPropagation();
        })

        //rid for andy, good candidate to check for a 'low' risk: A3JSJNT0GIBCUH
        //rid for lieberman, high risk: A255UD4AY616XX
        //selena, high risk & newbie unfriendly: A28QSTY8AH9BJJ
        let requester_id = btn.data('requester_id');
        let reward = btn.data('reward');
        //generate advice for workers based on their approval rate & # of approved hits
        let appRange = localStorage.getItem('tv-app-range') || 0;
        let appRate = localStorage.getItem('tv-app-rate') || 0;
        fetch(`https://view.turkerview.com/v1/requesters/rejections/?requester_id=${requester_id}&reward=${reward}&user_approved=${appRange}&user_rate=${appRate}`, {
            method: 'GET',
            cache: 'no-cache',
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(data => {

            $('#loading-component').remove();
            $('#tv-rejection-wrapper').find('.modal-body').html(getRejectionReport(data));

            $('body').addClass('global-modal-open modal-open');


        }).catch(ex=> {
            $('#loading-component').remove();
            $('#tv-rejection-wrapper').find('.modal-body').html(`<div class="alert alert-danger"><h3>Oh No!</h3><p>We weren't able to retrieve data, please close this dialog & try again</p></div>`)
            console.log(ex);
        });
    })
}

function getRejectionReport(json){
    let comment_div = ``;
    let stop = 0;
    json.comments.forEach(comment => {
        if (stop >= 3) return;
        stop++;
        comment_div += `
<div class="row" style="margin-bottom: 0;">
    <div class="col-xs-12" style="text-align: left;"><h3 class="text-success">Pros</h3><p class="text-muted">${comment.pros}</p></div>
    <div class="col-xs-12" style="text-align: left;"><h3 class="text-danger">Cons</h3><p class="text-muted">${comment.cons}</p></div>
    <div class="col-xs-12"><h3 class="text-warning">Rejection Reason</h3><p class="text-muted">${(comment.feedback ? comment.feedback : '-')}</p></div>
</div>
<hr style="margin-top: 0">
        `;
    })
    return `
<!-- Stats -->
<div class="row" style="text-align: center;">
    <div class="col-xs-12">
        <h2 class="text-muted">Rejection Stats</h2>
        <h3 style="display: none;">Threat Level</h3>
        <h2 style="display: none;" class="${json.recommendation.class}">${json.recommendation.level}</h2>
        <h3 style="display: none;">${json.recommendation.reason}</h3>
    </div>
</div>
<div class="row" style="text-align: center;">
    <div class="col-xs-4">
        <h3>Rejected</h3>
        <h2 class="text-danger">${json.total_rejections} (${((json.total_rejections/json.total_reviews)*100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%)</h2>
    </div>
    <div class="col-xs-4">
        <h3>Unmarked</h3>
        <h2 class="text-muted">${json.total_pending} (${((json.total_pending/json.total_reviews)*100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%) </h2>
    </div>
    <div class="col-xs-4">
        <h3>Approved</h3>
        <h2 class="text-success">${json.total_approved} (${((json.total_approved/json.total_reviews)*100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%)</h2>
    </div>
</div>
<div class="row" style="text-align: center; display: ${(json.inexperienced_rejections + json.experienced_rejections > 0) ? 'block' : 'none'}">
    <div class="col-xs-6">
        <h3>Inexperienced Worker Rejections</h3>
        <h2 class="text-warning">${((json.inexperienced_rejections/(json.experienced_rejections + json.inexperienced_rejections))*100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%</h2>
    </div>
    <div class="col-xs-6">
        <h3>Experienced Worker Rejections</h3>
        <h2 class="text-warning">${((json.experienced_rejections/(json.experienced_rejections + json.inexperienced_rejections))*100).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%</h2>
    </div>
    <h3 class="text-muted">${json.experience_advice}</h3>
</div>
<hr style="margin-top: 0">

<!-- Impact: We're going to hide this for now until I get feedback on the entire idea. KISS! -->
<div class="row" style="text-align: center; display: none;">
    <div class="col-xs-12">
        <h2 class="text-muted">Rejection Impact (Per Task!)</h2>
        <h3>Impact Level</h3>
        <h2 class="${json.impact.class}">${json.impact.level}</h2>
        <h3>${json.impact.reason}</h3>
    </div>
</div>
<div class="row" style="text-align: center; display: none;">
    <div class="col-xs-4">
        <h3>Approval Rate</h3>
        <h2 class="${json.impact.survey.approval_rate.class}">${json.impact.survey.approval_rate.text}</h2>
    </div>
    <div class="col-xs-4">
        <h3>Time Lost</h3>
        <h2 class="${json.impact.survey.time_lost.class}">${json.impact.survey.time_lost.text}</h2>
    </div>
    <div class="col-xs-4">
        <h3>Wages Forfeit</h3>
        <h2 class="${json.impact.survey.wages.class}">${json.impact.survey.wages.text}</h2>
    </div>
</div>
<hr style="margin-top: 0; display: none;">


<!-- Written Reviews -->
<div class="row" style="text-align: center;">
    <div class="col-xs-12">
        <h2 class="text-muted">Rejection Reviews (Top ${stop})</h2>
        <div class="row" style="display: none;"><div class="col-xs-12" style="text-align: left;"><button class="btn btn-success btn-md btn-expand-written-reviews"><i class="fa fa-plus"></i> Show</button></div></div>
        <div id="written-rejection-reviews" style="display: block;">
            ${comment_div}
        </div>
        <div class="col-xs-12"><a href="https://turkerview.com/requesters/${json.requester_id}/reviews/rejected" target="_blank">Read More on TurkerView</a></div>
    </div>
    <script>
        $('.btn-expand-written-reviews').click(function(){
            if ($(this).children('i').hasClass('fa-plus')){
                $(this).html('<i class="fa fa-minus"></i> Hide');
                $(this).parent().parent().next().show();
            }else{
                $(this).html('<i class="fa fa-plus"></i> Show');
                $(this).parent().parent().next().hide();
            }
        });
    </script>
</div>`;
}

function rejectionReportModal(){
    return `
<div id="tv-rejection-wrapper" class="fade">
    <div class="modal " style="display: block; z-index: 9999">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <button id="tv-rejection-modal-close" type="button" class="close" data-dismiss="modal"><svg class="close-icon" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                    <h2 class="modal-title">TurkerView Rejection Report</h2>
                </div>
                <div class="modal-body">
                
                    <div id="loading-component" class="row" style="text-align: center;">
                        <div class="col-xs-12" style="min-height: 100px;">
                            <div class="loading"></div>
                        </div>
                        <h3>Loading Report...</h3>
                    </div>
                    
                </div>
            </div>        
        </div>
    </div>
    <div id="tv-rejection-modal-backdrop" class="modal-backdrop fade in"></div>
</div>


`;
}

function buttonHitUp(hitData, react){
    //lets lock ourselves into the desktop mode and see if anyone complains about TVJS not working on mobile
    $('.desktop-row').each(function(rowNum){
        let thisRow = $(this);

        let rid = !react[rowNum].project ? react[rowNum].requester_id : react[rowNum].project.requester_id;
        let reward = !react[rowNum].project ? react[rowNum].monetary_reward.amount_in_dollars.toFixed(2) : react[rowNum].project.monetary_reward.amount_in_dollars.toFixed(2);
        let title = !react[rowNum].project ? react[rowNum].title : react[rowNum].project.title;

        //hit data
        if (hitData['error']) {
            thisRow.find('.project-name-column').prepend(`<span class="turkerview tv-tooltip" data-toggle="tooltip" title="You must be logged in on TurkerView.com to use this feature" style="color: #fff; background-color: rgba(128, 128, 128, 0.25);"><i class="fa fa-exclamation"></i></span>`);
        } else {
            let thisKey = rid.concat(reward, title)
            let avg_completion = hitData[thisKey] ? hitData[thisKey].avg_completion : null;
            let avg_hourly = avg_completion !== null ? ((3600/avg_completion)*reward).toFixed(2) : null;
            let min_completion = hitData[thisKey] ? hitData[thisKey].min_completion : null;
            let min_hourly = min_completion !== null ? ((3600/min_completion)*reward).toFixed(2) : null;
            let max_completion = hitData[thisKey] ? hitData[thisKey].max_completion : null;
            let max_hourly = max_completion !== null ? ((3600/max_completion)*reward).toFixed(2) : null;

            let hitPay = hitData[thisKey] ? payFormat(hitData[thisKey].avg_pay) : payFormat(null);
            let hitReviewCount = hitData[thisKey] ? hitData[thisKey].total_reviews : '0';

            let hitColor = avg_completion !== null ? hourlyFormat((3600/avg_completion)*reward) : 'rgba(128, 128, 128, ';
            let hitIconUrl = avg_completion !== null ? iconImage((3600/avg_completion)*reward) : 'https://turkerview.com/assets/images/tv-unrated.png';
            let hitOpacity = hitData[thisKey] ? confidence(hitData[thisKey].total_reviews) : '0.5';

            thisRow.children('.project-name-column').find('.turkerview').css('background-image', `url(${hitIconUrl})`).css('opacity', `${hitOpacity}`);

            var popoverHITHTML = buildHITPopover(hitColor, avg_completion, avg_hourly, min_completion, min_hourly, max_completion, max_hourly, hitPay, hitReviewCount);
            thisRow.find('.project-name-column > .tv-container').append(popoverHITHTML);
        }

        //export button
        thisRow.find('.project-name-column').append(`<span class="turkerview tv-tooltip tv-export text-muted" data-toggle="tooltip" title="Export this HIT to TurkerView Forum!" data-rowNum="${rowNum}" style="cursor: pointer;"><i class="fa fa-external-link text-muted"></i></span>`);

    }); //end row loop

    //ugly hack to get around sandboxing
    location.assign("javascript:$('.tv-tooltip').tooltip();void(0)");
}

function buildDefaultPopover(requester_id){
    let popOverHTML = `
<div class="tv-popover tv-hide tv-popover-placeholder" title="">
	<h3>Pardon Our Dust</h3>
	<div class="col-xs-12" style="padding: 8px;">
	<p>Unfortunately TurkerViewJS couldn't retrieve data from the server, this may happen occasionally as we move the API. Please consider checking the website to see the Requester profile!</p>
	<p><a href="https://turkerview.com/requesters/${requester_id}" target="_blank">Requester Profile Link</a></p>
	<div>
</div>

	</div>
</div>
`;
    return popOverHTML;
}

function buildVIEWPopover(params){
    let popOverHTML = `
<div class="tv-popover tv-hide" title="">
	<h3>TurkerView Ratings (${params.reviewCount})</h3>
	<h4 style=" text-align: center; margin-top: 10px; margin-bottom: 0;"><a href="https://turkerview.com/requesters/${params.rid}-${slugify(params.rname)}" target="_blank">${params.rname}</a></h4>
	<div style="padding: 9px 14px;">
        <div style="display: flex;">
            <div style="flex: 1;">
                <span class="tv-td">Pay Rate:</span>
                <span class="tv-td" style="padding: 5px 0;">Pay Sentiment:</span>
                <span class="tv-td">Approval:</span>
                <span class="tv-td">Communication:</span>
                <span class="tv-td" style="text-align: center; padding: 10px 0;">${params.rejections}</span>
                <span class="tv-td" style="text-align: center; padding: 5px 0;"><a href="https://turkerview.com/requesters/${params.rid}-${slugify(params.rname)}" target="_blank">Overview</a></span>
            </div>
            <div style="flex: 1;">
                <span class="tv-td">${params.hourly}</span>
                <span class="tv-td" style="padding: 5px 0;">${params.pay}</span>
                <span class="tv-td">${params.approval}</span>
                <span class="tv-td">${params.comm}</span>
                <span class="tv-td" style="text-align: center; padding: 10px 0;">${params.blocks}</span>
                <span class="tv-td" style="text-align: center; padding: 5px 0;"><a href="https://turkerview.com/requesters/${params.rid}-${slugify(params.rname)}/reviews" target="_blank">Reviews</a></span>
            </div>
        </div>
	</div>
	<h3>MTurk (${params.requester_info == null ? "N/A" : params.requester_info.activityLevel + " Activity"})</h3>
	<div style="padding: 9px 14px;">
        <div style="display: flex;">
            <div style="flex: 1;">
                <span class="tv-td">Approval %:</span>
                <span class="tv-td">Approval Time:</span>
            </div>
            <div style="flex: 1;">
                <span class="tv-td">${params.requester_info == null ? "N/A In Queue" : params.requester_info.taskApprovalRate}</span>
                <span class="tv-td" style="padding: 5px 0;">${params.requester_info == null ? "N/A In Queue" : params.requester_info.taskReviewTime}</span>
            </div>
        </div>
	</div>
	<h3>Your Review Ratings (${params.userReviewCount})</h3>
	<div style="padding: 9px 14px;">
        ${params.user_data.html_template}
	</div>
</div>
`;
    return popOverHTML;
}

function buildHITPopover(hitColor, avg_completion, avg_hourly, min_completion, min_hourly, max_completion, max_hourly, hitPay, hitReviewCount){
    let popOverHTML = `
<div class="tv-popover tv-hide" title="">
	<h3>TurkerView HIT Ratings (${hitReviewCount})</h3>
	<div style="padding: 9px 14px;">
		<span class="tv-td" style="text-align: center; font-size: 1.25rem;"><span style="color: ${hitColor} 1);">$${avg_hourly}</span><span style="font-size: 50%;"> / avg hr
		<br><span class="text-muted">${new Date(1000 * avg_completion).toISOString().substr(11, 8)} avg time</span></span></span>
<div style="display: flex; text-align: center;">
<div style="flex: 1;">
<span class="tv-td" style="padding: 5px 0; font-size: 1rem;"><i class="fa fa-caret-down" style="color: red;"></i> $${max_hourly}<span style="font-size: 60%;"> / hr
<br><span class="text-muted">${new Date(1000 * max_completion).toISOString().substr(11, 8)}
<br><span class="text-muted">(lowest)</span></span></span>
</div>
<div style="flex: 1;">
<span class="tv-td" style="padding: 5px 0; font-size: 1rem;"><i class="fa fa-caret-up" style="color: green;"></i> $${min_hourly}<span style="font-size: 60%;"> / hr
<br><span class="text-muted">${new Date(1000 * min_completion).toISOString().substr(11, 8)}
<br><span class="text-muted">(highest)</span></span></span>
</div>
</div>

	</div>
</div>
`;
    return popOverHTML;
}

/* Export HITs to TVF */
$(document).on('click', '.tv-export', function(){
    let that = $(this);
    $(this).children('i').removeClass('fa-external-link').addClass('fa-spinner fa-pulse');
    let rowNum = $(this).data('rownum');
    let hitKey = !react[rowNum].project ? react[rowNum].requester_id.concat(react[rowNum].monetary_reward.amount_in_dollars, react[rowNum].title) : react[rowNum].project.requester_id.concat(react[rowNum].project.monetary_reward.amount_in_dollars, react[rowNum].project.title);

    let view;
    if (queue.test(windowHREF)){
        view = viewData.requesters[react[rowNum].project.requester_id]
    } else {
        view = viewData.requesters[react[rowNum].requester_id];
    }

    let hit = hitData[hitKey];
    let hitDataOMFG = !react[rowNum].project ? react[rowNum] : react[rowNum].project;


    $.ajax({
        type: 'POST',
        url: 'https://forum.turkerview.com/export.php',
        data: {
            hitData: hitDataOMFG,
            reqTV: view,
            hitTV: hit
        },
        xhrFields: {
            withCredentials: true
        }
    }).done(function(data){
        that.children('i').removeClass('fa-spinner fa-pulse').addClass('fa-check');
        that.attr('data-original-title', 'Thanks for Sharing!');
    });
});

function fillTable(){
    if (tvAgreement == false){
        if ($('#tv-agreement').length) return;
        $('#tv-table').hide();
        $('#tv-table').parent().prepend(`
<form id="tv-agreement">
        <h2>TurkerView Intro</h2>
        <p>Thank you for joining the TurkerView community!</p>
        <p>We're a little different from other platforms and above all else we're about <strong class="text-success">helping workers earn more on MTurk</strong>, so we aim to highlight positive work experiences in reviews. That doesn't mean you can't review the junk too, but workers should keep a balanced perspective of their work profile on the platform.</p>
        <p>For convenience, we've made a very short (no ads, no wasted time) overview video of how the script works & how a review can be submitted</p>
        <p style="text-align: center">
                        <video width="70%" controls="">
                            <source src="https://turkerview.com/assets/TurkerViewJS.mp4" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </p>
<h2>TurkerView Participation Guidelines</h2>
<ul class="fa-ul">
    <li>
        <i class="fa-li fa fa-times-rectangle-o"></i><strong> Do <u class="text-danger">not</u> leave reviews out of frustration</strong>
        <p style="padding-left: 10px; padding-right: 10px; text-align: justify;">Especially over a rejection. Reviews should aim to be matter-of-fact as much as possible. Do feel free
    to use <a href="https://forum.turkerview.com/forums/daily-mturk-hits-threads.2/" target="_blank" style="text-decoration: underline;">TurkerView Forum</a> as a watercooler vent area, but think of reviews as an e-mail to your coworker that your boss can read. This means no inflammatory speech, including accusing someone of "scamming." Many negative experiences are a result of miscommunication, not ill intent, and will be cleared up with a quick e-mail.
        <br>Remember, the MTurk participation agreement requires <em>"As a Worker, you agree that: (i) you will interact with Requesters in a professional and courteous manner"</em>
        <br>It applies to TurkerView as well.
        </p>
    </li>
    <li>
        <i class="fa-li fa fa-times-rectangle-o"></i><strong> Do <u class="text-danger">not</u> rate pay sentiment drastically different from the hourly guidelines</strong>
        <p style="padding-left: 10px; padding-right: 10px; text-align: justify;"><em>(e.g., great pay for $2/hr or "underpaid" for $100/hr)</em> unless you give clear indications why in the comments so folks can understand
         why you feel that way.</p>
    </li>
    <li>
        <i class="fa-li fa fa-times-rectangle-o"></i><strong> Do <u class="text-danger">not</u> rate communication unless you've contacted the requester</strong>
        <p style="padding-left: 10px; padding-right: 10px; text-align: justify;">Workers rely on accurate & sensible information from our services. Requesters should generally be given 2-3 business days to reply & workers are asked to explain their communication experience with the requester. 
        </p>
    </li>
    <h3>...And Finally</h3>
    <li>
        <i class="fa-li fa fa-check-square-o"></i><strong> <u class="text-success">Do</u> adjust your times & check your hourly is accurate <em>before</em> submitting a review</strong>
        <p style="padding-left: 10px; padding-right: 10px; text-align: justify;">If you took a break to stretch, answer the phone, or do anything not related to the HIT <em>(including things like leaving optional feedback for a survey)</em> <strong>pause the hourly tracker</strong> in the HIT window. Otherwise it gives an inaccurate portrayal of the actual work to others 
         and can hurt a Requester's research/profile on the platform. Also, while we're constantly working to improve TurkerView, the script isn't perfect and can sometimes log the time incorrectly. If the completion time looks drastically off and you can't recall the time accurately, please don't submit a review for that HIT. In this case, no data is better than bad data.</p>
    </li>
</ul>
<p style="text-align: right; margin-bottom: 0;"><button type="submit" id="tv-agree-btn" class="btn btn-primary">Got it! Let me in!</button></p>
<p style="text-align: right;"><small><span class="text-muted">Don't worry, we'll only ask you to do this once!</span></small></p>
</form>`);

        $('#tv-agree-btn').on('click', function(){
            $('#tv-agreement').remove();
            tvAgreement = true;
            localStorage.setItem('tv-agree', true);
            fillTable();
        });
        return;
    }

    $('#tv-table > tbody').html('');
    $('#tv-table').show();



    let retrievalDate = $('#tvDateSelection').val();
    Object.keys(localStorage)
        .forEach(function(key){
            if (/^tv_/.test(key)) {
                let json = JSON.parse(localStorage.getItem(key));
                let sizeEst = (JSON.stringify(json).length*16)/(8*1024);
                /* Let's clean up old data or data we no longer have use for so we can keep localstorage clean for the user */
                /*
                 Single record HITs are <400 len, ~.75kb in size so we could store up to 6,000 without overflowing localstorage, we should never get close to that.
                 A massive Forker / Overwatch / etc install complicates this immensely, so lets be stingy with what TV is storing to avoid any possible complications while still getting good AA data
                 */
                let days = moment(today).tz('America/Los_Angeles', true).diff(moment(json['date']).tz('America/Los_Angeles', true), 'days');

                if (days > 4 && !json.reviewId){
                    //This record is too old to be reviewed & doesn't have a review id, its safe to remove it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 3 && json.reviewId && json.fast){
                    //This record is too old to be edited from TVJS, it has been reviewed & we already uploaded the approval time no need to keep it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 10 && json.reviewId && sizeEst > 5){
                    //This record is simply too big to keep longer than 10 days, this should be incredibly rare to invoke, but adds a very important safety net around the user's limited local storage length
                    localStorage.removeItem(key);
                    return;
                } else if (days > 4 && !json.times){
                    //This record is from prior to TVJS10, we should remove it
                    localStorage.removeItem(key);
                    return;
                } else if (days > 31){
                    //Its been too long, lets move on with our lives.
                    localStorage.removeItem(key);
                    return;
                }

                if (json['date'] !== retrievalDate) return;

                let mind;
                if (json['multi'] == true && json['times']){
                    let arr = json['times'];
                    mind = Math.floor(median(filterOutliers(arr))/1000);
                    if (!mind) mind = Math.floor(median(arr)/1000);
                } else mind = Math.floor(json['completionTime'] / 1000);

                let hourly = 3600 / mind * json['reward'];
                let disabled = json['reviewId'] != null ? 'disabled' : '';


                let status_indicator = `<i class="fa fa-clock-o text-muted" style="cursor: default;" data-toggle="tooltip" data-title="HIT Pending"></i>`;
                if (json['hit_status'] == 1) status_indicator = `<i class="fa fa-check text-success" style="cursor: default;" data-toggle="tooltip" data-title="HIT Approved"></i>`;
                else if (json['hit_status'] == -1) status_indicator = `<i class="fa fa-times text-danger" style="cursor: default;" data-toggle="tooltip" data-title="HIT Rejected"></i>`;


                if (json['display'] === false){
                    //user removed the record, don't display anymore.
                }
                else if (json['reviewId'] == null){

                    let base_hourly = (3600/(json['completionTime']/1000))*json['reward'];
                    let eligible = (base_hourly < 5 || base_hourly > 50 || settings.enable_quick_reviews != true) ? false : true;

                    let quick_html = `
<div class="btn-group dropdown show">
    <a style="${ eligible ? 'border-color: #a56914' : ''}" class="${ eligible ? 'btn btn-primary btn-quick-review' : 'btn btn-default disabled'} btn-sm" data-hitKey="${escape(key)}" data-toggle="tooltip" data-title="This will submit your review to TV with no pay sentiment rating or written text.">Quick Review</a>
    <a style="${ eligible ? 'border-color: #a56914' : ''}" class="${ eligible ? 'btn btn-primary btn-quick-review-dropdown' : 'btn btn-default disabled'} btn-sm dropdown-toggle" role="button"  data-toggle="tooltip" data-title="Quick review with pay sentiment"><i class="fa fa-thumbs-up"></i></a>
    <div class="dropdown-menu" aria-labelledby="dropdownMenuLink">
        <a class="dropdown-item ${base_hourly < 12 ? 'text-muted disabled' : ' text-success'} btn-quick-sentiment" href="#" data-hitKey="${escape(key)}" data-sentiment="5"><i class="fa fa-thumbs-up"></i> Generous</a>
        <a class="dropdown-item ${base_hourly < 10.50 ? 'text-muted disabled' : ' text-success'} btn-quick-sentiment" href="#" data-hitKey="${escape(key)}" data-sentiment="4"><i class="fa fa-thumbs-up"></i> Good</a>
        <a class="dropdown-item ${base_hourly < 7.25 ? 'text-muted disabled' : ' text-warning'} btn-quick-sentiment" href="#" data-hitKey="${escape(key)}" data-sentiment="3"><i class="fa fa-thumbs-up"></i> Fair</a>
        <a class="dropdown-item ${base_hourly > 10.50 ? 'text-muted disabled' : ' text-danger'} btn-quick-sentiment" href="#" data-hitKey="${escape(key)}" data-sentiment="2"><i class="fa fa-thumbs-up"></i> Low</a>
        <a class="dropdown-item ${base_hourly > 7.25 ? 'text-muted disabled' : ' text-danger'} btn-quick-sentiment" href="#" data-hitKey="${escape(key)}" data-sentiment="1"><i class="fa fa-thumbs-up"></i> Underpaid</a>
    </div>
</div>`;

                    $('#tv-table > tbody').append(`
<tr>
<td class="col-xs-3" style="overflow: hidden; white-space: nowrap; max-width: 140px;"><a href="https://worker.mturk.com/contact_requester/hit_type_messages/new?hit_type_message[hit_type_id]=TURKERVIEW&hit_type_message[requester_id]=${json['rid']}&hit_type_message[requester_name]=${json['requester']}" target="_blank"><i class="fa fa-fw fa-envelope-o" data-toggle="tooltip" title="Contact Requester"></i></a> ${json['requester']}</td>
<td class="col-xs-4" style="overflow: hidden; white-space: nowrap; max-width: 400px;">${json['title']}</td>
<td class="col-xs-1" style="overflow: hidden; white-space: nowrap; text-align: right;">$${hourly.toFixed(2)}</td>
<td class="col-xs-1" style="overflow: hidden; white-space: nowrap; text-align: center;">${status_indicator}</td>
<td class="col-xs-3" style="overflow-x: hidden; overflow-y: visible; overflow: visible; white-space: nowrap; max-height: 38px; text-align: center;">
    <a style="border-color: #a56914" class="btn btn-primary btn-sm btn-review ${disabled}" data-toggle="tooltip" data-title="Leave a review on TurkerView!" data-hitKey="${escape(key)}">Review</a>
    ${quick_html}
    <a class="btn btn-danger btn-sm btn-tv-remove-review" data-hitKey="${escape(key)}" style="border-color: #952d2b; margin-left: 8px;" data-toggle="tooltip" data-title="Remove Row (This will prevent you from being able to review this HIT)">X</a>
</td>
</tr>`)
                } else if (json['reviewId'] != null){
                    $('#tv-table > tbody').append(`
<tr ${hideReviewedFromTable ? 'style="display: none;"' : ''}>
<td class="col-xs-3" style="overflow: hidden; white-space: nowrap; max-width: 140px;"><a href="https://worker.mturk.com/contact_requester/hit_type_messages/new?hit_type_message[hit_type_id]=TURKERVIEW&hit_type_message[requester_id]=${json['rid']}&hit_type_message[requester_name]=${json['requester']}" target="_blank"><i class="fa fa-fw fa-envelope-o" data-toggle="tooltip" title="Contact Requester"></i></a> ${json['requester']}</td>
<td class="col-xs-4" style="overflow: hidden; white-space: nowrap; max-width: 400px;">${json['title']}</td>
<td class="col-xs-1" style="overflow: hidden; white-space: nowrap; text-align: right;">$${hourly.toFixed(2)}</td>
<td class="col-xs-1" style="overflow: hidden; white-space: nowrap; text-align: center;">${status_indicator}</td>
<td class="col-xs-3" style="overflow: hidden; white-space: nowrap; max-height: 38px; text-align: center;">
    <a href="https://turkerview.com/reviews/edit.php?id=${json['reviewId']}" target="_blank" class="btn btn-default btn-sm" data-hitKey="${escape(key)}" data-toggle="tooltip" data-title="Edit Review (Takes you to TurkerView)">Edit</a>
    <a class="btn btn-danger btn-sm btn-tv-remove-review pull-right" data-hitKey="${escape(key)}" style="border-color: #952d2b; margin-left: 8px;" data-toggle="tooltip" data-title="Remove Row (This will prevent you from being able to review this HIT)">X</a>
</td>
</tr>`)
                }
            }
        });

    location.assign("javascript:$('.btn-review').tooltip();javascript:$('.btn-tv-remove-review').tooltip();$('i').tooltip();$('.btn').tooltip();void(0)");

    $('.btn-quick-review, .btn-quick-sentiment').click(function(){
        //clear old error/success message
        //pull data, submit it immediately
        //disable other buttons while submitting
        //place error/success message directly to dash


        location.assign(`javascript:$('[data-toggle="tooltip"]').tooltip('hide');void(0);`);
        let td = $(this).closest('td');
        $('#new-zzzreview').find('.btn').addClass('disabled');


        let hitKey = unescape($(this).data('hitkey'));

        let appRange = localStorage.getItem('tv-app-range') || null;
        let appRate = localStorage.getItem('tv-app-rate') || null;
        if (appRange == null || appRate == null){
            checkQual('get');
            alert('Script was missing data, please try again!');
            return;
        }

        let hitData = JSON.parse(localStorage.getItem(hitKey));
        let requester = hitData['requester'];
        let rid = hitData['rid'];
        let title = hitData['title'];
        let hit_set_id = hitData['hit_set_id'] ? hitData['hit_set_id'] : hitData['gid'];
        let reward = hitData['reward'];
        let submit_date = hitData['date'];

        let mind;
        /* Batch results*/
        if (hitData['multi'] == true && hitData['times']){
            let arr = hitData['times'];
            mind = Math.floor(median(filterOutliers(arr))/1000);
            if (!mind) mind = Math.floor(median(arr)/1000);
        } else mind = Math.floor(hitData['completionTime'] / 1000);

        let minutes = Math.floor(mind / 60);
        let seconds = mind % 60;
        let submitTime = hitData['submitTime'];

        let now = moment.tz('America/Los_Angeles');

        t_approved = 0;
        if (hitData['approved']) t_approved = hitData['approved'];
        else if (hitData['hit_status'] == 1 && hitData['task_count'] == 1) t_approved = 1;

        t_rejected = 0;
        if (hitData['rejected'] && hitData['task_count'] > 1) t_rejected = hitData['rejected'];

        let reviewObject = {
            'hitKey': hitKey,
            'requester_name': requester,
            'requester_id': rid,
            'hit_title': title,
            'hit_set_id': hit_set_id,
            'base_pay': reward,
            'minutes': minutes,
            'seconds': seconds,
            'app_range': appRange,
            'app_rate': appRate,
            'tasks_completed': hitData['task_count'],
            'tasks_approved': t_approved,
            'tasks_rejected': t_rejected,
            'hit_status': hitData['hit_status'] ? hitData['hit_status'] : 0,
            'tracked_completion': mind,
            'submit_date': submit_date,
            'no_share': 1
        };

        if (hitData['fast']) reviewObject.approval_time = hitData['fast'];
        if (hitData['hit_status'] && hitData['hit_status'] == -1) reviewObject.requester_feedback = hitData['feedback'];
        if ($(this).hasClass('btn-quick-sentiment')) reviewObject.pay_rating = $(this).data('sentiment');

        var form_data = new FormData();
        for ( var key in reviewObject ) {
            form_data.append(key, reviewObject[key]);
        }

        fetch('https://turkerview.com/api/v2/reviews/submit/', {
            method: 'POST',
            body: form_data,
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(response => {
            //console.log(JSON.stringify(response));
            if (response.status == 'ok'){


                td.html(`<i class="fa fa-check text-success"></i>`);
                $('#new-zzzreview').find('.btn-quick-review, .btn-review, .btn-quick-review-dropdown, .btn-tv-remove-review, .btn:contains(Edit)').removeClass('disabled');

                /*
                const noticeAlert = document.getElementById('review-alert');
                noticeAlert.classList.remove('alert-success');
                noticeAlert.classList.remove('alert-warning');
                noticeAlert.classList.remove('alert-danger');
                noticeAlert.classList.add('alert-'+response.class);
                noticeAlert.style.display = 'block';
                noticeAlert.classList.remove('hide');
                noticeAlert.innerHTML = response.html;
                */


                let reviewed = JSON.parse(localStorage.getItem(hitKey));
                console.log(reviewed);
                reviewed['reviewed'] = true;
                reviewed['reviewId'] = response.new_review_id;
                localStorage.setItem(hitKey, JSON.stringify(reviewed));
            } else{
                console.log(response);
                console.log(response.postData);

                const noticeAlert = document.getElementById('review-alert');
                noticeAlert.classList.remove('alert-success');
                noticeAlert.classList.remove('alert-warning');
                noticeAlert.classList.remove('alert-danger');
                noticeAlert.classList.add('alert-'+response.class);
                noticeAlert.classList.remove('hide');
                noticeAlert.style.display = 'block';
                noticeAlert.innerHTML = response.html;


                $('#new-zzzreview').find('.btn-quick-review, .btn-review, .btn-quick-review-dropdown, .btn-tv-remove-review, .btn:contains(Edit)').removeClass('disabled');

                $(window).scrollTop(0)
            }

        }).catch(exception => {
            console.log(exception);
            const noticeAlert = document.getElementById('review-alert');
            noticeAlert.classList.remove('alert-success');
            noticeAlert.classList.remove('alert-warning');
            noticeAlert.classList.remove('alert-danger');
            noticeAlert.classList.add('alert-danger');
            noticeAlert.classList.remove('hide');
            noticeAlert.style.display = 'block';
            noticeAlert.innerHTML = `<div class="alert alert-danger"><h3>That's not good!</h3><p>We hit a major error that isn't handled by the server, please send details to CT:</p><p>${exception}</p></div>`;
            window.scrollTo(0,0);
            //$('#tvModal').scrollTop(0)
        });



    });

    $('.btn-quick-review-dropdown').click(function(){
        let dropdown = $(this).next('.dropdown-menu');
        $('.dropdown-menu').css('display', 'none');
        if (dropdown.is(':visible')) dropdown.css('display', 'none');
        else dropdown.css('display', 'block');
        //$(this).next('.dropdown-menu').css('display', 'block');
    });

    $('input[name=tvHideReviewed]').on('click', function(){
        hideReviewedFromTable = $('input[name=tvHideReviewed]').is(':checked') ? true : false;

        localStorage.setItem('tv-hide-reviewed', hideReviewedFromTable)
        if (hideReviewedFromTable){
            $('#tv-table > tbody > tr').each(function(){
                let review_box_text = $(this).children('td:eq(4)').text();
                if (review_box_text.indexOf('Edit') > -1) $(this).hide();
            });
        } else {
            $('#tv-table > tbody > tr').each(function(){
                $(this).show();
            });
        }
    });



    $('.btn-tv-remove-review').on('click', function(){
        let hitKey = unescape($(this).data('hitkey'));
        let json = JSON.parse(localStorage.getItem(hitKey));
        json.display = false;
        localStorage.setItem(hitKey, JSON.stringify(json));
        $('.tooltip').remove();
        $(this).closest('tr').remove();
    });

    $('.btn-review').on('click', function(){
        $('form#new-review').trigger('reset');
        $('input[name=pay_rating], input[name=comm_rating], input[name=hit_status], input[name=approval_time], input[name=requester_feedback]').removeAttr('value');
        $('#review-failure').hide();
        $('#hit_status_display').html(``);
        $('.btn-pay, .btn-comm, .btn-status').removeClass('active');
        $('.btn-pay, .btn-comm, .btn-status').find('i').remove();
        $('#wage_est').text('');
        $('#wage_est').hide();

        let appRange = localStorage.getItem('tv-app-range') || null;
        let appRate = localStorage.getItem('tv-app-rate') || null;
        if (appRange == null || appRate == null){
            checkQual('get');
            alert('Script was missing data, please try again!');
            return;
        }
        let hitKey = unescape($(this).data('hitkey'));



        let hitData = JSON.parse(localStorage.getItem(hitKey));

        if (hitData['contacted']){
            $('#comm-rating-row').show();
        } else{
            $('#comm-rating-row').hide();
        }

        let requester = hitData['requester'];
        let rid = hitData['rid'];
        let title = hitData['title'];
        let hit_set_id = hitData['hit_set_id'] ? hitData['hit_set_id'] : hitData['gid'];
        let reward = hitData['reward'];

        let mind;
        /* Batch results*/
        if (hitData['multi'] == true && hitData['times']){
            let arr = hitData['times'];
            mind = Math.floor(median(filterOutliers(arr))/1000);
            if (!mind) mind = Math.floor(median(arr)/1000);
        } else mind = Math.floor(hitData['completionTime'] / 1000);

        let minutes = Math.floor(mind / 60);
        let seconds = mind % 60;
        let submitTime = hitData['submitTime'];

        let now = moment.tz('America/Los_Angeles');
        let ms = moment(now).diff(moment(submitTime));

        t_approved = 0;
        if (hitData['approved']) t_approved = hitData['approved'];
        else if (hitData['hit_status'] == 1 && hitData['task_count'] == 1) t_approved = 1;

        t_rejected = 0;
        if (hitData['rejected'] && hitData['task_count'] > 1) t_rejected = hitData['rejected'];

        $('input[name=hitKey]').val(hitKey);
        $('input[name=req_name]').val(requester).attr('readonly', true);
        $('input[name=req_id]').val(rid).attr('readonly', true);
        $('input[name=hit_title]').val(title).attr('readonly', true);
        $('input[name=group_id]').val(hit_set_id).attr('readonly', true);
        $('input[name=base_pay]').val(reward).attr('readonly', true);
        $('input[name=minutes]').val(minutes);
        $('input[name=seconds]').val(seconds);
        $('input[name=app_range]').val(appRange);
        $('input[name=app_rate]').val(appRate);
        $('input[name=tasks_completed]').val(hitData['task_count']);
        $('input[name=tracked_completion]').val(mind);
        $('input[name=submit_date]').val(hitData['date']);
        $('input[name=tasks_approved]').val(t_approved);
        $('input[name=tasks_rejected]').val(t_rejected);
        $('input[name=hit_status]').val((hitData['hit_status'] ? hitData['hit_status'] : 0));
        if (hitData['fast']) $('input[name=approval_time]').val(hitData['fast']);
        if (hitData['hit_status'] && hitData['hit_status'] == -1) $('input[name=requester_feedback]').val(hitData['feedback']);

        if (hitData['hit_status'] && hitData['hit_status'] == -1) $('#hit_status_display').html(`<p><span class="text-danger"><i class="fa fa-times"></i> Rejected</span><br><strong>Reason:</strong> ${hitData['feedback']}</p>`);
        else if (hitData['hit_status'] && hitData['hit_status'] == 1 && hitData['task_count'] == 1) $('#hit_status_display').html(`<p class="text-success"><i class="fa fa-check"></i> Approved</p>`);
        else if (hitData['rejected'] && hitData['rejected'] == hitData['task_count']) $('#hit_status_display').html(`<p><span class="text-danger"><i class="fa fa-times"></i> All Rejected</span><br><strong>Reason:</strong> ${hitData['feedback']}</p>`);
        else if (hitData['rejected'] && hitData['rejected'] < hitData['task_count'] && hitData['approved']) $('#hit_status_display').html(`<p><span class="text-warning"><i class="fa fa-times"></i> Some Rejected</span><br><strong>Reason:</strong> ${hitData['feedback']}</p>`);
        else  $('#hit_status_display').html(`<p class="text-muted"><i class="fa fa-clock-o"></i> Pending</p>`);


        if (hitData['task_count'] > 2) $('#batch_alert').removeClass('hidden');
        else $('#batch_alert').addClass('hidden');

        $('#tvDashModal, #tv-dash-modal-backdrop').hide();
        $('#tvModal, #tv-modal-backdrop').show();
        $('body').addClass('global-modal-open modal-open');

        wageEst();
    })
}

function dupCheck(){
    let requester = $('#req_id').val();
    let title = $('#hit_title').val();
    let reward = $('#base_pay').val();
    $.get(`https://turkerview.com/common/dup-check.php?check_requester=${requester}&check_title=${title}&check_reward=${reward}`).done(function(response){
        if (response.indexOf('none') == -1){
            $('#duplicate-alert').children('p').html(`<form action="https://turkerview.com/reviews/edit.php" method="post" style="display: inline;"><input type="hidden" name="id" value="${response}">Does this look familiar to you? It seems you've reviewed this HIT & Requester before, you should <a id="dup-edit" href="javascript:;" onclick="parentNode.submit();">edit your previous review</a> instead!</form>`);
            $('#duplicate-alert').removeClass('hidden');
        }
    })
}

function tvApiAlert(){ return `
<div id="dash-api-change-alert" class="alert alert-success" style="${(settings.tv_api_key == null || settings.tv_api_key == '' || settings.tv_api_key.length != 40 ? '' : 'display: none;')}">
    <h3>TurkerView's API Is Changing</h3>
    <p>Sorry for the intrusion, but we're expanding our services & infrastructure and making huge improvements to the way we deliver information & data to Turkers in 2019!</p>
    <p>TVJS 10 is out! You can read change details <a href="https://forum.turkerview.com/threads/turkerviewjs-10.2010/" target="_blank">here</a> - including improvements to approval (AA) time tracking! You can find more information about the full API changes <a href="https://forum.turkerview.com/threads/view-api-details.2012/" target="_blank" style="text-decoration: underline;">on our announcement here</a>.</p>
    <p>Make sure to register & get your new access keys to our upgraded API by <a href="https://turkerview.com/account/api/" target="_blank" style="text-decoration: underline;">visiting your account dashboard</a>. We'll stop displaying this as soon as you do, but the script wont function after February 1st without an API Key.</p>
    <form action="saveApiForm" onsubmit="return false;">
        <input type="text" class="form-control" style="max-width: 50%; margin-top: 5px; margin-bottom: 5px;">
        <button type="submit" class="btn btn-primary">Save API Key</button>
    </form>
    <script>
        $('form[action*=saveApiForm]').submit(function(e){
            e.preventDefault();
            let api_key = $(this).find('input[type=text]').val().trim();
            if (api_key.length == 40){
                var store_settings = {
                    key: 'settings',
                    api_key: api_key
                }
                
                const request = indexedDB.open('turkerview', 1);
            
                request.onsuccess = function(event){
                    var transaction = event.target.result.transaction(['turkerview'], 'readwrite');
                    var objectStore = transaction.objectStore('turkerview');
                    var request2 = objectStore.put(store_settings);
            
                    request2.onsuccess = function(event){
                        let temp_settings = JSON.parse(localStorage.getItem('tv-settings'));
                        temp_settings.tv_api_key = api_key;
                        localStorage.setItem('tv-settings', JSON.stringify(temp_settings));
                        localStorage.setItem('turkerview_api_key', api_key);
                        alert('Awesome, we saved your API key for future use!');
                        window.location.reload();
                    }
                };
                
            } else {
                alert("We cannot save the provided key as it isn't valid.");
            }
        });
    </script>
</div>
`;
}

function tvDashModal(){ return `
<div class="modal fade in" id="tvDashModal" style="display: block;">
    <div id="tv-dash-dialog" class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button id="tv-dash-modal-close" type="button" class="close" data-dismiss="modal"><svg class="close-icon" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                <h2 class="modal-title">TurkerView Dashboard<span class="pull-right"><a id="tv-dashboard-link" class="hover tv-links" style="padding-right: 5px;" href="#"><i class="fa fa-home"></i></a><a id="tv-settings-link" class="text-muted tv-links" href="#"><i class="fa fa-gear"></i></a></span></h2>
            </div>
            <div class="modal-body">
                <div id="review-alert" class="alert alert-dismissable alert-success hide">
                </div>
                ${tvApiAlert()}
                <div id="tv-dashboard">
                    <div class="row">
                        <div class="col-xs-12">
                            <select class="form-control pull-left" style="width: 25%;" name="tvDateSelection" id="tvDateSelection" >
                                <option selected value="${today}">Today</option>
                                <option value="${moment.tz('America/Los_Angeles').subtract(1, "days").format("YYYY-MM-DD")}">Yesterday</option>
                                <option value="${moment.tz('America/Los_Angeles').subtract(2, "days").format("YYYY-MM-DD")}">${moment().tz('America/Los_Angeles').subtract(2, "days").format("YYYY-MM-DD")}</option>
                                <option value="${moment.tz('America/Los_Angeles').subtract(3, "days").format("YYYY-MM-DD")}">${moment().tz('America/Los_Angeles').subtract(3, "days").format("YYYY-MM-DD")}</option>
                                <option value="${moment.tz('America/Los_Angeles').subtract(4, "days").format("YYYY-MM-DD")}">${moment().tz('America/Los_Angeles').subtract(4, "days").format("YYYY-MM-DD")}</option>
                            </select>
                            <label class="pull-right text-muted" for="HideReviewed" id="HideReviewedLabel"><input type="checkbox" name="tvHideReviewed" id="HideReviewed" ${hideReviewedFromTable ? 'checked' : ''}> Hide Reviewed</label>
                        </div>
                    </div>
                    
                    <form id="new-zzzreview">
                        <div class="row">
                            <div class="col-xs-12 text-muted">
                            <table id="tv-table" class="mturk-table hits-statuses text-muted">
                                <thead>
                                    <tr>
                                        <th class="tv-th text-xs-left col-xs-3" style="max-width: 140px;">Requester</th>
                                        <th class="tv-th text-xs-left col-xs-4" style="max-width: 400px;">Title</th>
                                        <th class="tv-th text-xs-right col-xs-1">Hourly</th>
                                        <th class="tv-th text-xs-center col-xs-1"><i class="fa fa-clock-o"></i></th>
                                        <th class="tv-th text-xs-center col-xs-3">Review</th>
                                    </tr>
                                </thead>
                                <tbody>
                                
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </form>
                    <p class="text-muted" style="text-align: right"><small>Quick reviews can be enabled in settings (top right)</small></p>
                </div>
                
                <div id="tv-settings" style="display: none;">
                    <div class="row">
                        <div class="col-xs-12">
                            <h2 class="primary-color">Main Settings</h2>
                            <div class="input-group text-muted"><label><input type="checkbox" name="display_titlebar_wage" ${settings.titlebar_wage_display ? `checked` : ``}> Display Hourly Wage in Titlebar</label></div>
                            <div class="input-group text-muted"><label><input type="checkbox" name="display_mturk_ratings" ${settings.display_mturk_ratings == false ? `` : `checked`}> Display MTurk's System Requester Data</label></div>
                            <div class="input-group text-muted"><label><input type="checkbox" name="display_requester_ratings" ${settings.display_requester_ratings == false ? `` : `checked`}> Display Requester Ratings</label></div>
                            <div class="input-group text-muted"><label><input type="checkbox" name="display_hit_ratings" ${settings.display_hit_ratings == false ? `` : `checked`}> Display HIT Ratings</label></div>
                            <div class="input-group text-muted">
                                <label><input type="checkbox" name="enable_quick_reviews" ${settings.enable_quick_reviews == true ? `checked` : ``}> Enable Quick Reviews</label>
                                <small>
                                <p class="text-warning">Clicking the "Quick Review" button will <strong><u>instantly</u></strong> submit the review!</p>
                                <p class="text-warning">Quick reviews allows users to one-click submit a time only review (no ratings/writing). If enabled please be careful not to accidentally submit inaccurate data as it can lead to your reviews no longer being accepted.
                                Some HITs wont be eligible for quick review, but you can always submit a full form review in those cases.</p>
                                </small>
                            </div>
                            <h2>TurkerView API Key:</h2>
                            <div class="input-group" style="min-width: 65%;"><input type="text" name="tv_api_key" class="form-control search-input" placeholder="API Key" value="${settings.tv_api_key ? settings.tv_api_key : ``}"></div>
                            <div id="api_connect" style="${(settings.tv_api_key != null && settings.tv_api_key.length == 40 ? `` : `display: none;`)} width: 65%; margin-top: 5px;" class="alert alert-success"><p>Connected!</p></div>
                            <p class="text-muted"><small>Don't have one? Get your API access key <a href="https://turkerview.com/account/api/" target="_blank" style="text-decoration: underline;">here</a>.</small></p>
                        </div>  
                    </div>
                    <div class="row">
                        <div class="col-xs-12">
                            <h2 class="primary-color">Return Review Settings</h2>
                            <div class="input-group text-muted"><label><input type="checkbox" name="exp_returners" ${settings.exp_returners == true ? `checked` : ``}> Experienced Reviewers Only</label> <span class="text-warning"> This will remove a substantial amount of return reviews, usually more helpful to those who have passed the 10,000+ HIT mark</span></div>
                            
                            <p class="text-muted">
                                <select name="rr_screener_min" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="0" ${settings.rr_screener_min <= 0 ? `selected` : ``}>No Filter</option>
                                    <option value="10" ${settings.rr_screener_min == 10 ? `selected` : ``}>10+ seconds</option>
                                    <option value="15" ${settings.rr_screener_min == 15 ? `selected` : ``}>15+ seconds</option>
                                    <option value="30" ${settings.rr_screener_min == 30 ? `selected` : ``}>30+ seconds</option>
                                    <option value="60" ${settings.rr_screener_min == 60 ? `selected` : ``}>1+ minute</option>
                                    <option value="90" ${settings.rr_screener_minunderpaid == 90 ? `selected` : ``}>1Â½+ minutes</option>
                                    <option value="120" ${settings.rr_screener_min == 120 ? `selected` : ``}>2+ minutes</option>
                                </select>
                                <strong>Minimum Unpaid Screener Time</strong> Use this to filter out return reviews for screener levels you don't mind attempting without being paid. 
                            </p>
                            
                            <!--<label><input type="checkbox" name="show_return_favicon" ${settings.show_return_favicon ? `checked` : ``}> Change Tab Favicon</label>-->
                            <p style="text-align: center;" class="text-muted"><i class="fa fa-warning text-danger"></i> High | <i class="fa fa-warning text-warning"></i> Medium | <i class="fa fa-warning text-muted"></i> Low</p>
                            <p class="text-muted">
                                <select name="return_underpaid_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.underpaid == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.underpaid == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.underpaid == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.underpaid == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Underpaid</strong> Warning Level 
                            </p>
                            <p class="text-muted">
                                <select name="return_broken_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.broken == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.broken == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.broken == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.broken == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Broken</strong> Warning Level
                            </p>
                            <p class="text-muted">
                                <select name="return_screener_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.screener == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.screener == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.screener == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.screener == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Unpaid Screener</strong> Warning Level
                            </p>
                            <p class="text-muted">
                                <select name="return_tos_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.tos == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.tos == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.tos == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.tos == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>ToS Violation</strong> Warning Level
                            </p>
                            <p class="text-muted">
                                <select name="return_writing_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.writing == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.writing == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.writing == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.writing == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Writing</strong> Warning Level
                            </p>
                            <p class="text-muted">
                                <select name="return_downloads_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.downloads == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.downloads == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.downloads == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.downloads == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Downloads</strong> Warning Level
                            </p>
                            <p class="text-muted">
                                <select name="return_extraordinary_warn_lvl" class="form-control" style="width: 15%; display: inline-block;">
                                    <option value="high" ${settings.return_warning_levels.extraordinary_measures == `high` ? `selected` : ``}>High</option>
                                    <option value="medium" ${settings.return_warning_levels.extraordinary_measures == `medium` ? `selected` : ``}>Medium</option>
                                    <option value="low" ${settings.return_warning_levels.extraordinary_measures == `low` ? `selected` : ``}>Low</option>
                                    <option value="none" ${settings.return_warning_levels.extraordinary_measures == `none` ? `selected` : ``}>None</option>
                                </select>
                                <strong>Extraordinary Measures</strong> Warning Level
                            </p>
                           
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    </div>
</div>
<div id="tv-dash-modal-backdrop" class="modal-backdrop fade in"></div>`;
}

function initTurkerView(){
    $('footer').after(tvDashModal());

    const getCellValue = (tr, idx) => tr.children[idx].innerText.replace('$', '') || tr.children[idx].textContent.replace('$', '');

    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
            v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

    document.querySelectorAll('th.tv-th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        Array.from(tbody.querySelectorAll('tr'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
            .forEach(tr => tbody.appendChild(tr) );
    })));

    $('#tv-dash-modal-backdrop, #tv-dash-modal-close, #tvDashModal').on('click', function(){
        const noticeAlert = document.getElementById('review-alert');
        noticeAlert.classList.remove('alert-success');
        noticeAlert.classList.remove('alert-warning');
        noticeAlert.classList.remove('alert-danger');
        noticeAlert.classList.add('hide');
        noticeAlert.style.display = 'none';
        noticeAlert.innerHTML = '';
        $('.dropdown-menu').css('display', 'none');
        $('#tv-dash-modal-backdrop, #tvDashModal').hide();
        $('body').removeClass('global-modal-open modal-open');
    });

    $('#tv-dash-dialog').click(function(e){
        if (!e.target.classList.contains('btn-quick-review-dropdown') && !e.target.classList.contains('fa-thumbs-up')) $('.dropdown-menu').css('display', 'none');
        e.stopPropagation();
    });

    $('.tv-links').click(function(){
        $('.tv-links').removeClass('hover').addClass('text-muted');
        $(this).removeClass('text-muted').addClass('hover');
        if ($(this).attr('id') == 'tv-dashboard-link' && !$('#tv-dashboard').is(':visible')) $('#tv-dashboard, #tv-settings').toggle();
        else if ($(this).attr('id') == 'tv-settings-link' && !$('#tv-settings').is(':visible')) $('#tv-dashboard, #tv-settings').toggle();
    });

    $(document).on('change', '#tvDateSelection', function(){
        fillTable();
    });
}

function tvModal() {
    return `
<div class="modal fade in" id="tvModal" style="display: none;">
    <div id="tv-dialog" class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button id="tv-modal-close" type="button" class="close" data-dismiss="modal"><svg class="close-icon" viewBox="0 0 9.9 10.1" data-reactid=".8.0.0.0.0.0"><g fill="none" stroke="#555" class="close-icon-graphic" stroke-width="2.117" stroke-linecap="round" data-reactid=".8.0.0.0.0.0.0"><path d="M1.2 1.3l7.4 7.5M1.2 8.8l7.4-7.5" data-reactid=".8.0.0.0.0.0.0.0"></path></g></svg></button>
                <h2 class="modal-title">TurkerView Review</h2>
            </div>
            <div class="modal-body">
            <input type="hidden" name="hitKey" id="hitKey">
            <form id="new-review" action="" method="POST">
                <div id="review-failure" class="alert alert-dismissable alert-danger hide">
                    <button type="button" class="close" data-dismiss="alert">Ã—</button>
                    <h4>Red Alert!</h4>
                    <p>Why are you looking at this? Curiousity killed the cat batch. We'll add something here if there's a problem! :)</p>
                </div>
                <div class="row">
                    <div class="col-xs-7">
                        <h3>Requester Name</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="req_name" id="req_name" required placeholder="Requester Name">
                    </div>
                    <div class="col-xs-5">
                        <h3>Requester ID</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="req_id" id="req_id" required placeholder="Requester ID">
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3>HIT Title</h3>
                        <input type="text" class="form-control input-group input-group-sm" name="hit_title" id="hit_title" required placeholder="HIT Title">
                        <input type="hidden" name="group_id" id="group_id">
                    </div>
                </div>
                <div class="row">
                <div class="alert alert-dismissable alert-success">
                    <button type="button" class="close" data-dismiss="alert">Ã—</button>
                    <h4>Oh would you look at the time!?</h4>
                    <p>We've pre-filled your completion time for you, but please take a moment to double check that:
                    <ul class="fa-ul">
                        <li><i class="fa-li fa fa-check-square-o"></i> The time looks accurate (opening/closing tabs can make it wonky)
                        <li><i class="fa-li fa fa-check-square-o"></i> The estimated hourly makes sense
                        <li><i class="fa-li fa fa-check-square-o"></i> You've adjusted for breaks & other factors that would make it unhelpful/inaccurate for most workers (try to help others!)
                    </ul>
                    </p>
                </div>
                    <div class="col-xs-6">
                        <h3>Wage Data</h3>
                        <div class="form-group">
                            <div class="col-xs-6">
                                <input type="number" step="0.01" min="0" class="form-control input-sm hourly_field" name="base_pay" id="base_pay" required placeholder="Reward">
                            </div>
                            <div class="col-xs-6">
                                <input type="number" step="0.01" min="0" class="form-control input-sm hourly_field" name="bonus" id="bonus" placeholder="Bonus">
                            </div>
                        </div>
                    </div>
                    <div class="col-xs-6">
                        <h3>Completion Time</h3>
                        <div class="form-group">
                            <div class="col-xs-6">
                                <input type="number" step="1" min="0" class="form-control input-sm hourly_field" name="minutes" id="minutes" placeholder="Minutes">
                            </div>
                            <div class="col-xs-6">
                                <input type="number" step="1" min="0" class="form-control input-sm hourly_field" name="seconds" id="seconds" placeholder="Seconds">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3>Pay Rating<span class="text-primary pull-right" id="resetPay" style="cursor: pointer;"><i class="fa fa-undo"></i> Reset Rating</span></h3>
                        <input type="hidden" name="pay_rating" id="pay_rating" value="">
                        <div class="btn-group btn-group-justified" style="display: table; width: 100%; table-layout: fixed;">
                        <span style="font-weight: bold; font-size: 15px; display: none; position: absolute; top: -24px; right: 0; width: 100%;" class="text-muted" id="wage_est"></span>
                           <a role="button" id="underpaid" class="btn btn-danger btn-xs btn-pay" style="font-size: 16px; display: table-cell; float: none;" data-rating="1" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-times text-danger'></i>Very low or no pay</li>
                                <li><i class='fa-li fa fa-times text-danger'></i>Frustrating work experience</li>
                                <li><i class='fa-li fa fa-times text-danger'></i>Inadequate instructions</li>
                                </ul>" data-original-title="" title=""><small>Underpaid</small></a>
                           <a role="button" id="low" class="btn btn-danger btn-xs btn-pay" style="font-size: 16px; display: table-cell; float: none;" data-rating="2" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-times text-danger'></i>Below US min-wage ($7.25/hr)</li>
                                <li><i class='fa-li fa fa-exclamation-triangle text-warning'></i>No redeeming qualities to make up for pay</li>
                                </ul>" data-original-title="" title=""><small>Low</small></a>
                           <a role="button" id="fair" class="btn btn-warning btn-xs btn-pay" style="font-size: 16px; display: table-cell; float: none;" data-rating="3" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-exclamation-triangle text-warning'></i>Minimum wages for task (consider SE taxes!)</li>
                                <li><i class='fa-li fa fa-exclamation-triangle text-warning'></i>Work experience offers nothing to tip the scales in a positive or negative direction</li>
                                </ul>" data-original-title="" title=""><small>Fair</small></a>
                           <a role="button" id="good" class="btn btn-success btn-xs btn-pay" style="font-size: 16px; display: table-cell; float: none;" data-rating="4" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-check text-success'></i>Pay is above minimum wage, or compensates better than average for the level of effort required.</li>
                                <li><i class='fa-li fa fa-check text-success'></i>The overall work experience makes up for borderline wages</li>
                                </ul>" data-original-title="" title=""><small>Good</small></a>
                           <a role="button" id="generous" class="btn btn-success btn-xs btn-pay" style="font-size: 16px; display: table-cell; float: none;" data-rating="5" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-check text-success'></i>Pay is exceptional.</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Interesting, engaging work or work environment</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Concise instructions, well designed HIT.</li>
                                </ul>" data-original-title="" title=""><small>Generous</small></a>
                        </div>
                    </div>
                </div>
                <div class="row" id="comm-rating-row">
                    <div class="col-xs-12">
                        <h3>Comm Rating<span class="text-primary pull-right" id="resetComm" style="cursor: pointer;"><i class="fa fa-undo"></i> Reset Rating</span></h3>
                        <input type="hidden" name="comm_rating" id="comm_rating" value="">
                        <div class="btn-group btn-group-justified" style="display: table; width: 100%; table-layout: fixed;">
                                <a class="btn btn-danger btn-xs btn-comm" style="font-size: 16px; display: table-cell; float: none;" data-rating="1" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-times text-danger'></i>No response at all</li>
                                <li><i class='fa-li fa fa-times text-danger'></i>Rude response without a resolution</li>
                                </ul>" data-original-title="" title=""><small>Unacceptable</small></a>
                                <a class="btn btn-danger btn-xs btn-comm" style="font-size: 16px; display: table-cell; float: none;" data-rating="2" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-times text-danger'></i>Responsive, but unhelpful</li>
                                <li><i class='fa-li fa fa-exclamation-triangle text-warning'></i>Required IRB or extra intervention</li>
                                </ul>" data-original-title="" title=""><small>Poor</small></a>
                                <a class="btn btn-warning btn-xs btn-comm" style="font-size: 16px; display: table-cell; float: none;" data-rating="3" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-minus text-muted'></i>Responded in a reasonable timeframe</li>
                                <li><i class='fa-li fa fa-minus text-muted'></i>Resolves issues to a minimum level of satisfaction.</li>
                                </ul>" data-original-title="" title=""><small>Acceptable</small></a>
                                <a class="btn btn-success btn-xs btn-comm" style="font-size: 16px; display: table-cell; float: none;" data-rating="4" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-check text-success'></i>Prompt Response</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Positive resolution</li>
                                </ul>" data-original-title="" title=""><small>Good</small></a>
                                <a class="btn btn-success btn-xs btn-comm" style="font-size: 16px; display: table-cell; float: none;" data-rating="5" data-toggle="popover" data-title="Suggested Guidelines" data-content="<ul class='fa-ul'>
                                <li><i class='fa-li fa fa-check text-success'></i>Prompt response time</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Friendly &amp; Professional</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Helpful / Solved Issues</li>
                                <li><i class='fa-li fa fa-check text-success'></i>Interacts within the community</li>
                                </ul>" data-original-title="" title=""><small>Excellent</small></a>
                            </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3>HIT Status</h3>
                        <div id="batch_alert" class="alert alert-warning hide">
               <h3>Head's Up</h3>
               <p>Because of the increased importance of rejection information for this HIT we'll update the approval <strong>and rejection</strong> information automatically as it comes in (for this review only). You can also wait until all tasks have approved/rejected to review this HIT.</p>
               </div>
                        <input type="hidden" name="hit_status" id="hit_status" value="0">
                        <input type="hidden" name="requester_feedback" id="requester_feedback">
                        <input type="hidden" name="approval_time" id="approval_time">
                        <div id="hit_status_display">
                            
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3 class="text-success">Pros</h3>
                        <textarea class="form-control input-sm" rows="3" name="review_pros" id="review_pros"></textarea>
                        <small id="pro-footnote" class="text-muted">What did you like about the HIT or working for this Requester?</small>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3 class="text-danger">Cons</h3>
                        <textarea class="form-control input-sm" rows="3" name="review_cons" id="review_cons"></textarea>
                        <small id="con-footnote" class="text-muted">What did you dislike about the HIT or working for this Requester?</small>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                        <h3>Advice to Requester</h3>
                        <textarea class="form-control input-sm" rows="2" name="review_advice" id="review_advice"></textarea>
                  <small class="form-text text-muted">Feel free to leave advice/feedback directly for the Requester - but please keep it professional.</small>
                    </div>
                </div>
                <div class="row">
                    <div class="col-xs-12">
                    <input type="hidden" name="version" value="${ver}">
                    <input type="hidden" name="app_range">
                    <input type="hidden" name="app_rate">
                    <input type="hidden" name="tasks_completed">
                    <input type="hidden" name="tasks_approved">
                    <input type="hidden" name="tasks_rejected">
                    <input type="hidden" name="tracked_completion">
                    <input type="hidden" name="submit_date">
                    <label class="text-muted pull-right" >
                    <button type="button" class="btn btn-success" id="no_share_button" style="padding-right: 15px;" data-toggle="popover" data-content="<p>Checking this will stop your review from being posted to the current Daily Thread on TurkerHub. Please consider leaving this unchecked as cross-posting helps people see your review &amp; vote it as helpful.</p>
               Reviews don't need to be shared if:
               <ul class='fa-ul'>
                    <li><i class='fa-li fa fa-check-circle-o'></i>You're leaving many reviews in a row (avoid SPAM)</li>
                    <li><i class='fa-li fa fa-check-circle-o'></i>Reviewing old HITs/Requesters that may not be relevant to today's posted HITs</li>
                    <li><i class='fa-li fa fa-check-circle-o'></i>Quick time reports on well established HITs (C-SATs, etc)</li>
               </ul>
                Reviews should be shared if:
                <ul class='fa-ul'>
                    <li><i class='fa-li fa fa-check-circle-o'></i>They contain high quality written information about a HIT/Requester</li>
                    <li><i class='fa-li fa fa-check-circle-o'></i>They report a survey time from a recently posted HIT</li>
                    <li><i class='fa-li fa fa-check-circle-o'></i>They report rejections, blocks, or other high priority information</li>
               </ul>">Submit Only</button>
                <button type="submit" id="btn-review-submit" class="btn btn-primary">Submit & Export</button>
                   <div style="display: none;"><input type="checkbox" name="no_share" id="no_share"><small> Don't Share</small></div>
                   <script>
                   $('#no_share_button').click(function(){
                       $('#no_share_button').popover('hide');
                        document.getElementById("no_share").checked = true;
                        $('#btn-review-submit').click();
                   });
                    </script>
               </label>
               
                        
                    </div>
                </div>
            </form>
            </div>
        </div>
    </div>
</div>
<div id="tv-modal-backdrop" class="modal-backdrop fade in" style="display: none;"></div>
`;
}

function initReviews(){
    $('footer').after(tvModal());
    $('body').addClass('global-modal-open modal-open'); //we do this b/c we only add the modal once its called by the user, so need to trigger it as if modal loads on pageload

    $('#tv-modal-backdrop, #tv-modal-close, #tvModal').on('click', function(){
        //$('#tv-modal-backdrop, #tvModal, #review-failure').hide();
        $('#tvDashModal, #tv-dash-modal-backdrop, #tvModal, #tv-modal-backdrop').toggle();
        //$('body').removeClass('global-modal-open modal-open');
    });

    $('#tv-dialog').click(function(e){
        e.stopPropagation();
    });

    let payProOverride = false;
    let payConOverride = false;
    let commProOverride = false;
    let commConOverride = false;

    $('#resetPay').on('click', function(){
        $('#pay_rating').removeAttr('value');
        $('.btn-pay').removeClass('active').children('i').remove();
        requireWriting();
    });

    $('#resetComm').on('click', function(){
        $('#comm_rating').removeAttr('value');
        $('.btn-comm').removeClass('active').children('i').remove();
        requireWriting();
    });

    function requireWriting(){
        let payRating = $('#pay_rating').val();
        let commRating = $('#comm_rating').val();
        let hourly = $('#wage_est').text().replace(/\/hr/, '').replace(/\$/, '');

        //pay stuff
        if (parseFloat(hourly) > 10.50 && payRating < 3 && payRating) {
            //we're making over $10/hr, why is this low? we need to know the negative experience that warrants the sentiment
            payProOverride = false;
            payConOverride = true;
            $('textarea#review_cons').attr('required', true).attr('minlength', '80');
            if ($('#pay_con_req').length == 0) $('#review_cons').before(`
<div id="pay_con_req" class="alert alert-danger">
    <h3>We Need More Information!</h3>
    <p>This field is required when reviewing Pay & Hourly too far apart, please give others details about your experience! Why did you feel the good hourly wages weren\'t worth it?</p>
</div>`);
            if (commProOverride == false) $('textarea#review_pros').attr('required', false).removeAttr('minlength');
            $('#pay_pro_req').remove();
        }
        else if (parseFloat(hourly) < 7.25 && payRating > 2 && payRating) {
            //we're not even making minimum wage on this, why is it fair/good pay? passive work? whats up folks?
            payProOverride = true;
            payConOverride = false;
            $('textarea#review_pros').attr('required', true).attr('minlength', '80');
            if ($('#pay_con_req').length == 0) $('#review_pros').before(`
<div id="pay_pro_req" class="alert alert-danger">
    <h3>We Need More Information!</h3>
    <p>This field is required when reviewing Pay & Hourly too far apart, we try to promote fair wages on MTurk so please give others details about your experience! Why did you feel the poor hourly wages were fair for the task?</p>
</div>`);
            if (commConOverride == false) $('textarea#review_cons').attr('required', false).removeAttr('minlength');
            $('#pay_con_req').remove();
        } else {
            if (commProOverride == false) $('textarea#review_pros').attr('required', false).removeAttr('minlength');
            if (commConOverride == false) $('textarea#review_cons').attr('required', false).removeAttr('minlength');
            $('#pay_pro_req').remove();
            $('#pay_con_req').remove();
        }

        //comm stuff
        if (commRating < 3 && commRating) {
            commProOverride = false;
            commConOverride = true;
            $('textarea#review_cons').attr('required', true).attr('minlength', '80');
            if ($('#comm_con_req').length == 0) $('#review_cons').before(`
<div id="comm_con_req" class="alert alert-danger">
    <h3>We Need More Information!</h3>
    <p>This field is required when reviewing Communication, please give others details about your experience! If you did not communicate with the requester please do not rate communication. Its best to give Requesters 2-3 business days before reviewing communication.</p>
</div>`);

            if (payProOverride == false) $('textarea#review_pros').attr('required', false).removeAttr('minlength');
            $('#comm_pro_req').remove();
        } else if (commRating >= 3) {
            commProOverride = true;
            commConOverride = false;
            $('textarea#review_pros').attr('required', true).attr('minlength', '80');
            if ($('#comm_pro_req').length == 0) $('#review_pros').before(`
<div id="comm_pro_req" class="alert alert-danger">
    <h3>We Need More Information!</h3>
    <p>This field is required when reviewing Communication, please give others details about your experience! If you did not communicate with the requester please do not rate communication.</p>
</div>`);
            if (payConOverride == false) $('textarea#review_cons').attr('required', false).removeAttr('minlength');
            $('#comm_con_req').remove();
        } else if (!commRating) {
            if (payProOverride == false) $('textarea#review_pros').attr('required', false).removeAttr('minlength');
            if (payConOverride == false) $('textarea#review_cons').attr('required', false).removeAttr('minlength');
            $('#comm_pro_req').remove();
            $('#comm_con_req').remove();
        }
    }


    $('.btn-pay').on('click', function(){
        $('.btn-pay').removeClass('active');
        $(this).addClass('active');
        $('.btn-pay').children('i').remove();
        $(this).prepend('<i class="fa fa-check-square-o" style="font-size: .8em;">');
        var payRating = $(this).data('rating');
        $('input[name=pay_rating]').val(payRating);
        requireWriting();
    })

    location.assign(`javascript:$('.btn-pay, .btn-comm').popover({
    html: true,
        container: 'body',
        trigger: 'hover',
        placement: 'top'
});
$('label, button').popover({
        html: true,
        container: 'body',
        trigger: 'hover',
        placement: 'top'
    });
void(0)`);


    $('.btn-comm').on('click', function(){
        $('.btn-comm').removeClass('active');
        $(this).addClass('active');
        $('.btn-comm').children('i').remove();
        $(this).prepend('<i class="fa fa-check-square-o" style="font-size: .8em;">');
        var commRating = $(this).data('rating');
        $('input[name=comm_rating]').val(commRating);
        requireWriting();
    })

    $('.btn-status').on('click', function(){
        $('.btn-status').removeClass('active');
        $(this).addClass('active');
        $('.btn-status').children('i').remove();
        $(this).prepend('<i class="fa fa-check-square-o" style="font-size: .8em;">');
    })

    $('.hourly_field').on('keyup keydown change oninput input', function(){
        wageEst();
    });

    $('#new-review').submit(function(e){
        e.preventDefault();

        location.assign(`javascript:$('[data-toggle="tooltip"]').tooltip('hide');void(0);`);
        $('#btn-review-submit, #no_share_button').attr('disabled', true).prepend('<i class="fa fa-spinner fa-pulse"></i> ');
        var url = $(this).attr('action');
        var reviewForm = document.getElementById('new-review');
        var formData = new FormData(reviewForm);

        fetch('https://turkerview.com/api/v2/reviews/submit/', {
            method: 'POST',
            body: formData,
            headers: ViewHeaders
        }).then(response => {
            if (!response.ok) throw response;

            return response.json();
        }).then(response => {
            //console.log(JSON.stringify(response));
            if (response.status == 'ok'){
                const noticeAlert = document.getElementById('review-alert');
                noticeAlert.classList.remove('alert-success');
                noticeAlert.classList.remove('alert-warning');
                noticeAlert.classList.remove('alert-danger');
                noticeAlert.classList.add('alert-'+response.class);
                noticeAlert.classList.remove('hide');
                noticeAlert.innerHTML = response.html;

                $('form#new-review').trigger('reset');
                //$('#req_name, #req_id, #hit_title, #base_pay').attr('readonly', false);
                $('.btn-pay, .btn-comm, .btn-status').removeClass('active');
                $('.btn-pay, .btn-comm, .btn-status').find('i').remove();
                $('#wage_est').text('');
                $('#wage_est').hide();
                let tempKey = $('input[name=hitKey]').val();
                let reviewed = JSON.parse(localStorage.getItem(tempKey));
                reviewed['reviewed'] = true;
                reviewed['reviewId'] = response.new_review_id;
                localStorage.setItem(tempKey, JSON.stringify(reviewed));
                $('.btn-review').each(function(){
                    if (unescape($(this).data('hitkey')) == tempKey) {
                        $(this).text('Edit').removeClass('btn-primary btn-review').addClass('btn-default');
                        $(this).attr('href', `https://turkerview.com/reviews/edit.php?id=${response.new_review_id}`).attr('target', '_blank');
                    }
                });
                $('input[name=hitKey]').val('');
                $('#btn-review-submit, #no_share_button').attr('disabled', false).children('i').remove();
                fillTable();
                $('#tvDashModal, #tv-dash-modal-backdrop, #tvModal, #tv-modal-backdrop').toggle();
            } else{
                //console.log(response.postData);
                const noticeAlert = document.getElementById('review-failure');
                noticeAlert.classList.remove('alert-success');
                noticeAlert.classList.remove('alert-warning');
                noticeAlert.classList.remove('alert-danger');
                noticeAlert.classList.add('alert-'+response.class);
                noticeAlert.classList.remove('hide');
                noticeAlert.style.display = 'block';
                noticeAlert.innerHTML = response.html;

                $('#btn-review-submit, #no_share_button').attr('disabled', false).children('i').remove();

                $('#tvModal').scrollTop(0)

            }

        }).catch(exception => {
            console.log(exception);
            const noticeAlert = document.getElementById('new-review');
            noticeAlert.insertAdjacentHTML('beforebegin', `<div class="alert alert-danger"><h3>That's not good!</h3><p>We hit a major error that isn't handled by the server, please send details to CT:</p><p>${exception}</p></div>`);
            window.scrollTo(0,0);
            $('#tvModal').scrollTop(0)
        });

    });

    fillTable();

}

function wageEst(){
    var basePay = parseFloat($('input[name=base_pay]').val()) || 0;
    var bonus = parseFloat($('input[name=bonus]').val()) || 0;

    var min = parseFloat($('input[name=minutes]').val()) || 0;
    var sec = parseFloat($('input[name=seconds]').val()) || 0;

    var totalPay = basePay+bonus;
    var totalTime = (min*60)+sec;

    var hourly = ( totalPay*(3600/totalTime) ).toFixed(2);

    if (hourly !== 'Infinity' && hourly !== 'NaN') {
        $('.btn-group.btn-group-justified:contains(Underpaid)').css('padding-top', '16px')
        if (hourly < 4.49) { $('#wage_est').removeClass().addClass('text-danger'); var x = $('#wage_est').detach(); $('#underpaid').prepend(x); $('#wage_est').show(); }
        else if (hourly > 4.5 && hourly < 7.25) { $('#wage_est').removeClass().addClass('text-danger'); var x = $('#wage_est').detach(); $('#low').prepend(x); $('#wage_est').show(); }
        else if (hourly >= 7.25 && hourly < 10.50) { $('#wage_est').removeClass().addClass('text-warning'); var x = $('#wage_est').detach(); $('#fair').prepend(x); $('#wage_est').show(); }
        else if (hourly >= 10.50 && hourly < 12.75) { $('#wage_est').removeClass().addClass('text-success'); var x = $('#wage_est').detach(); $('#good').prepend(x); $('#wage_est').show(); }
        else if (hourly >= 12.75) { $('#wage_est').removeClass().addClass('text-success'); var x = $('#wage_est').detach(); $('#generous').prepend(x); $('#wage_est').show(); }

        $('#wage_est').text('$' + hourly + '/hr');
    }
}

function filterOutliers(someArray) {

    if(someArray.length < 4)
        return someArray;

    let values, q1, q3, iqr, maxValue, minValue;

    values = someArray.slice().sort( (a, b) => a - b);//copy array fast and sort

    if((values.length / 4) % 1 === 0){//find quartiles
        q1 = 1/2 * (values[(values.length / 4)] + values[(values.length / 4) + 1]);
        q3 = 1/2 * (values[(values.length * (3 / 4))] + values[(values.length * (3 / 4)) + 1]);
    } else {
        q1 = values[Math.floor(values.length / 4 + 1)];
        q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
    }

    iqr = q3 - q1;
    maxValue = q3 + iqr * 1.5;
    minValue = q1 - iqr * 1.5;

    return values.filter((x) => (x >= minValue) && (x <= maxValue));
}

function median(values){
    values.sort(function(a,b){
        return a-b;
    });

    if(values.length ===0) return 0

    var half = Math.floor(values.length / 2);

    if (values.length % 2)
        return values[half];
    else
        return (values[half - 1] + values[half]) / 2.0;
}

/* CSS */
$('head').append(`<style type="text/css">

@media (min-width: 768px) {
    #tv-dash-dialog {
        width: 54rem;
    }
}

@media (min-width: 1224px){
    #tv-dash-dialog {
        width: 62rem;
    }
}

.turkerview, .turkerviewHIT, .tv-popover {
	cursor: default;
	display: inline-block;
	padding: .25em .4em;
	font-size: 85%;
	line-height: 1;
	text-align: center;
	white-space: nowrap;
	vertical-align: baseline;
	border-radius: 2px;
	margin-left: 5px;
	margin-right: 5px;
	font-weight: 900;
}

.tv-hide {
	display: none;
}

#hourlyContainer:hover {
    opacity: 1 !important;
}

.tv-popover {
color: #555555;
font-weight: normal;
min-width: 250px;
margin-left: 0;
margin-top: 22px;
position: absolute;
z-index: 2000;
max-width: 300px;
padding: 1px;
text-align: left;
background-color: #fff;
background-clip: padding-box;
border: 1px solid rgba(0, 0, 0, 0.2);
border-radius: 6px; box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
white-space: normal;
}

.tv-popover h3 {
margin: 0; padding: 8px 14px; font-size: 15px; font-weight: normal; line-height: 18px; background-color: #f7f7f7; border-bottom: 1px solid #ebebeb; border-radius: 5px 5px 0 0;
}

.tv-td {
	display: block;
	padding: 3px 0;
}

.loading,
.loading::before,
.loading::after {
	position: absolute;
	top: 50%;
	left: 50%;
	border: 1px solid rgba(24,188,156, 0.2);
	border-left-color: rgba(24,188,156, 0.7);
	-webkit-border-radius: 999px;
	-moz-border-radius: 999px;
	border-radius: 999px;
}

.loading {
	margin: -25px 0 0 -25px;
	height: 50px;
	width: 50px;
	-webkit-animation: animation-rotate 2000ms linear infinite;
	-moz-animation: animation-rotate 2000ms linear infinite;
	-o-animation: animation-rotate 2000ms linear infinite;
	animation: animation-rotate 2000ms linear infinite;
}

.loading::before {
	content: "";
	margin: -23px 0 0 -23px;
	height: 44px;
	width: 44px;
	-webkit-animation: animation-rotate 2000ms linear infinite;
	-moz-animation: animation-rotate 2000ms linear infinite;
	-o-animation: animation-rotate 2000ms linear infinite;
	animation: animation-rotate 2000ms linear infinite;
}

.loading::after {
	content: "";
	margin: -29px 0 0 -29px;
	height: 56px;
	width: 56px;
	-webkit-animation: animation-rotate 4000ms linear infinite;
	-moz-animation: animation-rotate 4000ms linear infinite;
	-o-animation: animation-rotate 4000ms linear infinite;
	animation: animation-rotate 4000ms linear infinite;
}

@-webkit-keyframes animation-rotate {
	100% {
		-webkit-transform: rotate(360deg);
	}
}

@-moz-keyframes animation-rotate {
	100% {
		-moz-transform: rotate(360deg);
	}
}

@-o-keyframes animation-rotate {
	100% {
		-o-transform: rotate(360deg);
	}
}

@keyframes animation-rotate {
	100% {
		transform: rotate(360deg);
	}
}
</style>`);

$(document).on('mouseover', '.tv-container', function(){
    $(this).find('.tv-popover').removeClass('tv-hide');
});

$(document).on('mouseout', '.tv-container', function(){
    $(this).find('.tv-popover').addClass('tv-hide');
});

$(document).on('mouseover', '.mturk-requester-info', function(){
    $(this).closest('li').find('.table-row-popover__content').css('display', 'unset');
});

$(document).on('mouseout', '.mturk-requester-info', function(){
    $(this).closest('li').find('.table-row-popover__content').css('display', 'none');
});

function slugify(text){
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/&/g, '-and-')         // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

const tosMap = new Map([
    [0, `N/A`],
    [1, `<span class="text-muted">Minor Personal Information Violation (Email, Zip, Company Name)</span>`],
    [2, `<span class="text-danger">Major Personal Information Violation (Name, Phone #, SSN)</span>`],
    [3, `<span class="text-warning">SEO/Referral/Review Fraud</span>`],
    [4, `<span class="text-danger">Phishing/Malicious Activity</span>`],
    [9, `<span class="text-muted">Misc/Other</span>`]
]);
const writingMap = new Map([
    [0, ``],
    [1, `Experiential/Write about a time when...`],
    [9, ``]
]);
const downloadsMap = new Map([
    [0, ``],
    [1, `Inquisit Software`],
    [2, `Browser Extension`],
    [3, `Phone/Tablet Apps`],
    [9, ``]
]);
const emMap = new Map([
    [0, ``],
    [1, `Phone Calls`],
    [2, `Webcam / Face requirements`],
    [9, ``]
]);


    
        x1.00
    
    >
    <
    >>
    <<
    O


    x1.00
 set  限制解除 #rwl-iqxin{position:fixed;transform:translate(-95px,0);width:85px;height:25px;font-size:12px;font-weight: 500;font-family:Verdana, Arial, '宋体';color:#fff;background:#333;z-index:2147483647;margin: 0;opacity:0.05;transition:0.3s;overflow:hidden;user-select:none;text-align:center;white-space:nowrap;line-height:25px;padding:0 16px;border:1px solid #ccc;border-width:1px 1px 1px 0;border-bottom-right-radius:5px;box-sizing: content-box;}#rwl-iqxin input{margin: 0;padding: 0;vertical-align:middle;-webkit-appearance:checkbox;-moz-appearance:checkbox;position: static;clip: auto;opacity: 1;cursor: pointer;}#rwl-iqxin.rwl-active-iqxin{left: 0px;transform:translate(0,0);opacity: 0.9;height: 32px;line-height: 32px}#rwl-iqxin label{margin:0;padding:0;font-weight:500;}#rwl-iqxin #rwl-setbtn{margin: 0 4px 0 0;padding: 0 0 0 4px;border: none;border-radius: 2px;cursor: pointer;background: #fff;color: #000;} 