const baseTransformCfg = {
  root: 'main',
  cleanup: {
    start: [
      '.cookie-status-message',
      '.breadcrumbs',
      '.messages',
      '.sidebar',
      'h1 + ul.instruments-menu',
      'h1',
    ],
  },
  blocks: [
    {
      type: 'metadata',
      insertMode: 'append',
      params: {
        metadata: {
          keywords: '[name="keywords"]',
          ['Publication Date']: '[property="og:article:published_time"]',
          category: [
            [':scope:has(.is-blog) .webinar-speaker-img', 'Webinars'],
            [':scope:has(.is-blog)', ''],
          ],
          series: [
            [':has(.is-blog) .webinar-speaker-img', ''],
          ],
          eventDate: [
            [':has(.is-blog) .webinar-speaker-img', ''],
          ],
          speakers: [
            [':has(.is-blog) .webinar-speaker-img', '.webinar-speaker-img + strong'],
          ],
        }
      },
    },
    {
      type: 'overview',
      selectors: [
        '.entry div:has(div > p > img)',
        '.entry > div > div:first-of-type:has(div > img)',
      ],
      params: {
        cells: [
          ['div:has(img)', ':scope > div:last-child']
        ]
      },
    },
    {
      type: 'columns',
      selectors: [
        '.entry > .about-content',
        '.desc-img-wrapper:has(> :nth-child(2):last-child)',
      ],
    },
  ]
};

/**
 * Build a transformation config object from a sections mapping
 */
function buildTransformationConfigFromMapping(mapping) {
  const transformCfg = JSON.parse(JSON.stringify(baseTransformCfg));

  if (!mapping) {
    return transformCfg;
  }

  // add clean up sections
  transformCfg.cleanup.start = mapping
    .filter((m) => m.mapping === 'exclude')
    .map((m) => m.xpath);

  // process blocks
  transformCfg.blocks = mapping
    .filter((m) => m.mapping !== 'exclude' && m.mapping !== 'defaultContent')
    .map((m) => ({
      type: m.mapping,
      selectors: [],
      params: {},
    }));

  return JSON.parse(JSON.stringify(baseTransformCfg));
}

export {
  buildTransformationConfigFromMapping,
}
