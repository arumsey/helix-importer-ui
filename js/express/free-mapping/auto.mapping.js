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

import { getContentFrame } from '../../shared/ui.js';
import { getCurrentURL, getXPath } from '../../shared/utils.js';
import alert from '../../shared/alert.js';
import { DEFAULT_COLORS } from '../../shared/color.js';
import { createMappingRow, FREE_MAPPING_EDITOR_SECTIONS } from './free.mapping.row.js';
import {
  buildSelector,
  getFreeSelectionsMapping,
  saveFreeSelectionsMapping,
} from './free.mapping.utils.js';

// const removeChildElements = (elements) => {
//   elements.filter((el) => !elements.some((parent) => parent !== el && parent.contains(el)));
// };
const removeChildElements = (elements) => elements.filter((el) => {
  const keepIt = !elements.some((parent) => parent !== el && parent.contains(el));
  if (keepIt) {
    // eslint-disable-next-line no-console
    console.log('Keeping element:', el.className);
  }
  return keepIt;
});

const autoMapByType = (root, elementType) => {
  // FUTURE: Make call to AI service to get elements of type.

  let elements = [];

  // Is there a proper 'elementType'?
  const properElement = root.querySelector(elementType);
  if (properElement) {
    elements.push(properElement);
  }

  // Find anything with 'elementType' in the class.
  const typesByClass = root.querySelectorAll(`*[class*="${elementType}"]`);
  if (typesByClass && typesByClass.length > 0) {
    const filtered = removeChildElements([...typesByClass]);
    elements = elements.concat(filtered);
  }
  return elements.filter((el, index) => el && elements.indexOf(el) === index);
};

const autoMap = () => {
  const { contentDocument } = getContentFrame();
  const url = getCurrentURL();
  const mappingData = getFreeSelectionsMapping(url);

  if (mappingData.some((m) => m.id.startsWith('auto'))) {
    alert.info('Auto-mapping was already run on this page. Please remove the existing auto-mapping selections before running again.');
    return;
  }

  const autoHeaders = autoMapByType(contentDocument, 'header');
  const autoFooters = autoMapByType(contentDocument, 'footer');
  if (autoFooters.length === 0 && autoHeaders.length === 0) {
    alert.info('No headers or footers were found on this page.');
    return;
  }

  [...autoHeaders, ...autoFooters].forEach((s, index) => {
    const nextSlot = mappingData.length + index;
    const id = `auto-${Date.now()}-${nextSlot}-${Math.floor(Math.random() * (100000)) + 1}`;
    const mapping = {
      color: DEFAULT_COLORS[nextSlot % DEFAULT_COLORS.length].toRGBA(),
      id,
      layout: { numCol: 1, numRows: 1 },
      mapping: 'exclude',
      offset: 0,
      precision: 1,
      selector: buildSelector(s),
      variants: undefined,
      xpath: getXPath(s, contentDocument, true),
    };
    const row = createMappingRow(mapping, nextSlot);
    FREE_MAPPING_EDITOR_SECTIONS.appendChild(row);
    mappingData.push(mapping);
  });
  saveFreeSelectionsMapping(url, mappingData);
};

export {
  // eslint-disable-next-line import/prefer-default-export
  autoMap,
};
