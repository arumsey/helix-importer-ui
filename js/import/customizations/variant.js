import { initializeView } from './utils.customization.js';

const VARIANT_EDITOR = document.getElementById('variant-editor');
const VARIANT_EDITOR_SECTIONS = document.getElementById('variant-editor-rows');
const ADD_VARIANT_BUTTON = document.getElementById('variant-editor-add');

/**
 * After the mappings are read in, and the detection has been run, set up the variant
 * mappings in the customization tab.
 * @param importURL
 * @param getRowDeleteButton
 */
const initializeVariant = (importURL, getRowDeleteButton) => {
  initializeView(
    importURL,
    getRowDeleteButton,
    'variant',
    VARIANT_EDITOR,
    VARIANT_EDITOR_SECTIONS,
    ADD_VARIANT_BUTTON,
  );
};

export {
  VARIANT_EDITOR,
  ADD_VARIANT_BUTTON,
  initializeVariant,
};
