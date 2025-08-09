// Popup script to handle model detection, exclusive check, and search functionality
document.addEventListener('DOMContentLoaded', function () {
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const noModelDiv = document.getElementById('noModel');
  const modelNumberDiv = document.getElementById('modelNumber');
  const searchButton = document.getElementById('searchButton');
  const exclusiveMessage = document.getElementById('exclusiveMessage');
  const exclusiveText = document.getElementById('exclusiveText');
  const body = document.body;

  // Exclusive brand lists
  const mitre10ExclusiveBrands = [
    'Number 8', 'Jobmate', 'Nouveau', 'Gardeners Edge'
  ];

  const bunningsExclusiveBrands = [
    'Baracuda', 'Citeco', 'Click', 'Craftright', 'DETA',
    'Full Boar', 'Gerni', 'Hy-Clor', 'Jumbuck', 'Mondella',
    'Ozito', 'Pinnacle Hardware', 'Ryobi', 'Saxon', 'Tradie',
    'Trojan', 'Marquee', 'Arlec', 'Happy Tails'
  ];

  // Function to check exclusivity for a retailer
  function checkIfExclusive(make, model, retailer) {
    if (!make && !model) return false;

    const makeLower = (make || '').toLowerCase();
    const modelLower = (model || '').toLowerCase();
    const list = retailer === 'mitre10' ? mitre10ExclusiveBrands : bunningsExclusiveBrands;

    return list.some(brand => {
      const brandLower = brand.toLowerCase();
      return makeLower.includes(brandLower) || modelLower.includes(brandLower);
    });
  }

  // Function to get exclusive brand message
  function getExclusiveMessage(make, retailer) {
    const brandName = make || 'This product';
    const retailerName = retailer === 'mitre10' ? 'Mitre10' : 'Bunnings';
    return `${brandName} is exclusive to ${retailerName} and can only be purchased there.`;
  }

  // Get current active tab once
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url || '';
    let retailer = '';

    // Set popup background color & retailer
    if (url.includes('mitre10.co.nz')) {
      body.style.backgroundColor = '#ff6d00';
      retailer = 'mitre10';
    } else if (url.includes('bunnings.co.nz')) {
      body.style.backgroundColor = '#0d5257';
      retailer = 'bunnings';
    }

    // Check if we're on a supported site
    if (!retailer) {
      showNoModel('Please navigate to a Mitre10 or Bunnings product page');
      return;
    }

    // Ask content script for make & model
    chrome.tabs.sendMessage(currentTab.id, { action: 'getMakeAndModel' }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('Error communicating with content script:', chrome.runtime.lastError);
        showNoModel('Error: Please refresh the page and try again');
        return;
      }

      if (response && response.result) {
        const data = response.result;
        data.isExclusive = checkIfExclusive(data.make, data.model, retailer);
        if (data.isExclusive) {
          data.exclusiveMessage = getExclusiveMessage(data.make, retailer);
        }
        showResult(data);
      } else {
        showNoModel();
      }
    });
  });

  // Display the detected model
  function showResult(data) {
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    modelNumberDiv.textContent = data.searchTerm || data.model || 'Unknown';

    if (data.isExclusive) {
      exclusiveMessage.style.display = 'block';
      exclusiveText.textContent = data.exclusiveMessage || '';
      searchButton.disabled = true;
      searchButton.textContent = 'Search Disabled - Home Brand';
      console.log('Home brand found:', data.exclusiveMessage);
    } else {
      exclusiveMessage.style.display = 'none';
      searchButton.disabled = false;
      searchButton.textContent = 'Search Google for Make & Model';
      searchButton.addEventListener('click', function () {
        const searchTerm = data.searchTerm || data.model;
        if (searchTerm) {
          chrome.tabs.create({
            url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`
          });
        }
      });
    }
  }

  // No model found state
  function showNoModel(customMessage = null) {
    loadingDiv.style.display = 'none';
    noModelDiv.style.display = 'block';
    if (customMessage) {
      const noModelDisplay = noModelDiv.querySelector('.model-display');
      if (noModelDisplay) {
        noModelDisplay.textContent = customMessage;
      }
    }
  }
});
