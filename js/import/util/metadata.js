import alert from '../../shared/alert.js';
import {
  getImporterSectionsMapping,
  saveImporterSectionsMapping,
} from '../../sections-mapping/utils.ui.js';
import { createElement } from '../../shared/utils.js';

const METADATA_EDITOR = document.getElementById('metadata-editor');
const METADATA_EDITOR_SECTIONS = document.getElementById('metadata-editor-rows');
const ADD_METADATA_BUTTON = document.getElementById('metadata-editor-add');

// Handler for deleting a row for this scope (copied until `mappingData` is centralized).
let getMetadataRowDeleteButton;

/**
 * Either find the matching mapping and update it, create a brand new one or indicate that there
 * is a duplicate.
 * @param event
 * @param originalURL
 */
const updateMetadataMapping = (event, originalURL) => {
  if (event.target.value === undefined) {
    return;
  }

  const mappingData = getImporterSectionsMapping(originalURL);

  const metadataFields = ['name', 'value', 'condition'];
  const row = event.target.parentElement;
  const id = row.dataset.metadataId;
  const mItem = mappingData.find((m) => m.id === id) ?? {};
  metadataFields.forEach((attr) => {
    mItem[attr] = row.querySelector(`.metadata-row-${attr}`).value;
  });

  // Check for duplicate
  const dup = mappingData.some((md) => {
    if (md.mapping === 'metadata' && md.id !== id) {
      return md.name === mItem.name && md.value === mItem.value
        && md.condition === mItem.condition;
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
    mItem.mapping = 'metadata';
    mappingData.push(mItem);
  }

  saveImporterSectionsMapping(originalURL, mappingData);
};

/**
 * Get the elements required to create a metadata row in the UI.  Set values if given.  The caller
 * is to append it to whatever element they deem suitable.
 * @param originalURL
 * @param mapping
 * @returns {any}
 */
const getMetadataRow = (originalURL, mapping) => {
  const metadataRow = createElement('div', { class: 'row', 'data-metadata-id': mapping.id });
  const nameField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-name',
      placeHolder: 'Enter metadata name',
      value: mapping.name ?? '',
    },
  );
  const valueField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-value',
      placeHolder: 'Enter metadata value',
      value: mapping.value ?? '',
    },
  );
  const urlField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-condition',
      placeHolder: 'Enter condition',
      value: mapping.condition ?? '*',
    },
  );

  const delButton = getMetadataRowDeleteButton(originalURL);
  metadataRow.append(nameField, valueField, urlField, delButton);
  nameField.addEventListener('change', (e) => {
    updateMetadataMapping(e, originalURL);
  });
  valueField.addEventListener('change', (e) => {
    updateMetadataMapping(e, originalURL);
  });
  urlField.addEventListener('change', (e) => {
    updateMetadataMapping(e, originalURL);
  });

  return metadataRow;
};

/**
 * After the mappings are read in, and the detection has been run, set up the metadata
 * mappings in the customization tab.
 * @param importURL
 * @param getRowDeleteButton
 */
const initializeMetadata = (importURL, getRowDeleteButton) => {
  const mappingData = getImporterSectionsMapping(importURL);
  getMetadataRowDeleteButton = getRowDeleteButton;
  const allHidden = METADATA_EDITOR?.querySelectorAll('[class~="hidden"]');
  allHidden.forEach((he) => {
    he.classList.remove('hidden');
  });
  METADATA_EDITOR?.querySelector('#metadata-click-detection-prompt').classList.add('hidden');
  METADATA_EDITOR.querySelectorAll('div.row:not(.header)').forEach((mr) => mr.remove());
  ADD_METADATA_BUTTON?.addEventListener('click', () => {
    if (!METADATA_EDITOR) {
      return;
    }

    // If there are non-finished rows, do not add another one - focus the first empty field found.
    const textFields = [...METADATA_EDITOR.querySelectorAll('.row:not(.header) sp-textfield')];
    if (textFields.length > 0) {
      const emptyTextField = !!textFields && textFields.find((tf) => tf.value.trim() === '');
      if (emptyTextField) {
        emptyTextField.focus();
        alert.warning('Please complete all metadata mappings already present.');
        return;
      }
    }

    // Add a new metadata row.
    const metadataId = `metadata-${Date.now()}`;
    METADATA_EDITOR_SECTIONS.appendChild(
      getMetadataRow(importURL, { id: metadataId }),
    );
  });

  // Display existing metadata values
  const metadataMappings = mappingData.filter((md) => md.mapping === 'metadata');
  if (metadataMappings.length === 0) {
    // If no rows, add one to lead the user.
    ADD_METADATA_BUTTON.click();
  } else {
    metadataMappings.forEach((metadata) => {
      const row = getMetadataRow(importURL, metadata);
      METADATA_EDITOR_SECTIONS.appendChild(row);
    });
  }
};

export {
  METADATA_EDITOR,
  ADD_METADATA_BUTTON,
  initializeMetadata,
};
