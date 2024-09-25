import { html } from 'htm/preact';

function SectionTitle({ title, description }) {
  return html`
      <div class="section-title">
          <h2>${title}</h2>
          <p>${description}</p>
          <sp-divider size="l"></sp-divider>
      </div>
        `;
}

export default SectionTitle;
