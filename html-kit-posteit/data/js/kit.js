
/* Gli script di seguito servono solo per la linea guida HTML e non vanno usati per altri scopi */

/* title della pagina */
path = document.location.pathname;
if(path!='/' && path !='' && path != null){
    docs = path.match(/[^\/]+$/);
    if(docs && docs.length){
        doc = docs[0].slice(0,-6);
    }else{
        doc = path.match(/([^\/]*)\/*$/)[1];
    }
    document.title= 'Poste.it - ' + doc.toUpperCase();
}


/* evita ID's ripetuti */
/*
$('#cards-text-heading-news-01').each(function(indx){
    $(this).attr('id',$(this).attr('id') + '_' + indx);
});
$('#cards-action-news-01').each(function(indx){
    $(this).attr('id', $(this).attr('id') + '_' + indx);
});
$('[aria-labelledby="cards-action-news-01 cards-text-heading-news-01"]').each(function(indx){
    $(this).attr('aria-labelledby','cards-action-news-01_'+indx+' cards-text-heading-news-01_'+indx);
})
*/