/*****************************************************/
/*                                                   */
/*  Utilita.js - (c) Poste Italiane 2022             */
/*                                                   */
/*****************************************************/

/*  Set Browser-sniffing on/off */
var browserCheck = true;
/*  Set domain-sniffing on/off */
var domainCheck = true;
/*  Set Mediaquery-sniffing on/off */
var mqCheck = true;
/*  Set Debug on/off */
var debugging = true;

/* variabile usata dai timeout*/
var timeoutObj;

/* Doc. Debug var on/off - USAGE:
 *       writeLog("----");
 *       writeWarning("ops");
 *       writeError("ops");
 *       writeInfo("ops");
 */

/* Doc. Mediaquery-sniffing var on/off - USAGE:
 *    class = 'pi-xs'
 *            'pi-sm'
 *            'pi-md'
 *            'pi-lg'
 */

/* Doc. Browser-sniffing class on html var on/off
 *    class = 'pi-mobile'
 *            'pi-mobile pi-android'
 *            'pi-mobile pi-ios'
 *            'pi-firefox'
 *            'pi-ie pi-ie-edge'
 *            'pi-ie pi-ie10'
 *            'pi-ie pi-ie9'
 *            'pi-ie pi-ie8'
 *            'pi-ie pi-ie7'
 *            'pi-ie pi-ie6'
 *            'pi-chrome'
 *            'pi-opera'
 *            'pi-safari'
 */


/*****************/
/*    set log    */
/*****************/
function writeLog(arg) {
    if ((typeof console != "undefined") && debugging) {
        console.log(arg);
    }
}

function writeError(arg) {
    if ((typeof console != "undefined") && debugging) {
        console.error(arg);
    }
}

function writeInfo(arg) {
    if ((typeof console != "undefined") && debugging) {
        console.info(arg);
    }
}

function writeWarning(arg) {
    if ((typeof console != "undefined") && debugging) {
        console.warn(arg);
    }
}


/****************************/
/* Basic function hide/show */
/****************************/
function show(target) {
    $(target).addClass('show');
}

function hide(target) {
    $(target).addClass('hide');
}


/*********************/
/* Media Query check */
/*********************/
var mq_WindowWidth = $(window).width();
var mq_Detect = 'nomQDetect';


if (mqCheck) {
    mqCheckDetection();
}

$(window).resize(function () {
    if (mqCheck) {
        mqCheckDetection();
    }
});

function mqCheckDetection(mq_WindowWidth) {
    if ((mq_WindowWidth == null) || (mq_WindowWidth == '') || (mq_WindowWidth == 'undefined')) {
        mq_WindowWidth = $(window).width();
    }
    if (mq_WindowWidth < 768) {
        if (!($('html').hasClass('pi-xs'))) {
            $('html').removeClass('pi-sm pi-md pi-lg');
            $('html').addClass('pi-xs');
            writeInfo('MediaQuery Check : ' + 'xs');
            mq_Detect = 'xs';
            return mq_Detect;
        }
    } else if ((mq_WindowWidth > 767) && (mq_WindowWidth < 992)) {
        if (!($('html').hasClass('pi-sm'))) {
            $('html').removeClass('pi-xs pi-md pi-lg');
            $('html').addClass('pi-sm');
            writeInfo('MediaQuery Check : ' + 'sm');
            mq_Detect = 'sm';
            return mq_Detect;
        }
    } else if ((mq_WindowWidth > 991) && (mq_WindowWidth < 1200)) {
        if (!($('html').hasClass('pi-md'))) {
            $('html').removeClass('pi-xs pi-sm pi-lg');
            $('html').addClass('pi-md');
            writeInfo('MediaQuery Check : ' + 'md');
            mq_Detect = 'md';
            return mq_Detect;
        }
    } else if ((mq_WindowWidth > 1199)) {
        if (!($('html').hasClass('pi-lg'))) {
            $('html').removeClass('pi-xs pi-sm pi-md');
            $('html').addClass('pi-lg');
            writeInfo('MediaQuery Check : ' + 'lg');
            mq_Detect = 'lg';
            return mq_Detect;
        }
    }
}

/**************************/
/* Sniffing pixel density */
/**************************/
function isHighDensity() {
    return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 124dpi), only screen and (min-resolution: 1.3dppx), only screen and (min-resolution: 48.8dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (min-device-pixel-ratio: 1.3)').matches)) || (window.devicePixelRatio && window.devicePixelRatio > 1.3));
}

function isRetina() {
    return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx), only screen and (min-resolution: 75.6dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min--moz-device-pixel-ratio: 2), only screen and (min-device-pixel-ratio: 2)').matches)) || (window.devicePixelRatio && window.devicePixelRatio >= 2)) && /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
}


/*****************************************/
/* Modal ricalcolo posizione (al centro) */
/*****************************************/
$(function () {
    function reposition() {
        var modal = $(this),
            dialog = modal.find('.modal-dialog');
        modal.css('display', 'block');

        // Dividere per due centra la modale, ma  dividere per 3 o 4 funziona meglio per gli schermi grandi
        dialog.css("margin-top", Math.max(0, ($(window).height() - dialog.height()) / 2));
    }
    // Riposiziona quando la modale si mostra
    $('.modal').on('show.bs.modal', reposition);
    // Risposiziona al resize della finestra
    $(window).on('resize', function () {
        $('.modal:visible').each(reposition);
    });
});


/********************/
/* Sniffing browser */
/********************/
if (browserCheck) {
    BrowserDetection();
}

function BrowserDetection() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        writeInfo('Mobile Browser detected');
        //document.getElementsByTagName('html')[0].className += 'pi-mobile';
        $('html').addClass('pi-mobile');
        if (/Android/i.test(navigator.userAgent)) {
            writeInfo('Android Browser detected');
            //document.getElementsByTagName('html')[0].className += ' ' + 'pi-android';
            $('html').addClass('pi-android');
        } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            writeInfo('Ios Browser detected');
            //document.getElementsByTagName('html')[0].className += ' ' + 'pi-ios';
            $('html').addClass('pi-ios');
        }
    } else if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        var ffversion = new Number(RegExp.$1);
        writeInfo('Firefox Browser detected');
        //document.getElementsByTagName('html')[0].className += 'pi-firefox';
        $('html').addClass('pi-firefox');

    } else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
        var ieversion = new Number(RegExp.$1);
        if (ieversion == 10) {
            // for IE10
            //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie10';
            $('html').addClass('pi-ie pi-ie10');
            writeInfo('IE10 Browser detected');
        } else if (ieversion == 9) {
            // for IE9
            //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie9';
            $('html').addClass('pi-ie pi-ie9')
            writeInfo('IE9 Browser detected');
        } else if (ieversion == 8) {
            // for IE8
            //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie8';
            $('html').addClass('pi-ie pi-ie8')
            writeInfo('IE8 Browser detected');
        } else if (ieversion == 7) {
            // for IE7
            //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie7';
            $('html').addClass('pi-ie pi-ie7')
            writeInfo('IE7 Browser detected');
        } else if (ieversion == 6) {
            // for IE6
            //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie6';
            $('html').addClass('pi-ie pi-ie6')
            writeInfo('IE6 Browser detected');
        }
    } else if (/Trident.*rv[ :]?[1-9]{2}\./.test(navigator.userAgent)) {
        var ieVersion = new Number(RegExp.$1);
        //document.getElementsByTagName('html')[0].className += 'pi-ie pi-ie-edge';
        $('html').addClass('pi-ie pi-edge');
        writeInfo('IE > 10 Browser detected');
    } else if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        var chromeversion = new Number(RegExp.$1);
        //document.getElementsByTagName('html')[0].className += 'pi-chrome';
        $('html').addClass('pi-chrome');
        writeInfo('Chrome Browser detected');
    } else if (/Opera[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        var oprversion = new Number(RegExp.$1);
        //document.getElementsByTagName('html')[0].className += 'pi-opera';
        $('html').addClass('pi-opera');
        writeInfo('Opera Browser detected');
    } else if (/Safari[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        var safariversion = new Number(RegExp.$1);
        //document.getElementsByTagName('html')[0].className += 'pi-safari';
        $('html').addClass('pi-safari');
        writeInfo('Safari Browser detected');
    }
}


/*******************/
/* Sniffing domain */
/*******************/
if (domainCheck) {
    DomainDetection();
}

function DomainDetection() {
    var myhostnamePi = window.location.hostname.split('.').reverse();
    var myhostExtension = myhostnamePi[0]; /* estensione dominio (it/com) */
    var myhostDomain = myhostnamePi[1]; /* primo livello */
    var myhostSubDomain = myhostnamePi[2]; /* secondo livello */
    var mytagHtml = document.getElementsByTagName('html')[0];


    if (myhostDomain == "poste") {

        var posteit_suffix = 'pi-domain';
        mytagHtml.classList.add(posteit_suffix);

        /* Business check */
        if (myhostSubDomain == "business") {
            writeLog('DomainDetection: ' + myhostSubDomain);
            mytagHtml.classList.add(posteit_suffix + '-business');
        }
        /* Postepay check */
        else if (myhostSubDomain == "postepay") {
            writeLog('DomainDetection: ' + myhostSubDomain);
            mytagHtml.classList.add(posteit_suffix + '-postepay');
        }
        /* Postevita check */
        else if ((myhostSubDomain == "postevita") || (myhostSubDomain == "posteassicura")) {
            writeLog('DomainDetection: ' + myhostSubDomain);
            mytagHtml.classList.add(posteit_suffix + '-postevita');
        }
        /* Poste check */
        else {
            writeLog('DomainDetection: ' + myhostSubDomain);
            mytagHtml.classList.add(posteit_suffix + '-posteit');
        }
    }
    if (myhostDomain == "posteitaliane") {
        /* Corporate check */
        var posteitaliane_suffix = 'corporate-domain';
        writeLog('DomainDetection: ' + myhostDomain);
        mytagHtml.classList.add(posteitaliane_suffix, posteitaliane_suffix + '-posteitaliane');
    }
}

/*******************************************************************************************/
/* equalize element                                                                        */
/* setta altezza di una map / array a quella maggiore, in ingresso prende il selettore css */
/* N.B. a) utilizzare la classe .equalize-height per settare anche l'height dell'oggetto , .equalize-height-forced per forzare anche su XS */
/* N.B. b) utilizzare la classe .equalize-forced per mantenere l'equalize anche su XS */
/*******************************************************************************************/


function doEqualize(sel = null) {

    if ($(sel).length > 0) {
        var heights = $(sel).map(function () {
                return Math.ceil(this.getBoundingClientRect().height);
            }).get(),

            maxHeight = Math.max.apply(null, heights);

        if ($(sel).attr('data-default-height') >= maxHeight) {
            maxHeight = $(sel).attr('data-default-height') + "px";
        }

        $(sel).css("min-height", maxHeight);

        if ($(sel).hasClass('equalize-height')) {
            if(mq_Detect == 'xs'){
                if($(sel).hasClass('equalize-height-forced')){
                    $(sel).css("height", maxHeight);
                }
                else{
                    $(sel).css("height", "auto");
                }
            }
            else{
                $(sel).css("height", maxHeight);
            }
        }
        if ((mq_Detect == 'xs') && !($(sel).parents().hasClass('equalize-forced')) && !($(sel).parents().hasClass('content-overflow'))) {
            $(sel).css("min-height", "auto");
        }
        return maxHeight;
    }
}

function equalize(myvar) {
    if ($(myvar).hasClass('equalize-height')) {
        $(myvar).css("height", "auto");
    }
    $(myvar).css("min-height", "auto");
    doEqualize(myvar);
}

/* ciclo equalize su elementi di una stessa riga ----- equalize(".equalize* .panel-cards") */
function equalizeCycle(myclass, mycardclass, myfuncCallback) {
    var mynumMaxGruppiElementiEqualize = $(myclass).length;
    for (var i = 1; i <= mynumMaxGruppiElementiEqualize; i++) {
        var tgtcycle = myclass + "-" + i + " " + mycardclass;
        if ($(tgtcycle).length > 0) {
            equalize(tgtcycle);
        }
    }
    if (myfuncCallback != null){
        myfuncCallback();
    }
}


function mosaicPictureHeight(){
    if ($('.equalize-mosaic-wrap .mosaic-picture-wrap').length > 0){
        $('.equalize-mosaic-wrap .mosaic-picture-wrap').each(function() {
            var myContentHeight = $(this).next('.mosaic-wrap').outerHeight();
            var myFinalContentHeight = myContentHeight + 26 + 'px';
            $(this).css('min-height', myFinalContentHeight);
        });
    }
}


function mypMixedCardHeight(){
    if ($('.equalize-myp-mixedcard .myp-mixedcard').length > 0){
        $('.equalize-myp-mixedcard .myp-mixedcard').each(function() {
            if (mq_Detect == 'xs'){
                $(this).removeClass('mode-ctaset').attr('data-class','mode-ctaset');
            }
            else{
                if($(this).attr('data-class') != ''){
                    $(this).addClass($(this).attr('data-class'));
                    $(this).attr('data-class','')
                }
            }
        });
    }
}


/***************************/
/* scrollToTop icon fading */
/***************************/

function iconScrollFading(myicon) {
    var scrollTop = $(this).scrollTop();
    $(myicon).css({
        opacity: function () {
            var elementHeight = $(this).parent().height(),
                opacity = (((elementHeight / 1.8) - scrollTop) / elementHeight) * 1.8;
            return opacity;
        }
    });
}

/***********/
/* overlay */
/***********/

function overlayCreate(_options, elId = null) {

    if (elId == '' || elId == undefined || elId == null) {
        elId = 'overlay';
    }

    if (document.getElementById(elId) == null) {
        var ovObj = document.createElement('div');

        document.body.appendChild(ovObj).setAttribute('id', elId);
        document.body.appendChild(ovObj).setAttribute('class', 'overlay');

        if (_options != undefined) {
            if (_options.ariaHidden) {
                ovObj.setAttribute('aria-hidden', _options.ariaHidden);
            } else {
                //alert('aria-hidden');
                ovObj.setAttribute('aria-hidden', 'true');
            }
        }else{
            //ovObj.setAttribute('tabindex', '-1');
            ovObj.setAttribute('aria-hidden', 'true');
        }
    }
}

function overlayOn(_options, elId = null) {
    overlayCreate(_options);
    if (elId == '' || elId == undefined || elId == null) {
        elId = 'overlay';
    }
    var ol = document.getElementById(elId);
    ol.style.display = 'block';
    ol.removeAttribute('aria-hidden');
    if (_options != undefined) {
        if (_options.concealable) {
            ol.classList.add('concealable');
            overlayConcealable();
        }
        if (_options.bdNoOverflow) {
            document.body.style.overflow = 'hidden';
            document.getElementsByTagName('html')[0].style.overflow = 'hidden';

        }
    }
}

function overlayOff(elId = null) {
    if (elId == '' || elId == undefined || elId == null) {
        elId = 'overlay';
    }
    var ol = document.getElementById(elId);
    ol.style.display = 'none';
    ol.setAttribute('aria-hidden','true');
    document.body.style.overflow = 'inherit';
    document.getElementsByTagName('html')[0].style.overflow = 'inherit';
    //ol.remove();
}

function overlayConcealable() {
    $('.concealable').on('click', function () {
        overlayOff();
        if ($('.side-offcanvas').has('.side-offcanvas-close')) {
            offcanvasClose();
        };
        $(this).removeClass('concealable');
    });
}


/*************************/
/* Menu di navigazione   */
/*************************/

var menuEltoKeepInfocus = '.close-side-offcanvas, .offcanvas-panel-show button, .offcanvas-panel-show a, .offcanvas-panel-show input, .offcanvas-panel-show select, .offcanvas-panel-show textarea, .offcanvas-panel-show [tabindex]:not([tabindex="-1"]), .offcanvas-panel-show [role="button"]';

/*function navSideMenu(menuObj) {
    if ($(menuObj).length > 0) {
        menuPanelOpn(menuObj);
        menuBack(menuObj);
    }
}*/

/* Apre i pannellli del menu relativi all'oggetto menu passato */
/*var menuObjId
function menuPanelOpn(menuObj) {
   
    $(menuObj + ' .menu-section li button').on('click', function () {
        menuObjId = '#' + $(this).parents(menuObj).attr('id');
        var pnlToshow = '#' + $(this).attr('data-menu-ctrl');
        $(menuObjId + ' .offcanvas-panel').removeClass('offcanvas-panel-show').addClass('offcanvas-panel-hide').attr('aria-hidden', 'true');
        $(menuObjId + ' ' + pnlToshow).removeClass('offcanvas-panel-hide').addClass('offcanvas-panel-show').removeAttr('aria-hidden');
        
        $(menuObjId + ' button.back-side-panel').toggleClass('hide').attr('aria-hidden', function(index, attr){
            return attr == 'false' ? 'true' : 'false';
        });

        keepFocusIn(menuObjId, menuEltoKeepInfocus);

    });
}*/

/* gestisce il back button all'interno dei menu */
/*function menuBack(menuObj) {

    $('button.back-side-panel').on('click', function () {

        menuObjId = '#' + $(this).parents(menuObj).attr('id');
        var backPnlLv = $(this).attr('data-menu-back');

        $(menuObjId + ' .offcanvas-panel').removeClass('offcanvas-panel-show').addClass('offcanvas-panel-hide').attr('aria-hidden', 'true');
        
        $('.offcanvas-panel[data-menu-lv="' + $('#'+backPnlLv).attr('data-menu-lv') + '"]').removeClass('offcanvas-panel-hide').addClass('offcanvas-panel-show').removeAttr('aria-hidden');
        
        $(this).toggleClass('hide').attr('aria-hidden', function(index, attr){
            return attr == 'false' ? 'true' : 'false';
        });

        keepFocusIn(menuObjId, menuEltoKeepInfocus);
        
    });
}*/

/* ripristina la situazione esistente sul menu all'arrivo in pagina */
/*function menuReset(menuObj, initialPnl) {
    // console.log($('#' + $(menuObj).attr('id') + ' .menu-content'));
    $('#' + $(menuObj).attr('id') + ' .offcanvas-panel').addClass('offcanvas-panel-hide').removeClass('offcanvas-panel-show');
    //$('#' + $(menuObj).attr('id') + ' .menu-content').scrollTop=0;
    if(document.querySelector('.side-offcanvas-content.menu-content')!=null){
        document.querySelector('.side-offcanvas-content.menu-content').scrollTop=0; 
    }
    if(initialPnl.substring(1) == $('#' + $(menuObj).attr('id') + ' .offcanvas-panel[data-menu-lv="0"]').attr('id')){
        $('#' + $(menuObj).attr('id') + ' button.back-side-panel:not(.hide)').addClass('hide').attr('aria-hidden','true');
    }else{
        $('#' + $(menuObj).attr('id') + ' button.back-side-panel.hide').removeClass('hide').removeAttr('aria-hidden');
    }
    
    $('#' + $(menuObj).attr('id') + ' ' + initialPnl).removeAttr('aria-hidden').removeClass('offcanvas-panel-hide').addClass('offcanvas-panel-show');
}
*/


/********************/
/* Gestione offcanvas */
/********************/

function offcanvasToggle(_toggleElm, _overlayOp) {

    $(_toggleElm).on('click', function (e) {
        
        var elemClicked = $(this);
        var mySidebar = $('#'+elemClicked.attr('aria-controls'));

        e.preventDefault();

        if (mySidebar.hasClass('side-offcanvas-close')){
            overlayOn({concealable: true, bdNoOverflow: true});

        }else{
            overlayOff();
            if(mySidebar.find('.close-side-offcanvas')[0]==undefined)return;
            //menuReset(mySidebar, '#' + mySidebar.find('.close-side-offcanvas')[0].getAttribute('data-menu-pnl'));
        }

        elemClicked.attr('aria-expanded', function (index, attr) {

            mySidebar.toggleClass('side-offcanvas-close');
            
            mySidebar.attr('aria-hidden', function (index, attr) {
                return attr == 'true' ? 'false' : 'true';
            });

            return attr == 'true' ? 'false' : 'true';

        });

        clearTimeout(timeoutObj);
        timeoutObj = setTimeout(function() {
            if(mySidebar.hasClass('side-offcanvas-close')){
                $(elemClicked).focus();
            }else{
                keepFocusIn('#'+mySidebar.attr('id'), '.close-side-offcanvas, .offcanvas-panel-show button, .offcanvas-panel-show a, .offcanvas-panel-show input, .offcanvas-panel-show select, .offcanvas-panel-show textarea, .offcanvas-panel-show [tabindex]:not([tabindex="-1"]), .offcanvas-panel-show [role="button"]');
            }
        }, 150);
    });
};


function offcanvasClose(_closeElm) {

    if (_closeElm == undefined) {
        $('.side-offcanvas:not(.side-offcanvas-close) .close-side-offcanvas').trigger('click');
    }

    $(_closeElm).on('click', function (e) {
       
        e.preventDefault();
        var offCanvasBtn = $('button.offcanvas-toggle[aria-controls=' + $(this).attr('aria-controls') + '][aria-expanded=true]');
        
        offCanvasBtn.trigger('click');
        
        /*if ($(this).parents('.side-offcanvas.menu-navigazione').length > 0) {
            menuReset($(this).parents('.side-offcanvas'), '#'+$(this).attr('data-menu-pnl'));
        }*/
        
        document.activeElement.blur();
        
        return;

    });

    return;

};


/******************/
/* gestione focus */
/******************/

//funzione per mantenere il focus all'interno di un contenitore
function keepFocusIn(myElFocused, focusableElements, selFirstElFocusable) {

    // array degli elementi che saranno focusable all'interno di un contenitore
    if(focusableElements == '' || focusableElements == null){
        focusableElements = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';
    }
    
    var inFocusContainer = document.querySelector(myElFocused); // seleziono il contenitore

    if(selFirstElFocusable == '' || selFirstElFocusable == null){
        selFirstElFocusable = inFocusContainer.querySelectorAll(focusableElements)[0];
    }

    var firstFocusableElement = selFirstElFocusable; // il primo elemento da mettere in focus nel contenitore
    var focusableContent = inFocusContainer.querySelectorAll(focusableElements);
    var lastFocusableElement = focusableContent[focusableContent.length - 1]; // l'ultimo elemento in focus nel contenitore

    firstFocusableElement.focus();

    document.addEventListener('keydown', function (e) {
        var isTabPressed = e.key === 'Tab' || e.keyCode === 9;

        if (!isTabPressed) {
            var isEscPressed = e.key === 'Esc' ||  e.key === 'Escape' || e.keyCode === 27;

            if(isEscPressed){
                offcanvasClose();
                document.onkeydown = null;
            }
            document.onkeydown = null;
            return;
        }

        if (e.shiftKey) { // verifica se shift e' premuto nella combinazione shift + tab
            if (document.activeElement === firstFocusableElement) {
                e.preventDefault();
                lastFocusableElement.focus(); // setta il focus sull'ultimo elemento focusable
            }
        } else { // verifica se tab e' premuto
            if (document.activeElement === lastFocusableElement) {
                // se il focus ha raggiunto l'ultimo elemento, lo sposto sul primo dopo la pressione del tab
                e.preventDefault();
                firstFocusableElement.focus(); // setta il focus sul primo elemento focusable
            }
        }
    });


}


function focusFormMouse() {
    var t = 'input[type="text"],input[type="password"],input[type="email"],input[type="url"],input[type="tel"],input[type="number"],input[type="search"],textarea';
    var e;

    $(document).on("keydown mousedown", function (t) {
        e = "mousedown" === t.type
    }).on("focusin", function (t) {
        e && t.target && $(t.target).addClass("focus-mouse");
    }).on("focusout", function (t) {
        t.target && $(t.target).removeClass("focus-mouse")
    })
}


function focusLabelTransition() {
    var t = 'input[type="text"],input[type="password"],input[type="email"],input[type="url"],input[type="tel"],input[type="number"],input[type="search"],textarea';

    $("body").find(t).each(function (e, t) {
        var t = $(t),
            n = !!t.val(),
            i = !!t.attr("placeholder");
        (n || i) && $("label[for='" + t.attr("id") + "']").css("transition", "none").addClass("active"), n || i || $("label[for='" + t.attr("id") + "']").removeClass("active")
    });

    var n = 'input[type="file"]';
    var i = ($(document).on("focus", t, function (e) {
        e = "label[for='" + $(e.target).attr("id") + "']";
        $(e).addClass("active");
    }).on("blur", t, function (e) {
        var e = $(e.target),
            t = !e.val(),
            n = !e.attr("placeholder");
        t && n && $("label[for='" + e.attr("id") + "']").removeClass("active")
    }).on("change", t, function (e) { // da verificare
        e = $(e.target);
        i(e)
    }), function (e) {
        var t = $("label[for='" + e.attr("id") + "']"),
            n = e.val().length,
            e = !!e.attr("placeholder");
        n || e ? t.addClass("active") : t.removeClass("active")
    });

}

function labelrePosition(){
    $('.form-group.form-group-abs .input-group').each(function() {
            if ($(this).find('.input-group-addon:first-child:has(+ .form-control)').outerWidth() !== undefined){
                mylabelRepos = $(this).find('.input-group-addon:first-child:has(+ .form-control)').outerWidth();
                $(this).parent().find('.control-label').css('left',mylabelRepos + 12 +'px');
            };
    });
}

function focusInputGroup(){
    $('.form-group .input-group .form-control').on('focus', function(){
        $(this).parents('.input-group').find('.input-group-addon:not(>.form-control)').addClass('focus-siblings');
        $(this).parents('.input-group').find('.input-group-addon:has(>.form-control) > .form-control').addClass('focus-siblings');
        $(this).parents('.input-group:not(.input-group-otp)').find('> .form-control').addClass('focus-siblings');
    });
    $('.form-group .input-group:has(>.form-control) .form-control').on('focusout', function(){
        $(this).parents('.input-group').find('.input-group-addon:not(>.form-control)').removeClass('focus-siblings');
        $(this).parents('.input-group').find('.input-group-addon:has(>.form-control) .form-control').removeClass('focus-siblings');
        $(this).parents('.input-group:not(.input-group-otp)').find('> .form-control').removeClass('focus-siblings');
    });
}

function checkFileNameUpload(){
    $('input[type="file"]').on('change',function(e){
        var myval = (e.target.files[0].name);
        $(this).parent('.input-upload').find('.form-control[type="text"]').attr('value',myval);
    });
}

function focusInputUpload(){
    $('.form-group .input-upload input[type="file"]').on('focus', function(){
        $(this).parent('.input-upload').find('.input-group input').addClass('focus-siblings');
        $(this).parent('.input-upload').find('.input-group-addon').addClass('focus-siblings');
    });
    $('.form-group .input-upload input[type="file"]').on('focusout', function(){
        $(this).parent('.input-upload').find('.input-group input').removeClass('focus-siblings');
        $(this).parent('.input-upload').find('.input-group-addon').removeClass('focus-siblings');
    });
}


/*
    Animazione Scroll-to accordin by url, accetta parametro in entrata che se passato viene sommato all'offset, di default NULL
*/

function animationScrollAccordion(offsetExtra = null) {
    $('.main-pills .panel-group-accordion.panel-group-unique').not('.side-offcanvas-obj .main-pills .panel-group-accordion.panel-group-unique').on('shown.bs.collapse', function (e) {

        var offset = $(this).find('.collapse.in').prev('.panel-heading');
        if (offsetExtra == null) {
            offsetExtra = 0;
        }

        if (offset) {
            $('html,body').animate({
                scrollTop: $(offset).offset().top - offsetExtra
            }, 500);
        }
    });
}

/*
    Animazione apertura e scroll-to accordin by url accordionOpenByUrl() e' richiamata al ready su start-script
*/

function accordionOpenByUrl() {
    var myUrlHash = window.location.hash;
    if (myUrlHash.length > 0 && myUrlHash.indexOf('#!') !== 0 && myUrlHash.indexOf('#/') !== 0){
        if (location.hash) {
            setTimeout(function () {
                // accordion
                if($('.panel-group-accordion').length > 0){
                    if ($('#content-header-extra').css("height") !== undefined || $('#content-header-extra').css("height") !== null) {
                        animationScrollAccordion(parseInt($('#content-header-extra').css('height')));
                    } else {
                        animationScrollAccordion();
                    }
                    if (!$('.panel-group-accordion ' + myUrlHash).hasClass('in')) {
                        $('.panel-group-accordion .panel-heading a[href="' + myUrlHash + '"]').trigger('click');
                    }
                }
                // tab
                if($('[data-toggle="tab"]').length > 0){
                    if($('a[href="' + myUrlHash + '"]').attr('data-toggle')=='tab'){
                        $('a[href="' + myUrlHash + '"]').trigger('click');
                    }
                }
            }, 1);
        }

    }
}


/**************************/
/* Gestione Scroll ancore */
/**************************/

function anchorScrollingToFocus(myElement, extraOffset, focused) {
    var myAnchor = $(myElement).attr('href');
    if (myAnchor.match('#')) {
        writeLog('anchor detected on messages link - scrolling');
        var hash = myAnchor.substring(myAnchor.indexOf("#") + 1);
        if ($('#' + hash).length > 0) {
            startScrollandFocus($('#' + hash), extraOffset, focused);
        }
        return false;
    } else {
        writeLog('no anchor detected on messages link');
    }
}

function startScrollandFocus(element, extraOffset, focused) {
    var myoffset = element.offset().top;
    var scrollto = myoffset - extraOffset;
    $('html, body').animate({
        scrollTop: scrollto
    }, 1500, function () {
        if (focused == true) {
            $(element).focus();
            writeLog('focus on input');
        }
    });
}

/*******************************/
/*   List segmented control    */
/*******************************/

$('.radio-segmented-control-wrapper label.ctrl-btn').on('click', function () {
    $(this).siblings().removeClass('active');
    $(this).addClass('active');
});

/******************/
/* gestione Btn toggle */ //verificare
/******************/
function buttonToggle() {
    $('.btn-toggle').on('click', function () {

        $(this).children('.btn').toggleClass('active');

        if (!$(this).children('label').hasClass('disabled')) {

            $(this).find('.btn').toggleClass('active');
            //writeLog( $(this).find('.btn').attr('class') );


            if ($(this).find('.btn-primary').size() > 0) {
                $(this).find('.btn').toggleClass('btn-primary');
            }
            if ($(this).find('.btn-danger').size() > 0) {
                $(this).find('.btn').toggleClass('btn-danger');
            }
            if ($(this).find('.btn-success').size() > 0) {
                $(this).find('.btn').toggleClass('btn-success');
            }
            if ($(this).find('.btn-info').size() > 0) {
                $(this).find('.btn').toggleClass('btn-info');
            }

            $(this).find('.btn').toggleClass('btn-default');


        } else {
            writeLog('disabled btn-toggle click event');
        }

    });
}

var c, currentScrollTop = 0

function stickyHeader(myStickyHeader = null) {
    if (($(myStickyHeader) != null) && ($(myStickyHeader).length > 0)) {

        var a = $(window).scrollTop();
        var b = $(myStickyHeader).outerHeight();
        var offset = 500; //delta start per la barra extra
        currentScrollTop = a;


        // in presenza di barra extra
        if ($('#content-header-extra').length > 0) {
            if (currentScrollTop > b + offset) {
                $(myStickyHeader).removeClass('scrollDown');
                $(myStickyHeader).removeClass('sticky-mid');
                $(myStickyHeader).find('a , btn').attr('tabindex','0');
                $(myStickyHeader).attr('aria-hidden','false');
            } else {
                $(myStickyHeader).addClass('scrollDown');
                $(myStickyHeader).addClass('sticky-mid');
                $(myStickyHeader).find('a , btn').attr('tabindex','-1');
                $(myStickyHeader).attr('aria-hidden','true');
            }
            $(myStickyHeader).removeClass('hide');
        }
        // header default in fixed
        else {
            $('body').css('padding-top', b);
            if (c < currentScrollTop && a > b + b) {
                $(myStickyHeader).addClass('scrollDown');
                $(myStickyHeader).addClass('sticky-mid');
            } else if (c > currentScrollTop && !(a <= b)) {
                $(myStickyHeader).removeClass('scrollDown');
            } else if (c > currentScrollTop && a < b + b) {
                $(myStickyHeader).removeClass('sticky-mid');
            }
            c = currentScrollTop;
        }
    }
}

function scrollTabsCentered(myobj = null) {
    var pos = myobj.position().left; //get left position of li
    var myobjParent = myobj.parent('ul');
    var currentscroll = myobjParent.scrollLeft();
    var containerwidth = myobjParent.width();
    var middleItem = Math.floor(myobj.outerWidth(true) / 2);
    var diff = pos - containerwidth / 2;

    pos = (currentscroll + diff + middleItem);

    myobjParent.animate({
        scrollLeft: pos
    });
}

function collapseObjectOnMobile(mycollapseobj = null) {
    if ($(mycollapseobj).length > 0 && (mq_Detect == "md") || (mq_Detect == "lg")) {
        $(mycollapseobj).css('height', 'auto');
        $(mycollapseobj).removeAttr('aria-expanded');
        $(mycollapseobj).addClass('block-md block-lg');
    }
}

function rangeBar() {
    const allRanges = document.querySelectorAll(".form-range");
    if (allRanges.length > 0) {
        allRanges.forEach(wrap => {
            const range = wrap.querySelector('.form-range input[type=range]');
            const rangeBubble = wrap.querySelector('.form-range-rangeBubble');
            const track = wrap.querySelector('.form-range-track');

            range.addEventListener("input", () => {
                setRangeBubble(range, rangeBubble, track);
            });

            setRangeBubble(range, rangeBubble, track);

        });

        function setRangeBubble(range, rangeBubble, track) {
            const val = range.value;
            const min = range.min ? range.min : 0;
            const max = range.max ? range.max : 100;
            const newVal = Number(((val - min) * 100) / (max - min));
            rangeBubble.innerHTML = val;

            // calcoli basati empiricamente sulle dimensioni della thumb
            rangeBubble.style.left = 'calc(' + newVal + '% ' + ' + ' + (8 - (newVal * 0.25)) + 'px)';
            setRangeTrack(track, range, newVal);
        }

        function setRangeTrack(track = null, range, newVal) {
            if (track != null) {
                track.style.width = 'calc(' + range.value + '% ' + ' + ' + (-(range.value / 100)) + 'rem)';
            }
        }
    }
}

function triggerHelpLink(){
    $('<button id="skipBtnHelp">Apri la barra di assistenza</button>').insertAfter($('a.skip-link[href="#assistenza-side"]'));
    $('<button id="skipMenu">Apri il menu</button>').insertAfter($('a.skip-link[href="#menu-navigazione"]'));
    $('a.skip-link[href="#assistenza-side"]').each(function() {
        $.each(this.attributes,function(i,a){
            if(a.name!='href'){
                $('button#skipBtnHelp').attr(a.name,a.value);
            }
        })
    });
    $('a.skip-link[href="#menu-navigazione"]').each(function() {
        $.each(this.attributes,function(i,a){
            if(a.name!='href'){
                $('button#skipMenu').attr(a.name,a.value);
            }
        })
    });
    $('a.skip-link[href="#assistenza-side"]').remove();
    $('a.skip-link[href="#menu-navigazione"]').remove();
    $('button#skipBtnHelp').on('click',function(e){
        e.preventDefault();
        $('button.offcanvas-toggle[aria-controls="assistenza-side"]').trigger('click');
    });
    $('button#skipMenu').on('click',function(e){
        e.preventDefault();
        $('button.offcanvas-toggle[aria-controls="menu-navigazione"]').trigger('click');
    });
}


