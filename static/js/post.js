/**
 * 页面ready方法
 */
$(document).ready(function() {
    generateContent();
    share();
    $('.container img').magnificPopup({type:'image'});
});

/**
 * 侧边目录
 */
function generateContent() {
    var $mt = $('.toc');
    var $toc;
    $mt.each(function(i,o){
        $toc = $(o);
        $toc.toc({ listType: 'ul', headers: 'h1, h2, h3' });
    });
}

function share(){
    window._bd_share_config={"common":{"bdSnsKey":{},"bdText":"","bdMini":"2","bdMiniList":false,"bdPic":"","bdStyle":"1","bdSize":"24"},"share":{}};
    with(document)0[getElementsByTagName("script")[0].parentNode.appendChild(createElement('script')).src='http://bdimg.share.baidu.com/static/api/js/share.js?v=89860593.js?cdnversion='+~(-new Date()/36e5)];
}
