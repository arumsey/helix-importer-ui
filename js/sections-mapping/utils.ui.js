/**
 * Default mappings configuration. This is used to display the mappings in the UI, and to keep
 * the saved values sorted first.
 * @type {([{attributes: {value: string}, label: string},{attributes: {value: string}, label: string}]|[{attributes: {value: string}, label: string}]|[{attributes: {value: string}, label: string},{attributes: {value: string}, label: string},{attributes: {value: string}, label: string},{attributes: {value: string}, label: string}]|[{attributes: {disabled: boolean, value: string}, label: string}])[]}
 */
const defaultMappingsConfiguration = [
  [
    { label: 'Root', attributes: { value: 'root' } },
    { label: 'Exclude', attributes: { value: 'exclude' } },
  ],
  [{ label: 'Default Content', attributes: { value: 'defaultContent' } }],
  [
    { label: 'Hero', attributes: { value: 'hero' } },
    { label: 'Cards', attributes: { value: 'cards' } },
    { label: 'Columns', attributes: { value: 'columns' } },
    { label: 'Carousel', attributes: { value: 'carousel' } },
  ],
  [{ label: 'Snapshot', attributes: { value: 'snapshot', disabled: true } }],
];

// Keep a cache to reduce localstorage access.
let mappingDataCache = {};

  /**
 * Retrieve the Mapping for the provided URL from the local-storage.  A mapping is an array with
 * objects that contain:
 * - identifiers
 *   - xpath:  xpath of the box in the DOM
 *   - id: id, if available, of the box
 *   - classes: all the classes, if available, of the box
 * - boxId
 * - numCols
 * - numRows
 * - color
 * - mapping (block name)
 * @param url The current URL
 * @returns {*[]} Return the mapping as an array (not string). An empty array is
 *                     returned if the URL has no data.
 */
function getImporterSectionsMapping(url) {
  if (mappingDataCache?.url === url) {
    return mappingDataCache.mappings;
  }

  try {
    const allMappings = JSON.parse(localStorage.getItem('helix-importer-sections-mapping'));
    if (!url) {
      // Do not cache mappings without a URL.
      return allMappings ?? [];
    }
    mappingDataCache = { url , mappings: [] };
    if (allMappings) {
      if (Array.isArray(allMappings)) {
        const urlMapping = allMappings.find((sm) => sm.url === url);
        if (urlMapping) {
          mappingDataCache.mappings = urlMapping.mapping ?? [];
        }
      } else if (allMappings.url && allMappings.url === url) {
        // Handle the old way (single url saved)
        mappingDataCache.mappings = allMappings.mapping ?? [];
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Error loading sections mapping data for url ${url}`, e);
  }

  return mappingDataCache.mappings;
}

const sortMappings = (mappings) => {
  const defaultMapping = defaultMappingsConfiguration
    .flat()
    .map((dm) => {
      return dm?.attributes.value;
    });
  return mappings.sort((mapping1, mapping2) => {
    if (mapping1.mapping === mapping2.mapping) {
      return 0;
    } else if (defaultMapping.includes(mapping1.mapping)) {
      return -1;
    }
    return 1;
  });
}

/**
 * Write (or overwrite) the Mapping for the provided (base?) URL to the local-storage while
 * maintaining the mappings for other URLs.
 * @param url The current URL
 * @param mapping the mapping to store (component id to block name)
 * @returns void
 */
function saveImporterSectionsMapping(url, mapping) {
  // Reset cache
  mappingDataCache = {};
  // Sort mappings so 'move-up' will work easily.
  const sortedMapping = sortMappings(mapping);

  try {
    let allMappings = JSON.parse(localStorage.getItem('helix-importer-sections-mapping'));
    if (allMappings && Array.isArray(allMappings)) {
      const index = allMappings.findIndex((sm) => sm.url === url);
      if (index >= 0) {
        if (mapping.length === 0) {
          allMappings.splice(index, 1);
        } else {
          allMappings[index].mapping = sortedMapping;
        }
      } else {
        allMappings.push({
          url,
          mapping: sortedMapping,
        });
      }
    } else {
      // Local-Storage was empty or contained the old one-url way, just write the whole mapping.
      allMappings = [{
        url,
        mapping: sortedMapping,
      }];
    }

    // save mapping data
    localStorage.setItem('helix-importer-sections-mapping', JSON.stringify(allMappings));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Error saving sections mapping data for url ${url}`, e);
  }
}

export {
  defaultMappingsConfiguration,
  getImporterSectionsMapping,
  saveImporterSectionsMapping,
};
