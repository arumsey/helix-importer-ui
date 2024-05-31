/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import xPathToCss from '../libs/vendors/xpath-to-css/xpath-to-css.js';

const XPATH_BODY = '/html[1]/body[1]';
const MAPPING_CONFIG_KEYS = ['name', 'value'];

const baseTransformRules = {
  cleanup: {
    start: [],
    end: [],
  },
  blocks: [
    {
      type: 'metadata',
      insertMode: 'append',
      params: {
        cells: {},
      },
    },
  ],
};

/**
 * Build a CSS selector string from a mapping.
 * The most useful selector string will be used where a selector based off
 * of the xpath is used as a last resort.
 * @param mapping A mapping object
 * @param basePath xpath of the root element
 * @return {string} CSS selector string
 */
function buildSelector(mapping, basePath) {
  // TODO: this logic may be able to be greatly simplified
  // when mapping object provides a fully curated selector string
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
 * Build a block cells object from a list of mappings.
 * @param mappingList
 */
function buildBlockCellsFromMapping(mappingList = []) {
  return mappingList.reduce((cells, mapping) => {
    // does this mapping contain a block customization?
    if (!MAPPING_CONFIG_KEYS.every((key) => key in mapping)) {
      return cells;
    }
    const { name, value, condition } = mapping;
    const cellValue = cells[name];
    if (cellValue !== undefined) {
      // add a new entry to existing cell item array
      if (Array.isArray(cellValue) && condition) {
        cellValue.push([condition, value]);
      }
      if (typeof cellValue === 'string') {
        console.warn(`Conditional cell value [${condition}] cannot be added to an existing cell that has an absolute value`);
      }
    } else if (condition) {
      cells[name] = [[condition, value]];
    } else {
      cells[name] = value;
    }
    return cells;
  }, {});
}

/**
 * Build a transformation rules object from a section mapping
 */
function buildTransformationRulesFromMapping(mapping) {
  const transformRules = JSON.parse(JSON.stringify(baseTransformRules));

  if (!mapping) {
    return transformRules;
  }

  // find root element selector
  const rootMapping = mapping.find((m) => m.mapping === 'root');
  const rootXpath = rootMapping?.xpath ? rootMapping.xpath : XPATH_BODY;
  // const rootElement = selectElementFromXpath(rootXpath, document);

  // add root element selector
  transformRules.root = rootMapping ? buildSelector(rootMapping, rootXpath) : undefined;

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

  transformRules.blocks = [
    ...transformRules.blocks,
    ...Object.entries(blockMapping).map(([type, mappingList]) => {
      const existingRules = transformRules.blocks.find((b) => b.type === type);
      const selectors = mappingList.map((m) => buildSelector(m, XPATH_BODY));
      const cells = buildBlockCellsFromMapping(mappingList);
      return {
        ...existingRules,
        type,
        selectors,
        cells,
      };
    })];

  return transformRules;
}

export {
  buildBlockCellsFromMapping,
  buildTransformationRulesFromMapping,
};
