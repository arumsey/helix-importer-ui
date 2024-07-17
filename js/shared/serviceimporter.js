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
const POLL_INTERVAL = 5000;
const STORAGE_JOBS = 'service-importer-jobs';

export default class ServiceImporter {
  constructor(cfg) {
    this.config = {
      endpoint: 'prod',
      poll: true,
      ...cfg,
    };
    this.endpoint = endpoint[this.config.endpoint];
    this.apiKey = this.config.apiKey;
    this.importApiKey = this.config.importApiKey;
    this.listeners = [];
    this.job = {};
    this.busy = false;
  }

  #sendEvent(job) {
    this.listeners.forEach((listener) => listener({ job }));
  }

  #getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-import-api-key': this.importApiKey,
    };
  }

  async init(job = null) {
    if (!job) {
      const jobs = ServiceImporter.getJobs();
      if (jobs.length > 0) {
        this.job = jobs[jobs.length - 1];
      }
    } else {
      this.job = job;
    }
    if (this.job.id) {
      return this.startPolling();
    }
    return Promise.resolve();
  }

  async startPolling() {
    const $this = this;
    const poll = async () => {
      if ($this.busy) return;
      if ($this.job.status === 'COMPLETE' || $this.job.status === 'FAILURE') {
        clearInterval($this.projectTransformInterval);
        $this.projectTransformInterval = null;
        return;
      }
      const { id: jobId } = $this.job;
      if (jobId) {
        await $this.queryJob();
        $this.#sendEvent($this.job);
      }
    };

    if (this.projectTransformInterval) {
      clearInterval(this.projectTransformInterval);
      this.projectTransformInterval = null;
    }

    if (this.config.poll) {
      await poll();
      if (!this.projectTransformInterval) {
        this.projectTransformInterval = setInterval(poll, POLL_INTERVAL);
      }
    }
  }

  static getJobs() {
    const allJobs = JSON.parse(localStorage.getItem(STORAGE_JOBS)) || [];
    // remove jobs older than 30 days
    const filteredJobs = allJobs.filter((job) => {
      const now = new Date();
      const created = new Date(job.startTime);
      const diff = now - created;
      return diff < 30 * 24 * 60 * 60 * 1000;
    });
    localStorage.setItem(STORAGE_JOBS, JSON.stringify(filteredJobs));
    return filteredJobs;
  }

  async startJob(urls = [], options = {}) {
    if (!this.apiKey || !this.importApiKey) {
      throw new Error('API keys are required');
    }
    try {
      const resp = await fetch(`${this.endpoint}${IMPORT_PATH}`, {
        method: 'POST',
        headers: this.#getAuthHeaders(),
        body: JSON.stringify({ urls, ...options }),
      });
      if (resp.ok) {
        this.job = await resp.json();
        if (this.job.id) {
          const localJobs = ServiceImporter.getJobs();
          localJobs.push(this.job);
          localStorage.setItem(STORAGE_JOBS, JSON.stringify(localJobs));
        }
      } else {
        const msg = resp.headers.get('x-error');
        this.job = {
          status: 'ERROR',
          message: msg,
        };
      }
      this.#sendEvent(this.job);
      this.startPolling();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    return this.job;
  }

  async queryJob() {
    if (!this.apiKey || !this.importApiKey) {
      throw new Error('API keys are required');
    }
    const { id: jobId } = this.job;
    if (!jobId) {
      throw new Error('No job ID available');
    }
    try {
      this.busy = true;
      const resp = await fetch(`${this.endpoint}${IMPORT_PATH}/${jobId}`, {
        headers: this.#getAuthHeaders(),
      });
      if (resp.ok) {
        this.job = await resp.json();
        this.#sendEvent(this.job);
      } else {
        this.job = {};
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    this.busy = false;
    return this.job;
  }

  async fetchResult() {
    if (!this.apiKey || !this.importApiKey) {
      throw new Error('API keys are required');
    }
    const { id: jobId } = this.job;
    if (!jobId) {
      throw new Error('No job ID available');
    }
    try {
      const resp = await fetch(
        `${this.endpoint}${IMPORT_PATH}/${jobId}/result`,
        {
          headers: this.#getAuthHeaders(),
        },
      );
      return resp.json();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    return null;
  }

  addListener(listener) {
    this.listeners.push(listener);
  }
}
