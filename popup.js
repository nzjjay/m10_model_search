// Popup script to handle model detection and search functionality
document.addEventListener('DOMContentLoaded', function() {
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const noModelDiv = document.getElementById('noModel');
  const modelNumberDiv = document.getElementById('modelNumber');
  const searchButton = document.getElementById('searchButton');
  const exclusiveMessage = document.getElementById('exclusiveMessage');
  const exclusiveText = document.getElementById('exclusiveText');

  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0];
    
    // Check if we're on a Mitre10 site
    if (!currentTab.url.includes('mitre10.co.nz')) {
      showNoModel('Please navigate to a Mitre10 product page');
      return;
    }

    // Send message to content script to get make and model
    chrome.tabs.sendMessage(currentTab.id, { action: 'getMakeAndModel' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error communicating with content script:', chrome.runtime.lastError);
        showNoModel('Error: Please refresh the page and try again');
        return;
      }

      if (response && response.result) {
        showResult(response.result);
      } else {
        showNoModel();
      }
    });
  });

  // Function to display the detected model
  function showResult(data) {
    loadingDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    
    // Display the search term (make + model or just model)
    modelNumberDiv.textContent = data.searchTerm || data.model || 'Unknown';
    
    // Check if this is an exclusive brand
    if (data.isExclusive) {
      // Show exclusive message
      exclusiveMessage.style.display = 'block';
      if (data.exclusiveMessage) {
        exclusiveText.textContent = data.exclusiveMessage;
      }
      
      // Disable search button
      searchButton.disabled = true;
      searchButton.textContent = 'Search Disabled - Mitre10 Exclusive';
      
      console.log('Mitre10 exclusive product detected:', data.exclusiveMessage);
    } else {
      // Enable search functionality for non-exclusive products
      exclusiveMessage.style.display = 'none';
      searchButton.disabled = false;
      
      // Add click handler for Google search
      searchButton.addEventListener('click', function() {
        const searchTerm = data.searchTerm || data.model;
        if (searchTerm) {
          const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' price')}`;
          chrome.tabs.create({ url: googleUrl });
        }
      });
    }
  }

  // Function to show no model found state
  function showNoModel(customMessage = null) {
    loadingDiv.style.display = 'none';
    noModelDiv.style.display = 'block';
    
    if (customMessage) {
      const noModelDisplay = noModelDiv.querySelector('.model-display');
      noModelDisplay.textContent = customMessage;
    }
  }
});