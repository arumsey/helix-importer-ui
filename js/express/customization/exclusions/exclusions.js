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
import { initializeCustomizationView } from '../customization.utils.js';

const EXCLUSIONS_EDITOR = document.getElementById('exclusions-editor');
const EXCLUSIONS_EDITOR_SECTIONS = document.getElementById('exclusions-editor-rows');
const ADD_EXCLUSIONS_BUTTONS = [...document.getElementById('exclusions-editor-buttons').querySelectorAll('sp-button')];
// export const INVISIBLE_CONDITIONS = [
//   '[style*="display: none"]',
//   '[style*="display:none"]',
//   '[style*="display:none !important"]',
//   '[style*="display: none !important"]',
//   '[style*="opacity: 0"]',
//   '[style*="visibility: hidden"]',
// ];

/**
 * After the mappings are read in, and the detection has been run, set up the exclusions
 * mappings in the customization tab.
 * @param importURL
 */
const initializeExclusions = (importURL) => {
  initializeCustomizationView(
    importURL,
    'exclude',
    EXCLUSIONS_EDITOR,
    EXCLUSIONS_EDITOR_SECTIONS,
    ['attribute', 'property', 'value'],
    ADD_EXCLUSIONS_BUTTONS,
  );
};

export {
  // eslint-disable-next-line import/prefer-default-export
  initializeExclusions,
};
