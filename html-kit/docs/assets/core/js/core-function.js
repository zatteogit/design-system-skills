/*****************************************************

    js base - kit Bootstrap v5.3.2 - (c) Poste Italiane 2024 - GD//FS//DU

    Pack v1.0
 
*****************************************************/



/******************/

/* page loader */

/******************/
var pageLoader = false;

$('head').ready(function() {

     if ($('.pageLoader')) {  

        if (pageLoader){

            var loaded = false;
            var timeoutLoad = 4000;
            var delayLoadTime = 800;

            $(document).ready(function() {
                loaded = true;
                $(".pageLoader").delay(delayLoadTime).fadeOut("slow");
                $(".pageLoader").attr('aria-busy','false');
            });

            setTimeout(function() {
                if (!loaded) {
                    $(".pageLoader").fadeOut("fast");
                    $(".pageLoader").attr('aria-busy','false');
                }
            }, timeoutLoad);
        }
        else{
            $('.pageLoader').remove();
        }
    }
    
});

/******************/

/* active on menu */

/******************/

var aurl = window.location.href.split('#')[0];

$('#navbar-default li a').filter(function() { 
    return $(this).prop('href') === aurl;
}).addClass('active');

$('#nav-sidebar li a').filter(function() { 
    return $(this).prop('href') === aurl;
}).addClass('active');

$(document).ready(function() {
    setTimeout(function() {
        $('#nav-sidebar .collapse').each(function() {
            var $accordion = $(this);
            var $accordionToggle = $accordion.prev('a'); 
            var hasActiveLink = $accordion.find('li.active').length > 0; 

            console.log('Accordion ID:', $accordion.attr('id'), 'Has active link:', hasActiveLink);

            if (hasActiveLink && !$accordion.hasClass('show')) {
                $accordionToggle[0].click();
            } else if (!hasActiveLink && $accordion.hasClass('show')) {
                $accordionToggle[0].click();
            }
        });
    }, 250); 
});


/******************/

/* preview: change cutpoint on select */

/******************/

function previewSelectMq(myselect){


/*

    var myQuery;
    var myPreviewValue;
    var urlQueries = new URLSearchParams(window.location.search);
    var myPreviewIframe = $(myselect).parents('.preview').find('iframe');
    
    myQuery = urlQueries.get('previewSet');

    if(!myQuery){
        alert("1");
        myPreviewValue = $(myselect).val();
        urlQueries.set("previewSet", myPreviewValue);
        window.location.search = urlQueries.toString();
    }else{
        $(myselect).val(myQuery);
        myPreviewValue = myQuery;

        alert("2");
    }



*/



    var myPreviewValue = $(myselect).val();
    var myPreviewIframe = $(myselect).parents('.preview').find('#iframepreview');
    
    myPreviewIframe.removeClass('resizable');
    
    switch(myPreviewValue){
        case 'default':
            myPreviewIframe.css('width', '100%');
            break;
        case 'xs':
            myPreviewIframe.css('width', '414px');
            $('.preview-caption').text('Device width: <576px');
            break;
        case 'sm':
            myPreviewIframe.css('width', '578px');
            $('.preview-caption').text('Device width: <768px');
            break;
        case 'md':
            myPreviewIframe.css('width', '780px'); //720?
            $('.preview-caption').text('Device width: <992px');
            break;
        case 'lg':
            myPreviewIframe.css('width', '994px');
            $('.preview-caption').text('Device width: <1200px');
            break;
        case 'xl':
            myPreviewIframe.css('width', '1202px');
            $('.preview-caption').text('Device width: <1400px');
            break;
        case 'xxl':
            myPreviewIframe.css('width', '1402px');
            $('.preview-caption').text('Device width: >1400px');
            break;
        case 'flessibile':
            myPreviewIframe.addClass('resizable');
            $('.preview-caption').text('Device width: flessibile');
            break;
    }
}



/******************/

/* escaper html for highlight*/

/******************/
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



/******************/

/* context nav */

/******************/

var inner_nav_links = document.querySelectorAll('#nav-sidebar-context li a');

var simClick = function(elem) {

    // Crea l'evento click (con opzioni)
    var evt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    });
    // Se annullato, non esegue l'evento
    var canceled = !elem.dispatchEvent(evt);
};

function goto_from_url() {
    if (window.location.hash) {
        simClick(document.querySelector('[ href="' + window.location.hash + '" ]'));
    }
}

/* 
function inner_nav() {

    for (const link of inner_nav_links) {
        link.addEventListener('click', clickHandler);
    }

    function clickHandler(e) {



        scrollSpy.scrollspy('dispose');
        e.preventDefault();
        var href = this.getAttribute('href');
        var anch_offsetTop = document.querySelector(href).offsetTop;
console.log(anch_offsetTop);
      //  if (anch_offsetTop != null && anch_offsetTop != '') {

console.log('header: ' + header_height.toString);

            scroll({
                top: anch_offsetTop - (header_height - 15),
                behavior: "smooth"
            });
            console.warn(anch_offsetTop);
        //}

           
        inner_nav_links.forEach(function(el) {
            el.classList.remove('active');
        });
 
        this.classList.add('active');
        
        
    }

}
*/