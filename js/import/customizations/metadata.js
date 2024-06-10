import { initializeView } from './utils.customization.js';

const METADATA_EDITOR = document.getElementById('metadata-editor');
const METADATA_EDITOR_SECTIONS = document.getElementById('metadata-editor-rows');
const ADD_METADATA_BUTTON = document.getElementById('metadata-editor-add');

/**
 * After the mappings are read in, and the detection has been run, set up the metadata
 * mappings in the customization tab.
 * @param importURL
 * @param getRowDeleteButton
 */
const initializeMetadata = (importURL, getRowDeleteButton) => {
  initializeView(
    importURL,
    getRowDeleteButton,
    'metadata',
    METADATA_EDITOR,
    METADATA_EDITOR_SECTIONS,
    ADD_METADATA_BUTTON,
  );
};

export {
  METADATA_EDITOR,
  ADD_METADATA_BUTTON,
  initializeMetadata,
};
