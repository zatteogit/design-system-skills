/*****************************************************

poste-it.js - (c) Poste Italiane 2022

*****************************************************/
// color base
var $color_base = "#FDFDFD";

// color neutral
var $color_neutral_10 = "#1a1c1e";
var $color_neutral_30 = "#46474a";
var $color_neutral_40 = "#5d5e61";
var $color_neutral_60 = "#909194";
var $color_neutral_80 = "#c6c6c9";
var $color_neutral_90 = "#e2e2e6";
var $color_neutral_95 = "#f0f0f3";
var $color_neutral_97 = "#f5f5f7";
var $color_neutral_100 = "#fff";

// color primary
var $color_primary_20 = "#00297a";
var $color_primary_33 = "#0047bb";     //primario default
var $color_primary_50 = "#4270e4";
var $color_primary_90 = "#dae2ff";
var $color_primary_95 = "#eef0ff";
var $color_primary_97 = "#f2f8ff";     //rinominato in dls ice_blue_97

// color secondary
var $color_secondary_90 = "#f2e865";
var $color_secondary_87 = "#eedc00";   //secondario default
var $color_secondary_95 = "#fff47e";

// section
var $color_section_premium = "#002e5d";

// color banner
var $color_banner_97 = "#fcf7e4";

// color success
var $color_success_40 = "#006d36";
var $color_success_95 = "#ccebc3";
var $color_success_95 = "#EFF9EC";

// color evidence
var $color_evidence_40 = "#df7400";
var $color_evidence_95 = "#FFF0E5";

// color error
var $color_error_40 = "#ba1b1b"; // alias di color_alert_40
var $color_error_95 = "#FFE9E5"; // alias di color_error_95


// color outline
var $color_outline_onlight = "#E47701";

// cards, pills and boxes
var $shadow_default = "2px 2px 8px 8px rgba(0,0,0,0.05)";
var $border_default = "1px solid #F3F3F3";
var $border_marked = "1px solid #e2e2e6";
var $radius_default = "8px";

// typografy
var $standard_font_size = "16px";
var $standard_line_height = "1.5rem";

var $fw_thin = "      200";
var $fw_light = "     300";
var $fw_regular = "   400";
var $fw_medium = "    500";
var $fw_semibold = "  600";
var $fw_bold = "      700";


var backdropMenu = false;

/**********************************************************/
/* go Top function */
/**********************************************************/
function vaiTop() {

  //setta in pixel dopo quanto visualizzare top a seconda del cutpoint

  if (mq_Detect == 'sm' || mq_Detect == 'xs') {
    var offset = 350;
  } else {
    var offset = 1200;
  }

  var duration = 1000;

  $(window).scroll(function () {
    if ($(this).scrollTop() > offset) {
      $('.back-to-top').fadeIn(duration);

      //verifica che lo scroll sia inattivo e dopo 1sec nasconde il top
      clearTimeout($.data(this, 'scrollTimer'));
      $.data(this, 'scrollTimer', setTimeout(function () {
        $('.back-to-top').fadeOut('slow');
      }, duration + duration));

    } else {
      $('.back-to-top').fadeOut(duration);
    }
  });

  $('.back-to-top').on('mouseup', function (event) {
    event.preventDefault();
    $('html, body').animate({
      scrollTop: 0
    }, duration);
    return false;
  });

}


/**********************************************************/
/* Remove video on xs/sm */
/**********************************************************/

function videoControlmq(myVideo, myCutpoint) {
  if (!($('html').hasClass('pi-mobile'))) {
    if (($(myVideo).length > 0)) {
      if (mq_Detect == myCutpoint) {
        $(myVideo).each(function () {

          if ($(".azuremediaplayer").length > 0) {
            var myVideoId_cdn_xs = $(".azuremediaplayer video").attr('id');
            amp(myVideoId_cdn_xs).pause();

          } else {
            var myVideoId = $(this).attr('id');
            var myVideoSrc = $('#' + myVideoId + ' source').attr('src');

            $('#' + myVideoId + ' source').attr('rel', myVideoSrc);
            $('#' + myVideoId + ' source').removeAttr('src');
            $('#' + myVideoId).load();
          }
        });
      } else {
        $(myVideo).each(function () {
          if ($(".azuremediaplayer").length > 0) {
            var myVideoId_cdn_lg = $(".azuremediaplayer video").attr('id');
            amp(myVideoId_cdn_lg).play();

          } else {
            var myVideoId = $(this).attr('id');
            var myVideoRel = $('#' + myVideoId + ' source').attr('rel');

            $('#' + myVideoId + ' source').attr('src', myVideoRel);
            $('#' + myVideoId + ' source').removeAttr('rel');
            $('#' + myVideoId).load();
          }
        });
      }
    }
  }
}

/**********************************************************/
/* Slick config start */
/**********************************************************/
// $.extend(

// it lang translation
var it_slick_translation = {
  prevArrow: '<button aria-label="Slide precedente" class="slick-prev" type="button"><span class="slick-prev-icon" aria-hidden="true"></span><span class="slick-sr-only">Precedente</span></button>',
  nextArrow: '<button aria-label="Slide successiva" class="slick-next" type="button"><span class="slick-next-icon" aria-hidden="true"></span><span class="slick-sr-only">Successiva</span></button>',

  customPaging: function (slider, i) {
    var random_id = Math.floor(Math.random() * 1000000);
    return $('<button aria-labelledby="sl_slide_' + random_id + '" type="button"><span class="slick-dot-icon" aria-hidden="true"></span><span id="sl_slide_' + random_id + '" class="slick-sr-only">Vai alla slide ' + (i + 1) + '</span></button>');
  }
}

// it lang translation
var it_slick_translation_filter = {
  prevArrow: '<button aria-label="Filtro precedente" class="slick-prev" type="button"><span class="slick-prev-icon" aria-hidden="true"></span><span class="slick-sr-only">Precedente</span></button>',
  nextArrow: '<button aria-label="Filtro successiva" class="slick-next" type="button"><span class="slick-next-icon" aria-hidden="true"></span><span class="slick-sr-only">Successiva</span></button>',

  customPaging: function (slider, i) {
    var random_id = Math.floor(Math.random() * 1000000);
    return $('<button aria-labelledby="sl_slide_' + random_id + '" type="button"><span class="slick-dot-icon" aria-hidden="true"></span><span id="sl_slide_' + random_id + '" class="slick-sr-only">Vai al filtro ' + (i + 1) + '</span></button>');
  }
}

/******** scroller single elem / comparison cards ********/
$('.slick-h-scroll .slick-h-scroll-item-unique').slick($.extend({
  dots: true,
  infinite: false,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
  responsive: [{
    breakpoint: 767,
    settings: {
      slidesToShow: 1.2,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));

/******** scroller double elem / myp ********/
$('.slick-h-scroll .slick-h-scroll-item-double').slick($.extend({
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 1,
  responsive: [{
    breakpoint: 767,
    settings: {
      slidesToShow: 1.2,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));

/******** scroller double elem / myp ********/
$('.slick-h-scroll .slick-h-scroll-item-double-optdevice').slick($.extend({
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 1,
  responsive: [{
    breakpoint: 991,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1
    }
  }, {
    breakpoint: 767,
    settings: {
      slidesToShow: 1.2,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));

/******** scroller double elem / myp ********/
$('.slick-h-scroll .slick-h-scroll-item-double-optdevice-fullspace').slick($.extend({
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 1,
  responsive: [{
    breakpoint: 991,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1
    }
  }, {
    breakpoint: 767,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));

/******** scroller news cards / comparison cards ********/
$('.slick-h-scroll .slick-h-scroll-items').slick($.extend({
  dots: true,
  infinite: false,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 3,
  responsive: [{
    breakpoint: 992,
    settings: {
      slidesToShow: 2,
      slidesToScroll: 2
    }
  }, {
    breakpoint: 768,
    settings: {
      slidesToShow: 1.2,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));


/******** scroller cards paymemt ********/
$('.slick-h-scroll .slick-h-scroll-items-cards-payment').slick($.extend({
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 3,
  slidesToScroll: 3,
  responsive: [{
    breakpoint: 768,
    settings: {
      slidesToShow: 1.6,
      slidesToScroll: 1
    }
  }, {
    breakpoint: 720,
    settings: {
      slidesToShow: 1.5,
      slidesToScroll: 1
    }
  }, {
    breakpoint: 585,
    settings: {
      slidesToShow: 1.3,
      slidesToScroll: 1
    }
  }, {
    breakpoint: 540,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1
    }
  }]
}, it_slick_translation));


/******** servizi in evidenza ********/
$('.slick-scroll .slick-scroll-items-evidence').slick($.extend({
  regionLabel: 'aria label da personalizzare lorem ipsum sed nunc facilis items evidence',
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 8,
  slidesToScroll: 8,
  responsive: [{
    breakpoint: 991,
    settings: {
      slidesToShow: 6,
      slidesToScroll: 3
    }
  }, {
    breakpoint: 767,
    settings: {
      slidesToShow: 3.5,
      slidesToScroll: 3
    }
  }]
}, it_slick_translation));


/********* scroller tab giallo/blu generico *********/
$('.basictab').slick($.extend({
  slidesToShow: 5, // considerare il set minimo in base allo zoom 200%
  slidesToScroll: 1,
  infinite: false,
  arrows: true,
  centerMode: false, // inibisce il tabkey
  focusOnSelect: false,
  swipeToSlide: true,
  variableWidth: true //vincolo sul center mode
  ,
  responsive: [{
    breakpoint: 992,
    settings: {
      slidesToShow: 3,
      slidesToScroll: 1,
      centerMode: false,
      arrows: true,
      variableWidth: true
    }
  },
  {
    breakpoint: 768,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1,
      centerMode: false,
      variableWidth: true
    }
  }]
}, it_slick_translation));


/********* cerca *********/
$('.slick-scroll-filter .container-switch').slick($.extend({
  regionLabel: 'aria label da personalizzare lorem ipsum sed nunc facilis items evidence',
  dots: false,
  infinite: false,
  speed: 500,
  arrows: true,
  slidesToShow: 4,
  slidesToScroll: 1,
  variableWidth: true,
  responsive: [{
    breakpoint: 992,
    settings: {
      slidesToShow: 1,
      slidesToScroll: 1,
      centerMode: false,
      swipeToSlide: true,
      variableWidth: true
    }
  }]
}, it_slick_translation_filter));

/********* conf main banner *********/
var slickOptMap = {
  regionLabel: 'aria label da personalizzare lorem ipsum sed nunc facilis',
  autoplay: true,
  useAutoplayToggleButton: true,
  autoplaySpeed: 8000,
  dots: true,
  arrows: true,
  appendArrows: '.hero-arrows',
  appendDots: '.slick-dots-hero-progressive',
  infinite: true,
  slidesToShow: 1,
  slidesToScroll: 1,
  centerMode: true,
  variableWidth: false,
  fade: true,
  speed: 1000,
  adaptiveHeight: false,
  responsive: [
    {
      breakpoint: 992,
      settings: {
        appendArrows: '.hero-arrows'
      }
    }, {
      breakpoint: 768,
      settings: {
        adaptiveHeight: true,
        appendArrows: '.hero-arrows'
      }
    }]
};
$.extend(slickOptMap, it_slick_translation);

/*** Call main banner ***/
$('.hero-h-scroll').slick(slickOptMap);

/*** Progressive-dots main banner ***/
createHeroProg('.hero-h-scroll');

/*** Animation effect ***/
$('.hero-h-scroll').on('beforeChange', function (event, slick, currentSlide, nextSlide) {
  $('#content-abstract-hero .hero-h-scroll div[data-slick-index="' + nextSlide + '"] .abstract-wrap').removeClass('animation-fadeFromRight');
  $('#content-abstract-hero .hero-h-scroll div[data-slick-index="' + currentSlide + '"] .abstract-wrap').addClass('animation-fadeFromRight');

  if (!(mq_Detect == 'xs')) {
    $('#content-abstract-hero .hero-h-scroll div[data-slick-index="' + currentSlide + '"] picture img').removeClass('animation-zooming');
    $('#content-abstract-hero .hero-h-scroll div[data-slick-index="' + nextSlide + '"] picture img').addClass('animation-zooming');
  }
});

/*** Events ***/
function createHeroProg(heroItem) {
  var heroProgStopped = false;
  var clock;
  var progDots;
  var progWidth = 3; //settato a 3 perche' i metodi di slick sono before / after change e quindi c'è una differenza di 3ms
  var time = $(heroItem).slick('slickGetOption', 'autoplaySpeed');

  if (time > 0) {
    progDots = $(heroItem).slick('slickGetOption', 'appendDots');

    if (progDots != '' && progDots != undefined && progDots != null) {

      $(heroItem + ' .slick-slide').on('mouseover', function () {
        stopHeroProg();
        $(heroItem).attr('data-hero-status','pause');
      });

      $(heroItem + ' .slick-slide').on('mouseleave', function () {
        startHeroProg();
        $(heroItem).attr('data-hero-status','play');
      });

      $('.slick-autoplay-toggle-button .slick-pause-icon').on('mouseup', function () {
        stopHeroProg();
      });

      $('.slick-autoplay-toggle-button .slick-play-icon').on('mouseup', function () {
        startHeroProg();
      });

      $(heroItem).on('beforeChange', function (event, slick, currentSlide, nextSlide) {
        stopHeroProg();
        $(this).attr('data-hero-status','pause');
      }).trigger('beforeChange');

      // afterChange
      $(heroItem).on('afterChange', function (event, slick, currentSlide) {
        $(this).attr('data-hero-status','play');
        stopHeroProg();
        startHeroProg();
      }).trigger('afterChange');

      function progCounter() {
        progWidth = progWidth + 1;

        $(progDots + ' .slick-active button').css({
          'background': $color_neutral_60,
          'background': 'linear-gradient(90deg, ' + $color_primary_33 + ', ' + progWidth + '%, transparent ' + progWidth + '%)',
          'border': '1px solid ' + $color_primary_33
        });
      }

      function startHeroProg() {
        clock = setInterval(progCounter, (time / 100));
      }

      function stopHeroProg() {
        progWidth = 3;
        /* Update: Stop id interval */
        clearInterval(clock);
        clock = '';
        $(progDots + ' li button').css({
          'background': $color_neutral_60,
          'border': '1px solid ' + $color_neutral_60
        })
      }
    }
  }
}


/********* conf banner alfa *********/
$('.campaign-scroll').slick($.extend({
  regionLabel: 'lorem ipsum sed nunc facilis aria label banner alfa',
  autoplay: false,
  useAutoplayToggleButton: true,
  autoplaySpeed: 8000,
  dots: true,
  arrows: true,
  infinite: true,
  slidesToShow: 1,
  slidesToScroll: 1,
  centerMode: true,
  variableWidth: false,
  fade: true,
  speed: 1000,
  adaptiveHeight: false,
  responsive: [{
    breakpoint: 768,
    settings: {
      adaptiveHeight: true,
      autoplaySpeed: 300000
    }
  }]
}, it_slick_translation));

/*** Animation effect ***/
$('.campaign-scroll').on('beforeChange', function (event, slick, currentSlide, nextSlide) {
  $('.campaign-alfa-right div[data-slick-index="' + nextSlide + '"] .picture-wrap').addClass('animation-fadeToRight');
  $('.campaign-alfa-right div[data-slick-index="' + currentSlide + '"] .picture-wrap').removeClass('animation-fadeToRight');
  $('.campaign-alfa-left div[data-slick-index="' + nextSlide + '"] .picture-wrap').addClass('animation-fadeToLeft');
  $('.campaign-alfa-left div[data-slick-index="' + currentSlide + '"] .picture-wrap').removeClass('animation-fadeToLeft');
});




/*** Ripple Animation effect ***/
function btnRippleAnimation() {

  var excluded = [
    { class: "btn-cta" },
    { class: "btn-link" },
    { class: "back-side-panel" },
    { attr: "disabled" },
    { attr: "readonly" }
  ];

  var $btnRippleObj = $(".btn").filter(function () {
    var $button = $(this);
    for (var i = 0; i < excluded.length; i++) {
      var ex = excluded[i];
      if (ex.class && $button.hasClass(ex.class)) {
        return false;
      } else if (ex.attr && $button.attr(ex.attr)) {
        return false;
      }
    }
    return true;
  });

  $btnRippleObj.on('mouseup', function (e) {
    var wrapper = $(this);
    var parentOffset = wrapper.offset();
    var relX = e.pageX - parentOffset.left + wrapper.scrollLeft();
    var relY = e.pageY - parentOffset.top + wrapper.scrollTop();
    $(this).append($('<span class="ripple"></span>').css({
      left: relX,
      top: relY
    })
      .appendTo(this).delay(1500).queue(function () { $(this).remove(); })
    );
  });
}


/* responsive tables indicatori sullo scroll orizzontale */
function tableIndicators(tableRespCl) {

  var $scl;
  var tbl;
  var $tl;
  var $l;
  var gap;

  $(tableRespCl).each(function () {
    $scl = Math.ceil($(this).scrollLeft());

    tbl = $(this);

    if ($scl == 0) {
      $(this).removeClass('table-overflow-start table-overflow-end');
      if ($(this)[0].scrollWidth > $(this)[0].clientWidth) {
        $(this).addClass('table-overflow-end');
      }
    }


    $(tableRespCl).on('scroll', function () {
      $l = Math.ceil($(this).outerWidth());
      $tl = Math.ceil($(this).find('table').outerWidth());
      $scl = Math.ceil($(this).scrollLeft());

      gap = $tl - $l;

      if ($scl == 0) {
        $(this).removeClass('table-overflow-start table-overflow-end');
        $(this).addClass('table-overflow-end');
      } else if ($scl > 0) {
        if ($scl < (gap - 10)) {
          $(this).addClass('table-overflow-start');
          $(this).addClass('table-overflow-end');
        }

        if ($scl >= (gap - 10)) {
          $(this).removeClass('table-overflow-start table-overflow-end');
          $(this).addClass('table-overflow-start');
        }
      }
    });
  });

}

// setta altezza porzione fissa alta sidebar profilo
function setHoffCanFixed(offCanFixedEl) {
  $('.side-offcanvas-content-fixed + .side-offcanvas-content').css('height', 'calc(100% - ' + offCanFixedEl.outerHeight() + 'px)');
};
