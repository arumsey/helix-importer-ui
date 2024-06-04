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
/* global CodeMirror, html_beautify, ExcelJS, WebImporter */
import { initializeMetadata } from './util/metadata.js';
import { initOptionFields, attachOptionFieldsListeners } from '../shared/fields.js';
import { getDirectoryHandle, saveFile } from '../shared/filesystem.js';
import { asyncForEach, getElementByXpath, createElement } from '../shared/utils.js';
import PollImporter from '../shared/pollimporter.js';
import alert from '../shared/alert.js';
import { toggleLoadingButton } from '../shared/ui.js';
import { defaultMappingsConfiguration, getImporterSectionsMapping, saveImporterSectionsMapping } from '../sections-mapping/utils.ui.js';
import { buildTransformationRulesFromMapping } from './rules.import.js';
import TransformFactory from '../shared/transformfactory.js';

const PARENT_SELECTOR = '.import';
const CONFIG_PARENT_SELECTOR = `${PARENT_SELECTOR} form`;

const PREVIEW_CONTAINER = document.querySelector(`${PARENT_SELECTOR} .page-preview`);

const IMPORTFILEURL_FIELD = document.getElementById('import-file-url');
const IMPORT_BUTTON = document.getElementById('import-doimport-button');
const IMPORT_URL_FIELD = document.getElementById('import-url');

// const SAVEASWORD_BUTTON = document.getElementById('saveAsWord');
const FOLDERNAME_SPAN = document.getElementById('folder-name');

const TRANSFORMED_HTML_TEXTAREA = document.getElementById('import-transformed-html');
const MD_SOURCE_TEXTAREA = document.getElementById('import-markdown-source');
const MD_PREVIEW_PANEL = document.getElementById('import-markdown-preview');
const TRANSFORMATION_TEXTAREA = document.getElementById('import-transform-source');

const SPTABS = document.querySelector(`${PARENT_SELECTOR} sp-tabs`);

const DOWNLOAD_IMPORT_REPORT_BUTTON = document.getElementById('import-downloadImportReport');

const IS_BULK = document.querySelector('.import-bulk') !== null;
const BULK_URLS_HEADING = document.querySelector('#import-result h2');
const BULK_URLS_LIST = document.querySelector('#import-result ul');

const IMPORT_FILE_PICKER_CONTAINER = document.getElementById('import-file-picker-container');

// manual mapping elements
const IS_EXPRESS = document.querySelector('.import-express') !== null;
const DETECT_BUTTON = document.getElementById('detect-sections-button');
const DOWNLOAD_TRANSFORMATION_BUTTON = document.getElementById('import-downloadTransformation');
const MAPPING_EDITOR = document.getElementById('mapping-editor');
const MAPPING_EDITOR_SECTIONS = document.getElementById('mapping-editor-sections');
const OPENURL_BUTTON = document.getElementById('express-open-url-button');

const REPORT_FILENAME = 'import-report.xlsx';

const ui = {};
const config = {};
const importStatus = {};

let isSaveLocal = false;
let dirHandle = null;

const setupUI = () => {
  if (TRANSFORMED_HTML_TEXTAREA) {
    ui.transformedEditor = CodeMirror.fromTextArea(TRANSFORMED_HTML_TEXTAREA, {
      lineNumbers: true,
      mode: 'htmlmixed',
      theme: 'base16-dark',
    });
    ui.transformedEditor.setSize('100%', '100%');
  }

  if (MD_SOURCE_TEXTAREA) {
    ui.markdownEditor = CodeMirror.fromTextArea(MD_SOURCE_TEXTAREA, {
      lineNumbers: true,
      mode: 'markdown',
      theme: 'base16-dark',
    });
    ui.markdownEditor.setSize('100%', '100%');
  }

  if (TRANSFORMATION_TEXTAREA) {
    ui.jsonEditor = CodeMirror.fromTextArea(TRANSFORMATION_TEXTAREA, {
      lineNumbers: false,
      mode: 'javascript',
      json: true,
      readOnly: true,
      theme: 'base16-dark',
    });
    ui.jsonEditor.setSize('100%', '100%');
  }

  if (MD_PREVIEW_PANEL) {
    ui.markdownPreview = MD_PREVIEW_PANEL;
    // XSS review: we need interpreted HTML here - <script> tags are removed by importer anyway
    ui.markdownPreview.innerHTML = WebImporter.md2html('Run an import to see some markdown.');
  }

  SPTABS.selected = 'mapping-editor';
};

const loadResult = ({ md, html: outputHTML }, originalURL) => {
  if (outputHTML) {
    ui.transformedEditor?.setValue(html_beautify(outputHTML.replaceAll(/\s+/g, ' '), {
      indent_size: '2',
    }));
  }

  if (md) {
    ui.markdownEditor?.setValue(md || '');

    if (ui.markdownPreview) {
      // XSS review: we need interpreted HTML (from md2html) here
      // - <script> tags are removed by importer anyway
      ui.markdownPreview.innerHTML = WebImporter.md2html(md);
      // remove existing classes and styles
      Array.from(ui.markdownPreview.querySelectorAll('[class], [style]')).forEach((t) => {
        t.removeAttribute('class');
        t.removeAttribute('style');
      });
    }
  } else {
    ui.markdownEditor?.setValue('No preview available.');
    if (ui.markdownPreview) {
      ui.markdownPreview.innerHTML = 'No preview available.';
    }
  }

  if (ui.jsonEditor) {
    const mapping = getImporterSectionsMapping(originalURL) || [];
    const transform = buildTransformationRulesFromMapping(mapping);
    ui.jsonEditor.setValue(JSON.stringify(transform, null, 2));
  }
};

const updateImporterUI = (results, originalURL) => {
  try {
    const status = results.length > 0 && results[0].status ? results[0].status.toLowerCase() : 'success';
    if (!IS_BULK) {
      IMPORT_FILE_PICKER_CONTAINER.textContent = '';

      if (status === 'success') {
        const picker = document.createElement('sp-picker');
        picker.setAttribute('size', 'm');

        if (results.length < 2) {
          picker.setAttribute('quiet', true);
          picker.setAttribute('disabled', true);
        }

        results.forEach((result, index) => {
          const { path } = result;

          // add result to picker list
          const item = document.createElement('sp-menu-item');
          item.textContent = path;
          if (index === 0) {
            item.setAttribute('selected', true);
            picker.setAttribute('label', path);
            picker.setAttribute('value', path);
          }
          picker.appendChild(item);
        });

        IMPORT_FILE_PICKER_CONTAINER.append(picker);

        if (results.length > 0) {
          picker.addEventListener('change', (e) => {
            const r = results.filter((i) => i.path === e.target.value)[0];
            loadResult(r, originalURL);
          });
        }

        loadResult(results[0], originalURL);
      } else if (status === 'redirect') {
        alert.warning(`No page imported: ${results[0].from} redirects to ${results[0].to}`);
      }
    } else {
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
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error while updating the UI: ${err.message}`, err);
  }
};

const clearResultPanel = () => {
  BULK_URLS_LIST.textContent = '';
  BULK_URLS_HEADING.textContent = 'Importing...';
};

const initImportStatus = () => {
  importStatus.startTime = 0;
  importStatus.imported = 0;
  importStatus.total = 0;
  importStatus.rows = [];
  importStatus.extraCols = [];
};

const disableProcessButtons = () => {
  if (IMPORT_BUTTON) {
    IMPORT_BUTTON.disabled = true;
  }
  if (DETECT_BUTTON) {
    DETECT_BUTTON.disabled = true;
  }
};

const enableProcessButtons = () => {
  if (IMPORT_BUTTON) {
    IMPORT_BUTTON.disabled = false;
  }
  if (DETECT_BUTTON) {
    DETECT_BUTTON.disabled = false;
  }
};

const getProxyURLSetup = (url, origin) => {
  const u = new URL(url);
  if (!u.searchParams.get('host')) {
    u.searchParams.append('host', u.origin);
  }
  const src = `${origin}${u.pathname}${u.search}`;
  return {
    remote: {
      url,
      origin: u.origin,
    },
    proxy: {
      url: src,
      origin,
    },
  };
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
        files.push({ type: 'html', filename: `${path}.html`, data: `<html lang="en"><head><title>Import</title></title></head>${html}</html>` });
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
        if (!importStatus.extraCols.includes(key)) {
          importStatus.extraCols.push(key);
        }
      });
      data.report = report;
    }

    importStatus.rows.push(data);
  });

  return error;
};

const autoSaveReport = () => dirHandle && IS_BULK;

const getReport = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet 1');

  const headers = ['URL', 'path', 'file', 'status', 'redirect'].concat(importStatus.extraCols);

  // create Excel auto Filters for the first row / header
  worksheet.autoFilter = {
    from: 'A1',
    to: `${String.fromCharCode(65 + headers.length - 1)}1`, // 65 = 'A'...
  };

  // specify a width for known path / url columns
  const w = 60;
  worksheet.getColumn(1).width = w;
  worksheet.getColumn(2).width = w;
  worksheet.getColumn(3).width = w;
  worksheet.getColumn(5).width = w;

  worksheet.addRows([
    headers,
  ].concat(importStatus.rows.map((row) => {
    const {
      url, path, file, status, redirect, report,
    } = row;
    const extra = [];
    if (report) {
      importStatus.extraCols.forEach((col) => {
        const e = report[col];
        if (e) {
          if (typeof e === 'string') {
            if (e.startsWith('=')) {
              extra.push({
                formula: report[col].replace(/=/, '_xlfn.'),
                value: '', // cannot compute a default value
              });
            } else {
              extra.push(report[col]);
            }
          } else {
            extra.push(JSON.stringify(report[col]));
          }
        } else {
          extra.push('');
        }
      });
    }
    return [url, path, file || '', status, redirect || ''].concat(extra);
  })));

  return workbook.xlsx.writeBuffer();
};

const postImportStep = async () => {
  if (autoSaveReport()) {
    // save report file in the folder
    try {
      await saveFile(dirHandle, REPORT_FILENAME, await getReport());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save report file', e);
      return false;
    }
  }
  return true;
};

const createImporter = () => {
  config.importer = new PollImporter({
    origin: config.origin,
    poll: !IS_BULK,
    importFileURL: config.fields['import-file-url'],
  });
};

const getContentFrame = () => document.querySelector(`${PARENT_SELECTOR} iframe`);

const sleep = (ms) => new Promise(
  (resolve) => {
    setTimeout(resolve, ms);
  },
);

const smartScroll = async (window, reset = false) => {
  let scrolledOffset = 0;
  let maxLoops = 4;
  while (maxLoops > 0 && window.document.body.scrollHeight > scrolledOffset) {
    const scrollTo = window.document.body.scrollHeight;
    window.scrollTo({ left: 0, top: scrollTo, behavior: 'smooth' });
    scrolledOffset = scrollTo;
    maxLoops -= 1;
    // eslint-disable-next-line no-await-in-loop
    await sleep(250);
  }
  if (reset) {
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
};

const detectSections = async (src, frame) => {
  const { originalURL } = frame.dataset;
  const sections = await window.xp.detectSections(
    frame.contentDocument.body,
    frame.contentWindow.window,
  );
  const selectedSection = { id: null };

  // eslint-disable-next-line no-console
  console.log('sections', sections);

  // Initialize mappings basic UI after detection
  const allHidden = MAPPING_EDITOR?.querySelectorAll('[class~="hidden"]');
  allHidden.forEach((he) => {
    he.classList.remove('hidden');
  });
  MAPPING_EDITOR?.querySelector('#mapping-click-detection-prompt').classList.add('hidden');

  const selectedSectionProxy = new Proxy(selectedSection, {
    set: (target, key, value) => {
      const oldValue = target[key];
      // eslint-disable-next-line no-console
      console.log(`${key} set from ${selectedSection.id} to ${value}`);
      target[key] = value;
      const oldOverlayDiv = getContentFrame().contentDocument.querySelector(`.xp-overlay[data-box-id="${oldValue}"]`);
      if (oldOverlayDiv) {
        oldOverlayDiv.classList.remove('hover');
      }
      const overlayDiv = getContentFrame().contentDocument.querySelector(`.xp-overlay[data-box-id="${value}"]`);
      if (overlayDiv) {
        overlayDiv.classList.add('hover');
      }
      return true;
    },
  });

  // Delete a row from the UI and remove its contents from the saved mappings.
  const getRowDeleteButton = (url) => {
    const deleteBtn = document.createElement('sp-button');
    deleteBtn.setAttribute('variant', 'negative');
    deleteBtn.setAttribute('icon-only', '');
    deleteBtn.innerHTML = '<sp-icon-delete slot="icon"></sp-icon-delete>';
    deleteBtn.addEventListener('click', (e) => {
      const rowEl = e.target.closest('.row');
      if (rowEl) {
        let mappingData = getImporterSectionsMapping(originalURL);
        const id = rowEl.dataset.sectionId ?? rowEl.dataset.metadataId;
        // eslint-disable-next-line no-param-reassign
        mappingData = mappingData.filter((m) => m.id !== id);

        // save sections mapping data
        saveImporterSectionsMapping(url, mappingData);

        rowEl.remove();
      }
    });

    return deleteBtn;
  };

  function saveMappingChange({ newMapping, newSelector }) {
    const mappingData = getImporterSectionsMapping(originalURL);
    // update mapping data
    const mItem = mappingData.find((m) => m.id === selectedSection.id);
    if (mItem) {
      mItem.mapping = newMapping ?? mItem.mapping;
      mItem.selector = newSelector ?? mItem.selector;
    } else if (selectedSection.id !== null) {
      mappingData.push({
        id: selectedSection.id,
        selector: newSelector ?? selectedSection.selector,
        mapping: newMapping ?? selectedSection.mapping,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log('Id was null', JSON.stringify(selectedSection, undefined, 2));
      return;
    }
    saveImporterSectionsMapping(originalURL, mappingData);
  }

  function getSelectorTextField(id, placeHolder, value, changeType, visible, helpText) {
    const textField = document.createElement('sp-textfield');
    textField.setAttribute('id', id);
    textField.setAttribute('placeHolder', placeHolder);

    if (!visible) {
      textField.classList.add('hidden');
    }
    textField.addEventListener('change', (e) => {
      if (e.target.value && e.target.value.length > 0) {
        const args = {};
        args[changeType] = e.target.value;
        saveMappingChange(args);

        // Manage warnings when the selector matches more than 1 element.
        const allSelectors = frame.contentDocument.querySelectorAll(e.target.value);
        if (allSelectors.length !== 1) {
          alert.warning(`This selector produces ${allSelectors.length} results.`);
        } else {
          const help = e.target.parentElement.querySelector('sp-help-text');
          if (help) {
            help.remove();
          }
        }
      }
    });
    if (value) {
      textField.setAttribute('value', value);
    }
    if (helpText) {
      textField.appendChild(
        createElement('sp-help-text', { slot: 'help-text' }, helpText),
      );
    }

    return textField;
  }

  function getBlockPicker(value = 'unset') {
    const blockPickerDiv = document.createElement('div');
    const blockPicker = document.createElement('sp-picker');
    blockPicker.setAttribute('label', 'Mapping ...');
    blockPicker.setAttribute('id', 'block-picker');

    defaultMappingsConfiguration.forEach((group, idx, arr) => {
      group.forEach((item) => {
        const mItem = document.createElement('sp-menu-item');
        item.attributes = item.attributes || [];
        Object.keys(item.attributes).forEach((k) => {
          mItem.setAttribute(k, item.attributes[k]);
        });
        mItem.textContent = item.label;
        blockPicker.appendChild(mItem);
      });
      if (idx < arr.length - 1) {
        blockPicker.appendChild(document.createElement('sp-menu-divider'));
      }
    });

    blockPicker.setAttribute('value', value);

    blockPicker.addEventListener('change', (e) => {
      saveMappingChange({ newMapping: e.target.value });
    });

    blockPickerDiv.appendChild(blockPicker);

    return blockPickerDiv;
  }

  function getMappingRow(section, idx = 1) {
    const row = document.createElement('div');
    row.dataset.idx = `${idx}`;
    row.dataset.sectionId = section.id;
    row.dataset.xpath = section.xpath;
    row.classList.add('row');
    const selector = !section.selector ? '' : section.selector;

    const color = createElement('div', { id: 'sec-color', class: 'sec-color', style: `background-color: ${section.color || 'white'}` });
    const moveUpBtn = createElement(
      'sp-button',
      {
        variant: 'primary',
        'icon-only': '',
        title: 'Move this item up one row',
        style: `background-color: ${section.color}`,
        class: 'move-up',
      },
    );
    moveUpBtn.innerHTML = '<sp-icon-arrow-up slot="icon"></sp-icon-arrow-up>'
      + '<sp-tooltip self-managed>Move this mapping up one row</sp-tooltip>';
    moveUpBtn.addEventListener('click', (e) => {
      const rowEl = e.target.closest('.row');
      if (rowEl) {
        const mappingData = getImporterSectionsMapping(originalURL);
        const id = rowEl.dataset.sectionId;
        const index = mappingData.findIndex((m) => m.id === id);
        if (index >= 0) {
          const movedMapping = mappingData.splice(index, 1);
          mappingData.splice(index - 1, 0, movedMapping[0]);

          // save sections mapping data
          saveImporterSectionsMapping(originalURL, mappingData);
          rowEl.parentNode.insertBefore(rowEl, rowEl.previousElementSibling);

          // Give a little visual feedback that the row was moved.
          rowEl.style.backgroundColor = 'blue';
          setTimeout(() => {
            rowEl.style.backgroundColor = '';
          }, 300);
        }
      }
    });

    let helpText;
    if (selector?.length > 0) {
      const allSelectors = frame.contentDocument.querySelectorAll(selector);
      if (allSelectors.length !== 1) {
        helpText = `This selector produces ${allSelectors.length} results.`;
      }
    }
    const domSelector = getSelectorTextField(
      'sec-dom-selector',
      'Selector',
      selector,
      'newSelector',
      true,
      helpText,
    );
    const title = selector.replaceAll(' ', '\n').replaceAll('>\n', '> ');
    const selectorDiv = createElement('div', { title: `${title}` });
    selectorDiv.appendChild(domSelector);
    selectorDiv.appendChild(createElement('sp-tooltip', { 'self-managed': true }, title));

    const mappingPicker = getBlockPicker(section.mapping);
    const deleteBtn = getRowDeleteButton(originalURL);

    row.append(color, moveUpBtn, selectorDiv, mappingPicker, deleteBtn);

    row.addEventListener('mouseenter', (e) => {
      const target = e.target.nodeName === 'DIV' ? e.target : e.target.closest('.row');
      if (target.nodeName === 'DIV') {
        const id = target.dataset.sectionId;
        const div = getElementByXpath(frame.contentDocument, target.dataset.xpath);
        if (div) {
          div.scrollIntoViewIfNeeded({ behavior: 'smooth' });
        }
        selectedSectionProxy.id = id;

        // Highlight the box by emphasising the border for a second.
        // Maybe...
        // const originalStyle = div.style;
        // div.style = `${originalStyle};border: 50px green solid !important;`;
        // setTimeout(() => {
        //   div.style = originalStyle;
        // }, 1000);
      }
    });

    return row;
  }

  const mappingData = getImporterSectionsMapping(originalURL);

  // Set up the non-metadata (customized) blocks.
  mappingData.filter((md) => md.mapping !== 'metadata').forEach((m) => {
    const row = getMappingRow(m, MAPPING_EDITOR_SECTIONS.children.length);
    MAPPING_EDITOR_SECTIONS.appendChild(row);
  });

  frame.contentDocument.body.addEventListener('click', (e) => {
    const clickMappingData = getImporterSectionsMapping(originalURL);
    const overlayDiv = e.target; // .closest('.xp-overlay');
    if (overlayDiv.dataset.boxData) {
      const section = JSON.parse(overlayDiv.dataset.boxData);
      section.color = overlayDiv.style.borderColor;
      section.mapping = 'unset';

      if (!clickMappingData.find((m) => m.id === section.id)) {
        clickMappingData.push({
          id: section.id,
          selector: section.selector,
          xpath: section.xpath,
          layout: section.layout,
          color: section.color,
        });
        const row = getMappingRow(section, MAPPING_EDITOR_SECTIONS.children.length);
        MAPPING_EDITOR_SECTIONS.appendChild(row);
        saveImporterSectionsMapping(originalURL, clickMappingData);
      }
    }
  });

  initializeMetadata(originalURL, getRowDeleteButton);
};

const attachListeners = () => {
  attachOptionFieldsListeners(config.fields, PARENT_SELECTOR);

  function pageLoadFailed(src, url, res) {
    // eslint-disable-next-line no-console
    console.warn(
      `Cannot transform ${src} - page may not exist (status ${res?.status || 'unknown status'})`,
    );
    alert.error(
      `Cannot transform ${src} - page may not exist (status ${res?.status || 'unknown status'})`,
    );
    importStatus.rows.push({
      url,
      status: `Invalid: ${res?.status || 'unknown status'}`,
    });
    updateImporterUI([{ status: 'error' }], url);
  }

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

    importStatus.rows.push({
      url: params.originalURL,
      status: `Error: ${err.message}`,
    });

    updateImporterUI([{ status: 'error' }], originalURL);
    await postImportStep();
  });

  IMPORT_BUTTON?.addEventListener('click', (async () => {
    initImportStatus();

    if (IS_BULK) {
      clearResultPanel();
      if (config.fields['import-show-preview']) {
        PREVIEW_CONTAINER.classList.remove('hidden');
      } else {
        PREVIEW_CONTAINER.classList.add('hidden');
      }
      DOWNLOAD_IMPORT_REPORT_BUTTON?.classList.remove('hidden');
    } else {
      DOWNLOAD_IMPORT_REPORT_BUTTON?.classList.add('hidden');
      DOWNLOAD_TRANSFORMATION_BUTTON?.classList.add('hidden');
    }

    disableProcessButtons();
    toggleLoadingButton(IMPORT_BUTTON);
    isSaveLocal = config.fields['import-local-docx'] || config.fields['import-local-html'] || config.fields['import-local-md'];
    if (isSaveLocal && !dirHandle) {
      try {
        dirHandle = await getDirectoryHandle();
        await dirHandle.requestPermission({
          mode: 'readwrite',
        });
        FOLDERNAME_SPAN.innerText = `Saving file(s) to: ${dirHandle.name}`;
        FOLDERNAME_SPAN.classList.remove('hidden');
      } catch (e) {
        // Cancel import.
        DOWNLOAD_IMPORT_REPORT_BUTTON?.classList.remove('hidden');
        DOWNLOAD_TRANSFORMATION_BUTTON?.classList.remove('hidden');
        enableProcessButtons();
        toggleLoadingButton(IMPORT_BUTTON);
        alert.warning('Folder selection was cancelled or failed.');
        return;
      }
    }

    const field = IS_BULK ? 'import-urls' : 'import-url';
    const urlsArray = config.fields[field].split('\n').reverse().filter((u) => u.trim() !== '');
    importStatus.total = urlsArray.length;
    importStatus.startTime = Date.now();
    const processNext = async () => {
      if (urlsArray.length > 0) {
        const url = urlsArray.pop();
        const { remote, proxy } = getProxyURLSetup(url, config.origin);
        const src = proxy.url;

        importStatus.imported += 1;
        // eslint-disable-next-line no-console
        console.log(`Importing: ${importStatus.imported} => ${src}`);

        let res;
        try {
          const headers = JSON.parse(config.fields['import-custom-headers'] || '{}');
          res = await fetch(src, {
            headers,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`Unexpected error when trying to fetch ${src} - CORS issue or invalid headers ?`, e);
        }
        if (res && res.ok) {
          if (res.redirected) {
            const u = new URL(res.url);
            let redirect = res.url;
            if (u.origin === window.location.origin) {
              redirect = `${remote.origin}${u.pathname}`;
            }
            importStatus.rows.push({
              url,
              status: 'Redirect',
              redirect,
            });
            // eslint-disable-next-line no-console
            console.warn(`Cannot transform ${url} - redirected to ${redirect}`);
            updateImporterUI([{ status: 'redirect', from: url, to: redirect }], url);
            processNext();
          } else {
            const contentType = res.headers.get('content-type');
            if (contentType.includes('html') || contentType.includes('json')) {
              const frame = document.createElement('iframe');
              frame.id = 'import-content-frame';

              if (config.fields['import-enable-js']) {
                frame.removeAttribute('sandbox');
              } else {
                frame.setAttribute('sandbox', 'allow-same-origin');
              }

              const onLoad = async () => {
                const includeDocx = !!dirHandle && config.fields['import-local-docx'];

                // sell.amazon.com has a frame-busting script!
                frame.contentDocument.body.setAttribute('style', 'display:block !important');

                if (config.fields['import-scroll-to-bottom']) {
                  await smartScroll(frame.contentWindow.window, true);
                }

                await sleep(config.fields['import-pageload-timeout'] || 100);

                if (config.fields['import-scroll-to-bottom']) {
                  await smartScroll(frame.contentWindow.window, true);
                }

                if (frame.contentDocument) {
                  const { originalURL, replacedURL } = frame.dataset;

                  const onLoadSucceeded = await config.importer.onLoad({
                    url: replacedURL,
                    document: frame.contentDocument,
                    params: { originalURL },
                  });

                  if (onLoadSucceeded) {
                    let transform = null;
                    if (IS_EXPRESS) {
                      // auto generate transformation config
                      const mapping = getImporterSectionsMapping(originalURL) || [];
                      transform = TransformFactory.create(
                        buildTransformationRulesFromMapping(mapping),
                      );
                    }
                    config.importer.setTransformationInput({
                      url: replacedURL,
                      document: frame.contentDocument,
                      includeDocx,
                      params: { originalURL },
                      transform,
                    });
                    await config.importer.transform();
                  }
                }

                const event = new Event('transformation-complete');
                frame.dispatchEvent(event);
              };

              frame.addEventListener('load', onLoad);
              frame.addEventListener('transformation-complete', processNext);

              frame.dataset.originalURL = url;
              frame.dataset.replacedURL = src;

              if (contentType.includes('json')) {
                const blob = await res.blob();
                frame.src = URL.createObjectURL(blob);
              } else {
                frame.src = src;
              }

              const current = getContentFrame();
              current.removeEventListener('load', onLoad);
              current.removeEventListener('transformation-complete', processNext);

              current.replaceWith(frame);
            } else if (dirHandle) {
              const blob = await res.blob();
              const u = new URL(src);
              const path = WebImporter.FileUtils.sanitizePath(u.pathname);

              await saveFile(dirHandle, path, blob);
              importStatus.rows.push({
                url,
                status: 'Success',
                path,
              });
              updateImporterUI([{ status: 'success' }], url);
              processNext();
            }

            SPTABS.selected = 'import-preview';
          }
        } else {
          pageLoadFailed(src, url, res);
          processNext();
        }
      } else {
        const frame = getContentFrame();
        frame.removeEventListener('transformation-complete', processNext);
        DOWNLOAD_IMPORT_REPORT_BUTTON?.classList.remove('hidden');
        DOWNLOAD_TRANSFORMATION_BUTTON?.classList.remove('hidden');
        enableProcessButtons();
        toggleLoadingButton(IMPORT_BUTTON);
        if (IS_EXPRESS) {
          // After the import, detect sections again (show boxes, mapping, etc.)
          setTimeout(() => {
            DETECT_BUTTON?.click();
          }, 100);
        }
      }
    };
    processNext();
  }));

  DETECT_BUTTON?.addEventListener('click', (async () => {
    initImportStatus();
    DOWNLOAD_IMPORT_REPORT_BUTTON?.classList.add('hidden');
    DOWNLOAD_TRANSFORMATION_BUTTON?.classList.add('hidden');
    PREVIEW_CONTAINER?.classList.remove('hidden');
    MAPPING_EDITOR_SECTIONS.innerHTML = '';

    disableProcessButtons();
    toggleLoadingButton(DETECT_BUTTON);

    const field = /* IS_BULK ? 'import-urls' : */ 'import-url';
    const urlsArray = config.fields[field].split('\n').reverse().filter((u) => u.trim() !== '');
    importStatus.total = urlsArray.length;
    importStatus.startTime = Date.now();
    const processNext = async () => {
      if (urlsArray.length > 0) {
        const url = urlsArray.pop();
        const { remote, proxy } = getProxyURLSetup(url, config.origin);
        const src = proxy.url;

        importStatus.imported += 1;
        // eslint-disable-next-line no-console
        console.log(`Importing: ${importStatus.imported} => ${src}`);

        let res;
        try {
          const headers = JSON.parse(config.fields['import-custom-headers'] || '{}');
          res = await fetch(src, {
            headers,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`Unexpected error when trying to fetch ${src} - CORS issue or invalid headers ?`, e);
        }
        if (res && res.ok) {
          if (res.redirected) {
            const u = new URL(res.url);
            let redirect = res.url;
            if (u.origin === window.location.origin) {
              redirect = `${remote.origin}${u.pathname}`;
            }
            importStatus.rows.push({
              url,
              status: 'Redirect',
              redirect,
            });
            // eslint-disable-next-line no-console
            console.warn(`Cannot transform ${url} - redirected to ${redirect}`);
            updateImporterUI([{ status: 'redirect', from: url, to: redirect }], url);
            processNext();
          } else {
            const contentType = res.headers.get('content-type');
            if (contentType.includes('html') || contentType.includes('json')) {
              const frame = document.createElement('iframe');
              frame.id = 'import-content-frame';

              if (config.fields['import-enable-js']) {
                frame.removeAttribute('sandbox');
              } else {
                frame.setAttribute('sandbox', 'allow-same-origin');
              }

              const onLoad = async () => {
                // sell.amazon.com has a frame-busting script!
                frame.contentDocument.body.setAttribute('style', 'display:block !important');

                const style = frame.contentDocument.createElement('style');
                style.innerHTML = `
                  .xp-overlay:hover {
                    box-shadow: inset 0 0 75px rgba(0, 0, 125, 1);
                    background-color: rgba(0, 0, 125, 0.1) !important;
                    cursor: pointer;
                  }
                  .xp-overlay.hover {
                    box-shadow: inset 0 0 75px rgba(0, 0, 125, 1);
                    background-color: rgba(0, 0, 125, 0.3) !important;
                    cursor: pointer;
                  }
                  .xp-overlay .xp-overlay-selector.show {
                    display: none !important;
                  }
                `;
                frame.contentDocument.head.appendChild(style);

                if (config.fields['import-scroll-to-bottom']) {
                  await smartScroll(frame.contentWindow.window, true);
                }

                await sleep(config.fields['import-pageload-timeout'] || 5000);

                if (config.fields['import-scroll-to-bottom']) {
                  await smartScroll(frame.contentWindow.window, true);
                }

                if (frame.contentDocument) {
                  const { originalURL, replacedURL } = frame.dataset;

                  const onLoadSucceeded = await config.importer.onLoad({
                    url: replacedURL,
                    document: frame.contentDocument,
                    params: { originalURL },
                  });

                  if (onLoadSucceeded) {
                    await detectSections(src, frame);
                  }
                }

                const event = new Event('detection-complete');
                frame.dispatchEvent(event);
              };

              frame.addEventListener('load', onLoad);
              frame.addEventListener('detection-complete', processNext);

              frame.dataset.originalURL = url;
              frame.dataset.replacedURL = src;

              if (contentType.includes('json')) {
                const blob = await res.blob();
                frame.src = URL.createObjectURL(blob);
              } else {
                frame.src = src;
              }

              const current = getContentFrame();
              current.removeEventListener('load', onLoad);
              current.removeEventListener('detection-complete', processNext);

              current.replaceWith(frame);
            } else if (dirHandle) {
              const blob = await res.blob();
              const u = new URL(src);
              const path = WebImporter.FileUtils.sanitizePath(u.pathname);

              await saveFile(dirHandle, path, blob);
              importStatus.rows.push({
                url,
                status: 'Success',
                path,
              });
              updateImporterUI([{ status: 'success' }], url);
              processNext();
            }
          }
        } else {
          pageLoadFailed(src, url, res);
          processNext();
        }
      } else {
        const frame = getContentFrame();
        frame.removeEventListener('transformation-complete', processNext);
        // DOWNLOAD_IMPORT_REPORT_BUTTON.classList.remove('hidden');
        enableProcessButtons();
        toggleLoadingButton(DETECT_BUTTON);
      }
    };
    processNext();
  }));

  DOWNLOAD_TRANSFORMATION_BUTTON?.addEventListener('click', async () => {
    const originalURL = config.fields['import-url'];

    const importDirHandle = await getDirectoryHandle();
    await importDirHandle.requestPermission({
      mode: 'readwrite',
    });

    const mapping = getImporterSectionsMapping(originalURL) || [];

    // save sections mapping data for current URL
    await saveFile(importDirHandle, 'import_mapping.json', JSON.stringify(mapping, null, 2));

    // save import json
    const transformCfg = buildTransformationRulesFromMapping(mapping);
    await saveFile(importDirHandle, 'import.json', JSON.stringify(transformCfg, null, 2));
  });

  IMPORTFILEURL_FIELD?.addEventListener('change', async (event) => {
    if (config.importer) {
      await config.importer.setImportFileURL(event.target.value);
    }
  });

  DOWNLOAD_IMPORT_REPORT_BUTTON?.addEventListener('click', (async () => {
    const buffer = await getReport();
    const a = document.createElement('a');
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    a.setAttribute('href', URL.createObjectURL(blob));
    a.setAttribute('download', REPORT_FILENAME);
    a.click();
  }));

  OPENURL_BUTTON?.addEventListener('click', () => {
    const importURL = config.fields['import-url'];
    if (importURL && importURL.length > 0) {
      window.open(importURL, '_blank');
    }
  });

  IMPORT_URL_FIELD?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && IS_EXPRESS && config.fields['import-url']) {
      DETECT_BUTTON?.click();
    }
  });

  if (SPTABS) {
    SPTABS.addEventListener('change', () => {
      // required for code to load in editors
      setTimeout(() => {
        ui.transformedEditor?.refresh();
        ui.markdownEditor?.refresh();
        ui.jsonEditor?.refresh();
      }, 1);
    });
  }
};

const init = () => {
  config.origin = window.location.origin;
  config.fields = initOptionFields(CONFIG_PARENT_SELECTOR);

  createImporter();

  if (!IS_BULK) setupUI();
  attachListeners();

  if (IS_EXPRESS && config.fields['import-detect-on-load'] && config.fields['import-url']) {
    DETECT_BUTTON?.click();
  }
};

init();
