
import xPathToCss from "xpath-to-css";

const XPATH_BODY = '/html[1]/body[1]';

const baseTransformRules = {
  cleanup: {
    start: [],
  },
  blocks: [
    {
      type: 'metadata',
      insertMode: 'append',
      params: {
        metadata: {}
      },
    },
  ]
};

function selectElementFromXpath(xpath, document) {
  return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function buildSelector(mapping, basePath) {
  if (mapping.selector) {
    return mapping.selector;
  }
  if (mapping.domId) {
    return `#${mapping.domId}`;
  }
  if (mapping.domClasses) {
    return `.${mapping.domClasses}`;
  }
  if (mapping.xpath) {
    return xPathToCss(mapping.xpath.replace(basePath, ''));
  }
  return '';
}

/**
 * Build a transformation config object from a sections mapping
 */
function buildTransformationRulesFromMapping(mapping, { document }) {
  const transformRules = JSON.parse(JSON.stringify(baseTransformRules));

  if (!mapping) {
    return transformRules;
  }

  // find root element selector
  const rootMapping = mapping.find((m) => m.mapping === 'root');
  const rootXpath = rootMapping?.xpath ? rootMapping.xpath : XPATH_BODY;
  const rootElement = selectElementFromXpath(rootXpath, document);

  // add root element selector
  transformRules.root = rootMapping ? buildSelector(rootMapping, XPATH_BODY) : undefined;

  // add clean up sections
  transformRules.cleanup.start = mapping
    .filter((m) => m.mapping === 'exclude')
    .map((m) => buildSelector(m, XPATH_BODY));

  // process blocks
  const blockMapping = mapping
    .filter((m) => m.mapping !== 'root' && m.mapping !== 'exclude' && m.mapping !== 'defaultContent')
    .reduce((blockMap, m) => {
      if (blockMap[m.mapping]) {
        blockMap[m.mapping].push(m);
      } else {
        blockMap[m.mapping] = [m];
      }
      return blockMap;
    }, {});

  transformRules.blocks = [...transformRules.blocks, ...Object.entries(blockMapping).map(([type, mappingList]) => {
    const selectors = mappingList.map((m) => buildSelector(m, XPATH_BODY));
    return {
      type,
      selectors,
    };
  })];

  return transformRules;
}

export {
  buildTransformationRulesFromMapping,
}
