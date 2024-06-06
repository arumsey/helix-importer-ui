import parsers from './parsers/index.js';

/* global WebImporter */

const IGNORE_ELEMENTS = [
  'style',
  'source',
  'script',
  'iframe',
];

export default class Transformer {
  /**
   * Transform a source document from a set of rules.
   *
   * @param rules Transformation ruleset
   * @param source Source document properties
   * @return Transformed root element
   */
  static transform(rules, source) {
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
    WebImporter.DOMUtils.remove(main, removeStart);

    // phase 3: block creation
    blocks.forEach((blockCfg) => {
      const {
        type, variants, selectors, parse, insertMode = 'replace', params = {},
      } = blockCfg;
      const parserFn = parse || parsers[type] || parsers.block;
      const validSelectors = selectors
        ? selectors.filter(WebImporter.CellUtils.isValidCSSSelector)
        : [];
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
        if (!WebImporter.CellUtils.isEmpty(items)) {
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
        }
      });
    });

    // phase 4: DOM removal - end
    WebImporter.DOMUtils.remove(document, removeEnd);

    return main;
  }
}
