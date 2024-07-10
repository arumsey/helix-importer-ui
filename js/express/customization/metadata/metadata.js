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

const METADATA_EDITOR = document.getElementById('metadata-editor');
const METADATA_EDITOR_SECTIONS = document.getElementById('metadata-editor-rows');
const ADD_METADATA_BUTTON = document.getElementById('metadata-editor-add');

/**
 * After the mappings are read in, and the detection has been run, set up the metadata
 * mappings in the customization tab.
 * @param importURL
 */
const initializeMetadata = (importURL) => {
  initializeCustomizationView(
    importURL,
    'metadata',
    METADATA_EDITOR,
    METADATA_EDITOR_SECTIONS,
    ['name', 'value', 'condition'],
    [ADD_METADATA_BUTTON],
  );
};

export {
  // eslint-disable-next-line import/prefer-default-export
  initializeMetadata,
};
