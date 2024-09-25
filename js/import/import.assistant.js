import { render } from 'preact';
import { html } from 'htm/preact';

function Assistant({ trigger }) {
  return html`
      <sp-overlay trigger="${trigger}@click" type="manual">
          <sp-popover class="chat-container">
              <sp-dialog dismissable>
                  <span slot="heading">Chat Window</span>
                  <sp-textfield placeholder="Enter your message"></sp-textfield>
                  <sp-action-button>Send</sp-action-button>
              </sp-dialog>
          </sp-popover>
      </sp-overlay>
        `;
}

render(html`<${Assistant} trigger="assistant-trigger" />`, document.getElementById('assistant-container'));
