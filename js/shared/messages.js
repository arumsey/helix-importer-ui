function register(callback = () => undefined) {
  window.addEventListener('message', (event) => {
    // Ensure the message is from a trusted origin
    if (event.origin !== window.location.origin) {
      return;
    }

    // Handle the received message
    const { theme } = event.data;
    if (theme) {
      document.querySelector('sp-theme').color = theme;
    }
    callback(event.data);
  });
}

export {
  // eslint-disable-next-line import/prefer-default-export
  register,
};
