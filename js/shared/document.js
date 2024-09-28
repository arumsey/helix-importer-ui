/* global html2canvas */
const getContentFrame = () => document.querySelector('.page-preview  iframe#import-content-frame');

const sleep = (ms) => new Promise(
  (resolve) => {
    setTimeout(resolve, ms);
  },
);

const smartScroll = async (window) => {
  let scrolledOffset = 0;
  let maxLoops = 4;
  while (maxLoops > 0 && window.document.body.scrollHeight > scrolledOffset) {
    const scrollTo = window.document.body.scrollHeight;
    window.scrollTo({ left: 0, top: scrollTo, behavior: 'smooth' });
    scrolledOffset = scrollTo;
    maxLoops -= 1;
    // eslint-disable-next-line no-await-in-loop
    await sleep(250);
  }
};

const getProxyURLSetup = (url, origin) => {
  const u = new URL(url);
  if (!u.searchParams.get('host')) {
    u.searchParams.append('host', u.origin);
  }
  const src = `${origin}${u.pathname}${u.search}`;
  return {
    remote: {
      url,
      origin: u.origin,
    },
    proxy: {
      url: src,
      origin,
    },
  };
};

/**
 * Load a URL and return its results.
 * HTML and JSON content will also be loaded into an iframe to allow for JS execution.
 * @param url the url to load
 * @param options
 * @return {Promise<object>}
 */
const loadDocument = async (url, options) => {
  const {
    origin, headers, enableJs, scrollToBottom, pageLoadTimeout = 100,
  } = options;

  const { remote, proxy } = getProxyURLSetup(url, origin);
  const src = proxy.url;

  let res;
  try {
    const headersObj = JSON.parse(headers || '{}');
    res = await fetch(src, {
      headersObj,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Unexpected error when trying to fetch ${src} - CORS issue or invalid headers ?`, e);
  }

  if (!res || !res.ok) {
    return {
      url,
      error: true,
      status: res?.status,
    };
  }

  if (res.redirected) {
    return {
      redirected: true,
      url: res.url,
      remote,
    };
  }

  const contentType = res.headers.get('content-type');

  if (!contentType.includes('html') && !contentType.includes('json')) {
    const blob = await res.blob();
    return {
      url,
      blob,
    };
  }

  const frame = document.createElement('iframe');
  frame.id = 'import-content-frame';

  if (enableJs) {
    frame.removeAttribute('sandbox');
  } else {
    frame.setAttribute('sandbox', 'allow-same-origin');
  }

  const onLoad = async () => {
    if (scrollToBottom) {
      await smartScroll(frame.contentWindow.window);
    }

    await sleep(pageLoadTimeout);

    if (scrollToBottom) {
      await smartScroll(frame.contentWindow.window);
    }

    if (frame.contentDocument) {
      const { originalURL, replacedURL } = frame.dataset;
      const document = frame.contentDocument;
      // take a screenshot
      const pageCanvas = await html2canvas(frame.contentDocument.body, {
        proxy: 'http://localhost:3001',
        logging: true,
        useCORS: true,
      });
      const screenshot = pageCanvas.toDataURL();
      return {
        originalURL,
        replacedURL,
        document,
        screenshot,
      };
    }

    return {};
  };

  frame.dataset.originalURL = url;
  frame.dataset.replacedURL = src;

  if (contentType.includes('json')) {
    const blob = await res.blob();
    frame.src = URL.createObjectURL(blob);
  } else {
    frame.src = src;
  }

  const current = getContentFrame();
  current.removeEventListener('load', onLoad);
  current.replaceWith(frame);

  const doc = await new Promise((resolve) => {
    frame.addEventListener('load', async () => {
      const content = await onLoad();
      resolve(content);
    });
  });

  return { ...doc, url };
};

export {
  getContentFrame,
  getProxyURLSetup,
  loadDocument,
};
