import parsers from './parsers/index.js';

/* global WebImporter */

const IGNORE_ELEMENTS = [
  'style',
  'source',
  'script',
  'iframe',
];

function isValidCSSSelector(selector) {
  try {
    document.querySelector(selector);
    return true;
  } catch (e) {
    return false;
  }
}

export default class Transformer {
  /**
   * Transform a source document from a set of rules.
   *
   * @param rules Transformation ruleset
   * @param source Source document properties
   * @return Transformed root element
   */
  static transform(rules, source) {
    console.log('Transformer Rules', rules);
    const { document } = source;

    const {
      root = 'main',
      cleanup: {
        ignore: removeIgnore = IGNORE_ELEMENTS,
        start: removeStart = [],
        end: removeEnd = [],
      },
      blocks = [],
    } = rules;

    // phase 1: get root element
    const main = document.querySelector(root) || document.body;

    // phase 2: DOM removal - start
    WebImporter.DOMUtils.remove(main, removeIgnore);
    WebImporter.DOMUtils.remove(document, removeStart);

    // phase 3: block creation
    blocks.forEach((blockCfg) => {
      const {
        type, variants, selectors, parse, insertMode = 'replace', params = {},
      } = blockCfg;
      const parserFn = parse || parsers[type] || parsers.block;
      const validSelectors = selectors ? selectors.filter(isValidCSSSelector) : [];
      const elements = validSelectors.length
        ? selectors.reduce((acc, selector) => [...acc, ...main.querySelectorAll(selector)], [])
        : [main];
      // process every element for this block
      elements.forEach((element) => {
        // add params to source
        source.params = { ...source.params, ...params };
        // parse the element into block items
        let items = parserFn.call(this, element, source);
        if (Array.isArray(items)) {
          items = items.filter((item) => item);
        }
        // create the block
        const block = WebImporter.Blocks.createBlock(document, {
          name: WebImporter.Blocks.computeBlockName(type),
          variants,
          cells: items,
        });
        if (block) {
          // add block to DOM
          if (insertMode === 'append') {
            main.append(block);
          } else if (insertMode === 'prepend') {
            main.prepend(block);
          } else {
            element.replaceWith(block);
          }
        }
      });
    });

    // phase 4: DOM removal - end
    WebImporter.DOMUtils.remove(document, removeEnd);

    return main;
  }

  /**
   * Build a name/value pair block configuration from a selector object.
   *
   * Selector Object:
   * {
   *   name: value_selector | [condition_selector, value_selector]
   * }
   *
   * @param element Root element to query from
   * @param params Object of selector conditions
   */
  static buildBlockConfig(element, params) {
    const cfg = {};
    Object.entries(params).forEach(([name, value]) => {
      let selector = value;
      if (Array.isArray(value)) {
        // find first matching element
        const [, conditionalSelector] = value
          .find(([condition]) => element.querySelector(condition)) || [];
        selector = conditionalSelector;
      }
      let cfgValue = selector;
      if (selector && isValidCSSSelector(selector)) {
        cfgValue = [
          ...element.querySelectorAll(selector)]
          .map((el) => el.textContent || el.content);
        if (cfgValue.length <= 1) {
          [cfgValue = selector] = cfgValue;
        }
      }
      if (cfgValue !== undefined) {
        cfg[name] = cfgValue;
      }
    });
    return cfg;
  }

  /**
   * Build a two-dimensional array of block cells from a selector object.
   * @param element
   * @param cells
   */
  static buildBlockCells(element, cells) {
    return cells.map((row) => {
      if (Array.isArray(row)) {
        return row.map((col) => [...element.querySelectorAll(col)]);
      }
      return [...element.querySelectorAll(row)];
    })
      .filter((row) => row.some((col) => col.length > 0));
  }
}
