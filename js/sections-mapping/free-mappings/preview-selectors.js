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
import {
  getXPath,
  getCurrentURL,
  SPTABS,
} from '../../shared/utils.js';
import {
  CLICK_CONTAINERS,
  createMappingRow,
  handleRowData,
  FREE_MAPPING_EDITOR_SECTIONS,
  setSelectorHelperText, toggleFreeMappingEditor
} from './mapping.row.js';
import { DEFAULT_COLORS } from '../../shared/color.js';
import {
  getFreeSelectionsMapping, isDefaultMapping,
  saveFreeSelectionsMapping
} from './mapping.utils.js';

const TRUST_NODE_ID = true;

const MAX_CLASSES_PER_ELEMENT = 4;

// Build a selector for the element.
function buildSelector(element) {
  if (!element) {
    return '';
  }
  const id = element.getAttribute('id');
  let classes = element?.className.trim().replaceAll(' ', '.');
  while (classes.includes('..')) {
    classes = classes.replaceAll('..', '.');
  }
  let selector = '';
  if (id && id.length > 0) {
    selector = `#${id}`;
  }
  if (classes && classes.length > 0) {
    const split = classes.split('.');
    if (split.length > MAX_CLASSES_PER_ELEMENT) {
      classes = split.slice(0, MAX_CLASSES_PER_ELEMENT).join('.');
    }
    selector += `.${classes}`;
  }
  if (selector.length > 0) {
    return selector;
  }

  if (element.nodeName === 'BODY') {
    return ':scope';
  }

  // Last resort - use the node name, and immediate child specification.
  return element ? element.nodeName : '';
}

function getMappingRowFromTarget(target) {
  const rows = [...FREE_MAPPING_EDITOR_SECTIONS.querySelectorAll('.row')];
  const targetXPath = getXPath(target, document, false);
  return rows.find((r) => {
    const { xpath } = handleRowData(r);
    return xpath === targetXPath;
  });
}

function buildSelectorWithDepth(element, depth, offset) {
  const correctedDepth = Math.max(depth, 0);
  let selector = buildSelector(element);
  let parent = element.parentNode;
  let actualDepth = 1;
  for (let i = 1; i < correctedDepth; i += 1) {
    selector = `${buildSelector(parent)} ${selector}`;
    actualDepth++;
    if (parent.nodeName === 'BODY') {
      break;
    }
    parent = parent.parentNode;
  }
  let newSelector = selector.trim();

  const selectorParts = newSelector.split(' ');
  if (offset > 0 && offset < selectorParts.length) {
    selectorParts.splice(selectorParts.length - offset, offset);
    newSelector = selectorParts.join(' ');
  }

  if (actualDepth < correctedDepth && newSelector.includes(':scope')) {
    newSelector = newSelector.replaceAll(' ', ' > ');
  }

  return newSelector;
}

function createNewMapping(target, targetSelector, count) {
  let nextSlot = count;
  if (nextSlot === undefined) {
    nextSlot = FREE_MAPPING_EDITOR_SECTIONS.querySelectorAll('.row').length + 1;
  } else {
    nextSlot += 1;
  }
  return {
    id: `box-${Date.now()}-${Math.floor(Math.random() * (1000)) + 1}`,
    selector: targetSelector,
    mapping: undefined,
    xpath: getXPath(target, document),
    layout: { numCols: 1, numRows: 1 },
    color: DEFAULT_COLORS[nextSlot % DEFAULT_COLORS.length].toRGBA(),
    precision: 1,
    offset: 0,
  };
}

function handleBodyMouseClick(event) {
  SPTABS.selected = 'mapping-editor';

  // Prevent clicking to navigate away from this page.
  event.stopPropagation();
  event.preventDefault();

  const currentURL = getCurrentURL();
  let containerTarget = event.target;
  // If already at a container, see if there are legit child containers.
  if (CLICK_CONTAINERS.includes(containerTarget.tagName)) {
    while (containerTarget.children.length === 1 && CLICK_CONTAINERS.includes(containerTarget.children[0].tagName)) {
      containerTarget = containerTarget.children[0];
      if (TRUST_NODE_ID && containerTarget.getAttribute('id')) {
        break;
      }
    }
  } else {
    while (containerTarget && !CLICK_CONTAINERS.includes(containerTarget.tagName)) {
      containerTarget = containerTarget.parentElement;
    }
  }

  let mappingData = {};
  const mappingRow = getMappingRowFromTarget(containerTarget);
  if (mappingRow) {
    mappingData = handleRowData(mappingRow);
    mappingRow.classList.add('highlight');
    setTimeout(() => mappingRow.classList.remove('highlight'), 750);
  }

  let target = containerTarget;
  if (event.altKey) {
    let parentDepth = 1;
    if (mappingRow) {
      mappingData.count += 1;
      parentDepth = mappingData.count;
    }
    for (let i = 0; i < parentDepth; i += 1) {
      target = target.parentElement;
    }
  }

  if (!target) {
    target = containerTarget;
  }

  const targetSelector = buildSelector(target);
  const mappings = getFreeSelectionsMapping(currentURL) || [];
  let currentMapping = mappings.find((m) => m.id === mappingData?.sectionId);
  let newMapping = !currentMapping;
  if (newMapping) {
    currentMapping = createNewMapping(target, targetSelector);
    mappings.push(currentMapping);
  }
  if (event.shiftKey) {
    // Shift key, so reset the selector.
    currentMapping.selector = buildSelector(target);
    currentMapping.precision = 1;
    currentMapping.offset = 0;
  } else if (event.ctrlKey) {
    // Ctrl key, delete mapping
    mappings.splice(mappings.indexOf(currentMapping), 1);
    mappingRow.remove();
    target.dataset.boxData = ''
    saveFreeSelectionsMapping(getCurrentURL(), mappings);
    target.style.border = 'initial';
    return;
  }

  console.log('Latest selector is:', JSON.stringify(currentMapping, undefined, 2));

  // Reset the UI.
  if (newMapping) {
    const row = createMappingRow(currentMapping, FREE_MAPPING_EDITOR_SECTIONS.children.length);
    FREE_MAPPING_EDITOR_SECTIONS.appendChild(row);
  } else {
    const selector = mappingRow.querySelector('#sec-dom-selector');
    if (selector) {
      selector.value = currentMapping.selector;
    }
    const precision = mappingRow.querySelector('#sec-dom-precision');
    if (precision) {
      precision.value = currentMapping.precision;
    }
    setSelectorHelperText(mappingRow, currentMapping.selector);
  }

  // Save the new mapping to local storage and the element's data attribute.
  target.dataset.boxData = JSON.stringify(currentMapping);
  saveFreeSelectionsMapping(getCurrentURL(), mappings);

  target.style.border = `4px solid ${currentMapping.color}`;
}

function initializeFreeMappings(frame, url) {
  toggleFreeMappingEditor(true);
  frame.contentWindow.document.body.addEventListener('click', handleBodyMouseClick);

  // Reset the non-customized block mappings.
  const mappingUIData = getFreeSelectionsMapping(url);
  FREE_MAPPING_EDITOR_SECTIONS.querySelectorAll('.row').forEach((r) => r.remove());
  mappingUIData.filter((md) => isDefaultMapping(md))
    .forEach((m) => {
      const row = createMappingRow(m, FREE_MAPPING_EDITOR_SECTIONS.children.length);
      FREE_MAPPING_EDITOR_SECTIONS.appendChild(row);
    });
}

export {
  buildSelector,
  buildSelectorWithDepth,
  initializeFreeMappings,
};
