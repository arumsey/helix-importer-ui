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
/* global adobeIMS */

import {
  useEffect, useState, useCallback, useRef,
} from 'preact/hooks';
import { ImsData, injectAdobeIMS } from './ims.js';
import { sendRuntime } from '../shell.js';

export function useIms() {
  const [imsLibData, setImsLibData] = useState({});
  const imsData = useRef(new ImsData());

  imsData.current.onStateChanged = useCallback(async (state) => {
    setImsLibData(state);
    if (state.isSignedInUser && state.profile === null) {
      const profile = await adobeIMS.getProfile();
      imsData.current.adobeIdData.onProfile(profile);
    }
    sendRuntime({ ims: state });
  });

  window.adobeid = imsData.current.adobeIdData;

  useEffect(() => {
    let isSubscribed = true;

    const injectIms = async () => {
      await injectAdobeIMS();
      if (isSubscribed) {
        setImsLibData(imsData.current.imslibData);
      }
    };

    // call the function
    injectIms()
      .catch(console.error);

    return () => {
      isSubscribed = false;
    };
  }, []);

  return imsLibData;
}

export function useImsActions() {
  const signIn = () => {
    adobeIMS.signIn();
  };

  const signOut = () => {
    adobeIMS.signOut();
  };

  return {
    signIn,
    signOut,
  };
}
