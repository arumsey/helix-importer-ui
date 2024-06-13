import { createElement, getCurrentURL } from '../../shared/utils.js';
import {
  getImporterSectionsMapping,
  saveImporterSectionsMapping,
} from '../../sections-mapping/utils.ui.js';
import alert from '../../shared/alert.js';
import { getRowDeleteButton } from '../../sections-mapping/mapping.row.js';

const customizedFields = {
  metadata: ['name', 'value', 'condition'],
  variant: ['value', 'condition'],
};

const addBlankRowIfRequired = (viewDiv, addButton) => {
  const textFields = [...viewDiv.querySelectorAll('.row:not(.header) sp-textfield')];
  if (textFields.length === 0) {
    // If no rows, add one to lead the user after UI resets.
    addButton.click();
  }
};

/**
 * Either find the matching mapping and update it, create a brand new one or indicate that there
 * is a duplicate.
 * @param event
 * @param view
 */
const updateCustomizedMapping = (event, view) => {
  if (event.target.value === undefined) {
    return;
  }
  const originalURL = getCurrentURL();

  const mappingData = getImporterSectionsMapping(originalURL);

  const row = event.target.parentElement;
  const id = row.dataset.customId;
  const mItem = mappingData.find((m) => m.id === id) ?? {};
  const fields = customizedFields[view];
  fields.forEach((attr) => {
    mItem[attr] = row.querySelector(`.${view}-row-${attr}`).value;
  });

  // Check for duplicate
  const dup = mappingData.some((md) => {
    if (md.mapping === view && md.id !== id) {
      let duplicate = true;
      fields.forEach((attr) => {
        duplicate = duplicate && md[attr] === mItem[attr];
      });
      return duplicate;
    }
    return false;
  });
  if (dup) {
    alert.error('This value already exists. The change was not saved.');
    return;
  }

  // Fill in the properties on a new item, and push to mapping data.
  if (!mItem.id) {
    mItem.id = id;
    mItem.mapping = view;
    mappingData.push(mItem);
  }

  saveImporterSectionsMapping(originalURL, mappingData);
};

/**
 * Get the elements required to create a customized row in the UI.  Set values if given.  The caller
 * is to append it to whatever element they deem suitable.
 * @param originalURL
 * @param mapping
 * @param view
 * @returns {any}
 */
const getCustomizationRow = (originalURL, mapping, view) => {
  const divProps = { class: 'row' };
  divProps['data-custom-id'] = mapping.id;
  const customizationRow = createElement('div', divProps);

  const fields = customizedFields[view];
  if (fields.includes('name')) {
    const nameField = createElement(
      'sp-textfield',
      {
        class: `${view}-row-name`,
        placeHolder: `Enter ${view} name`,
        value: mapping.name ?? '',
      },
    );
    customizationRow.append(nameField);
    nameField.addEventListener('change', (e) => {
      updateCustomizedMapping(e, view);
    });
  }
  const valueField = createElement(
    'sp-textfield',
    {
      class: `${view}-row-value`,
      placeHolder: `Enter ${view} value`,
      value: mapping.value ?? '',
    },
  );
  const urlField = createElement(
    'sp-textfield',
    {
      class: `${view}-row-condition`,
      placeHolder: 'Enter condition',
      value: mapping.condition ?? '*',
    },
  );

  const delButton = getRowDeleteButton(originalURL);
  customizationRow.append(valueField, urlField, delButton);
  valueField.addEventListener('change', (e) => {
    updateCustomizedMapping(e, view);
  });
  urlField.addEventListener('change', (e) => {
    updateCustomizedMapping(e, view);
  });

  return customizationRow;
};

/**
 * After the mappings are read in, and the detection has been run, set up the custom
 * mappings in the provided tab.
 * @param importURL
 * @param blockType (currently, either 'metadata' or 'variant')
 * @param viewDiv
 * @param viewSection
 * @param addButton
 */
const initializeView = (
  importURL,
  blockType,
  viewDiv,
  viewSection,
  addButton,
) => {
  const mappingData = getImporterSectionsMapping(importURL);
  const allHidden = viewDiv?.querySelectorAll('[class~="hidden"]');
  allHidden.forEach((he) => {
    he.classList.remove('hidden');
  });
  viewDiv?.querySelector('.customization-click-detection-prompt').classList.add('hidden');
  viewDiv.querySelectorAll('div.row:not(.header)').forEach((mr) => mr.remove());
  addButton?.addEventListener('click', () => {
    if (!viewDiv) {
      return;
    }

    // If there are non-finished rows, do not add another one - focus the first empty field found.
    const textFields = [...viewDiv.querySelectorAll('.row:not(.header) sp-textfield')];
    if (textFields.length > 0) {
      const emptyTextField = !!textFields && textFields.find((tf) => tf.value.trim() === '');
      if (emptyTextField) {
        emptyTextField.focus();
        alert.warning(`Please complete all ${blockType} mappings already present.`);
        return;
      }
    }

    // Add a new customized row.
    const newId = `custom-${Date.now()}-${Math.floor(Math.random() * (1000)) + 1}`;
    viewSection.appendChild(
      getCustomizationRow(
        getCurrentURL(),
        { id: newId },
        blockType,
        updateCustomizedMapping,
        addButton,
      ),
    );
  });

  // Display existing customized values
  const customizedMappings = mappingData.filter((md) => md.mapping === blockType);
  if (customizedMappings.length > 0) {
    customizedMappings.forEach((mapping) => {
      const row = getCustomizationRow(
        importURL,
        mapping,
        blockType,
        updateCustomizedMapping,
        addButton,
      );
      viewSection.appendChild(row);
    });
  }

  // Add a blank row when activated - ensure a blank one doesn't already exist.
  document.querySelector('[value="block-customization"]')
    .addEventListener('click', () => addBlankRowIfRequired(viewDiv, addButton));
};

export {
  // eslint-disable-next-line import/prefer-default-export
  initializeView,
};
