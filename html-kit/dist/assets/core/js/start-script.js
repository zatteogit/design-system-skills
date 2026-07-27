/*****************************************************

start-script.js - (c) Poste Italiane 2025

*****************************************************/

//domainCheck = true;
//browserCheck = true;

/************************************/
/* Gestisci equalize dove richiesto */
/************************************/
function globalEqualize() {
    equalize('.equalize');
    equalize('.equalize-1');
    equalize('.equalize-2');
    equalize('.equalize-3');
    equalize('.panel-cards-comparison .panel-heading');
    equalize('.panel-cards-comparison .panel-body');
    equalizeCycle('.equalize-wrap', '.obj-wrap');
    equalizeCycle('.equalize-group', '.panel-cards');
    equalizeCycle('.equalize-group', '.keybtn');
    equalizeCycle('.equalize-group', '.panel-cards.mode-ctaset .cards-wrap.panel-wrap');
    equalizeCycle('.equalize-wrap', '.showcase-wrap');
    equalizeCycle('.equalize-wrap', '.main-pills-wrap');
    equalizeCycle('.equalize-wrap', '.box-frame .box-heading');
    equalizeCycle('.equalize-wrap', '.box-frame .box-body');
    equalizeCycle('.equalize-wrap', '.box-rack .box-heading');
    equalizeCycle('.equalize-wrap', '.box-rack .box-body');
    equalizeCycle('.equalize-wrap', '.panel-cards-trendy .panel-heading');
    equalizeCycle('.equalize-wrap', '.panel-cards-trendy .panel-body');
    equalizeCycle('.equalize-mosaic-wrap', '.mosaic-wrap', mosaicPictureHeight);
    equalizeCycle('.equalize-myp-mixedcard', '.myp-mixedcard', mypMixedCardHeight);
}

window.addEventListener('load', function () {

    /* dark/light appropriately switch */
    illuminate();

    /* show-hide handler */
    piShowHide();

    /* Start Equalize */
    globalEqualize();

    /* Estendi equalize all'interno dei Tab */
    document.querySelectorAll('[data-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function () {
            globalEqualize();
        });
    });

    /* Estendi equalize all'interno di elementi collassati*/
    document.querySelectorAll('.collapse').forEach(collapse => {
        collapse.addEventListener('shown.bs.collapse', function () {
            globalEqualize();
            this.removeAttribute('aria-expanded'); // rimuove attributi aria errati inseriti da BS3 su elementi collapse
        });
    });


    /*****************************************/
    /* apertura accordion con URL */
    /*****************************************/
    animationScrollAccordion(65);
    accordionOpenByUrl();
});



document.addEventListener('DOMContentLoaded', function () {

    /*****************************************/
    /* Centered tab/filter */
    /*****************************************/
    const scrollContentXCentered = document.querySelectorAll('.scroll-content-x.mode-center ul li');
    if (scrollContentXCentered.length > 0) {
        scrollContentXCentered.forEach(li => {
            li.addEventListener('mouseup', function () {
                scrollTabsCentered(this);
            });
        });
    }

    if (document.querySelector('.scroll-content-x.mode-center ul li.active')) {
        scrollTabsCentered(document.querySelector('.scroll-content-x.mode-center ul li.active'));
    }

    /*****************************************/
    /**** Ripple animation on Button ****/
    /*****************************************/
    btnRippleAnimation();

    /*****************************************/
    /**** collapse object only in xs and sm ****/
    /*****************************************/
    collapseObjectOnMobile('.collapse-filter');

    /*****************************************/
    /* sticky header */
    /*****************************************/
    stickyHeader('header.sticky .sticky-wrap');

    /*****************************************/
    /* Intercetta il focus tramite mouse/keyboard */
    /*****************************************/
    focusFormMouse();

    /************************************/
    /* Retina */
    /************************************/

    if (isRetina()) {
        writeLog('detect Retina display');
    } else if (isHighDensity()) {
        writeLog('detect HighDensity display');
    }

    /************************************/
    /* Abilita soft animation su item con altezze differenti */
    /************************************/
    document.querySelectorAll('.carousel-swipe-soft').forEach(carousel => {
        carousel.addEventListener('slid.bs.carousel', function (e) {
            const nextH = e.relatedTarget.offsetHeight;
            this.querySelector('.active.item').parentNode.style.height = `${nextH}px`;
        });
    });

    /*****************************************/
    /* Attiva buttonToggle listener */
    /*****************************************/
    buttonToggle();

    /*****************************************/
    /* Collapse on Select - (vertical navtab transformation)*/
    /*****************************************/
    document.querySelectorAll(".self-select").forEach(select => {
        select.addEventListener("change", function () {
            if (this.dataset.selectType === 'infotabs') {
                document.querySelector(`nav[data-select-content="${this.dataset.selectNav}"] ul li:nth-of-type(${this.value}) a`).click();
            } else {
                const myactualVal = this.value;
                const myactualSelectId = this.id;
                const targetContent = document.querySelector(`#${myactualVal}[data-parent="${myactualSelectId}"]`);
                if (targetContent) {
                    document.querySelectorAll(`.self-contentblock[data-parent="${myactualSelectId}"]`).forEach(content => {
                        if (content !== targetContent) {
                            content.style.display = 'none';
                        } else {
                            content.style.display = 'block';
                        }
                    });
                } else {
                    document.querySelectorAll(`.self-contentblock[data-parent="${myactualSelectId}"]`).forEach(content => {
                        content.style.display = 'none';
                    });
                }
            }
        });
    });


    /************************/
    /* Messages - Scrollto  */
    /************************/
    const boxMessages = document.querySelector(".box-messages");
    if (boxMessages) {
        document.querySelectorAll(".box-messages.box-danger ul li a, .box-messages.box-error ul li a").forEach(link => {
            link.addEventListener('mouseup', function (e) {
                e.preventDefault();
                anchorScrollingToFocus(this, 80, true);
            });
        });
    }


    /**********************/
    /* Fix scroll ancore  */
    /**********************/
    document.querySelectorAll('.no-anchor').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
        });
    });

    /**************/
    /* Triggering */
    /**************/

    /* Trigger click date */
    const dateElements = document.querySelectorAll(".date");
    if (dateElements.length > 0) {
        dateElements.forEach(dateElem => {
            dateElem.querySelector(".input-group-addon").addEventListener("click", function () {
                this.previousElementSibling.focus();
            });
        });
    }
    /* Trigger click/hover popoverInfo */
    const popoverInfo = document.querySelectorAll(".input-group-addon-info");
    if (popoverInfo.length > 0) {
        popoverInfo.forEach(info => {
            info.addEventListener("click", function () {
                if (this.previousElementSibling.dataset.trigger === 'focus') {
                    this.previousElementSibling.focus();
                }
            });
            info.addEventListener("click", function () {
                if (this.parentNode.querySelector('select').dataset.trigger === 'focus') {
                    this.parentNode.querySelector('select').focus();
                }
            });
            info.addEventListener("mouseenter", function () {
                if (this.previousElementSibling.dataset.trigger === 'hover') {
                    this.previousElementSibling.dispatchEvent(new Event("mouseenter"));
                }
            });
            info.addEventListener("mouseleave", function () {
                if (this.previousElementSibling.dataset.trigger === 'hover') {
                    this.previousElementSibling.dispatchEvent(new Event("mouseleave"));
                }
            });
            info.addEventListener("mouseenter", function () {
                if (this.parentNode.querySelector('select').dataset.trigger === 'hover') {
                    this.parentNode.querySelector('select').dispatchEvent(new Event("mouseenter"));
                }
            });
            info.addEventListener("mouseleave", function () {
                if (this.parentNode.querySelector('select').dataset.trigger === 'hover') {
                    this.parentNode.querySelector('select').dispatchEvent(new Event("mouseleave"));
                }
            });
        });
    }

    /*************/
    /* Calendari */
    /*************/

    /* Trigger click date */
    if (dateElements.length > 0) {
        if (document.querySelector('html.pi-mobile')) {
            dateElements.forEach(dateElem => {
                dateElem.querySelector('input').setAttribute('type', 'date');
                dateElem.querySelector('.input-group-addon').classList.remove('hide');
            });
        }
    }


    /****************************/
    /* Generic - fix assenza js */
    /****************************/
    const nojsArray = ["nojs-block", "nojs-inline", "nojs-inline-block", "nojs-xs-block", "nojs-xs-inline", "nojs-xs-inline-block", "nojs-sm-block", "nojs-sm-inline", "nojs-sm-inline-block", "nojs-md-block", "nojs-md-inline", "nojs-md-inline-block", "nojs-lg-block", "nojs-lg-inline", "nojs-lg-inline-block"];

    nojsArray.forEach(val => {
        document.querySelectorAll("." + val).forEach(elem => {
            elem.classList.remove(val);
        });
    });


    /***************/
    /* Generic modal - 'aria-hidden' */
    /***************/
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function () {
            this.setAttribute('aria-hidden', 'true');
        });
        modal.addEventListener('shown.bs.modal', function () {
            this.removeAttribute('aria-hidden');
        });
    });


    /***************/
    /* Modal video */
    /***************/
    //BUTTARE?
    const modalIframes = document.querySelectorAll(".modal-iframe");
    if (modalIframes.length > 0) {
        // onload event
        modalIframes.forEach(modal => {
            //set data-src-iframe="true" to avoid src removal
            if (modal.dataset.srcIframe == 'false') {
                const iframe = modal.querySelector('iframe');
                const src = iframe.getAttribute('src');
                iframe.setAttribute('rel', src);
                iframe.removeAttribute('src');
            }
        });
        // start event
        document.querySelectorAll('.start-modal-iframe').forEach(btn => {
            btn.addEventListener('click', function () {
                const myDataTarget = this.dataset.target;
                const src = document.querySelector(myDataTarget + ' iframe').getAttribute('rel');
                document.querySelector(myDataTarget + ' iframe').setAttribute('src', src);
            });
        });
        // close event
        document.querySelectorAll('.modal-iframe').forEach(modal => {
            modal.addEventListener('hide.bs.modal', function () {
                this.querySelector('iframe').removeAttribute('src');
            });
        });
    }

    const modalNocdns = document.querySelectorAll(".modal-nocdn");
    if (modalNocdns.length > 0) {
        // onload event
        modalNocdns.forEach(modal => {
            const videoSource = modal.querySelector('video source');
            const src = videoSource.getAttribute('src');
            videoSource.setAttribute('rel', src);
            videoSource.removeAttribute('src');
            modal.querySelector('video').load();
        });
        // start event
        document.querySelectorAll('.modal-nocdn').forEach(modal => {
            modal.addEventListener('click', function () {
                const myDataTarget = this.dataset.target;
                const src = document.querySelector(myDataTarget + ' video source').getAttribute('rel');
                document.querySelector(myDataTarget + ' video source').setAttribute('src', src);
                document.querySelector(myDataTarget + ' video').load();
            });
        });
        // close event
        document.querySelectorAll('.modal-nocdn').forEach(modal => {
            modal.addEventListener('hide.bs.modal', function () {
                this.querySelector('video source').removeAttribute('src');
                this.querySelector('video').load();
            });
        });
    }

    const modalCdns = document.querySelectorAll(".modal-cdn");
    if (modalCdns.length > 0) {
        //start event
        document.querySelectorAll('.start-modal-cdn').forEach(btn => {
            btn.addEventListener('click', function () {
                const myDataTarget = this.dataset.target;
                const myCDNvideoTarget = document.querySelector(myDataTarget + ' video').id;
                document.querySelector(myDataTarget + ' .azuremediaplayer').removeAttribute('style');
                amp(myCDNvideoTarget).play();
            });
        });
        // close event
        document.querySelectorAll('.modal-cdn').forEach(modal => {
            modal.addEventListener('hide.bs.modal', function () {
                const myModalTarget = this.id;
                const myCDNvideoTarget = document.querySelector('#' + myModalTarget + ' video').id;
                amp(myCDNvideoTarget).pause();
            });
        });
    }

    /************/
    /* Carousel */
    /************/

    //BUTTARE?

    document.querySelectorAll(".carousel .item .container").forEach(container => {
        container.parentNode.classList.add('carousel-overlay');
    });


    document.querySelectorAll('.carousel .carousel-indicators li').forEach(indicator => {
        indicator.addEventListener('focus', function () {
            this.addEventListener('keydown', function (event) {
                if (event.key == 'Enter' || event.key == ' ') {
                    this.closest('.carousel').carousel(parseInt(this.dataset.slideTo));
                    event.preventDefault();
                }
            });
        });
    });


    /********************/
    /* responsive tabs  */
    /********************/

    if (document.querySelectorAll(".horizontal-nav-tabs").length > 0) {
        const tabs = document.querySelectorAll(".horizontal-nav-tabs li");
        tabs[0].classList.add('active');
    }

    /******************/
    /* Tabs verticali */
    /******************/

    const verticalNavTabs = document.querySelectorAll("ul.nav-tabs li a");
    if (verticalNavTabs.length > 0) {
        verticalNavTabs.forEach(tab => {
            const myrel = tab.getAttribute("rel");
            const myhref = tab.getAttribute("href");
            tab.setAttribute("rel", myhref);
            tab.setAttribute("href", myrel);
        });
    }


    /*********************************/
    /* Check focus */
    /*********************************/

    /* panel-cards-opacity */

    document.querySelectorAll('.panel-cards-opacity').forEach(panelCard => {
        panelCard.setAttribute('role', 'region');
        panelCard.querySelector('.extra-info').setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('.panel-cards-opacity .btn-card').forEach(btn => {
        btn.addEventListener('focus', function () {
            this.closest('.panel-cards-opacity').classList.add('focus');
            this.closest('.panel-cards-opacity').querySelector('.extra-info').setAttribute('aria-expanded', 'true');
        });
        btn.addEventListener('focusout', function () {
            this.closest('.panel-cards-opacity').classList.remove('focus');
            this.closest('.panel-cards-opacity').querySelector('.extra-info').setAttribute('aria-expanded', 'false');
        });
    });

    document.querySelectorAll('.panel-cards-opacity').forEach(panelCard => {
        panelCard.addEventListener('mouseover', function () {
            this.classList.add('focus');
            this.querySelector('.extra-info').setAttribute('aria-expanded', 'true');
        });
        panelCard.addEventListener('mouseout', function () {
            this.classList.remove('focus');
            this.querySelector('.extra-info').setAttribute('aria-expanded', 'false');
        });
    });


    /* rangeBar */
    rangeBar();

    /* Verifica supporto JS */
    document.body.classList.remove('no-js');


    /* responsive tables indicatori sullo scroll orizzontale */
    tableIndicators('.table-responsive');


    /* slick slider tabindex vs aria-hidden editable-aea campaign alfa .*/
    const campaignAlfaEditableAreas = document.querySelectorAll('.campaign-alfa .slick-slide .box-editable-area');
    if (campaignAlfaEditableAreas.length > 0) {
        campaignAlfaEditableAreas.forEach(area => {
            area.setAttribute('tabindex', '-1');
        });
        document.querySelectorAll('.campaign-alfa .slick-slide.slick-active .box-editable-area').forEach(area => {
            area.setAttribute('tabindex', '0');
        });

        document.querySelector('.campaign-alfa.slick-slider').addEventListener('afterChange', function () {
            document.querySelectorAll('.campaign-alfa .slick-slide .box-editable-area').forEach(area => {
                area.setAttribute('tabindex', '-1');
            });
            document.querySelectorAll('.campaign-alfa .slick-slide.slick-active .box-editable-area').forEach(area => {
                area.setAttribute('tabindex', '0');
            });
        });
    }

   // setHoffCanFixed(document.querySelector('.side-offcanvas-content-fixed .side-offcanvas-content-wrap'));
});

let timeoutFuncExe = false;

window.addEventListener('resize', function () {
    clearTimeout(timeoutObj);
    timeoutObj = setTimeout(function () {
        if (document.querySelector('.scroll-content-x.mode-center ul li.active')) {
            /**** ScrollTabCenter ****/
            scrollTabsCentered(document.querySelector('.scroll-content-x.mode-center ul li.active'));
        }

        document.querySelectorAll('.carousel-swipe-soft .carousel-inner').forEach(carousel => {
            carousel.style.height = 'auto';
        });

        /**** collapse object only in xs and sm ****/
        collapseObjectOnMobile('.collapse-filter');

        /**** sticky header ****/
        stickyHeader('header.sticky .sticky-wrap');

        /**** Start equalize on resize ****/
        globalEqualize();

         /* dark-light switcher */
        illuminate();

        /* responsive tables indicatori sullo scroll orizzontale */
        tableIndicators('.table-responsive');
        
    }, 50);

    /**** Popover on start resizing ****/

    document.querySelectorAll('[data-toggle=popover]').forEach(popover => {
        popover.removeAttribute('aria-describedby');
        popover.classList.remove('focus-mouse');
        popover.blur();
        popover.dispatchEvent(new Event('hide.bs.popover'));
    });

   // setHoffCanFixed(document.querySelector('.side-offcanvas-content-fixed .side-offcanvas-content-wrap'));

});

// allo scroll della finestra
window.addEventListener('scroll', function () {
    /**** Icon Scroll on FullpageHero Carousel ****/
    iconScrollFading('.icon-scroll');

    /**** sticky header ****/
    stickyHeader('header.sticky .sticky-wrap');
});