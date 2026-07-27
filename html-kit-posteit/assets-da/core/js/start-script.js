/*****************************************************

start-script.js - (c) Poste Italiane 2022

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

$(window).on('load', function() {


    /* Start Equalize */
    globalEqualize();

    /* Estendi equalize all'interno dei Tab */
    $('[data-toggle="tab"]').on('shown.bs.tab', function(e) {
        globalEqualize();
    });

    /* Estendi equalize all'interno di elementi collassati*/
    $('.collapse').on('shown.bs.collapse', function(e) {
        globalEqualize();
        $(this).removeAttr('aria-expanded'); /* rimuove attributi aria errati inseriti da BS3 su elementi collapse */
    });


    /*****************************************/
    /* apertura accordion con URL */
    /*****************************************/
    animationScrollAccordion(65);
    accordionOpenByUrl();

});

$(window).on('pageshow', function(e) { 
    if (e.originalEvent.persisted){
    /* force event for caching and browser navigation*/
        //focusLabelTransition(); // Intercetta il focus per gestire l'animazione delle label
        labelrePosition();      // Riposizionamento label su campi Input-group 
    }
    
});


$(document).ready(function() {
    
    /*****************************************/
    /* Centered tab/filter */
    /*****************************************/
    if($('.scroll-content-x.mode-center ul li').length > 0){
        $('.scroll-content-x.mode-center ul li').on('mouseup',function(){
            scrollTabsCentered($(this));
        });
    }
    if($('.scroll-content-x.mode-center ul li.active').length > 0){
        scrollTabsCentered($('.scroll-content-x.mode-center ul li.active'));
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
    /* Gestione Side offcanvas          */
    /*****************************************/
    overlayCreate();
   // navSideMenu('.menu-navigazione');
   // navSideMenu('#menu-navigazione.side-offcanvas');

    /*****************************************/
    /* Mostra di piu' */
    /*****************************************/
    //showMore();

    /*****************************************/
    /* Gestisce il back-to-top */
    /*****************************************/
    vaiTop();

    /*****************************************/
    /* Intercetta il focus tramite mouse/keyboard */
    /*****************************************/
    focusFormMouse();

    /*****************************************/
    /* Gestione Form  */
    /*****************************************/
    //focusLabelTransition(); // Intercetta il focus per gestire l'animazione delle label
    labelrePosition();      // Riposizionamento label su campi Input-group 
    focusInputGroup();      // Gestione colore focus sugli elementi input-group addon dei campi Input-group


    /*****************************************/
    /* Gestione Upload  */
    /*****************************************/
    focusInputUpload();
    checkFileNameUpload()   // Recupero nome file per campi upload base

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
    $('.carousel-swipe-soft').on('slid.bs.carousel', function (e) {
        var nextH = $(e.relatedTarget).height();
        $(this).find('.active.item').parent().animate({
            height: nextH
        }, 500);
    });

    /*****************************************/
    /* Attiva buttonToggle listener */
    /*****************************************/
    buttonToggle();

    /*****************************************/
    /* Collapse on Select - (vertical navtab transformation)*/
    /*****************************************/
    $(".self-select").change(function() {
        if ($(this).data('select-type') === 'infotabs') {

            $('nav[data-select-content="' + $(this).data('select-nav') + '"] ul li:nth-of-type(' + $(this).val() + ') a').trigger('click');

        } else {
            //select default ex. cc/postale
            var myactualVal = $(this).val();
            var myactualSelectId = $(this).attr('id');

            if ($('#' + myactualVal + '[data-parent="' + myactualSelectId + '"]').length > 0) {
                $('.self-contentblock[data-parent="' + myactualSelectId + '"]').not($('#' + myactualVal + '[data-parent="' + myactualSelectId + '"]')).hide(0, function() {
                    $('#' + myactualVal + '[data-parent="' + myactualSelectId + '"]').show(0);
                });
            } else {
                $('.self-contentblock' + '[data-parent="' + myactualSelectId + '"]').hide(0);
            }
        }

    });


    /************************/
    /* Messages - Scrollto  */
    /************************/
    if ($(".box-messages").length > 0) {
        $(".box-messages.box-danger ul li a, .box-messages.box-error ul li a").on('mouseup',function(e) {
            e.preventDefault();
            anchorScrollingToFocus(this, 80, true);
        });
    }


    /**********************/
    /* Fix scroll ancore  */
    /**********************/
    $('.no-anchor').click(function(e) {
        e.preventDefault();
    });

    /**************/
    /* Triggering */
    /**************/

    /* Trigger click date */
    if ($(".date").length > 0) {
        $(".date .input-group-addon").click(function() {
            var myInputTgt = $(this).prev();
            $(myInputTgt).focus()
        });
    }
    /* Trigger click/hover popoverInfo */
    if ($(".input-group-addon-info").length > 0) {
        $(".input-group-addon-info").click(function() {
            if ($(this).prev().attr('data-trigger') == 'focus') {
                var myInputTgt = $(this).prev();
                $(myInputTgt).focus();
            }
        });
        $(".input-group-addon-info").click(function() {
            if ($(this).parent('.input-group').find('select').attr('data-trigger') == 'focus') {
                var myInputTgt = $(this).parent('.input-group').find('select');
                $(myInputTgt).focus();
            }
        });
        $(".input-group-addon-info").on('mouseenter mouseleave', function(e) {
            if ($(this).prev().attr('data-trigger') == 'hover') {
                var myInputTgt = $(this).prev();
                $(myInputTgt).trigger(e.type);
            }
        });
        $(".input-group-addon-info").on('mouseenter mouseleave', function(e) {
            if ($(this).parent('.input-group').find('select').attr('data-trigger') == 'hover') {
                var myInputTgt = $(this).parent('.input-group').find('select');
                $(myInputTgt).trigger(e.type);
            }
        });
    }

    /*************/
    /* Calendari */
    /*************/

    /* Trigger click date */
    if ($(".date").length > 0) {

        if ($('html.pi-mobile').length > 0) {
            $('.input-group.date input').attr('type', 'date');
            $('.input-group.date input + .input-group-addon').removeClass('hide');
        }
    }


    /****************************/
    /* Generic - fix assenza js */
    /****************************/
    var nojsArray = ["nojs-block", "nojs-inline", "nojs-inline-block", "nojs-xs-block", "nojs-xs-inline", "nojs-xs-inline-block", "nojs-sm-block", "nojs-sm-inline", "nojs-sm-inline-block", "nojs-md-block", "nojs-md-inline", "nojs-md-inline-block", "nojs-lg-block", "nojs-lg-inline", "nojs-lg-inline-block"];

    $.each(nojsArray, function(i, val) {
        $("." + val).removeClass(val);
    });


    /****************************/
    /* Pause Emotional video on xs/sm */
    /****************************/
    videoControlmq(".carousel video", "xs");


    /***************/
    /* Generic modal - 'aria-hidden' */
    /***************/
    $('.modal').on('hidden.bs.modal', function (e) {
        $(this).attr('aria-hidden','true');
    });

    $('.modal').on('shown.bs.modal', function (e) {
        $(this).removeAttr('aria-hidden');
    });


    /***************/
    /* Modal video */
    /***************/
    if ($(".modal-iframe").length > 0) {
        // onload event
        $('.modal-iframe').each(function() {
            //set data-src-iframe="true" to avoid src removal
            if ($(this).data('src-iframe') == 'false') {
                var myid = $(this).attr('id');
                var mysrc = $('#' + myid + ' ' + 'iframe').attr('src');
                $('#' + myid + ' ' + 'iframe').attr('rel', mysrc);
                $('#' + myid + ' ' + 'iframe').removeAttr('src');
            }
        });
        // start event
        $('.start-modal-iframe').click(function() {
            var myDataTarget = $(this).attr('data-target');
            var src = $(myDataTarget + ' ' + 'iframe').attr('rel');
            $(myDataTarget + ' ' + 'iframe').attr('src', src);
        });
        // close event
        $('.modal-iframe').on('hide.bs.modal', function(e) {
            $('.modal-iframe iframe').removeAttr('src');
        });

    }

    if ($(".modal-nocdn").length > 0) {
        // onload event
        $('.modal-nocdn').each(function() {
            var myid = $(this).attr('id');
            var mysrc = $('#' + myid + ' ' + 'video source').attr('src');
            $('#' + myid + ' ' + 'video source').attr('rel', mysrc);
            $('#' + myid + ' ' + 'video source').removeAttr('src');
            $('#' + myid + ' ' + 'video').load();
        });
        // start event
        $('.modal-nocdn').click(function() {
            var myDataTarget = $(this).attr('data-target');
            var src = $(myDataTarget + ' ' + 'video source').attr('rel');
            $(myDataTarget + ' ' + 'video source').attr('src', src);
            $(myDataTarget + ' ' + 'video').load();
        });
        // close event
        $('.modal-nocdn').on('hide.bs.modal', function(e) {
            $('.modal-nocdn video source').removeAttr('src');
            $('.modal-nocdn video').load();
        });
    }

    if ($(".modal-cdn").length > 0) {

        //start event
        $('.start-modal-cdn').click(function() {
            var myDataTarget = $(this).attr('data-target');
            var myCDNvideoTarget = $(myDataTarget + ' video').attr('id');
            $(myDataTarget + ' .azuremediaplayer').removeAttr('style');
            amp(myCDNvideoTarget).play();
        });

        // close event
        $('.modal-cdn').on('hide.bs.modal', function(e) {
            var myModalTarget = $(this).attr('id');
            var myCDNvideoTarget = $('#' + myModalTarget + ' video').attr('id');
            amp(myCDNvideoTarget).pause();
        });

    }

    /************/
    /* Carousel */
    /************/
    $(".carousel .item .container").wrap("<div class='carousel-overlay'></div>");


    $('.carousel .carousel-indicators li').focus(function() {
        $(this).keydown(function(event) {
            if (event.key == 'Enter' || event.key == ' ') {
                $(this).parents('.carousel').carousel(parseInt($(this).attr('data-slide-to')));
                event.preventDefault();
            }
        });
    });


    /********************/
    /* responsive tabs  */
    /********************/
    if ($(".horizontal-nav-tabs").length > 0) {
        $(".horizontal-nav-tabs li").each(function(indice) {
            if (indice == 0) {
                $(this).addClass('active');
            }
        });
    }

    /******************/
    /* Tabs verticali */
    /******************/

    if ($("ul.nav-tabs li a").length > 0) {
        $("ul.nav-tabs li a").each(function(i) {

            var myrel = $(this).attr("rel");
            var myhref = $(this).attr("href");
            $(this).attr("rel", myhref);
            $(this).attr("href", myrel);

        });
    }


    
    /*********************************/
    /* Check focus */
    /*********************************/

    /* panel-cards-opacity */

    $('.panel-cards-opacity').each(function(index) {
        $(this).attr('role', 'region');
        $(this).find('.extra-info').attr('aria-expanded', 'false');
    });
    $('.panel-cards-opacity .btn-card').focus(function() {
        $(this).parents('.panel-cards-opacity').addClass('focus');
        $(this).parents('.panel-cards-opacity').find('.extra-info').attr('aria-expanded', 'true');
    });
    $('.panel-cards-opacity .btn-card').focusout(function() {
        $(this).parents('.panel-cards-opacity').removeClass('focus');
        $(this).parents('.panel-cards-opacity').find('.extra-info').attr('aria-expanded', 'false');
    });
    $('.panel-cards-opacity').mouseover(function() {
        $(this).addClass('focus');
        $(this).find('.extra-info').attr('aria-expanded', 'true');
    });
    $('.panel-cards-opacity').mouseout(function() {
        $(this).removeClass('focus');
        $(this).find('.extra-info').attr('aria-expanded', 'false');
    });


    /* rangeBar */
    rangeBar();

    // gestione sidebar e relativo overlay
    //$('.side-offcanvas-close').prop('hidden',true); // attributo hidden on ready by js per seo
    overlayOff('overlay');

    var overlayOp = {
        concealable: false,
        bdNoOverflow: true
    };

    offcanvasToggle('.offcanvas-toggle', overlayOp);
    offcanvasClose('.close-side-offcanvas');


    /* assistenza skip link */
    triggerHelpLink();

    /* Verifica supporto JS */
    $('body').removeClass('no-js');


    /* responsive tables indicatori sullo scroll orizzontale */
    tableIndicators('.table-responsive');


    /* slick slider tabindex vs aria-hidden editable-aea campaign alfa .*/
    if($('.campaign-alfa .slick-slide .box-editable-area')){
        $('.campaign-alfa .slick-slide .box-editable-area').attr('tabindex','-1');
        $('.campaign-alfa .slick-slide.slick-active .box-editable-area').attr('tabindex','0');

        $('.campaign-alfa.slick-slider').on('afterChange',function(){
            $('.campaign-alfa .slick-slide .box-editable-area').attr('tabindex','-1');
            $('.campaign-alfa .slick-slide.slick-active .box-editable-area').attr('tabindex','0');
        });
    }

    setHoffCanFixed($('.side-offcanvas-content-fixed .side-offcanvas-content-wrap'));


});


var timeoutFuncExe = false;

$(window).resize(function() {

    clearTimeout(timeoutObj);
    timeoutObj = setTimeout(function() {

        if($('.scroll-content-x.mode-center ul li.active').length > 0){
            /**** ScrollTabCenter ****/
            scrollTabsCentered($('.scroll-content-x.mode-center ul li.active'));
        }

        $('.carousel-swipe-soft .carousel-inner').css('height','auto');

        /**** collapse object only in xs and sm ****/
        collapseObjectOnMobile('.collapse-filter');

        /**** sticky header ****/
        stickyHeader('header.sticky .sticky-wrap');

        /**** Start equalize on resize ****/
        globalEqualize();

        /**** Remove Emotional video on xs/sm ****/
        videoControlmq(".carousel video", "xs");


    }, 500);


    /**** Popover on start resizing ****/

    if($('[data-toggle=popover]').length){
        $('[data-toggle=popover]').each(function(){
            $(this).removeAttr('aria-describedby');
            $(this).removeClass('focus-mouse').popover('hide');
            $(this).blur();
        });
    }

    setHoffCanFixed($('.side-offcanvas-content-fixed .side-offcanvas-content-wrap'));

});

$(window).scroll('scroll',function() {
    
    /**** Icon Scroll on FullpageHero Carousel ****/
    iconScrollFading('.icon-scroll');

    /**** sticky header ****/
    stickyHeader('header.sticky .sticky-wrap');
   
    clearTimeout(timeoutObj);
    timeoutObj = setTimeout(function() {
        $('.slick-slider').slick('slickNext');
    }, 500);
});