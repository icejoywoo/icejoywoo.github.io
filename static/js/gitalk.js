var gitalk = new Gitalk({
  clientID: 'b89e53d48767595d1ba9',
  clientSecret: '134f794b8c3ab787f8ed32c0c530ef8a087a5d29',
  repo: 'icejoywoo.github.io',
  owner: 'icejoywoo',
  admin: ['icejoywoo'],
  id: location.pathname,      // Ensure uniqueness and length less than 50
  distractionFreeMode: false  // Facebook-like distraction free mode
})

gitalk.render('gitalk-container')