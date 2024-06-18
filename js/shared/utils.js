const PARENT_SELECTOR = '.import';
const SPTABS = document.querySelector(`${PARENT_SELECTOR} sp-tabs#mapping-editor-tabs`);

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array);
  }
}

function getElementByXpath(document, path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
}

// Create and return an element with optional 'props' attributes and optional inner text.
function createElement(nodeName, props, innerText) {
  const newElement = document.createElement(nodeName);
  if (newElement) {
    if (props) {
      Object.entries(props)
        .forEach(([key, value]) => {
          newElement.setAttribute(key, value);
        });
    }
    if (innerText) {
      newElement.innerText = innerText;
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('Error creating element:', nodeName);
  }
  return newElement;
}

const getContentFrame = () => document.querySelector(`${PARENT_SELECTOR} iframe`);

/**
 * Get the current URL.  User can change from time to time.
 * @returns {string}
 */
const getCurrentURL = () => {
  const frame = getContentFrame();
  const { originalURL } = frame.dataset;
  return originalURL;
};
const getXPath = (elm, document, withDetails = false) => {
  const allNodes = document.getElementsByTagName('*');
  let segs;
  // eslint-disable-next-line no-param-reassign
  for (segs = []; elm && elm.nodeType === 1; elm = elm.parentNode) {
    if (withDetails) {
      if (elm.hasAttribute('id')) {
        let uniqueIdCount = 0;
        for (let n = 0; n < allNodes.length; n += 1) {
          if (allNodes[n].hasAttribute('id') && allNodes[n].id === elm.id) {
            uniqueIdCount += 1;
          }
          if (uniqueIdCount > 1) {
            break;
          }
        }
        if (uniqueIdCount === 1) {
          segs.unshift(`id("${elm.getAttribute('id')}")`);
          return segs.join('/');
        }

        segs.unshift(`${elm.localName.toLowerCase()}[@id="${elm.getAttribute('id')}"]`);
      } else if (elm.hasAttribute('class')) {
        segs.unshift(`${elm.localName.toLowerCase()}[@class="${[...elm.classList].join(' ').trim()}"]`);
      }
    } else {
      let i;
      let sib;
      for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
        if (sib.localName === elm.localName) {
          i += 1;
        }
      }
      segs.unshift(`${elm.localName.toLowerCase()}[${i}]`);
    }
  }
  return segs.length ? `/${segs.join('/')}` : null;
};

export {
  asyncForEach,
  createElement,
  getContentFrame,
  getCurrentURL,
  getElementByXpath,
  getXPath,
  SPTABS,
};
