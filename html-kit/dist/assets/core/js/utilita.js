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
    document.querySelector(target).classList.add('show');
}

function hide(target) {
    document.querySelector(target).classList.add('hide');
}



/*********************/
/* Media Query check */
/*********************/

let mq_WindowWidth = window.innerWidth;
let mq_Detect = 'nomQDetect';

if (typeof mqCheck !== 'undefined' && mqCheck) {
    mqCheckDetection();
}

window.addEventListener('resize', function () {
    if (typeof mqCheck !== 'undefined' && mqCheck) {
        mqCheckDetection();
    }
});

function mqCheckDetection(mq_WindowWidth) {
    if ((mq_WindowWidth == null) || (mq_WindowWidth === '') || (mq_WindowWidth === undefined)) {
        mq_WindowWidth = window.innerWidth;
    }

    const html = document.documentElement;

    if (mq_WindowWidth < 576) {
        if (!html.classList.contains('pi-xs')) {
            html.classList.remove('pi-sm', 'pi-md', 'pi-lg', 'pi-xl', 'pi-xxl');
            html.classList.add('pi-xs');
            writeInfo('MediaQuery Check : xs');
            mq_Detect = 'xs';
        }
    } else if ((mq_WindowWidth >= 576) && (mq_WindowWidth < 768)) {
        if (!html.classList.contains('pi-sm')) {
            html.classList.remove('pi-xs', 'pi-md', 'pi-lg', 'pi-xl', 'pi-xxl');
            html.classList.add('pi-sm');
            writeInfo('MediaQuery Check : sm');
            mq_Detect = 'sm';
        }
    } else if ((mq_WindowWidth >= 768) && (mq_WindowWidth < 992)) {
        if (!html.classList.contains('pi-md')) {
            html.classList.remove('pi-xs', 'pi-sm', 'pi-lg', 'pi-xl', 'pi-xxl');
            html.classList.add('pi-md');
            writeInfo('MediaQuery Check : md');
            mq_Detect = 'md';
        }
    } else if ((mq_WindowWidth >= 992) && (mq_WindowWidth < 1200)) {
        if (!html.classList.contains('pi-lg')) {
            html.classList.remove('pi-xs', 'pi-sm', 'pi-md', 'pi-xl', 'pi-xxl');
            html.classList.add('pi-lg');
            writeInfo('MediaQuery Check : lg');
            mq_Detect = 'lg';
        }
    } else if ((mq_WindowWidth >= 1200) && (mq_WindowWidth < 1400)) {
        if (!html.classList.contains('pi-xl')) {
            html.classList.remove('pi-xs', 'pi-sm', 'pi-md', 'pi-lg', 'pi-xxl');
            html.classList.add('pi-xl');
            writeInfo('MediaQuery Check : xl');
            mq_Detect = 'xl';
        }
    } else if (mq_WindowWidth >= 1400) {
        if (!html.classList.contains('pi-xxl')) {
            html.classList.remove('pi-xs', 'pi-sm', 'pi-md', 'pi-lg', 'pi-xl');
            html.classList.add('pi-xxl');
            writeInfo('MediaQuery Check : xxl');
            mq_Detect = 'xxl';
        }
    }

    return mq_Detect;
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

document.addEventListener('DOMContentLoaded', function () {
    function reposition(modal) {
        const dialog = modal.querySelector('.modal-dialog');
        modal.style.display = 'block';

        // Divide by 2 to center the modal, but dividing by 3 or 4 works better for large screens
        const marginTop = Math.max(0, (window.innerHeight - dialog.offsetHeight) / 2);
        dialog.style.marginTop = marginTop + 'px';
    }

    // Reposition when the modal is shown
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('show.bs.modal', function () {
            reposition(this);
        });
    });

    // Reposition on window resize
    window.addEventListener('resize', function () {
        document.querySelectorAll('.modal').forEach(modal => {
            if (window.getComputedStyle(modal).display !== 'none') {
                reposition(modal);
            }
        });
    });
});



/********************/
/* Sniffing browser */
/********************/
if (browserCheck) {
    BrowserDetection();
}


function BrowserDetection() {
    const html = document.documentElement;

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        writeInfo('Mobile Browser detected');
        html.classList.add('pi-mobile');

        if (/Android/i.test(navigator.userAgent)) {
            writeInfo('Android Browser detected');
            html.classList.add('pi-android');
        } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            writeInfo('iOS Browser detected');
            html.classList.add('pi-ios');
        }
    } else if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        const ffversion = Number(RegExp.$1);
        writeInfo('Firefox Browser detected');
        html.classList.add('pi-firefox');
    } else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
        const ieversion = Number(RegExp.$1);
        html.classList.add('pi-ie');

        if (ieversion === 10) {
            html.classList.add('pi-ie10');
            writeInfo('IE10 Browser detected');
        } else if (ieversion === 9) {
            html.classList.add('pi-ie9');
            writeInfo('IE9 Browser detected');
        } else if (ieversion === 8) {
            html.classList.add('pi-ie8');
            writeInfo('IE8 Browser detected');
        } else if (ieversion === 7) {
            html.classList.add('pi-ie7');
            writeInfo('IE7 Browser detected');
        } else if (ieversion === 6) {
            html.classList.add('pi-ie6');
            writeInfo('IE6 Browser detected');
        }
    } else if (/Trident.*rv[ :]?[1-9]{2}\./.test(navigator.userAgent)) {
        const ieVersion = Number(RegExp.$1);
        html.classList.add('pi-ie', 'pi-edge');
        writeInfo('IE > 10 Browser detected');
    } else if (/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        const chromeversion = Number(RegExp.$1);
        html.classList.add('pi-chrome');
        writeInfo('Chrome Browser detected');
    } else if (/Opera[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        const oprversion = Number(RegExp.$1);
        html.classList.add('pi-opera');
        writeInfo('Opera Browser detected');
    } else if (/Safari[\/\s](\d+\.\d+)/.test(navigator.userAgent)) {
        const safariversion = Number(RegExp.$1);
        html.classList.add('pi-safari');
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
    const elements = document.querySelectorAll(sel);

    if (elements.length > 0) {
        const heights = Array.from(elements).map(el =>
            Math.ceil(el.getBoundingClientRect().height)
        );

        let maxHeight = Math.max.apply(null, heights);

        const defaultHeight = elements[0].getAttribute('data-default-height');
        if (defaultHeight && parseInt(defaultHeight) >= maxHeight) {
            maxHeight = parseInt(defaultHeight);
        }

        elements.forEach(el => {
            el.style.minHeight = `${maxHeight}px`;

            if (el.classList.contains('equalize-height')) {
                if (mq_Detect === 'xs') {
                    if (el.classList.contains('equalize-height-forced')) {
                        el.style.height = `${maxHeight}px`;
                    } else {
                        el.style.height = 'auto';
                    }
                } else {
                    el.style.height = `${maxHeight}px`;
                }
            }

            if (mq_Detect === 'xs' &&
                !el.closest('.equalize-forced') &&
                !el.closest('.content-overflow')) {
                el.style.minHeight = 'auto';
            }
        });

        return maxHeight;
    }
}


function equalize(myvar) {
    const elements = document.querySelectorAll(myvar);

    elements.forEach(el => {
        if (el.classList.contains('equalize-height')) {
            el.style.height = 'auto';
        }
        el.style.minHeight = 'auto';
    });

    doEqualize(myvar);
}

/* ciclo equalize su elementi di una stessa riga ----- equalize(".equalize* .panel-cards") */

function equalizeCycle(myclass, mycardclass, myfuncCallback) {
    
    var mynumMaxGruppiElementiEqualize = document.querySelectorAll(myclass).length;
    
    for (var i = 1; i <= mynumMaxGruppiElementiEqualize; i++) {
        var tgtcycle = `${myclass}-${i} ${mycardclass}`;
        if (document.querySelectorAll(tgtcycle).length > 0) {
            equalize(tgtcycle);
        }
    }

    if (myfuncCallback !== null) {
        myfuncCallback;
    }
}

function mosaicPictureHeight() {
    var mosaicPictureWraps = document.querySelectorAll('.equalize-mosaic-wrap .mosaic-picture-wrap');
    if (mosaicPictureWraps.length > 0) {
        mosaicPictureWraps.forEach(function (wrap) {
            var myContentHeight = wrap.nextElementSibling.offsetHeight;
            var myFinalContentHeight = `${myContentHeight + 26}px`;
            wrap.style.minHeight = myFinalContentHeight;
        });
    }
}

function mypMixedCardHeight() {
    var mypMixedCards = document.querySelectorAll('.equalize-myp-mixedcard .myp-mixedcard');
    if (mypMixedCards.length > 0) {
        mypMixedCards.forEach(function (card) {
            if (mq_Detect === 'xs') {
                card.classList.remove('mode-ctaset');
                card.setAttribute('data-class', 'mode-ctaset');
            } else {
                var dataClass = card.getAttribute('data-class');
                if (dataClass !== '') {
                    card.classList.add(dataClass);
                    card.setAttribute('data-class', '');
                }
            }
        });
    }
}

/***************************/
/* scrollToTop icon fading */
/***************************/

function iconScrollFading(myicon) {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const icons = document.querySelectorAll(myicon);

    icons.forEach(icon => {
        const parentHeight = icon.parentElement.offsetHeight;
        const opacity = (((parentHeight / 1.8) - scrollTop) / parentHeight) * 1.8;
        icon.style.opacity = Math.max(0, Math.min(1, opacity)); // Ensure opacity is between 0 and 1
    });
}

//const menuEltoKeepInfocus = '.close-side-offcanvas, .offcanvas-panel-show button, .offcanvas-panel-show a, .offcanvas-panel-show input, .offcanvas-panel-show select, .offcanvas-panel-show textarea, .offcanvas-panel-show [tabindex]:not([tabindex="-1"]), .offcanvas-panel-show [role="button"]';

/******************/
/* gestione focus */
/******************/

//funzione per mantenere il focus all'interno di un contenitore
function keepFocusIn(myElFocused, focusableElements, selFirstElFocusable) {

    // array degli elementi che saranno focusable all'interno di un contenitore
    if (focusableElements == '' || focusableElements == null) {
        focusableElements = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]';
    }

    var inFocusContainer = document.querySelector(myElFocused); // seleziono il contenitore

    if (selFirstElFocusable == '' || selFirstElFocusable == null) {
        selFirstElFocusable = inFocusContainer.querySelectorAll(focusableElements)[0];
    }

    var firstFocusableElement = selFirstElFocusable; // il primo elemento da mettere in focus nel contenitore
    var focusableContent = inFocusContainer.querySelectorAll(focusableElements);
    var lastFocusableElement = focusableContent[focusableContent.length - 1]; // l'ultimo elemento in focus nel contenitore

    firstFocusableElement.focus();

    document.addEventListener('keydown', function (e) {
        var isTabPressed = e.key === 'Tab' || e.keyCode === 9;

        if (!isTabPressed) {
            var isEscPressed = e.key === 'Esc' || e.key === 'Escape' || e.keyCode === 27;

            if (isEscPressed) {
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

/* intercetta il focus con il mouse*/

function focusFormMouse() {
    // La variabile con i selettori (anche se non viene usata nella funzione)
    const selectors = 'input[type="text"],input[type="password"],input[type="email"],input[type="url"],input[type="tel"],input[type="number"],input[type="search"],textarea';
    
    let isMouseDown;

    // Gestione keydown e mousedown
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('mousedown', handleInteraction);
    
    // Gestione focus e blur
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    function handleInteraction(event) {
        isMouseDown = event.type === 'mousedown';
    }

    function handleFocusIn(event) {
        if (isMouseDown && event.target) {
            event.target.classList.add('focus-mouse');
        }
    }

    function handleFocusOut(event) {
        if (event.target) {
            event.target.classList.remove('focus-mouse');
        }
    }
}

/*riposiziona il focus per la label nelle form group */
function labelrePosition() {
    // Seleziona tutti gli elementi .input-group dentro .form-group.form-group-abs
    const inputGroups = document.querySelectorAll('.form-group.form-group-abs .input-group');
    
    inputGroups.forEach(inputGroup => {
        // Cerca il primo .input-group-addon che è seguito direttamente da .form-control
        const firstAddon = inputGroup.querySelector('.input-group-addon:first-child + .form-control');
        
        if (firstAddon) {
            // Se esiste, prendi l'elemento .input-group-addon
            const addon = firstAddon.previousElementSibling;
            const addonWidth = addon.offsetWidth;
            
            if (addonWidth !== undefined) {
                // Trova il .control-label nel genitore più vicino
                const label = inputGroup.parentElement.querySelector('.control-label');
                if (label) {
                    label.style.left = `${addonWidth + 12}px`;
                }
            }
        }
    });
}


/*
    Animazione Scroll-to accordin by url, accetta parametro in entrata che se passato viene sommato all'offset, di default NULL
*/

function animationScrollAccordion(offsetExtra = null) {
    // Seleziona tutti gli accordion escludendo quelli dentro .side-offcanvas-obj
    const accordions = document.querySelectorAll('.main-pills .panel-group-accordion.panel-group-unique:not(.side-offcanvas-obj .main-pills .panel-group-accordion.panel-group-unique)');
    
    accordions.forEach(accordion => {
        // Ascolta l'evento di Bootstrap per il collapse mostrato
        accordion.addEventListener('shown.bs.collapse', function(e) {
            // Trova il panel-heading precedente al collapse aperto
            const openCollapse = this.querySelector('.collapse.in');
            const offset = openCollapse ? openCollapse.previousElementSibling : null;
            
            // Imposta offsetExtra a 0 se non specificato
            if (offsetExtra === null) {
                offsetExtra = 0;
            }
            
            if (offset) {
                // Ottieni la posizione dell'elemento rispetto al top della pagina
                const offsetTop = offset.getBoundingClientRect().top + window.scrollY;
                
                // Animazione di scroll
                window.scrollTo({
                    top: offsetTop - offsetExtra,
                    behavior: 'smooth'
                });
                
                // valutare Alternativa, che si lascia commentata di seguito, se al posto di smooth si voglia un'animazione più simile a jQuery
                /*
                const start = window.pageYOffset;
                const end = offsetTop - offsetExtra;
                const duration = 500;
                const startTime = performance.now();
                
                function animate(currentTime) {
                    const elapsedTime = currentTime - startTime;
                    const progress = Math.min(elapsedTime / duration, 1);
                    
                    // Funzione di easing simile a jQuery
                    const easeInOutQuad = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                    
                    window.scrollTo(0, start + (end - start) * easeInOutQuad(progress));
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    }
                }
                
                requestAnimationFrame(animate);
                */
            }
        });
    });
}

/*
    Animazione apertura e scroll-to accordin by url accordionOpenByUrl() e' richiamata al ready su start-script
*/

function accordionOpenByUrl() {
    const myUrlHash = window.location.hash;
    
    if (myUrlHash.length > 0 && !myUrlHash.startsWith('#!') && !myUrlHash.startsWith('#/')) {
        if (location.hash) {
            setTimeout(function () {
                // Gestione accordion
                const accordions = document.querySelectorAll('.panel-group-accordion');
                if (accordions.length > 0) {
                    const headerExtra = document.getElementById('content-header-extra');
                    if (headerExtra) {
                        const headerHeight = getComputedStyle(headerExtra).height;
                        if (headerHeight !== undefined && headerHeight !== null) {
                            animationScrollAccordion(parseInt(headerHeight));
                        } else {
                            animationScrollAccordion();
                        }
                    }
                    
                    // Cerca il pannello dell'accordion corrispondente all'hash
                    const targetPanel = document.querySelector('.panel-group-accordion ' + myUrlHash);
                    if (targetPanel && !targetPanel.classList.contains('in')) {
                        const accordionTrigger = document.querySelector(`.panel-group-accordion .panel-heading a[href="${myUrlHash}"]`);
                        if (accordionTrigger) {
                            // Simula il click
                            const clickEvent = new Event('click', {
                                bubbles: true,
                                cancelable: true
                            });
                            accordionTrigger.dispatchEvent(clickEvent);
                        }
                    }
                }
                
                // Gestione tab
                const tabs = document.querySelectorAll('[data-toggle="tab"]');
                if (tabs.length > 0) {
                    const tabLink = document.querySelector(`a[href="${myUrlHash}"]`);
                    if (tabLink && tabLink.getAttribute('data-toggle') === 'tab') {
                        const clickEvent = new Event('click', {
                            bubbles: true,
                            cancelable: true
                        });
                        tabLink.dispatchEvent(clickEvent);
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
    const myAnchor = myElement.getAttribute('href');
    
    if (myAnchor.includes('#')) {
        writeLog('anchor detected on messages link - scrolling');
        const hash = myAnchor.substring(myAnchor.indexOf("#") + 1);
        const targetElement = document.getElementById(hash);
        
        if (targetElement) {
            startScrollandFocus(targetElement, extraOffset, focused);
            return false;
        }
    } else {
        writeLog('no anchor detected on messages link');
    }
}

function startScrollandFocus(element, extraOffset, focused) {
    const myoffset = element.getBoundingClientRect().top + window.scrollY;
    const scrollto = myoffset - extraOffset;
    
    // Versione con scrollTo nativa e smooth scrolling
    window.scrollTo({
        top: scrollto,
        behavior: 'smooth'
    });
    
    // Se si vuol mantenere l'animazione (1500ms) simile a jQuery si
    // può usare questa versione alternativa che teniamo commentata:
    /*
    const start = window.scrollY;
    const startTime = performance.now();
    const duration = 1500;
    
    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Easing function (easeInOutQuad)
        const easeInOutQuad = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        window.scrollTo(0, start + (scrollto - start) * easeInOutQuad(progress));
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else if (focused === true) {
            element.focus();
            writeLog('focus on input');
        }
    }
    
    requestAnimationFrame(animate);
    */
    
    // Se si usa la versione smooth scrolling nativa, 
    // aspetta che lo scroll sia completato prima di fare il focus
    if (focused === true) {
        setTimeout(() => {
            element.focus();
            writeLog('focus on input');
        }, 1500);
    }
}


/*******************************/
/*   List segmented control    */
/*******************************/

document.querySelectorAll('.radio-segmented-control-wrapper label.ctrl-btn').forEach(button => {
    button.addEventListener('click', function() {
        // Rimuove la classe 'active' da tutti i siblings
        this.parentElement.querySelectorAll('label.ctrl-btn').forEach(sibling => {
            if (sibling !== this) {
                sibling.classList.remove('active');
            }
        });
        
        // Aggiunge la classe 'active' all'elemento cliccato
        this.classList.add('active');
    });
});

/*-------------- HERE -----------------*/


/******************/
/* gestione Btn toggle */ //verificare
/******************/
function buttonToggle() {
    document.querySelectorAll('.btn-toggle').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            const buttons = this.querySelectorAll('.btn');
            buttons.forEach(function (btn) {
                btn.classList.toggle('active');
            });

            const label = this.querySelector('label');
            if (!label || !label.classList.contains('disabled')) {
                buttons.forEach(function (btn) {
                    btn.classList.toggle('active');

                    if (btn.classList.contains('btn-primary')) {
                        btn.classList.toggle('btn-primary');
                    }
                    if (btn.classList.contains('btn-danger')) {
                        btn.classList.toggle('btn-danger');
                    }
                    if (btn.classList.contains('btn-success')) {
                        btn.classList.toggle('btn-success');
                    }
                    if (btn.classList.contains('btn-info')) {
                        btn.classList.toggle('btn-info');
                    }

                    btn.classList.toggle('btn-default');
                });
            } else {
                console.log('disabled btn-toggle click event');
            }
        });
    });
}


let c, currentScrollTop = 0;

function stickyHeader(myStickyHeader = null) {
    if (myStickyHeader && document.querySelector(myStickyHeader)) {
        const a = window.scrollY;
        const b = document.querySelector(myStickyHeader).offsetHeight;
        const offset = 500; // delta start per la barra extra
        currentScrollTop = a;

        const myHeader = document.querySelector(myStickyHeader);

        // In presenza di barra extra
        if (document.querySelector('#content-header-extra')) {
            if (currentScrollTop > b + offset) {
                myHeader.classList.remove('scrollDown', 'sticky-mid');
                myHeader.querySelectorAll('a, btn').forEach(el => el.setAttribute('tabindex', '0'));
                myHeader.setAttribute('aria-hidden', 'false');
            } else {
                myHeader.classList.add('scrollDown', 'sticky-mid');
                myHeader.querySelectorAll('a, btn').forEach(el => el.setAttribute('tabindex', '-1'));
                myHeader.setAttribute('aria-hidden', 'true');
            }
            myHeader.classList.remove('hide');
        }
        // Header default in fixed
        else {
            document.body.style.paddingTop = `${b}px`;
            if (c < currentScrollTop && a > b + b) {
                myHeader.classList.add('scrollDown', 'sticky-mid');
            } else if (c > currentScrollTop && !(a <= b)) {
                myHeader.classList.remove('scrollDown');
            } else if (c > currentScrollTop && a < b + b) {
                myHeader.classList.remove('sticky-mid');
            }
            c = currentScrollTop;
        }
    }
}

function scrollTabsCentered(myobj = null) {
    if (!myobj) return;
  
    // Get the parent <ul> element
    var myobjParent = myobj.parentElement;
  
    // Get the width of the parent container
    var containerwidth = myobjParent.offsetWidth;
  
    // Calculate the middle point of the element
    var middleItem = Math.floor(myobj.offsetWidth / 2);
  
    // Calculate the new scroll position to center the element
    var newScrollPos = myobj.offsetLeft - containerwidth / 2 + middleItem;
    console.log('myobj.offsetLeft: '+ myobj.offsetLeft );
    console.log('containerwidth / 2: '+ containerwidth / 2);
    console.log('middleItem: ' + middleItem);
    console.log('newScrollPos: ' + newScrollPos);
    // Animate the scroll to the new position
    myobjParent.scrollTo({
      left: newScrollPos,
      behavior: 'smooth'
    });
  }

function collapseObjectOnMobile(mycollapseobj = null) {
    if (mycollapseobj && document.querySelector(mycollapseobj) && (mq_Detect === "md" || mq_Detect === "lg")) {
        const collapseElement = document.querySelector(mycollapseobj);
        collapseElement.style.height = 'auto';
        collapseElement.removeAttribute('aria-expanded');
        collapseElement.classList.add('block-md', 'block-lg');
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

