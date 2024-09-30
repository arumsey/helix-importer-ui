function onSwcLoaded() {
  document.body.classList.remove('loading');
}

const asyncScript = document.querySelector('script[src="./js/dist/spectrum-web-components.js"]');
asyncScript.addEventListener('load', onSwcLoaded);

// Fallback in case the script is already loaded or for iframe scenarios
window.addEventListener('load', () => {
  if (document.readyState === 'complete') {
    if (asyncScript.src && asyncScript.hasAttribute('src')) {
      onSwcLoaded();
    }
  }
});
