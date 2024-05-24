/**
 * Build a transformation config object from a sections mapping
 */
function buildTransformationConfigFromMapping(mapping) {
  const transformCfg = {
    cleanup : {
      start: [],
      end: [],
    },
    blocks: [],
  }

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

  return transformCfg;
}

export {
  buildTransformationConfigFromMapping,
}
