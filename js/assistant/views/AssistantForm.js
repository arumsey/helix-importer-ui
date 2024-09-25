import { html } from 'htm/preact';

function AssistantForm() {
  return html`
      <form class="assistant-form">
          <sp-field-label for="import-url" required>URL</sp-field-label>
          <sp-textfield class="option-field" id="import-url" type="url">
              <sp-help-text slot="help-text">https://www.example.com</sp-help-text>
              <sp-help-text slot="negative-help-text">Please enter a valid URL.</sp-help-text>
          </sp-textfield>
      </form>
        `;
}

export default AssistantForm;
