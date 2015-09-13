/**
 * 页面ready方法
 */
$(document).ready(function() {
    disqus();
});


function disqus(){
    /* * * CONFIGURATION VARIABLES * * */
    var disqus_shortname = 'icejoywoo';

    var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
    dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
    document.getElementsByTagName("script")[0].parentNode.appendChild(dsq);
}
