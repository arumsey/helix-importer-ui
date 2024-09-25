import ServiceImporter from '../shared/serviceimporter.js';
import { PreviewButtons } from './import.preview.js';

const BULK_URLS_HEADING = document.querySelector('#import-result h2');
const BULK_URLS_LIST = document.querySelector('#import-result ul');

const buildImportPickerItems = (picker) => {
  picker.textContent = '';
  picker.removeAttribute('label');
  picker.removeAttribute('value');
  const jobCache = ServiceImporter.getJobs();
  jobCache.forEach((job, index) => {
    const { id, startTime } = job;
    // pretty print end time
    const startDate = new Date(startTime);
    const item = document.createElement('sp-menu-item');
    item.setAttribute('value', id);
    item.textContent = startDate.toLocaleString();
    if (index === jobCache.length - 1) {
      item.setAttribute('selected', true);
      picker.setAttribute('label', startDate.toLocaleString());
      picker.setAttribute('value', id);
    }
    picker.appendChild(item);
  });

  if (jobCache.length === 0) {
    picker.setAttribute('disabled', true);
  } else {
    picker.removeAttribute('disabled');
  }
};

const setupBulkUI = (config) => {
  if (config.fields['import-use-service']) {
    document.querySelectorAll('#import-use-service ~ sp-field-group').forEach((el) => {
      el.removeAttribute('hidden');
    });
  }

  const container = document.createElement('div');
  const label = document.createElement('sp-field-label');
  label.setAttribute('for', 'import-job-picker');
  label.setAttribute('size', 'm');
  label.textContent = 'Import Job';

  const fieldgroup = document.createElement('sp-field-group');
  fieldgroup.setAttribute('horizontal', '');

  const picker = document.createElement('sp-picker');
  picker.setAttribute('id', 'import-job-picker');
  picker.setAttribute('size', 'm');
  buildImportPickerItems(picker);

  picker.addEventListener('change', (e) => {
    const jobCache = ServiceImporter.getJobs();
    const job = jobCache.find((j) => j.id === e.target.value);
    config.service.init(job);
  });

  const deleteButton = document.createElement('sp-button');
  deleteButton.setAttribute('id', 'deleteTrigger');
  deleteButton.setAttribute('variant', 'negative');
  deleteButton.setAttribute('icon-only', '');
  deleteButton.innerHTML = '<sp-icon-delete slot="icon"></sp-icon-delete>';

  /*
  const deleteOverlay = document.createElement('sp-overlay');
  deleteOverlay.setAttribute('type', 'modal');
  deleteOverlay.setAttribute('trigger', 'deleteTrigger@click');
  deleteOverlay.innerHTML = `
    <sp-dialog-base
    underlay
    @click=${(event) => {
    if ((event.target).localName === 'sp-button') {
      (event.target).dispatchEvent(
        new Event('close', { bubbles: true, composed: true }),
      );
    }
  }}
    >
    <sp-dialog>
      <h2 slot="heading">Delete Import Job</h2>
      Are you sure you want to delete this import job?
      <sp-button
        slot="button"
        id="cancelButton"
        variant="secondary"
        treatment="outline"
      >
        Cancel
      </sp-button>
      <sp-button
        slot="button"
        id="confirmButton"
        variant="negative"
        treatment="fill"
      >
        Delete
       </sp-button>
    </sp-dialog>
    </sp-dialog-base>
  `;

  fieldgroup.append(picker, deleteButton, deleteOverlay);
  container.append(label, fieldgroup);

   */

  document.querySelector('#import-result').prepend(container);
};

const clearBulkResults = () => {
  if (BULK_URLS_LIST) {
    BULK_URLS_LIST.textContent = '';
  }
  if (BULK_URLS_HEADING) {
    BULK_URLS_HEADING.textContent = 'Importing...';
  }
};

const updateBulkResults = (results, originalURL, importStatus) => {
  try {
    const status = results.length > 0 && results[0].status ? results[0].status.toLowerCase() : 'success';
    const li = document.createElement('li');
    const link = document.createElement('sp-link');
    link.setAttribute('size', 'm');
    link.setAttribute('target', '_blank');
    link.setAttribute('href', originalURL);
    link.textContent = originalURL;
    li.append(link);

    let name = 'sp-icon-checkmark-circle';
    let label = 'Success';
    if (status === 'redirect') {
      name = 'sp-icon-alias';
      label = 'Redirect';
    } else if (status === 'error') {
      name = 'sp-icon-alert';
      label = 'Error';
    }

    const icon = document.createElement(name);
    icon.setAttribute('label', label);
    li.append(icon);

    BULK_URLS_LIST.append(li);

    const totalTime = Math.round((new Date() - importStatus.startTime) / 1000);
    let timeStr = `${totalTime}s`;
    if (totalTime > 60) {
      timeStr = `${Math.round(totalTime / 60)}m ${totalTime % 60}s`;
      if (totalTime > 3600) {
        timeStr = `${Math.round(totalTime / 3600)}h ${Math.round((totalTime % 3600) / 60)}m`;
      }
    }

    BULK_URLS_HEADING.innerText = `Imported URLs (${importStatus.imported} / ${importStatus.total}) - Elapsed time: ${timeStr}`;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error while updating the UI: ${err.message}`, err);
  }
};

const updateJobResults = (job) => {
  const {
    duration, successCount, status, urlCount, endTime, baseURL,
  } = job;

  clearBulkResults();

  const createListItem = (text, href, style) => {
    const li = document.createElement('li');
    if (href) {
      const link = document.createElement('sp-link');
      link.setAttribute('size', 'm');
      link.setAttribute('target', '_blank');
      link.setAttribute('href', href);
      link.textContent = text;
      li.append(link);
    } else {
      li.textContent = text;
    }

    let name = 'sp-icon-checkmark-circle';
    let label = 'Success';
    if (style === 'failure') {
      name = 'sp-icon-alert';
      label = 'Error';
    }
    const icon = document.createElement(name);
    icon.setAttribute('label', label);
    li.append(icon);

    BULK_URLS_LIST.append(li);
  };

  const totalTime = duration / 1000;
  let timeStr = `${totalTime}s`;
  if (totalTime > 60) {
    timeStr = `${Math.round(totalTime / 60)}m ${totalTime % 60}s`;
    if (totalTime > 3600) {
      timeStr = `${Math.round(totalTime / 3600)}h ${Math.round((totalTime % 3600) / 60)}m`;
    }
  }

  const endDate = new Date(endTime);
  const dateStr = endDate.toLocaleString();

  if (status === 'RUNNING') {
    BULK_URLS_HEADING.innerText = `Importing ${urlCount} URL${urlCount > 1 ? 's' : ''}...`;
  }
  if (status === 'COMPLETE') {
    createListItem(`Base URL: ${baseURL}`);
    createListItem(`Total URLs: ${urlCount}`);
    createListItem(`Completed at: ${dateStr}`);
    createListItem(`Elapsed time: ${timeStr}`);

    BULK_URLS_HEADING.innerText = `Import Complete (${successCount} / ${urlCount}) - Elapsed time: ${timeStr}`;
    PreviewButtons.DOWNLOAD_IMPORT_CONTENT_BUTTON.classList.remove('hidden');
  }
  if (status === 'FAILED') {
    BULK_URLS_HEADING.innerText = 'Import Failed';
  }
};

export {
  setupBulkUI,
  buildImportPickerItems,
  updateBulkResults,
  clearBulkResults,
  updateJobResults,
};
