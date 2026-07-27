/*****************************************************

posteitaliane-it.js - (c) Poste Italiane 2025

*****************************************************/

/*** funzione mostra / nascondi come BS collapse  ***/

const mostra_it = '<span class="icon"><svg focusable="false"><use xlink:href="/dist/assets/core/images/iconset/sprite.svg#007a-expand-more-m" href="/dist/assets/core/images/iconset/sprite.svg#007a-expand-more-m"></use></svg></span>Mostra altro'
const nascondi_it ='<span class="icon"><svg focusable="false"><use xlink:href="/dist/assets/core/images/iconset/sprite.svg#007b-expand-less-m" href="/dist/assets/core/images/iconset/sprite.svg#007b-expand-less-m"></use></svg></span>Mostra meno';

function piShowHide(sOiT=false){
  var triggers = Array.from(document.querySelectorAll('[data-pi-toggle="pi-collapse"]'));
  if(!triggers)return;
  window.addEventListener('mouseup', (ev) => {
      var elm = ev.target;
      //if (!sOiT) oldInner = elm.innerHTML;
      if (triggers.includes(elm)) {
        if(elm.getAttribute('aria-expanded')=='false'){
            elm.setAttribute('aria-expanded','true');
            elm.innerHTML=nascondi_it;
            sOiT = true;
          }else{
            elm.setAttribute('aria-expanded','false');
            elm.innerHTML=mostra_it
            //elm.innerHTML = oldInner;
          }
          var selector = elm.getAttribute('data-pi-target');
          collapse(selector, 'pi-toggle');
      }
  }, false);

  var fnmap = {
      'pi-toggle' : 'toggle',
      'pi-show' : 'add',
      'pi-hide' : 'remove'
  };
  var collapse = (selector, cmd) => {
    var targets = Array.from(document.querySelectorAll(selector));
    targets.forEach(target => {
        target.classList[fnmap[cmd]]('pi-show');
    });
  }
}


/*** Ritorna Oggetto tramite id o #id  ***/
function returnObjFromId(id){
  if (id.indexOf('#') > -1){
    id=id.replace(/#(?=\S)/g, '');
  }
  if (document.getElementById)
      var returnObjById = document.getElementById(id);
  else if (document.all) /* oldest browsers puo' segnalare deprecato */
      var returnObjById = document.all[id];
  else if (document.layers)
      var returnObjById = document.layers[id];
  return returnObjById;
}

/*** Ripple Animation effect ***/
function btnRippleAnimation() {

  var excluded = [
    { class: 'btn-cta' },
    { class: 'btn-link' },
    { class: 'back-side-panel' },
    { attr: 'disabled' },
    { attr: 'readonly' },
    {attr: 'data-pi-toggle'}
  ];

// filtra elementi su cui applicare ripple
const btnRippleElements = Array.from(document.querySelectorAll('.btn')).filter(button => {
  return !excluded.some(ex => {
      if (ex.class && button.classList.contains(ex.class)) {
          return true;
      }
      if (ex.attr && button.hasAttribute(ex.attr)) {
          return true;
      }
      return false;
  });
});

// aggiungo effetto ripple
btnRippleElements.forEach(button => {
  button.addEventListener('mouseup', function(e) {
      const myButton = this;
      // Otteniamo le coordinate del click sull'elemento filtrato
      const rect = this.getBoundingClientRect();
      const relX = e.clientX - rect.left + this.scrollLeft;
      const relY = e.clientY - rect.top + this.scrollTop;

      // aggiungo l'elemento ripple
      const ripple = document.createElement('span');
      ripple.classList.add('ripple');
      ripple.style.left = relX + 'px';
      ripple.style.top = relY + 'px';

      // aggiungo il ripple al pulsante
      this.appendChild(ripple);

      //aggiungo evento anche sul child creato al volo e lo ripasso al parent
      /* ripple.addEventListener('mouseup',function(){
        console.log(this);
        myButton.mouseup;
      }); */

      // Rimuoviamo il ripple dopo 1 secondo
      setTimeout(() => {
          ripple.remove();
      }, 1000);
  });
});

}


function tableIndicators(tableRespClass) {
    // Selezioniamo tutti gli elementi con la classe specificata
    const tables = document.querySelectorAll(tableRespClass);

    tables.forEach(table => {
        // Controllo iniziale
        let scrollLeft = Math.ceil(table.scrollLeft);
        if (scrollLeft === 0) {
            table.classList.remove('table-overflow-start', 'table-overflow-end');
            if (table.scrollWidth > table.clientWidth) {
                table.classList.add('table-overflow-end');
            }
        }

        // Event listener per lo scroll
        table.addEventListener('scroll', function() {
            const containerWidth = Math.ceil(this.offsetWidth);
            const tableWidth = Math.ceil(this.querySelector('table').offsetWidth);
            const scrollLeft = Math.ceil(this.scrollLeft);
            const gap = tableWidth - containerWidth;

            // Reset delle classi
            if (scrollLeft === 0) {
                this.classList.remove('table-overflow-start', 'table-overflow-end');
                this.classList.add('table-overflow-end');
            } 
            else if (scrollLeft > 0) {
                if (scrollLeft < (gap - 10)) {
                    this.classList.add('table-overflow-start', 'table-overflow-end');
                }
                
                if (scrollLeft >= (gap - 10)) {
                    this.classList.remove('table-overflow-start', 'table-overflow-end');
                    this.classList.add('table-overflow-start');
                }
            }
        });
    });
}

// setta altezza porzione fissa alta sidebar profilo
function setHoffCanFixed(offCanFixedEl) {
  // Seleziona l'elemento successivo che ha la classe 'side-offcanvas-content'
  const nextElement = document.querySelector('.side-offcanvas-content-fixed + .side-offcanvas-content');
  
  // Ottiene l'altezza completa dell'elemento (inclusi padding e bordi)
  const height = offCanFixedEl.offsetHeight;
  
  // Imposta l'altezza con calc
  nextElement.style.height = `calc(100% - ${height}px)`;
}

//  dark/light appropriato switch quando siamo nel contesto modulo intro -> sfondo fotografico -> bs theme = dark - di default su xs e sm
function illuminate(classMqBody=['pi-xs','pi-sm']){
  darkToLight = document.querySelectorAll('.module-intro.concept-photo[data-pi-theme-switch="true"]');
  if(!darkToLight)
    return;

  darkToLight.forEach((light,index) => {
    isLight=light.getAttribute('data-bs-theme');
    if (classMqBody.some(classMq => document.documentElement.classList.contains(classMq))) {
      if(isLight!='light'){
        light.setAttribute('data-bs-theme','light');
      }
    }else{
      light.setAttribute('data-bs-theme','dark');
    }
  });
}


// swiper carousel central config

const swiper_lang_it = {
  enabled: true,
  prevSlideMessage: 'Slide precedente',
  nextSlideMessage: 'Slide successiva',
  firstSlideMessage: 'Prima slide',
  lastSlideMessage: 'Ultima slide',
  slideLabelMessage: '{{index}} di {{slidesLength}}',
  itemRoleDescriptionMessage: 'slide',
  slideRole: 'group',
}
