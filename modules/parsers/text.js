export default function parse(el) {
  return [...el.childNodes].map((node) => {
    let nextText = '';
    if (node.nodeType === Node.TEXT_NODE) {
      nextText = node.textContent.trim();
      if (nextText.length === 0) {
        return null;
      }
      return [nextText];
    }
    return null;
  });
}
