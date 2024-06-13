import DOMPurify from 'dompurify';

const PSEUDO_TEXT_SELECTOR = '::text';
const TEMPLATE_REGEX = /\{\{(.+?)}}/g;

function isHTMLElement(el) {
  return (
    typeof HTMLElement === 'object' ? el instanceof HTMLElement // DOM2
      : el
        && typeof el === 'object'
        && el.nodeType === 1
        && typeof el.nodeName === 'string'
  );
}

function isValidCSSSelector(selector) {
  try {
    document.querySelector(selector);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Evaluate a cell value based on a selector or template string.
 * If the cell is a selector, query the element for the value.
 * If the cell is a template string, replace the templates with the
 * selector value and create a document fragment..
 *
 * @param element Block element
 * @param cell Selector or template string
 * @return {HTMLElement[]}
 */
function evaluateCell(element, cell) {
  let cellList = cell;
  if (!Array.isArray(cellList)) {
    cellList = [cellList];
  }
  return cellList.map((c) => {
    if (isValidCSSSelector(c)) {
      return [...element.querySelectorAll(c)];
    }
    // convert template string to HTML
    let html = c.replace(TEMPLATE_REGEX, (match, expression) => {
      const value = expression.trim();
      if (isValidCSSSelector(value)) {
        return element.querySelector(value)?.innerHTML || '';
      }
      return value;
    });
    // clean up HTML and return a document fragment
    html = DOMPurify.sanitize(html);
    return element.ownerDocument.createRange().createContextualFragment(html);
  });
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
   * Build a two-dimensional array of block cells from a selector array.
   * Each column in the selector array can be a CSS selector or a template string.
   * A template string allows for additional HTML to be added along with selector references.
   *
   * Selector Array:
   * [
   *  [colSelector | colTemplate, ...],
   * ]
   *
   * @param element
   * @param cells
   */
  static buildBlockCells(element, cells) {
    return cells.map((row) => {
      if (isHTMLElement(row)) {
        return [row];
      }
      if (Array.isArray(row)) {
        return row.map((col) => evaluateCell(element, col));
      }
      return evaluateCell(element, row);
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
    return isValidCSSSelector(selector);
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
