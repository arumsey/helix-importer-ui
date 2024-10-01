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
import { applyDefaultTheme, toggleTheme } from './shared/theme.js';

const TOGGLE_THEME = document.querySelector('sp-top-nav #toggle-theme');
const ACTION_MENU = document.querySelector('sp-top-nav sp-action-menu');

TOGGLE_THEME.addEventListener('click', () => {
  toggleTheme();
});

ACTION_MENU.addEventListener('change', (event) => {
  const { value } = event.currentTarget;
  if (value === 'help') {
    window.open('https://www.aem.live/developer/importer', '_blank');
  }
});

applyDefaultTheme();
