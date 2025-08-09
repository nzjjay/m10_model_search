// Content script to extract make and model from Mitre10 pages
function extractMakeAndModel() {
  // Check if we're on a Mitre10 site
  if (!window.location.hostname.includes('mitre10.co.nz')) {
    return null;
  }

  let make = null;
  let model = null;

  // Method 1: Extract from the product header (brand and model shown separately)
  // Look for brand in product name section
  const brandElement = document.querySelector('.product--brand');
  if (brandElement) {
    make = brandElement.textContent.trim();
  }

  // Look for model in product identifiers section
  const modelElements = document.querySelectorAll('.product--model-number');
  for (const element of modelElements) {
    const text = element.textContent.trim();
    // Extract model after "MODEL:" or "M:" prefix
    const modelMatch = text.match(/(?:MODEL|M):\s*(.+)/i);
    if (modelMatch && modelMatch[1]) {
      model = modelMatch[1].trim();
    }
  }

  // Method 2: Extract from specifications section (.spec-item structure)
  const specItems = document.querySelectorAll('.spec-item');
  
  for (const item of specItems) {
    const attrDiv = item.querySelector('.attr');
    const valueDiv = item.querySelector('.value');
    
    if (attrDiv && valueDiv) {
      const attrText = attrDiv.textContent.trim().toLowerCase();
      const valueText = valueDiv.textContent.trim();
      
      // Look for brand/make
      if ((attrText.includes('brand') || attrText.includes('manufacturer')) && !make) {
        make = valueText;
      }
      
      // Look for model number
      if (attrText.includes('model number') && !model) {
        model = valueText;
      }
    }
  }

  // Method 3: Fallback - try to extract from page title if brand/model not found
  if (!make || !model) {
    const titleElement = document.querySelector('h1.product--name, .product--title');
    if (titleElement) {
      const titleText = titleElement.textContent.trim();
      
      // Try to extract brand from title if not found
      if (!make) {
        // Common brand patterns at start of product titles
        const brandMatch = titleText.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+/);
        if (brandMatch && brandMatch[1]) {
          make = brandMatch[1].trim();
        }
      }
    }
  }

  // Clean up the extracted values
  if (make) {
    make = make.replace(/[^\w\s]/g, '').trim(); // Remove special characters
  }
  
  if (model) {
    model = model.replace(/[^\w\s-]/g, '').trim(); // Keep hyphens for model numbers
  }

  // Return both make and model if found
  if (make && model) {
    return {
      make: make,
      model: model,
      searchTerm: `${make} ${model}`
    };
  } else if (model) {
    // If only model found, still return it
    return {
      make: null,
      model: model,
      searchTerm: model
    };
  }

  return null;
}

// Store the extracted make and model
function storeMakeAndModel() {
  const result = extractMakeAndModel();
  if (result) {
    document.documentElement.setAttribute('data-make-model', JSON.stringify(result));
    console.log('Make and model extracted:', result);
  } else {
    console.log('No make/model found on this page');
  }
}

// Run extraction when page loads
storeMakeAndModel();

// Also run after delays in case content loads dynamically
setTimeout(storeMakeAndModel, 1000);
setTimeout(storeMakeAndModel, 3000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMakeAndModel') {
    const stored = document.documentElement.getAttribute('data-make-model');
    let result = null;
    
    if (stored) {
      try {
        result = JSON.parse(stored);
      } catch (e) {
        // If parsing fails, try extracting again
        result = extractMakeAndModel();
      }
    } else {
      result = extractMakeAndModel();
    }
    
    sendResponse({ result: result });
  }
});