import { render } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { AssistantProvider } from '../assistant/useAssistant.js';
import AssistantForm from '../assistant/AssistantForm.js';

function Assistant({ config }) {
  const [assistantConfig, setAssistantConfig] = useState({ ...config });

  const configContext = useMemo(() => ({ assistantConfig, setAssistantConfig }), [assistantConfig]);

  return html`
      <${AssistantProvider} value=${configContext}>
        <div class="import-assistant">
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
