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

export class ImsData {
  imslibData = {
    accessToken: null,
    accessTokenHasExpired: false,
    isSignedInUser: false,
    reauthToken: null,
    ready: false,
    error: null,
    profile: null,
    appState: null,
  };

  onStateChanged = null;

  triggerOnStateChanged(newState) {
    this.imslibData = { ...newState };
    this.onStateChanged(newState);
  }

  constructor(adobeid = null) {
    if (adobeid) {
      this.adobeIdData = {
        ...this.adobeIdData,
        ...adobeid,
      };
    }
  }

  adobeIdData = {
    client_id: 'aem-import-assistant',
    environment: 'stg1',
    redirect_uri: 'https://localhost:3001/tools/index.html',
    useLocalStorage: false,
    autoValidateToken: true,
    debug: true,
    scope: 'AdobeID,openid',
    locale: 'en_US',
    onAccessToken: (accessToken) => {
      const imslibData = {
        ...this.imslibData,
        accessToken,
        isSignedInUser: true,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onAccessTokenHasExpired: () => {
      const imslibData = {
        ...this.imslibData,
        accessTokenHasExpired: true,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onReauthAccessToken: (reauthToken) => {
      const imslibData = {
        ...this.imslibData,
        reauthToken,
        isSignedInUser: true,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onError: (errortype, error) => {
      const imslibData = {
        ...this.imslibData,
        error: {
          errortype,
          error,
        },
        isSignedInUser: true,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onReady: (context) => {
      const imslibData = {
        ...this.imslibData,
        ready: true,
        appState: context,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onProfile: (profile) => {
      const imslibData = {
        ...this.imslibData,
        profile,
      };
      this.triggerOnStateChanged(imslibData);
    },
    onJumpTokenToDevice: (jumpTokenToDeviceResponse) => {
      const imslibData = {
        ...this.imslibData,
        jumpTokenToDeviceResponse,
      };
      this.triggerOnStateChanged(imslibData);
    },
  };
}

function addScript(url) {
  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    scriptElement.onload = (val) => {
      resolve(val);
    };
    scriptElement.onerror = (err) => {
      reject(err);
    };
    scriptElement.onabort = (err) => {
      reject(err);
    };
    document.head.appendChild(scriptElement);
  });
}

export async function injectAdobeIMS() {
  if (window.adobeIMS) {
    return;
  }

  const imsLibPath = 'https://auth-stg1.services.adobe.com/imslib/imslib.min.js';
  await addScript(imsLibPath);
}
