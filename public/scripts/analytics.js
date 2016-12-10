import 'autotrack';

export function init() {
  console.log('ga');
  // In the analytics.js tracking snippet
  ga('create', 'UA-88759837-1', 'auto');

  // Start plugins
  ga('require', 'cleanUrlTracker', {
    stripQuery: true,
    indexFilename: 'index.html',
    trailingSlash: 'remove'
  });
  ga('require', 'outboundLinkTracker');
  ga('require', 'urlChangeTracker');
  ga('require', 'pageVisibilityTracker', {
    fieldsObj: {
      nonInteraction: null
    }
  });

  ga('send', 'pageview');

}

init();
