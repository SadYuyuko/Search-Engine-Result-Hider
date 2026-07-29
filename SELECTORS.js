const SELECTORS = {
    bing: {
      containers: 'li.b_algo, div.b_algo',
      titles: ['h2 a', 'a h2', '.b_title'],
      snippets: ['.b_caption p', '.b_snippet', '.b_paractl p', '.b_lineclamp2'],
      links: 'a[href]',
    },
    google: {
      containers: 'div.g, div.MjjYud',
      titles: ['h3', 'div[role="heading"]', '.LC20lb', '.DKV0Md', '.sXLaOe', '.c9DxTc', 'a h3'],
      snippets: ['.st', '.VwiC3b', '.s3v9rd', '.IsZvec', '.lyLwlc', '.yXK7lf'],
      links: 'a[href]',
    },
    duckduckgo: {
      containers: '[data-testid="result"], .result, .web-result, .tile, .tile--ad',
      titles: ['a[data-testid="result-title-a"]', '.result__title', '.tile__title', '.tile--title__title', 'h2 a', 'a h2'],
      snippets: ['[data-testid="result-snippet"]', '[data-result="snippet"]', '.result__snippet'],
      links: ['a[data-testid="result-extras-url-link"]', 'a[data-testid="result-title-a"]', '.result__url', '.tile--title__domain', 'a[href]'],
    },
    yandex: {
      containers: 'div.Organic',
      titles: ['.OrganicTitle'],
      snippets: ['.OrganicText'],
      links: ['.OrganicTitle a', '.Path-Item a', 'a.Link', 'a[href]'],
    },
    brave: {
      containers: '.snippet[data-type="web"], .snippet[data-type="news"], .snippet[data-type="videos"], .image-wrapper',
      titles: ['.title', '.snippet-title', '.img-title'],
      snippets: ['.generic-snippet .content', '.generic-snippet', '.line-clamp-dynamic', '.snippet-description', '.description'],
      links: ['a[href]'],
    },
    yahoo: {
      containers: '.sw-Card.Algo, li.b_algo, div.b_algo, #web .algo, .algo-sr, .richAlgo',
      titles: ['h3', '.s-title', 'h2 a', 'a h2', '.b_title', '.title'],
      snippets: ['.sw-Card__description', '.sw-Card__snippet', '.sw-Text__body', 'p', '.b_caption p', '.b_snippet', '.b_paractl p'],
      links: ['h3 a', '.s-title', '.sw-Card__title a', 'a[data-ylk*="slk:title"]', 'a.ac-algo', 'a[data-y-link-id]'],
    },
    other: {
      containers: '',
    }
  };