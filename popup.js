// Popup script for the Chrome extension
document.addEventListener('DOMContentLoaded', async () => {
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const noModelDiv = document.getElementById('noModel');
  const modelNumberDiv = document.getElementById('modelNumber');
  const searchButton = document.getElementById('searchButton');

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a Mitre10 page
    if (!tab.url.includes('mitre10.co.nz')) {
      showNoModel('Please navigate to a Mitre10 product page');
      return;
    }

    // Inject and execute the content script to get make and model
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractMakeAndModelFromPage
    });

    const result = results[0]?.result;

    if (result && result.searchTerm) {
      showResult(result);
    } else {
      showNoModel();
    }

  } catch (error) {
    console.error('Error:', error);
    showNoModel('Error scanning page');
  }

  function showResult(result) {
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    noModelDiv.style.display = 'none';
    
    // Display the make and model information
    let displayText = '';
    if (result.make && result.model) {
      displayText = `${result.make} ${result.model}`;
    } else if (result.model) {
      displayText = result.model;
    }
    
    modelNumberDiv.textContent = displayText;
    
    searchButton.onclick = () => {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(result.searchTerm)}`;
      chrome.tabs.create({ url: googleUrl });
      window.close();
    };
  }

  function showNoModel(message = 'No make/model detected on this page') {
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    noModelDiv.style.display = 'block';
    
    const noModelText = noModelDiv.querySelector('.model-display');
    noModelText.textContent = message;
  }
});

// Function to be injected into the page
function extractMakeAndModelFromPage() {
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