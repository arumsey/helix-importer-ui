/* global WebImporter */

export default function parse(element, { params: { cells } }) {
  if (Array.isArray(cells)) {
    return WebImporter.Transformer.buildBlockCells(element, cells);
  }
  if (typeof cells === 'object') {
    return WebImporter.Transformer.buildBlockConfig(element, cells);
  }
  return [];
}
