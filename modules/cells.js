export default class CellUtils {
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
      let replacements = [];
      if (Array.isArray(value)) {
        // find first matching element
        const [, conditionalSelector, ...conditionalReplacements] = value
          .find(([condition]) => element.querySelector(condition)) || [];
        selector = conditionalSelector;
        replacements = conditionalReplacements;
      }
      let cfgValue = selector;
      const useSiblingText = selector?.endsWith('+ ::text') || false;
      if (useSiblingText) {
        selector = selector.replace('+ ::text', '').trim();
      }
      if (selector && CellUtils.isValidCSSSelector(selector)) {
        const [, attribute] = selector.match(/\[(.*?)\]$/) || [];
        if (attribute) {
          selector = selector.replace(/\[(.*?)\]$/, '');
        }
        cfgValue = [
          ...element.querySelectorAll(selector)]
          .map((el) => {
            let text = '';
            if (attribute) {
              text = el.getAttribute(attribute);
            } else {
              text = useSiblingText
                ? el.nextSibling.textContent
                : el.textContent || el.content;
            }
            // perform replacements
            const [search, replace = ''] = replacements;
            if (search) {
              return text.replace(new RegExp(search), replace).trim();
            }
            return text ? text.trim() : text;
          });
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

  /**
   * Is the cells parameter considered empty?
   * Block cells can either be an object or an array.
   * Cells that are an empty array or an object with no keys are considered to be empty.
   * @param cells An object or array of cell values.
   * @return {boolean}
   */
  static isEmpty(cells) {
    if (Array.isArray(cells)) {
      return cells.length === 0;
    } if (typeof cells === 'object' && cells !== null) {
      return Object.keys(cells).length === 0;
    }
    return false;
  }

  /**
   * Does the selector represent a valid CSS selector?
   * @param selector
   * @return {boolean}
   */
  static isValidCSSSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (e) {
      return false;
    }
  }
}
