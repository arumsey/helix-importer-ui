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
/* global WebImporter adobeIMS */
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { loadDocument } from '../shared/document.js';
import { importerEvents } from '../shared/events.js';
import { getRuntime } from '../shared/runtime.js';

const AssistantContext = createContext();
export const AssistantProvider = AssistantContext.Provider;

export function useAssistantConfig() {
  const { assistantConfig, setAssistantConfig } = useContext(AssistantContext);
  return { config: assistantConfig, setConfig: setAssistantConfig };
}

export function useAssistantActions() {
  const { config: { origin, fields } } = useAssistantConfig();
  const sendCommand = async (command, prompt) => {
    // load document
    const urlsArray = fields['import-url'].split('\n').reverse().filter((u) => u.trim() !== '');

    const url = urlsArray.pop();
    const { document, screenshot } = await loadDocument(url, {
      origin,
      headers: fields['import-custom-headers'],
      enableJs: fields['import-enable-js'],
      scrollToBottom: fields['import-scroll-to-bottom'],
      pageLoadTimeout: fields['import-pageload-timeout'],
    });

    // create an import builder factory
    const { ims } = getRuntime();
    const auth = {
      accessToken: ims.accessToken.token,
      imsOrgId: '',
    };
    const factory = WebImporter.ImportBuilderFactory({ auth });

    // set up event listeners
    factory.on('start', (msg) => {
      importerEvents.emit('start', msg);
    });
    factory.on('progress', (msg) => {
      importerEvents.emit('progress', msg);
    });
    factory.on('complete', () => {
      importerEvents.emit('complete');
    });

    // send the command
    const page = [document, screenshot];
    const builder = await factory.create({ mode: 'script', page });

    const manifest = await builder.buildProject();
    console.log(manifest);
  };

  return {
    sendCommand,
  };
}
