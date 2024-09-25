const TOGGLE_THEME = document.querySelector('#toggle-theme');

TOGGLE_THEME.addEventListener('click', () => {
  const theme = document.querySelector('body.parent > sp-theme');
  theme.color = theme.color === 'light' ? 'dark' : 'light';

  const iframe = document.querySelector('main iframe');
  iframe.contentWindow.postMessage({ theme: theme.color }, '*');
});
