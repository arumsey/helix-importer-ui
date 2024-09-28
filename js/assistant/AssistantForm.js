import { useState, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { useAssistantActions } from './useAssistant.js';

function AssistantForm() {
  const { sendCommand } = useAssistantActions();
  const [form, setForm] = useState({ command: '', prompt: '' });

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
          <p>${JSON.stringify(form)}</p>
      </form>
        `;
}

export default AssistantForm;
