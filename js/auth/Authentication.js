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
import { html } from 'htm/preact';
import { useIms, useImsActions } from './useIms.js';

function Authentication() {
  const { ready, isSignedInUser, profile } = useIms();
  const { signIn, signOut } = useImsActions();

  const handleClick = () => {
    signIn();
  };

  const handleMenuChange = (event) => {
    const { value } = event.currentTarget;
    if (value === 'help') {
      window.open('https://www.aem.live/developer/importer', '_blank');
    }
    if (value === 'signout') {
      signOut();
    }
  };

  if (!ready) {
    return html`<div></div>`;
  }

  return html`
          ${profile && html`<p>Hello, ${profile.first_name}</p>`}
          ${!isSignedInUser ? html`<sp-button onClick=${handleClick}>Login</sp-button>` : html`
          <sp-action-menu
                  label="Account"
                  placement="bottom-end"
                  quiet
                  onChange=${handleMenuChange}
          >
              <sp-menu-item>Account Settings</sp-menu-item>
              <sp-menu-item>My Profile</sp-menu-item>
              <sp-menu-divider></sp-menu-divider>
              <sp-menu-item value="help">Help</sp-menu-item>
              <sp-menu-item value="signout">Sign Out</sp-menu-item>
          </sp-action-menu>
          `}
        `;
}

export default Authentication;
