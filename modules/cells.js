const PSEUDO_TEXT_SELECTOR = '::text';

function isHTMLElement(el) {
  return (
    typeof HTMLElement === 'object' ? el instanceof HTMLElement // DOM2
      : el
        && typeof el === 'object'
        && el.nodeType === 1
        && typeof el.nodeName === 'string'
  );
}

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
   * @param items Object of selector conditions
   */
  static buildBlockConfig(element, items) {
    const cfg = {};
    Object.entries(items).forEach(([name, value]) => {
      let selector = value;
      let params = {};
      if (Array.isArray(value)) {
        // find first matching element
        const [, conditionalSelector, conditionalParams] = value
          .find(([condition]) => element.querySelector(condition)) || [];
        selector = conditionalSelector;
        params = conditionalParams || {};
      }
      let cfgValue = selector;
      const { selector: valueSelector, useSiblingText } = CellUtils.getValueSelector(selector);
      selector = valueSelector;
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
            // additional processing based on conditional params that were provided
            const { replace: [search, replace = ''] = [] } = params;
            // perform replacements
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
      if (isHTMLElement(row)) {
        return [row];
      }
      if (Array.isArray(row)) {
        return row.map((col) => [...element.querySelectorAll(col)]);
      }
      return [...element.querySelectorAll(row)];
    })
      .filter((row) => row.some((col) => (Array.isArray(col) ? col.length > 0 : col)));
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

  static isTextSelector(selector = '') {
    return selector.includes(PSEUDO_TEXT_SELECTOR) || false;
  }

  static getValueSelector(selector = '') {
    const useText = selector.endsWith(PSEUDO_TEXT_SELECTOR) || false;
    let cleanSelector = selector.replace(PSEUDO_TEXT_SELECTOR, '*');
    const useSiblingText = useText && cleanSelector.endsWith('+ *');
    cleanSelector = cleanSelector.replace(/\+ \*$/, '');
    return {
      selector: cleanSelector,
      useSiblingText,
    };
  }

  static getSearchSelector(selector = '') {
    const [, searchText] = selector.match(new RegExp(`${PSEUDO_TEXT_SELECTOR}\\((.*?)\\)`));
    const cleanSelector = selector
      .replace(new RegExp(`${PSEUDO_TEXT_SELECTOR}\\((.*)\\)`), '')
      .trim();
    return {
      selector: cleanSelector,
      search: searchText,
    };
  }
}
