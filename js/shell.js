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

const iframe = document.querySelector('main > iframe');

const runtime = {};

function attachRuntime() {
  const { contentWindow } = iframe;
  if (typeof contentWindow.attachRuntime === 'function') {
    contentWindow.attachRuntime(runtime);
  } else {
    console.error('Unable to attach the importer runtime to the iframe.');
  }
}

function sendRuntime(obj) {
  Object.entries(obj).forEach(([key, value]) => {
    runtime[key] = value;
  });
  if (iframe.contentDocument) {
    attachRuntime();
  }
}

function sendMessage(msg) {
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage(msg, '*');
  }
}

export {
  sendRuntime,
  sendMessage,
  attachRuntime,
};
