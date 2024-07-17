/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/** Create Carousel block */
const createCarouselBlock = (document) => {
  const carousel = document.querySelector('#myCarousel');
  if (carousel) {
    const cells = [['Carousel (auto-2000)']]; // Title row

    const communityTitleTop = document.querySelector('.communitytitle-top');
    const communityTitleBottom = document.querySelector(
        '.communitytitle-bottom',
    );
    const defaultText = `Default Slide Text
      (optional)`;

    let title1Html = communityTitleTop
        ? `<h2>${
            communityTitleTop.querySelector('#communitytitle-1')?.innerHTML || ''
        }</h2>${
            communityTitleTop.querySelector('#communitytitle-2')?.innerHTML || ''
        }`
        : '';
    let title2Html = communityTitleBottom
        ? `<h2>${
            communityTitleBottom.querySelector('#communitytitle-3')?.innerHTML ||
            ''
        }</h2>${
            communityTitleBottom.querySelector('#communitytitle-4')?.innerHTML ||
            ''
        }`
        : '';

    if (title1Html || title2Html) {
      let combinedTitleHtml = `${title1Html}<hr>${title2Html}`;
      cells.push([defaultText, combinedTitleHtml]);
    }

    communityTitleTop?.remove();
    communityTitleBottom?.remove();

    const items = carousel.querySelectorAll('.item');
    items.forEach((item) => {
      const picture = item.querySelector('picture img');
      const imgSrc = picture ? picture.src : '';
      const imgElement = `<img src="${imgSrc}" alt="${picture?.alt || ''}">`;

      const title =
          item.querySelector('.carousel-caption .carousel-header div')
              ?.textContent || '';
      const description =
          item.querySelector('.carousel-caption .carousel-copy div')
              ?.textContent || '';

      let content = `${imgElement}<h3>${title}</h3><p>${description}</p>`;

      cells.push([content, '']); // Add the concatenated content as a new row with HTML

      // Check for a PDF link
      const btnLink = item.querySelector('.carousel-button a');
      if (btnLink) {
        const btnUrl = btnLink.href;
        cells.push(['url', btnUrl]); // Add the PDF link as a new row
      }
    });

    const table = WebImporter.DOMUtils.createTable(cells, document);
    carousel.replaceWith(table); // Replace the original carousel section with the new table
  }
};

const createDescriptionBlock = (document) => {
  const descriptionContainer = document.querySelector('.col-sm-6.col-xs-6');
  const descriptionText = descriptionContainer?.innerHTML.trim();

  const cells = [['Description'], [descriptionText]];

  const table = WebImporter.DOMUtils.createTable(cells, document);
  descriptionContainer?.replaceWith(table);
};

const createSubNavBlock = (document) => {
  const tabs = document.querySelectorAll(
      '.detailaccordioncontent > .accordion-group > .collapse',
  );
  if (tabs.length > 0) {
    const cells = [['SubNav']];

    tabs.forEach((tab) => {
      const tabId = tab.id;
      const tabTitleElement = document.querySelector(
          `button[data-target="#${tabId}"]`,
      );
      const tabTitle = tabTitleElement
          ? tabTitleElement.textContent.trim()
          : tabId;

      let tabContent = '';
      if (tabId === 'overview') {
        const overviewCategories = Array.from(tab.querySelectorAll('dt'))
        .map((el) => el.textContent.trim().toLowerCase())
        .join(', ');
        tabContent = `<p>${overviewCategories}</p>`;
      } else if (tabId === 'interactivesitemap') {
        const interactiveSitePlan = tab.querySelector(
            'a.gtm-interactivesiteplan',
        )
            ? 'interactive site plan'
            : '';
        const staticSitemap = tab.querySelector('a.gtm-siteplanpdf')
            ? 'static sitemap'
            : '';
        const sitemapCategories = [interactiveSitePlan, staticSitemap]
        .filter(Boolean)
        .join(', ');
        tabContent = `<p>${sitemapCategories}</p>`;
      } else if (tabId === 'schools') {
        const schoolDistrict = tab.querySelector('p')?.textContent.trim() || '';
        const schoolDetails = Array.from(tab.querySelectorAll('dl'))
        .map((dl) => {
          const title = dl.querySelector('dt')?.textContent.trim() || '';
          const value = dl.querySelector('dd')?.textContent.trim() || '';
          return `<li>${title}<ul><li>${value}</li></ul></li>`;
        })
        .join('');
        tabContent = `<p>${schoolDistrict}</p><ul>${schoolDetails}</ul>`;
      } else if (tabId === 'amenities') {
        const amenitiesTitle = 'Amenities';
        const amenities = Array.from(tab.querySelectorAll('dd p'))
        .map((el) => el.textContent.trim())
        .join(', ');
        tabContent = `<ul><li>${amenitiesTitle}<ul><li>${amenities}</li></ul></li></ul>`;
      } else if (tabId === 'hoa') {
        const hoaTitle = 'HOA Info';
        const hoaInfo = Array.from(tab.querySelectorAll('.blueheader'))
        .map((el) => el.innerHTML.split('<br>'))
        .flat()
        .map((info) => info.trim())
        .filter((info) => info)
        .map((info) => `<li>${info}</li>`)
        .join('');
        const ampTitle = 'AMP (Alliance Management Partners)';
        const hoaContactInfo = Array.from(tab.querySelectorAll('a, small'))
        .map((el) => el.textContent.trim())
        .join('\n');
        tabContent = `<ul><li>${hoaTitle}<ul>${hoaInfo}</ul></li></ul>\n${ampTitle}\n${hoaContactInfo}`;
      } else if (tabId === 'ebrochure') {
        const eBrochureTitle = 'eBrochure';
        const eBrochureLink = tab.querySelector('a.gtm-ebrochure')
            ? tab.querySelector('a.gtm-ebrochure').outerHTML
            : '';
        tabContent = `<ul><li>${eBrochureTitle}<ul><li>${eBrochureLink}</li></ul></li></ul>`;
      } else if (tabId !== 'videophotos') {
        tabContent = tab.innerHTML.trim();
      }

      if (tabTitle && tabId !== 'videophotos') {
        cells.push([tabTitle, tabContent]);
      }
    });

    const table = WebImporter.DOMUtils.createTable(cells, document);
    document.querySelector('.detailaccordioncontent').replaceWith(table);
  }
};

const createPromotionBlock = (document) => {
  const promotionElements = Array.from(document.querySelectorAll('.well > h3'));
  const promotionElement = promotionElements.find(
      (el) => el.textContent.trim() === 'Current Promotions',
  );
  if (promotionElement) {
    let promotionContent = promotionElement.closest('.well').innerHTML.trim();
    promotionContent = promotionContent.replace(/<br\s*\/?>/gi, '\n'); // Replace <br> with newline character

    const cells = [['Promotion'], [promotionContent]];

    const table = WebImporter.DOMUtils.createTable(cells, document);
    promotionElement.closest('.well').replaceWith(table);
  }
};

const createLinksBlock = (document) => {
  const linksContainer = document.querySelector('.detaillinks');
  if (linksContainer) {
    const links = Array.from(linksContainer.querySelectorAll('a'))
    .map((link) => link.outerHTML)
    .join('<br>');

    const cells = [['Links'], [links]];

    const table = WebImporter.DOMUtils.createTable(cells, document);

    const detailAccordionThirdColumn = document.querySelector(
        '.detailthirdcolumncontent',
    );
    detailAccordionThirdColumn.replaceWith(table);
  }
};

const createMetadata = (main, document, url, html) => {
  const meta = {};

  // Title
  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.textContent.replace(/[\n\t]/gm, '');
  }

  // Description
  const desc = document.querySelector("[property='og:description']");
  if (desc) {
    meta.Description = desc.content;
  }

  // Image
  const img = document.querySelector("[property='og:image']");
  if (img && img.content) {
    const el = document.createElement('img');
    el.src = img.content;
    meta.Image = el;
  }

  // Community Name
  const nameElement = document.querySelector('h1.h1');
  meta.Name = nameElement?.textContent.trim();
  nameElement?.remove();

  const location = document.querySelector('h4 .gtm-drivingdirections');
  location?.remove();

  // Parsing dataLayer script from html
  const scriptMatch = html.match(/<script>(.*?)<\/script>/s);
  if (scriptMatch) {
    const scriptContent = scriptMatch[1];
    const dataLayerMatch = scriptContent.match(
        /dataLayer\s*=\s*(\[\{.*?\}\]);/s,
    );
    if (dataLayerMatch) {
      try {
        const jsonString = dataLayerMatch[1]
        .replace(/'/g, '"')
        .replace(/\s+/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*\]/g, ']');

        const dataLayer = JSON.parse(jsonString)[0];

        meta.City = dataLayer.city || '';
        meta.State = dataLayer.state || '';
        meta.Metro = dataLayer.region || '';

        if (dataLayer.community) {
          const communityMatch = dataLayer.community.match(/\d+\s\|\s(.+)/);
          if (communityMatch) {
            meta.Community = communityMatch[1];
          }
        }

        if (dataLayer.model) {
          const modelMatch = dataLayer.model.match(/\d+\s\|\s(.+)/);
          if (modelMatch) {
            meta.Model = modelMatch[1];
          }
        }

        meta.Spec = dataLayer.spec || '';
      } catch (e) {
        console.error('Error parsing dataLayer JSON:', e);
      }
    }
  }

  meta.Path = new URL(url).pathname;
  meta.Template = 'communities';

  // Create Metadata Block
  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);

  return meta;
};

const removeUnwantedSections = (document) => {
  // Remove specific .container elements but not the ones containing home specialists
  const containers = document.querySelectorAll('.container');
  containers.forEach((container) => {
    if (container.querySelector('#models')) {
      container.remove();
    }
  });

  const detailAccordion = document.querySelector('.detailaccordioncontent');
  detailAccordion?.remove();

  const detailAccordionThirdColumn = document.querySelector(
      '.detailthirdcolumncontent',
  );
  detailAccordionThirdColumn?.remove();

  const subnav = document.querySelector(
      '.container > .row > .col-sm-12 > .btn-group',
  );
  subnav?.remove();
};

export default {
  transformDOM: ({ document, url, html, params }) => {
    const main = document.body;

    WebImporter.DOMUtils.remove(main, [
      '.navholder',
      '#skiptocontent',
      '.footerrow',
      '.subfooter',
      '.breadcrumb',
      '.sidebar',
      '.sharethis-inline-share-buttons',
      'form',
      '#chat-widget-container',
      '.mobile-footer',
      '.modal-footer',
      '.cd-top',
      '#buttonClickModal',
      'noscript',
      '#communities',
      '.homesearchform',
      '.container > .row > .col-sm-12 > small > a',
      '.container > .row > .topbuffer',
      '.modal',
      '.graydivider',
      ':scope > img',
      '#inventoryshowhide',
      '.container.topbuffer .row .text-center',
      '.container.topbuffer .row .col-sm-12 h2',
      '.btn-primary',
      '.btn-fancy',
      '.col-sm-6 h4',
      '.col-sm-6 br',
    ]);

    createCarouselBlock(document);
    createDescriptionBlock(document);
    createSubNavBlock(document);
    createPromotionBlock(document);
    createLinksBlock(document);
    createMetadata(main, document, url, html);
    removeUnwantedSections(document);

    return main;
  },

  generateDocumentPath: ({ document, url, html, params }) =>
      WebImporter.FileUtils.sanitizePath(
          new URL(url).pathname.replace(/\.html$/, '').replace(/\/$/, ''),
      ),
};

// const createSpecialistsBlock = (document) => {
//   const specialistsSection1 = document.querySelectorAll(
//     '.detailthirdcolumncontent .agents-right',
//   );
//   const specialistsSection2 = document.querySelectorAll(
//     '.container.topbuffer .row .text-center',
//   );

//   const specialistsInfo = [];

//   specialistsSection1?.forEach((specialist) => {
//     const name = specialist.childNodes[0].textContent.trim();
//     const email =
//       specialist
//         .querySelector('a[aria-label^="Send Email"]')
//         ?.textContent.trim() || '';
//     const phone =
//       specialist.querySelector('a[aria-label^="Call"]')?.textContent.trim() ||
//       '';
//     specialistsInfo.push({ name, email, phone, photo: '' }); // Temporarily push without photo
//   });

//   specialistsSection2?.forEach((specialist, index) => {
//     const photo = specialist.querySelector('img')?.src || '';
//     if (specialistsInfo[index]) {
//       specialistsInfo[index].photo = photo; // Update the corresponding specialist info with photo
//     }
//   });

//   const tables = [];
//   specialistsInfo.forEach((specialist) => {
//     const cells = [
//       ['Specialists'],
//       ['Photo', `<img src="${specialist.photo}" alt="${specialist.name}">`],
//       ['Name', specialist.name],
//       ['Email', specialist.email],
//       ['Phone', specialist.phone],
//     ];

//     const table = WebImporter.DOMUtils.createTable(cells, document);
//     tables.push(table);
//   });

//   // Create a container to hold all the new tables
//   const container = document.createElement('div');
//   tables.forEach((table) => {
//     container.appendChild(table);
//   });

//   // Append the new tables to the original specialists container
//   const specialistsContainer = document.querySelector(
//     '.container.topbuffer .row',
//   );
//   if (specialistsContainer) {
//     specialistsContainer.append(container);
//   }

//   // Remove the original specialist elements
//   const specialistsToRemove = document.querySelectorAll(
//     '.container.topbuffer .row .text-center',
//   );
//   specialistsToRemove?.forEach((ele) => {
//     ele.remove();
//   });
// };
