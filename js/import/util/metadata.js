import alert from '../../shared/alert.js';
import { saveImporterSectionsMapping } from '../../sections-mapping/utils.ui.js';
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
 * @param mappingData
 * @param originalURL
 */
const updateMetadataMapping = (event, mappingData, originalURL) => {
  if (event.target.value || event.target.value === '') {
    const metadataFields = ['name', 'value', 'condition'];
    const row = event.target.parentElement;
    const id = row.dataset.metadataId;
    const mItem = mappingData.find((m) => m.id === id);
    const newValues = { id, mapping: 'metadata' };
    metadataFields.forEach((attr) => {
      const fieldValue = row.querySelector(`.metadata-row-${attr}`).value;
      if (mItem) {
        mItem[attr] = fieldValue;
      } else {
        newValues[attr] = fieldValue;
      }
    });
    // Check for duplicate
    const dup = mappingData.find((md) => {
      if (md.mapping === 'metadata' && md.id !== id) {
        return md.name === mItem?.name && md.value === mItem?.value
          && md.condition === mItem?.condition;
      }
      return false;
    });
    if (dup) {
      alert.error('This value already exists. The change was not saved.');
      return;
    }

    if (!mItem) {
      mappingData.push(newValues);
    }

    saveImporterSectionsMapping(originalURL, mappingData);
  }
};

/**
 * Get the elements required to create a metadata row in the UI.  Set values if given.  The caller
 * is to append it to whatever element they deem suitable.
 * @param mappingData
 * @param originalURL
 * @param mapping
 * @returns {any}
 */
const getMetadataRow = (mappingData, originalURL, mapping) => {
  const metadataRow = createElement('div', { class: 'row', 'data-metadata-id': mapping.id });
  const nameField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-name',
      placeHolder: 'Enter metadata name',
      value: mapping.name ?? ''
    }
  );
  const valueField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-value',
      placeHolder: 'Enter metadata value',
      value: mapping.value ?? ''
    }
  );
  const urlField = createElement(
    'sp-textfield',
    {
      class: 'metadata-row-condition',
      placeHolder: 'Enter condition',
      value: mapping.condition ?? ''
    }
  );

  const delButton = getMetadataRowDeleteButton(mappingData, originalURL);
  metadataRow.append(nameField, valueField, urlField, delButton);
  nameField.addEventListener('change', (e) => {
    updateMetadataMapping(e, mappingData, originalURL);
  });
  valueField.addEventListener('change', (e) => {
    updateMetadataMapping(e, mappingData, originalURL);
  });
  urlField.addEventListener('change', (e) => {
    updateMetadataMapping(e, mappingData, originalURL);
  });

  return metadataRow;
};

/**
 * After the mappings are read in, and the detection has been run, set up the metadata
 * mappings in the customization tab.
 * @param mappingData
 * @param originalURL
 * @param getRowDeleteButton
 */
const initializeMetadata = (mappingData, originalURL, getRowDeleteButton) => {
  getMetadataRowDeleteButton = getRowDeleteButton;
  const allHidden = METADATA_EDITOR?.querySelectorAll('[class~="hidden"]');
  allHidden.forEach((he) => {
    he.classList.remove('hidden');
  });
  METADATA_EDITOR?.querySelector('#metadata-click-detection-prompt').classList.add('hidden');

  const mappingRows = METADATA_EDITOR.querySelectorAll('div.row:not(.header)');
  if (mappingRows.length > 0) {
    mappingRows.remove();
  }

  // Display existing metadata values;
  mappingData
    .filter((md) => md.mapping === 'metadata')
    .forEach((metadata) => {
      const row = getMetadataRow(mappingData, originalURL, metadata);
      METADATA_EDITOR_SECTIONS.appendChild(row);
    });

  ADD_METADATA_BUTTON?.addEventListener('click', () => {
    if (!METADATA_EDITOR) {
      return;
    }

    // If there are non-finished rows, do not add another one - focus the first empty field found.
    const textFields = METADATA_EDITOR.querySelectorAll('.row:not(.header) sp-textfield');
    if (textFields.length > 0) {
      const emptyTextField = !!textFields && Array.from(textFields).find((sptf) => sptf.value.trim() === '');
      if (emptyTextField) {
        emptyTextField.focus();
        alert.warning('Please complete all metadata mappings already present.');
        return;
      }
    }

    // Add a new metadata row.
    const metadataId = `metadata-${Date.now()}`;
    METADATA_EDITOR_SECTIONS.appendChild(
      getMetadataRow(mappingData, originalURL, { id: metadataId })
    );
  });
};

export {
  METADATA_EDITOR,
  ADD_METADATA_BUTTON,
  initializeMetadata,
  updateMetadataMapping,
};
