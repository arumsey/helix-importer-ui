/* global WebImporter */

export default function parse(element, { params: { cells } }) {
  if (Array.isArray(cells)) {
    return WebImporter.CellUtils.buildBlockCells(element, cells);
  }
  if (typeof cells === 'object') {
    return WebImporter.CellUtils.buildBlockConfig(element, cells);
  }
  return [];
}
