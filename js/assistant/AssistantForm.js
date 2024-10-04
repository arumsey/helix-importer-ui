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

import { useEffect, useState, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { useAssistantActions } from './useAssistant.js';
import { importerEvents } from '../shared/events.js';

function AssistantForm() {
  const { sendCommand } = useAssistantActions();
  const [form, setForm] = useState({ command: '', prompt: '' });
  const [eventMessage, setEventMessage] = useState('');

  useEffect(() => {
    const handleStart = (event) => {
      setEventMessage(`${event.detail}`);
    };

    const handleProgress = (event) => {
      setEventMessage(`${event.detail}`);
    };

    importerEvents.on('start', handleStart);
    importerEvents.on('progress', handleProgress);

    return () => {
      importerEvents.off('start', handleStart);
      importerEvents.off('progress', handleProgress);
    };
  }, []);

  const handleSend = useCallback(() => {
    sendCommand(form.command, form.prompt);
  }, [form]);

  return html`
      <form class="assistant-form">
          <sp-field-group>
              <div>
                  <sp-field-label for="assistant-command" size="m">Command:</sp-field-label>
                  <sp-picker id="assistant-command" size="m" label="Command" onChange=${(event) => setForm({ ...form, command: event.currentTarget.value })}>
                      <sp-menu-item value="start">Start</sp-menu-item>
                      <sp-menu-item value="remove">Remove content</sp-menu-item>
                      <sp-menu-item value="find">Find block</sp-menu-item>
                      <sp-menu-item value="cells">Block cells</sp-menu-item>
                  </sp-picker>
              </div>
              <sp-field-label for="assistant-prompt" required>Prompt</sp-field-label>
              <sp-textfield id="assistant-prompt" multiline grows onChange=${(event) => setForm({ ...form, prompt: event.currentTarget.value })}>
                  <sp-help-text slot="help-text">A helpful prompt to send with the command</sp-help-text>
              </sp-textfield>
          </sp-field-group>
          <sp-button variant="secondary" onClick=${handleSend}>
              <sp-icon-send slot="icon"></sp-icon-send>
              Send
          </sp-button>
          <p>${eventMessage}</p>
      </form>
        `;
}

export default AssistantForm;
