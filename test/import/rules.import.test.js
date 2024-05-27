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

/* eslint-env mocha */
import path from 'path';
import { dirname } from 'dirname-filename-esm';
import { JSDOM } from 'jsdom';
import 'jsdom-global/register.js'
import assert from 'assert';
import { readFile } from 'fs/promises';
import { buildTransformationRulesFromMapping } from '../../js/import/rules.import.js';

// eslint-disable-next-line no-underscore-dangle
const __dirname = dirname(import.meta);

const baseRules = {
  cleanup: {
    start: [],
  },
  blocks: [
    {
      type: 'metadata',
      insertMode: 'append',
      params: {
        metadata: {}
      },
    },
  ]
};

const test = async (mapping, rules) => {
  const html = await readFile(path.resolve(__dirname, 'fixtures', 'document.html'), 'utf-8');
  const { document } = new JSDOM(html, { runScripts: undefined }).window;

  const actual = buildTransformationRulesFromMapping(mapping, { document });
  assert.equal(JSON.stringify(actual).trim(), JSON.stringify(rules).trim());
};

const testFixture = async (spec) => {
  const mapping = await readFile(path.resolve(__dirname, 'fixtures', `${spec}.mapping.json`), 'utf-8');
  const expected = await readFile(path.resolve(__dirname, 'fixtures', `${spec}.rules.json`), 'utf-8');
  await test(JSON.parse(mapping), JSON.parse(expected));
};

describe('buildTransformationRulesFromMapping tests', () => {
  it('root element with dom id', async () => {
    const mapping = [
      {
        domId: 'maincontent',
        mapping: 'root',
      }
    ];
    const rules = { ...baseRules, root: '#maincontent' };
    await test(mapping, rules);
  });
  it('root element with dom classes', async () => {
    const mapping = [
      {
        domClasses: 'page-main',
        mapping: 'root',
      }
    ];
    const rules = { ...baseRules, root: '.page-main' };
    await test(mapping, rules);
  });
  it('root element with xpath', async () => {
    const mapping = [
      {
        xpath: '/html[1]/body[1]/div[2]/main[1]',
        mapping: 'root',
      }
    ];
    const rules = { ...baseRules, root: 'div:nth-of-type(2) > main:first-of-type' };
    await test(mapping, rules);
  });
  it('excluded items by class name', async () => {
    await testFixture('exclude');
  });
});
