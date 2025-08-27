// content.js - Runs on YouTube pages and handles transcript downloading

class YouTubeTranscriptDownloader {
  constructor() {
    this.transcriptData = [];
  }

  // Wait for element to appear with timeout
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // Check if transcript is already visible
  isTranscriptVisible() {
    const segments = document.querySelectorAll('.segment');
    return segments.length > 0;
  }

  // Check if transcript button is available and not already clicked
  isTranscriptButtonAvailable() {
    const transcriptButton = document.querySelector('button[aria-label="Show transcript"]');
    return transcriptButton && transcriptButton.offsetParent !== null;
  }

  // Click the "...more" button to expand description (if needed)
  async clickMoreButton() {
    try {
      // Check if transcript button is already visible
      if (this.isTranscriptButtonAvailable()) {
        console.log('Transcript button already visible, skipping more button');
        return true;
      }

      const moreButton = document.querySelector('tp-yt-paper-button#expand');
      if (moreButton && moreButton.textContent.includes('more')) {
        console.log('Clicking ...more button to expand description...');
        moreButton.click();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for expansion
        return true;
      }
    } catch (error) {
      console.log('More button not found or not needed');
    }
    return false;
  }

  // Click the "Show transcript" button
  async clickShowTranscript() {
    try {
      // Check if transcript is already visible
      if (this.isTranscriptVisible()) {
        console.log('Transcript already visible, skipping button click');
        return true;
      }

      // Look for the Show transcript button
      const transcriptButton = await this.waitForElement('button[aria-label="Show transcript"]', 3000);
      
      if (transcriptButton) {
        console.log('Clicking show transcript button...');
        transcriptButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for transcript panel to load
        return true;
      } else {
        throw new Error('Transcript button not found');
      }
    } catch (error) {
      console.error('Error clicking transcript button:', error);
      return false;
    }
  }

  // Extract transcript text using your working method
  async extractTranscript() {
    try {
      // If transcript is already visible, extract immediately
      if (this.isTranscriptVisible()) {
        console.log('Transcript already visible, extracting...');
      } else {
        // Wait for transcript segments to load
        await this.waitForElement('.segment', 3000);
      }
      
      // Wait a bit more for all segments to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Extract transcript using your proven method
      let transcript = "";
      const segments = document.querySelectorAll(".segment");
      
      if (segments.length === 0) {
        throw new Error('No transcript segments found');
      }

      segments.forEach(segment => {
        transcript += segment.innerText + "\n";
      });

      return transcript.trim().split('\n');
    } catch (error) {
      console.error('Error extracting transcript:', error);
      return [];
    }
  }

  // Get video metadata
  getVideoMetadata() {
    // Get video title
    const titleElement = document.querySelector('#title.style-scope.ytd-watch-metadata h1 yt-formatted-string');
    const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
    
    // Get publish date from the info section
    const infoElement = document.querySelector('#info.style-scope.ytd-watch-info-text');
    let publishDate = 'Unknown Date';
    if (infoElement) {
      // Look for date pattern in the text content
      const infoText = infoElement.textContent;
      const dateMatch = infoText.match(/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/); // Pattern like "Feb 27, 2022"
      if (dateMatch) {
        publishDate = dateMatch[0];
      }
    }
    
    // Get channel name
    const channelElement = document.querySelector('#container.style-scope.ytd-channel-name yt-formatted-string a');
    const channelName = channelElement ? channelElement.textContent.trim() : 'Unknown Channel';
    
    return {
      title,
      publishDate,
      channelName
    };
  }

  // Download transcript as text file with metadata header
  downloadTranscript(transcriptLines, metadata) {
    // Create header with video metadata
    const header = `VIDEO TITLE: ${metadata.title}
CHANNEL: ${metadata.channelName}
PUBLISHED: ${metadata.publishDate}
TRANSCRIPT DOWNLOADED: ${new Date().toLocaleDateString()}

========================================

`;
    
    const transcriptText = header + transcriptLines.join('\n');
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Load transcript data without downloading (for sidebar)
  async loadTranscriptData() {
    try {
      console.log('Loading transcript data for sidebar...');
      
      // Step 1: Try to click more button (may not be necessary on all pages)
      await this.clickMoreButton();
      
      // Step 2: Click show transcript
      const transcriptShown = await this.clickShowTranscript();
      if (!transcriptShown) {
        throw new Error('Could not find or click the transcript button. Make sure the video has captions available.');
      }
      
      // Step 3: Extract transcript
      console.log('Extracting transcript...');
      const transcript = await this.extractTranscript();
      
      if (transcript.length === 0) {
        throw new Error('No transcript found. The video may not have captions available.');
      }
      
      // Step 4: Get video metadata
      console.log('Extracting video metadata...');
      const metadata = this.getVideoMetadata();
      
      console.log('Transcript data loaded successfully!');
      return { transcript, metadata };
      
    } catch (error) {
      console.error('Error loading transcript data:', error);
      throw error;
    }
  }

  // Main function to execute the transcript download
  async downloadYouTubeTranscript() {
    try {
      console.log('Starting transcript download process...');
      
      // Step 1: Try to click more button (may not be necessary on all pages)
      await this.clickMoreButton();
      
      // Step 2: Click show transcript
      const transcriptShown = await this.clickShowTranscript();
      if (!transcriptShown) {
        throw new Error('Could not find or click the transcript button. Make sure the video has captions available.');
      }
      
      // Step 3: Extract transcript
      console.log('Extracting transcript...');
      const transcript = await this.extractTranscript();
      
      if (transcript.length === 0) {
        throw new Error('No transcript found. The video may not have captions available.');
      }
      
      // Step 4: Get video metadata
      console.log('Extracting video metadata...');
      const metadata = this.getVideoMetadata();
      
      // Step 5: Download transcript with metadata
      this.downloadTranscript(transcript, metadata);
      
      console.log('Transcript downloaded successfully!');
      return { success: true, segments: transcript.length };
      
    } catch (error) {
      console.error('Error in transcript download process:', error);
      throw error;
    }
  }
}

// Listen for messages from popup and sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Add a small delay to ensure DOM is ready
  setTimeout(() => {
    if (request.action === 'downloadTranscript') {
      const downloader = new YouTubeTranscriptDownloader();
      
      downloader.downloadYouTubeTranscript()
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      // Return true to indicate we'll send a response asynchronously
      return true;
    }
    
    if (request.action === 'loadTranscriptForSidebar') {
      const downloader = new YouTubeTranscriptDownloader();
      
      // Load transcript without downloading
      downloader.loadTranscriptData()
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      // Return true to indicate we'll send a response asynchronously
      return true;
    }
  }, 100); // Small delay to ensure DOM stability
  
  return true; // Keep message channel open
});