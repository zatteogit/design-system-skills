/*****************************************************

    js base init- kit Bootstrap v5.3.2 - (c) Poste Italiane 2024 - GD//FS//DU

    Start Script
    Pack v1.0

*****************************************************/
if(document.getElementsByTagName('header')[0]!=null){
    var header_height = document.getElementsByTagName('header')[0].clientHeight;
    var scrollSpyLeftTarget = 'nav-sidebar-context';
}

if(document.getElementById('breadcrumb')!=null){
    brC=document.getElementById('breadcrumb');
    if(document.getElementById('main-title')!=null){
        abstR=document.getElementById('main-title');
    }
    var abstr_height = brC.clientHeight + abstR.clientHeight;
}else{
    if(document.getElementById('main-title')!=null){
        abstR=document.getElementById('main-title');
        var abstr_height = abstR.clientHeight ;
    }
}


window.addEventListener("load", function() {
    goto_from_url();
});

document.onreadystatechange = function() {
    if(document.getElementById(scrollSpyLeftTarget)){
        document.body.style.position = "relative";
        document.getElementsByTagName('html')[0].setAttribute('style','scroll-padding-top:'+ header_height +'px; scroll-behaviour: smooth');
        //var offsetOnScroll = (header_height + 10)+'px';
        var scrollSpy = new bootstrap.ScrollSpy(document.body, {
            target: 'body',
            //offset: header_height + 10
            rootMargin: '0px 0px 0px 0px'
        })
    }
};
    


/*********** ************** ***********/
/*********** document Ready ***********/
/*********** ************** ***********/

$(document).ready(function() {

    /*
    $('pre code.language-javascript').each(function(i, e) {
        escapeHtml($(this));
    });
    */


    /*********** Select Preview ***********/
    previewSelectMq($('.preview-services select'));

    $('.preview-services select').change(function () {
        previewSelectMq(this);
        return previewSelectMqCahnge = true;
    });



    /*********** Highlight JS ***********/
    $('pre code.language-html').each(function() {
        var that = $(this);
        // cache the content of 'code'
        var html = that.html().trim();
        that.empty();
        // escape the content
        that.text(html);
    });

    $('pre code').each(function(i, e) {
        hljs.highlightElement(e);
        /* Comprimi codice */
        if (!$(this).hasClass('visible')) {
            $(this).addClass('collapsed');
            $(this).parents('.code').find('.codehide').addClass('d-none');
        }
        else{
            $(this).parents('.code').find('.codeshow').addClass('d-none');
        }
    });


    /*********** Copy markup ***********/
    $(".copycode").on("click", function(e) {
        e.preventDefault();
        var myCodeContainer = $(this).parents(".code").find("code");
        var myCodeType = 'plaintext';
        var text = myCodeContainer.text().trim();
        var copyHex = document.createElement('textarea');

        if (myCodeContainer.hasClass("language-html")) {
            myCodeType = "Html";
        }
        if (myCodeContainer.hasClass("language-javascript")) {
            myCodeType = "Javascript";
        }
        if (myCodeContainer.hasClass("language-css")) {
            myCodeType = "Css";
        }

        copyHex.value = text
        document.body.appendChild(copyHex);

        try {
            copyHex.select();
            document.execCommand('copy');
            console.log('(type-1) contenuto copiato negli appunti' + '\n');
        } catch (err) {
            console.log('(type-2: ' + err + ') contenuto copiato negli appunti' + '\n');
            navigator.clipboard.writeText(text);
        } finally {
            console.log(copyHex.value)
            document.body.removeChild(copyHex);
            // info toast
            var toast = new bootstrap.Toast($('#codeToast'));
            toast.show();
            toastListener(myCodeType);
        }

    });

    function toastListener(myCodeType) {
        $("#codeToast").on("shown.bs.toast", function() {
            $('#codeToast').find('.toast-body .code-type').html(myCodeType);
        });
    }


});

/* CTA Comprimi codice */
$(".viewcode").on("click", function(e) {
    e.preventDefault();
    var myCodeContainer = $(this).parents(".code").find("code");
    var myCodeIconShow = $(this).parents(".code").find(".codeshow");
    var myCodeIconHide = $(this).parents(".code").find(".codehide");
    myCodeContainer.toggleClass('collapsed');
    myCodeIconShow.toggleClass('d-none');
    myCodeIconHide.toggleClass('d-none');
});