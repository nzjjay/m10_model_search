// ===== Shared Data =====
const exclusiveBrands = {
  mitre10: ['Number 8', 'Jobmate', 'Nouveau'],
  bunnings: [
    'Baracuda',
    'Citeco',
    'Click',
    'Craftright',
    'DETA',
    'Full Boar',
    'Gerni',
    'Hy-Clor',
    'Jumbuck',
    'Mondella',
    'Ozito',
    'Pinnacle Hardware',
    'Ryobi',
    'Saxon',
    'Tradie',
    'Trojan',
    'Marquee',
    'Arlec',
    'Happy Tails'
  ]
};
// ===== Shared Functions =====
function getExclusiveInfo(make, model, retailer) {
  const brands = (exclusiveBrands[retailer.toLowerCase()] || []).map(b => b.toLowerCase());
  const makeLower = make?.toLowerCase() || '';
  const modelLower = model?.toLowerCase() || '';

  const matchedBrand = brands.find(brand =>
    makeLower.includes(brand) || modelLower.includes(brand)
  );

  if (matchedBrand) {
    const brandName = make || 'This product';
    return {
      isExclusive: true,
      message: `${capitalize(matchedBrand)} can only be purchased at ${retailer}.`
    };
  }

  return { isExclusive: false, message: null };
}

function buildResult(make, model, retailer) {
  const { isExclusive, message } = getExclusiveInfo(make, model, retailer);

  return {
    make: make || null,
    model: model || null,
    searchTerm: [make, model].filter(Boolean).join(' ') || '',
    isExclusive,
    exclusiveMessage: message,
    retailer
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== Main Extractor =====
function extractMakeAndModel() {
  const hostname = window.location.hostname;

  if (hostname.includes('mitre10.co.nz')) {
    return extractMitre10MakeAndModel();
  }
  if (hostname.includes('bunnings.co.nz')) {
    return extractBunningsMakeAndModel();
  }
  return null;
}

// ===== Extractors =====
function extractBunningsMakeAndModel() {
  let make = document.querySelector('[data-locator="product-brand-name"]')?.textContent.trim() || null;
  let model = null;

  try {
    const nextData = document.querySelector('#__NEXT_DATA__');
    if (nextData) {
      const pageData = JSON.parse(nextData.textContent);
      const productQuery = pageData?.props?.pageProps?.dehydratedState?.queries
        ?.find(q => q.queryKey?.[0] === 'retail-product');
      const modelFeature = productQuery?.state?.data?.classifications?.[0]?.features
        ?.find(f => f.code === 'modelNumber');
      model = modelFeature?.featureValues?.[0]?.value || null;
    }
  } catch (e) {
    console.log('Could not extract model from Next.js data, trying DOM fallback');
  }

  if (!model) {
    document.querySelectorAll('dt').forEach(dt => {
      if (dt.textContent.trim().toLowerCase() === 'model number') {
        model = dt.nextElementSibling?.textContent.trim() || null;
      }
    });
  }

  make = make?.replace(/[^\w\s]/g, '').trim() || null;
  model = model?.replace(/[^\w\s-]/g, '').trim() || null;

  return buildResult(make, model, 'Bunnings');
}

function extractMitre10MakeAndModel() {
  let make = document.querySelector('.product--brand')?.textContent.trim() || null;
  let model = null;

  document.querySelectorAll('.product--model-number').forEach(el => {
    const match = el.textContent.trim().match(/(?:MODEL|M):\s*(.+)/i);
    if (match) model = match[1].trim();
  });

  document.querySelectorAll('.spec-item').forEach(item => {
    const attr = item.querySelector('.attr')?.textContent.trim().toLowerCase();
    const val = item.querySelector('.value')?.textContent.trim();
    if (!make && attr && (attr.includes('brand') || attr.includes('manufacturer'))) make = val;
    if (!model && attr?.includes('model number')) model = val;
  });

  if (!make || !model) {
    const titleText = document.querySelector('h1.product--name, .product--title')?.textContent.trim() || '';
    if (!make) {
      const brandMatch = titleText.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+/);
      if (brandMatch) make = brandMatch[1].trim();
    }
  }

  make = make?.replace(/[^\w\s]/g, '').trim() || null;
  model = model?.replace(/[^\w\s-]/g, '').trim() || null;

  return buildResult(make, model, 'Mitre10');
}

// ===== Store & Messaging =====
function storeMakeAndModel() {
  const result = extractMakeAndModel();
  if (result) {
    document.documentElement.setAttribute('data-make-model', JSON.stringify(result));
    console.log('Make and model extracted:', result);
    if (result.isExclusive) console.log(`${result.retailer} exclusive brand detected:`, result.exclusiveMessage);
  } else {
    console.log('No make/model found on this page');
  }
}

storeMakeAndModel();
setTimeout(storeMakeAndModel, 1000);
setTimeout(storeMakeAndModel, 3000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMakeAndModel') {
    const stored = document.documentElement.getAttribute('data-make-model');
    let result = null;
    try {
      result = stored ? JSON.parse(stored) : extractMakeAndModel();
    } catch {
      result = extractMakeAndModel();
    }
    sendResponse({ result });
  }
});
