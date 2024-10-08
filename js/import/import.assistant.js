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

import { render } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { AssistantProvider } from '../assistant/useAssistant.js';
import AssistantForm from '../assistant/AssistantForm.js';

function Assistant({ config }) {
  const [assistantConfig, setAssistantConfig] = useState({ ...config });

  const configContext = useMemo(() => ({ assistantConfig, setAssistantConfig }), [assistantConfig]);

  const closeAssistant = (event) => {
    event.currentTarget.closest('.page-assistant').classList.toggle('open');
  };

  return html`
      <${AssistantProvider} value=${configContext}>
        <div class="import-assistant">
            <sp-action-button quiet onClick=${closeAssistant}>
                <sp-icon-close slot="icon"></sp-icon-close>
            </sp-action-button>            
            ${assistantConfig.dirHandle && html`<${AssistantForm} />`}
        </div>
      </AssistantProvider>
        `;
}

export default function renderAssistant(config) {
  render(
    html`<${Assistant} config=${config}/>`,
    document.getElementById('assistant-container'),
  );
}
