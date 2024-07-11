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

const endpoint = Object.freeze({
  dev: 'https://spacecat.experiencecloud.live/api/ci',
  prod: 'https://spacecat.experiencecloud.live/api/v1',
});

const IMPORT_PATH = '/tools/import';
const POLL_INTERVAL = 300000;
const STORAGE_JOBID_KEY = 'service-importer-jobid';

export default class ServiceImporter {
  constructor(cfg) {
    this.config = {
      endpoint: 'prod',
      poll: true,
      ...cfg,
    };
    this.endpoint = endpoint[this.config.endpoint];
    this.apiKey = this.config.apiKey;
    this.job = {};
  }

  async init() {
    const jobId = localStorage.getItem(STORAGE_JOBID_KEY);
    if (jobId) {
      this.job = { jobId };
      await this.queryJob();
    }
  }

  getJob() {
    return this.job;
  }

  isRunning() {
    return this.job.status === 'RUNNING';
  }

  async startJob(urls = [], options = {}) {
    const resp = await fetch(`${this.endpoint}${IMPORT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-import-api-key': this.apiKey,
      },
      body: JSON.stringify({ urls, ...options }),
    });
    if (resp.ok) {
      this.job = await resp.json();
      localStorage.setItem(STORAGE_JOBID_KEY, this.job.jobId);
    } else {
      this.job = {};
    }
    return this.job;
  }

  async queryJob() {
    const { jobId } = this.job;
    if (!jobId) {
      throw new Error('No job ID available');
    }
    const resp = await fetch(`${this.endpoint}${IMPORT_PATH}/${jobId}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-import-api-key': this.apiKey,
      },
    });
    if (resp.ok) {
      this.job = await resp.json();
    } else {
      this.job = {};
    }
    return this.job;
  }

  async fetchResult() {
    const { jobId } = this.job;
    if (!jobId) {
      throw new Error('No job ID available');
    }
    const resp = await fetch(`${this.endpoint}${IMPORT_PATH}/${jobId}/result`, {
      headers: {
        'Content-Type': 'application/json',
        'x-import-api-key': this.apiKey,
      },
    });
    return resp.json();
  }
}
