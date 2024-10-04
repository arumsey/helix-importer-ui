/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
import { initOptionFields, attachOptionFieldsListeners } from '../shared/fields.js';
import { getDirectoryHandle, saveFile } from '../shared/filesystem.js';
import { asyncForEach } from '../shared/utils.js';
import PollImporter from '../shared/pollimporter.js';
import alert from '../shared/alert.js';
import { toggleLoadingButton } from '../shared/ui.js';
import { registerRuntime } from '../shared/runtime.js';
import ServiceImporter from '../shared/serviceimporter.js';
import { applyDefaultTheme } from '../shared/theme.js';
import {
  setupPreview,
  attachPreviewListeners,
  updatePreview,
  getReport,
  REPORT_FILENAME, toggleReportButton,
} from './import.preview.js';
import {
  setupBulkUI,
  buildImportPickerItems,
  updateBulkResults,
  updateJobResults,
  clearBulkResults,
} from './import.bulk.js';
import importStatus from './import.status.js';
import renderAssistant from './import.assistant.js';
import {
  getContentFrame,
  getProxyURLSetup,
  loadDocument,
} from '../shared/document.js';

const PARENT_SELECTOR = '.import';

const CONFIG_PARENT_SELECTOR = `${PARENT_SELECTOR} form`;
const PREVIEW_CONTAINER = document.querySelector(`${PARENT_SELECTOR} .page-preview`);

const IMPORTFILEURL_FIELD = document.getElementById('import-file-url');
const IMPORT_BUTTON = document.getElementById('import-doimport-button');
const DEFAULT_TRANSFORMER_USED = document.getElementById('transformation-file-default');

const FOLDERNAME_SPAN = document.getElementById('folder-name');

const IS_BULK = document.querySelector('.import-bulk') !== null;
const USE_IMPORT_SERVICE = document.querySelector('#import-use-service');

const ASSISTANT_CONTAINER = document.querySelector(`${PARENT_SELECTOR} .page-assistant`);
const ASSISTANT_BUTTON = document.getElementById('import-assistant-button');

const config = {};

let isSaveLocal = false;
let dirHandle = null;

const updateImporterUI = (results, originalURL) => {
  if (!IS_BULK) {
    updatePreview(results, originalURL);
  } else {
    updateBulkResults(results, originalURL, importStatus.getStatus());
  }
};

const disableProcessButtons = () => {
  IMPORT_BUTTON.disabled = true;
};

const enableProcessButtons = () => {
  IMPORT_BUTTON.disabled = false;
};

const postSuccessfulStep = async (results, originalURL) => {
  let error = false;
  await asyncForEach(results, async ({
    docx, html, md, filename, path, report, from,
  }) => {
    const data = {
      url: originalURL,
      path,
    };

    if (isSaveLocal && dirHandle && (docx || html || md)) {
      const files = [];
      if (config.fields['import-local-docx'] && docx) {
        files.push({ type: 'docx', filename, data: docx });
      } else if (config.fields['import-local-html'] && html) {
        files.push({ type: 'html', filename: `${path}.html`, data: `<html><head></head>${html}</html>` });
      } else if (config.fields['import-local-md'] && md) {
        files.push({ type: 'md', filename: `${path}.md`, data: md });
      }

      files.forEach((file) => {
        try {
          const filePath = files.length > 1 ? `/${file.type}${file.filename}` : file.filename;
          saveFile(dirHandle, filePath, file.data);
          data.file = filePath;
          data.status = 'Success';
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`Failed to save ${file.type} file ${path} for ${originalURL}`, e);
          data.status = `Error: Failed to save ${file.type} file ${path} - ${e.message}`;
          error = true;
        }
      });
    } else if (from) {
      try {
        const res = await fetch(from);
        if (res && res.ok) {
          if (res.redirected) {
            data.status = 'Redirect';
            data.redirect = res.url;
          } else if (dirHandle) {
            const blob = await res.blob();
            await saveFile(dirHandle, path, blob);
            data.file = path;
            data.status = 'Success';
          } else {
            data.status = 'Success - No file created';
          }
        } else {
          data.status = `Error: Failed to download ${from} - ${res.status} ${res.statusText}`;
          error = true;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Failed to download ${from} to ${path}`, e);
        data.status = `Error: Failed to download ${from} - ${e.message}`;
        error = true;
      }
    } else {
      data.status = 'Success - No file created';
    }

    if (report) {
      Object.keys(report).forEach((key) => {
        importStatus.addExtraCols(key);
      });
      data.report = report;
    }

    importStatus.addRow(data);
  });

  return error;
};

const autoSaveReport = () => dirHandle && IS_BULK;

const postImportStep = async () => {
  if (autoSaveReport()) {
    // save report file in the folder
    try {
      await saveFile(dirHandle, REPORT_FILENAME, await getReport(importStatus.getStatus()));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save report file', e);
      return false;
    }
  }
  return true;
};

const setDefaultTransformerNotice = (importer) => {
  if (importer.usingDefaultTransformer) {
    DEFAULT_TRANSFORMER_USED.classList.remove('hidden');
  } else {
    DEFAULT_TRANSFORMER_USED.classList.add('hidden');
  }
};

const createImporter = () => {
  config.importer = new PollImporter({
    origin: config.origin,
    poll: !IS_BULK,
    importFileURL: config.fields['import-file-url'],
  });
  config.service = new ServiceImporter({
    apiKey: config.fields['spacecat-api-key'],
    importApiKey: config.fields['import-api-key'],
  });
  if (config.fields['spacecat-api-key'] && config.fields['import-api-key']) {
    config.service.init();
  }
};

const startImport = async () => {
  const field = IS_BULK ? 'import-urls' : 'import-url';
  const urlsArray = config.fields[field].split('\n').reverse().filter((u) => u.trim() !== '');
  importStatus.merge({
    urls: urlsArray,
    total: urlsArray.length,
    startTime: Date.now(),
  });

  const processNext = async () => {
    if (urlsArray.length > 0) {
      const url = urlsArray.pop();
      const { remote, proxy } = getProxyURLSetup(url, config.origin);
      const src = proxy.url;

      importStatus.incrementImported();
      // eslint-disable-next-line no-console
      console.log(`Importing: ${importStatus.getStatus().imported} => ${src}`);

      const res = await loadDocument(url, {
        origin: config.origin,
        headers: config.fields['import-custom-headers'],
        enableJs: config.fields['import-enable-js'],
        scrollToBottom: config.fields['import-scroll-to-bottom'],
        pageLoadTimeout: config.fields['import-pageload-timeout'],
      });

      if (res.error) {
        // eslint-disable-next-line no-console
        console.warn(`Cannot transform ${src} - page may not exist (status ${res.status || 'unknown status'})`);
        alert.error(`Cannot transform ${src} - page may not exist (status ${res.status || 'unknown status'})`);
        importStatus.addRow({
          url,
          status: `Invalid: ${res.status || 'unknown status'}`,
        });
        updateImporterUI([{ status: 'error' }], url);
        processNext();
      }

      if (res.redirected) {
        const u = new URL(res.url);
        let redirect = res.url;
        if (u.origin === window.location.origin) {
          redirect = `${remote.origin}${u.pathname}`;
        }
        importStatus.addRow({
          url,
          status: 'Redirect',
          redirect,
        });
        // eslint-disable-next-line no-console
        console.warn(`Cannot transform ${url} - redirected to ${redirect}`);
        updateImporterUI([{ status: 'redirect', from: url, to: redirect }], url);
        processNext();
      }

      if (res.document) {
        const includeDocx = !!dirHandle && config.fields['import-local-docx'];

        const { document, replacedURL, originalURL } = res;
        const onLoadSucceeded = await config.importer.onLoad({
          url: replacedURL,
          document,
          params: { originalURL },
        });

        if (onLoadSucceeded) {
          config.importer.setTransformationInput({
            url: replacedURL,
            document,
            includeDocx,
            params: { originalURL },
          });
          await config.importer.transform();
          processNext();
        }
      }

      if (dirHandle && res.blob) {
        const u = new URL(src);
        const path = WebImporter.FileUtils.sanitizePath(u.pathname);

        await saveFile(dirHandle, path, res.blob);
        importStatus.addRow({
          url,
          status: 'Success',
          path,
        });
        updateImporterUI([{ status: 'success' }], url);
        processNext();
      }
    } else {
      toggleReportButton(true);
      enableProcessButtons();
      toggleLoadingButton(IMPORT_BUTTON);
    }
  };

  const useService = config.fields['import-use-service'];

  importStatus.reset();
  setDefaultTransformerNotice(config.importer);

  if (IS_BULK) {
    clearBulkResults();
    if (!useService && config.fields['import-show-preview']) {
      PREVIEW_CONTAINER.classList.remove('hidden');
      ASSISTANT_CONTAINER.classList.add('hidden');
    } else {
      PREVIEW_CONTAINER.classList.add('hidden');
    }
    if (!useService) {
      toggleReportButton(true);
    }
  } else {
    toggleReportButton(false);
    PREVIEW_CONTAINER.classList.remove('hidden');
    ASSISTANT_CONTAINER.classList.add('hidden');
  }

  disableProcessButtons();
  toggleLoadingButton(IMPORT_BUTTON);
  isSaveLocal = config.fields['import-local-docx'] || config.fields['import-local-html'] || config.fields['import-local-md'];
  if (isSaveLocal && !dirHandle && !useService) {
    try {
      dirHandle = await getDirectoryHandle();
      await dirHandle.requestPermission({
        mode: 'readwrite',
      });
      FOLDERNAME_SPAN.innerText = `Saving file(s) to: ${dirHandle.name}`;
      FOLDERNAME_SPAN.classList.remove('hidden');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('No directory selected');
    }
  }

  if (useService) {
    // perform import using the service
    await config.service.startJob(urlsArray, {
      saveAsDocx: config.fields['import-local-docx'],
      saveAsHtml: config.fields['import-local-html'],
      saveAsMd: config.fields['import-local-md'],
      enableJavascript: config.fields['import-enable-js'],
      scrollToBottom: config.fields['import-scroll-to-bottom'],
    });
    enableProcessButtons();
    toggleLoadingButton(IMPORT_BUTTON);
    buildImportPickerItems(document.getElementById('import-job-picker'));
  } else {
    // perform import locally
    processNext();
  }
};

const toggleAssistant = async () => {
  if (ASSISTANT_CONTAINER.classList.contains('hidden')) {
    const handle = await getDirectoryHandle();
    if (handle) {
      PREVIEW_CONTAINER.classList.add('hidden');
      ASSISTANT_CONTAINER.classList.remove('hidden');
      const assistantConfig = { origin: config.origin, fields: config.fields, dirHandle: handle };
      renderAssistant(assistantConfig);
    }
  } else {
    ASSISTANT_CONTAINER.classList.add('hidden');
  }
};

const attachListeners = () => {
  attachOptionFieldsListeners(config.fields, PARENT_SELECTOR);
  attachPreviewListeners(config, PARENT_SELECTOR);

  config.importer.addListener(async ({ results }) => {
    const frame = getContentFrame();
    const { originalURL } = frame.dataset;

    updateImporterUI(results, originalURL);
    let error = await postSuccessfulStep(results, originalURL);
    error = await postImportStep() && error;

    if (error) {
      alert.error(`Something went wrong during the import of page ${originalURL}. Please check the Dev Console logs.`);
    } else {
      alert.success(`Import of page ${originalURL} completed.`);
    }
  });

  config.importer.addErrorListener(async ({ url, error: err, params }) => {
    const frame = getContentFrame();
    const { originalURL } = frame.dataset;

    // eslint-disable-next-line no-console
    console.error(`Error importing ${url}: ${err.message}`, err);
    alert.error(`Error importing ${url}: ${err.message}`);

    importStatus.addRow({
      url: params.originalURL,
      status: `Error: ${err.message}`,
    });

    updateImporterUI([{ status: 'error' }], originalURL);
    await postImportStep();
  });

  config.service.addListener(({ job }) => {
    updateJobResults(job);
  });

  IMPORT_BUTTON.addEventListener('click', async () => {
    startImport();
  });

  ASSISTANT_BUTTON?.addEventListener('click', async () => {
    toggleAssistant();
  });

  USE_IMPORT_SERVICE?.addEventListener('change', (event) => {
    document.querySelectorAll(`#${event.target.id} ~ sp-field-group`).forEach((el) => {
      if (event.target.checked) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  });

  IMPORTFILEURL_FIELD.addEventListener('change', async (event) => {
    if (config.importer) {
      await config.importer.setImportFileURL(event.target.value);
      setDefaultTransformerNotice(config.importer);
    }
  });
};

const init = () => {
  config.origin = window.location.origin;
  config.fields = initOptionFields(CONFIG_PARENT_SELECTOR);

  applyDefaultTheme();
  registerRuntime();
  createImporter();

  if (IS_BULK) {
    setupBulkUI(config);
  } else {
    setupPreview(PARENT_SELECTOR);
  }

  attachListeners();
};

init();
