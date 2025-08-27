// popup.js - Handles the popup interface

document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('downloadBtn');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const status = document.getElementById('status');
  
  // Download transcript button
  downloadBtn.addEventListener('click', async function() {
    const maxRetries = 3;
    let currentRetry = 0;
    
    while (currentRetry < maxRetries) {
      try {
        // Update UI to show working state
        downloadBtn.disabled = true;
        
        if (currentRetry === 0) {
          downloadBtn.textContent = 'Processing...';
          status.textContent = 'Downloading transcript...';
        } else {
          downloadBtn.textContent = `Retrying (${currentRetry + 1}/${maxRetries})...`;
          status.textContent = 'Extension loading, please wait...';
        }
        
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on a YouTube video page
        if (!tab.url.includes('youtube.com/watch')) {
          throw new Error('Please navigate to a YouTube video page');
        }
        
        // Send message to content script
        await chrome.tabs.sendMessage(tab.id, { action: 'downloadTranscript' });
        
        // Success state
        status.textContent = 'Transcript downloaded!';
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.textContent = 'Download Transcript';
          status.textContent = 'Click to download or view transcript';
        }, 2000);
        
        return; // Success, exit retry loop
        
      } catch (error) {
        console.error(`Error downloading transcript (attempt ${currentRetry + 1}):`, error);
        
        if (error.message.includes('Could not establish connection')) {
          currentRetry++;
          if (currentRetry < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
        }
        
        // Final error or non-connection error
        const errorMessage = error.message.includes('Could not establish connection') 
          ? 'Extension still loading. Please wait and try again.'
          : error.message || 'Error downloading transcript';
          
        status.textContent = errorMessage;
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download Transcript';
        
        // Reset after delay
        setTimeout(() => {
          status.textContent = 'Click to download or view transcript';
        }, 3000);
        
        return;
      }
    }
  });

  // Open sidebar button
  openSidebarBtn.addEventListener('click', async function() {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Open the side panel for this tab
      await chrome.sidePanel.open({ tabId: tab.id });
      
      // Close the popup
      window.close();
      
    } catch (error) {
      console.error('Error opening sidebar:', error);
      status.textContent = 'Error opening sidebar';
      
      setTimeout(() => {
        status.textContent = 'Click to download or view transcript';
      }, 2000);
    }
  });
});