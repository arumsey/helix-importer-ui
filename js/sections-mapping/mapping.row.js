import {
  defaultMappingsConfiguration,
  getImporterSectionsMapping, isDefaultMapping,
  saveImporterSectionsMapping,
} from './utils.ui.js';
import {
  createElement,
  getContentFrame,
  getCurrentURL,
  getElementByXpath,
} from '../shared/utils.js';
import { DEFAULT_COLORS } from '../shared/color.js';
import { buildSelectorWithDepth } from './preview-selectors.js';

const MAPPING_EDITOR_SECTIONS = document.getElementById('mapping-editor-sections');
const MAX_CLASSES_PER_ELEMENT = 2;
const CLICK_CONTAINERS = ['DIV', 'SECTION', 'HEADER', 'BODY' ];

const originalStyles = [];

function handleRowData(row, args) {
  if (!row?.dataset) {
    return {};
  }
  let data = {};
  if (row.dataset.mapping) {
    try {
      data = JSON.parse(row.dataset.mapping);
    } catch (e) {
      return {};
    }
  }

  if (!args) {
    return data;
  }

  args = { ...data, ...args };
  row.dataset.mapping = JSON.stringify(args);
  return args;
}

function handleMouseOverMappingRow(e, mouseIsOver) {
  const frameForEvent = getContentFrame();
  const target = e.target.nodeName === 'DIV' ? e.target : e.target.closest('.row');
  if (target.nodeName === 'DIV') {
    const { xpath } = handleRowData(target);
    const div = getElementByXpath(frameForEvent.contentDocument, xpath);
    if (!div) {
      return;
    }
    let mappingColor = DEFAULT_COLORS[0];
    const colorSwatch = target.querySelector('#sec-color');
    if (colorSwatch) {
      mappingColor = colorSwatch.style.backgroundColor;
    }
    const original = originalStyles.find((os) => os.xpath === xpath);
    if (mouseIsOver) {
      div.scrollIntoViewIfNeeded({ behavior: 'smooth' });
      if (!original) {
        originalStyles.push({
          style: div.style,
          xpath,
        });
      }
      // Highlight the box by emphasising the border for a second.
      div.style = `${div.style};border: 10px ${mappingColor} solid !important;`;
    } else if (original) {
      div.style = original.style;
    }
  }
}

const getSelectorHitText = (frame, selector) => {
  let helpText = '';
  if (selector) {
    const bodySelector = selector.replace(':scope', 'BODY');
    try {
      const allSelectors = frame.contentDocument.querySelectorAll(bodySelector);

      // Manage warnings when the selector matches more than 1 element.
      if (allSelectors.length !== 1) {
        helpText = `This precision/offset produces ${allSelectors.length} results.`;
      }
    } catch (e) {
      helpText = 'The values do not match current page.';
    }
  }

  return helpText;
};

// Delete a row from the UI and remove its contents from the saved mappings.
const getRowDeleteButton = (url) => {
  const deleteBtn = document.createElement('sp-button');
  deleteBtn.setAttribute('variant', 'negative');
  deleteBtn.setAttribute('icon-only', '');
  deleteBtn.innerHTML = '<sp-icon-delete slot="icon"></sp-icon-delete>';
  deleteBtn.addEventListener('click', (e) => {
    const rowEl = e.target.closest('.row');
    if (rowEl) {
      let mappingData = getImporterSectionsMapping(url);
      const rowDataset = handleRowData(rowEl);
      const id = rowDataset.sectionId ?? rowDataset.customId;
      // eslint-disable-next-line no-param-reassign
      mappingData = mappingData.filter((m) => m.id !== id);

      // save sections mapping data
      saveImporterSectionsMapping(url, mappingData);

      // Remove any 'markups' in the preview.
      handleMouseOverMappingRow({ target: rowEl }, false);

      rowEl.remove();
    }
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.append(deleteBtn);
  return buttonContainer;
};

function saveMappingChange(id, args) {
  const currentURL = getCurrentURL();
  const mappingData = getImporterSectionsMapping(currentURL);
  // update mapping data
  let mItemIndex = mappingData.findIndex((m) => m.id === id);
  if (mItemIndex >= 0) {
    mappingData[mItemIndex] = { ...mappingData[mItemIndex], ...args };
  } else if (id !== null) {
    mappingData.push({ id, ...args });
  } else {
    // eslint-disable-next-line no-console
    console.log('Id was not provided.', JSON.stringify(id, undefined, 2));
    return;
  }
  saveImporterSectionsMapping(currentURL, mappingData);
}

function setSelectorHelperText(row, selector, frame) {
  let helpSelector = selector;
  let helpFrame = frame;
  if (!selector) {
    helpSelector = row.querySelector('#sec-dom-selector').value;
  }
  if (!frame) {
    helpFrame = getContentFrame();
  }

  const helperText = getSelectorHitText(helpFrame, helpSelector);
  // Manage warnings when the selector matches more than 1 element.
  let help = row.querySelector('sp-help-text');
  if (help === null && helperText.length > 0) {
    const selectorField = row.querySelector('sec-dom-selector');
    help = selectorField.parentElement.appendChild(
      createElement('sp-help-text', { slot: 'help-text' }),
    );
  }
  if (help !== null) {
    help.innerText = helperText;
  }

  row.querySelector('.sec-selector-group').setAttribute('title',
    selector.replaceAll(' ', '\n').replaceAll('>\n', '> '));
}

function onMappingChange(e, property) {
  const frame = getContentFrame();
  if (e.target.value !== undefined && e.target.value !== '') {
    const prev = {};
    const row = e.target.closest('.row');
    const args = handleRowData(row);
    prev[property] = args[property];
    args[property] = e.target.value;
    const { sectionId, selector, precision, offset, xpath } = handleRowData(row, args);
    saveMappingChange(sectionId, args);

    if (['precision', 'offset'].includes(property)) {
      const selector = row.querySelector('#sec-dom-selector');
      const deepSelector = buildSelectorWithDepth(
        getElementByXpath(frame.contentDocument, xpath), precision, offset
      );
      if (deepSelector.includes(' > ')) {
        row.querySelector('#sec-dom-precision').setAttribute('max', precision);
      }
      row.querySelector('#sec-dom-offset').setAttribute('max', `${parseInt(precision) - 1}`);
      selector.value = deepSelector;
      setSelectorHelperText(row, deepSelector);
    } else if ('selector' === property) {
      setSelectorHelperText(row, selector, frame);
    }
  }
}

function getSelectorNumberField(label, property, value, min) {
  const numberField = createElement('sp-number-field',
    { id: `sec-dom-${property}`, label, value: value, size: 'm', min }
  );
  numberField.addEventListener('change', (e) => onMappingChange(e, property));

  return numberField;
}

function getSelectorTextField(id, placeHolder, value, changeType, visible, disabled, helpText) {
  const textField = createElement('sp-textfield', { id, placeHolder });
  if (disabled) {
    textField.setAttribute('disabled', 'true');
  }
  if (!visible) {
    textField.classList.add('hidden');
  }
  textField.addEventListener('change', (e) => onMappingChange(e, changeType));
  if (value) {
    textField.setAttribute('value', value);
  }
  if (helpText?.length) {
    textField.appendChild(
      createElement('sp-help-text', { slot: 'help-text' }, helpText),
    );
  }

  return textField;
}

function getBlockPicker(id, value = 'unset') {
  const blockPickerDiv = document.createElement('div');
  const blockPicker = document.createElement('sp-picker');
  blockPicker.setAttribute('label', 'Mapping ...');
  blockPicker.setAttribute('id', 'block-picker');

  defaultMappingsConfiguration.forEach((group, idx, arr) => {
    group.forEach((item) => {
      const mItem = document.createElement('sp-menu-item');
      item.attributes = item.attributes || [];
      Object.keys(item.attributes).forEach((k) => {
        mItem.setAttribute(k, item.attributes[k]);
      });
      mItem.textContent = item.label;
      blockPicker.appendChild(mItem);
    });
    if (idx < arr.length - 1) {
      blockPicker.appendChild(document.createElement('sp-menu-divider'));
    }
  });

  blockPicker.setAttribute('value', value);

  blockPicker.addEventListener('change', (e) => {
    saveMappingChange(id, { mapping: e.target.value });
  });

  blockPickerDiv.appendChild(blockPicker);

  return blockPickerDiv;
}

function createMappingRow(section, idx = 1) {
  const frame = getContentFrame();
  const row = document.createElement('div');
  row.classList.add('row');
  const { selector, variants, precision, offset } = handleRowData(row, {
    idx: idx,
    sectionId: section.id,
    xpath: section.xpath,
    selector: section.selector ?? '',
    variants: section.variants ?? '',
    precision: section.precision ?? 1,
    offset: section.offset ?? 0,
    customId: undefined,
  });

  const color = createElement('div', { id: 'sec-color', class: 'sec-color', style: `background-color: ${section.color || 'white'}` });
  const moveUpBtnContainer = document.createElement('div');
  const moveUpBtn = createElement(
    'sp-button',
    {
      variant: 'primary',
      'icon-only': '',
      title: 'Move this item up one row',
      style: `background-color: ${section.color}`,
      class: 'move-up',
    },
  );
  moveUpBtn.innerHTML = '<sp-icon-arrow-up slot="icon"></sp-icon-arrow-up>'
    + '<sp-tooltip self-managed>Move this mapping up one row</sp-tooltip>';
  moveUpBtn.addEventListener('click', (e) => {
    const currentURL = getCurrentURL();
    const rowEl = e.target.closest('.row');
    if (rowEl) {
      const mappingData = getImporterSectionsMapping(currentURL);
      const id = rowEl.dataset.sectionId;
      const index = mappingData.findIndex((m) => m.id === id);
      if (index >= 0) {
        const movedMapping = mappingData.splice(index, 1);
        mappingData.splice(index - 1, 0, movedMapping[0]);

        // save sections mapping data
        saveImporterSectionsMapping(currentURL, mappingData);
        rowEl.parentNode.insertBefore(rowEl, rowEl.previousElementSibling);

        // Give a little visual feedback that the row was moved.
        rowEl.style.backgroundColor = 'blue';
        setTimeout(() => {
          rowEl.style.backgroundColor = '';
        }, 300);
      }
    }
  });
  moveUpBtnContainer.append(moveUpBtn);

  const title = selector.replaceAll(' ', '\n').replaceAll('>\n', '> ');
  const tooltip = createElement('sp-tooltip', { 'self-managed': true }, title);
  const selectorGroup = createElement('div', { class: 'sec-selector-group', title: `${title}` });
  const selectorTweaker = createElement('div');
  const precisionTweaker = getSelectorNumberField('Precision', 'precision', precision, 1);
  const offsetTweaker = getSelectorNumberField('Offset', 'offset', offset, 0);
  selectorTweaker.append(precisionTweaker, offsetTweaker, tooltip);

  const domSelector = getSelectorTextField(
    'sec-dom-selector',
    'Selector',
    selector,
    'selector',
    true,
    true,
    getSelectorHitText(frame, selector),
  );

  const selectorDiv = createElement('div');
  selectorDiv.appendChild(domSelector);
  selectorGroup.append(selectorTweaker, selectorDiv, tooltip);

  const variantsField = getSelectorTextField(
    'sec-dom-variants',
    'Add optional block variants',
    variants,
    'variants',
    true,
    false,
  );

  const mappingPicker = getBlockPicker(section.id, section.mapping);
  const deleteBtn = getRowDeleteButton(getCurrentURL());

  row.append(color, moveUpBtnContainer, selectorGroup, mappingPicker, variantsField, deleteBtn);

  row.addEventListener('mousemove', (e) => handleMouseOverMappingRow(e, true));
  row.addEventListener('mouseout', (e) => handleMouseOverMappingRow(e, false));

  return row;
}

// Set up the non-customized block mappings.
function setupMappingUI(url) {
  const mappingUIData = getImporterSectionsMapping(url);
  mappingUIData.filter((md) => isDefaultMapping(md))
    .forEach((m) => {
      const row = createMappingRow(m, MAPPING_EDITOR_SECTIONS.children.length);
      MAPPING_EDITOR_SECTIONS.appendChild(row);
    });
}

export {
  createMappingRow,
  getRowDeleteButton,
  handleRowData,
  setupMappingUI,
  setSelectorHelperText,
  CLICK_CONTAINERS,
  MAPPING_EDITOR_SECTIONS,
  MAX_CLASSES_PER_ELEMENT,
};
