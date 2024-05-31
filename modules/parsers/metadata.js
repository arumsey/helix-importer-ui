import blockParser from './block.js';

/* global WebImporter */

function isDate(str) {
  const date = new Date(str);
  return !Number.isNaN(date);
}

export default function parse(element, { document, params: { cells = {} } }) {
  const baseMetadata = WebImporter.Blocks.getMetadata(document) || {};
  const customMetadata = blockParser(document, { params: { cells } });
  // convert dates
  Object.entries(customMetadata).forEach(([key, value]) => {
    if (isDate(value)) {
      customMetadata[key] = new Date(value).toISOString().slice(0, 10);
    }
  });
  return { ...baseMetadata, ...customMetadata };
}
