import parseMetadata from './metadata.js';
import parseColumns from './columns.js';
import parseText from './text.js';
import defaultParser from './block.js';
import parseCarousel from './carousel.js';

const parsers = {
  metadata: parseMetadata,
  columns: parseColumns,
  carousel: parseCarousel,
  text: parseText,
  block: defaultParser,
};

export default parsers;
