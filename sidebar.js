// sidebar.js - Handles the transcript sidebar functionality

class TranscriptSidebar {
  constructor() {
    this.currentTranscript = [];
    this.currentMetadata = null;
    this.isTextCleaned = false;
    this.originalTranscript = [];
    
    this.initializeElements();
    this.attachEventListeners();
    this.checkCurrentTab();
  }

  initializeElements() {
    // Status elements
    this.statusDiv = document.getElementById('status');
    this.loadTranscriptBtn = document.getElementById('loadTranscriptBtn');
    
    // Video info elements
    this.videoInfo = document.getElementById('videoInfo');
    this.videoTitle = this.videoInfo.querySelector('.video-title');
    this.videoChannel = this.videoInfo.querySelector('.channel');
    this.videoDate = this.videoInfo.querySelector('.date');
    
    // Transcript elements
    this.transcriptContainer = document.getElementById('transcriptContainer');
    this.transcriptContent = document.getElementById('transcriptContent');
    this.segmentCount = document.getElementById('segmentCount');
    this.wordCount = document.getElementById('wordCount');
    
    // Control buttons
    this.cleanTextBtn = document.getElementById('cleanTextBtn');
    this.downloadBtn = document.getElementById('downloadBtn');
    
    // Error elements
    this.errorState = document.getElementById('errorState');
    this.retryBtn = document.getElementById('retryBtn');
  }

  attachEventListeners() {
    this.loadTranscriptBtn.addEventListener('click', () => this.loadTranscript());
    this.cleanTextBtn.addEventListener('click', () => this.toggleCleanText());
    this.downloadBtn.addEventListener('click', () => this.downloadTranscript());
    this.retryBtn.addEventListener('click', () => this.loadTranscript());
  }

  async checkCurrentTab() {
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (currentTab && currentTab.url && currentTab.url.includes('youtube.com/watch')) {
        this.setStatus('Ready to load transcript', 'Click "Load Transcript" to get started');
        this.loadTranscriptBtn.disabled = false;
      } else {
        this.setStatus('Navigate to YouTube', 'Please open a YouTube video to load its transcript');
        this.loadTranscriptBtn.disabled = true;
      }
    } catch (error) {
      console.error('Error checking current tab:', error);
      this.setStatus('Error', 'Unable to detect current page');
    }
  }

  setStatus(title, message, showButton = true) {
    const statusText = this.statusDiv.querySelector('.status-text');
    statusText.textContent = message;
    this.loadTranscriptBtn.style.display = showButton ? 'block' : 'none';
    
    // Show status, hide everything else
    this.statusDiv.style.display = 'flex';
    this.transcriptContainer.style.display = 'none';
    this.videoInfo.style.display = 'none';
    this.errorState.style.display = 'none';
  }

  showError(title, message) {
    const errorTitle = this.errorState.querySelector('.error-title');
    const errorMessage = this.errorState.querySelector('.error-message');
    
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    
    // Show error, hide everything else
    this.errorState.style.display = 'flex';
    this.statusDiv.style.display = 'none';
    this.transcriptContainer.style.display = 'none';
    this.videoInfo.style.display = 'none';
  }

  async loadTranscript() {
    const maxRetries = 3;
    let currentRetry = 0;
    
    while (currentRetry < maxRetries) {
      try {
        if (currentRetry === 0) {
          this.setStatus('Loading...', 'Extracting transcript from video...', false);
        } else {
          this.setStatus('Retrying...', `Attempt ${currentRetry + 1} of ${maxRetries}. Content script may still be loading...`, false);
        }
        
        this.loadTranscriptBtn.innerHTML = '<span class="loading"></span> Loading...';
        this.loadTranscriptBtn.disabled = true;

        // Get the current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (!currentTab.url.includes('youtube.com/watch')) {
          throw new Error('Please navigate to a YouTube video page');
        }

        // Send message to content script to load transcript
        const response = await chrome.tabs.sendMessage(currentTab.id, { 
          action: 'loadTranscriptForSidebar' 
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to load transcript');
        }

        // Store the transcript data
        this.currentTranscript = response.data.transcript;
        this.originalTranscript = [...response.data.transcript];
        this.currentMetadata = response.data.metadata;
        this.isTextCleaned = false;

        // Display the transcript
        this.displayTranscript();
        this.updateVideoInfo();
        this.showTranscriptView();
        
        return; // Success, exit the retry loop

      } catch (error) {
        console.error(`Error loading transcript (attempt ${currentRetry + 1}):`, error);
        
        if (error.message.includes('Could not establish connection')) {
          currentRetry++;
          if (currentRetry < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          }
        }
        
        // Final error or non-connection error
        this.showError('Loading Failed', 
          error.message.includes('Could not establish connection') 
            ? 'Extension is still loading. Please wait a moment and try again.'
            : error.message
        );
        this.loadTranscriptBtn.innerHTML = 'Load Transcript';
        this.loadTranscriptBtn.disabled = false;
        return;
      }
    }
  }

  updateVideoInfo() {
    if (this.currentMetadata) {
      this.videoTitle.textContent = this.currentMetadata.title;
      this.videoChannel.textContent = this.currentMetadata.channelName;
      this.videoDate.textContent = this.currentMetadata.publishDate;
    }
  }

  showTranscriptView() {
    // Show transcript view, hide others
    this.transcriptContainer.style.display = 'flex';
    this.videoInfo.style.display = 'block';
    this.statusDiv.style.display = 'none';
    this.errorState.style.display = 'none';
    
    // Enable controls
    this.cleanTextBtn.disabled = false;
    this.downloadBtn.disabled = false;
  }

  displayTranscript() {
    this.transcriptContent.innerHTML = '';
    
    this.currentTranscript.forEach((line, index) => {
      const segment = document.createElement('div');
      segment.className = 'segment';
      
      if (this.isTextCleaned) {
        // Cleaned text - just show as paragraphs
        segment.innerHTML = `<span class="segment-text">${line}</span>`;
        segment.classList.add('cleaned');
      } else {
        // Original text - always show timestamps
        const timestampMatch = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
        
        if (timestampMatch) {
          const [, timestamp, text] = timestampMatch;
          segment.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="segment-text">${text}</span>
          `;
        } else {
          segment.innerHTML = `<span class="segment-text">${line}</span>`;
        }
      }
      
      this.transcriptContent.appendChild(segment);
    });

    this.updateStats();
  }

  updateStats() {
    const segmentCount = this.currentTranscript.length;
    const wordCount = this.currentTranscript.join(' ').split(/\s+/).length;
    
    this.segmentCount.textContent = `${segmentCount} segments`;
    this.wordCount.textContent = `${wordCount} words`;
  }

  toggleTimestamps() {
    this.displayTranscript();
  }

  toggleCleanText() {
    if (this.isTextCleaned) {
      // Restore original
      this.currentTranscript = [...this.originalTranscript];
      this.cleanTextBtn.textContent = 'Clean Text';
      this.cleanTextBtn.classList.remove('btn-primary');
      this.cleanTextBtn.classList.add('btn-secondary');
      this.isTextCleaned = false;
    } else {
      // Clean the text
      this.currentTranscript = this.cleanTranscriptText(this.originalTranscript);
      this.cleanTextBtn.textContent = 'Show Original';
      this.cleanTextBtn.classList.remove('btn-secondary');
      this.cleanTextBtn.classList.add('btn-primary');
      this.isTextCleaned = true;
    }
    
    this.displayTranscript();
    
    // Add cleaned styling
    if (this.isTextCleaned) {
      document.querySelectorAll('.segment').forEach(segment => {
        segment.classList.add('cleaned');
      });
    }
  }

  cleanTranscriptText(transcript) {
    let cleaned = [];
    let currentParagraph = '';
    
    transcript.forEach(line => {
      // Remove timestamp from line
      const text = line.replace(/^\d{1,2}:\d{2}\s+/, '').replace(/\d{1,2}:\d{2}\s*/g, '').replace(/\s+/g, ' ').trim();
      
      // Skip very short fragments or common filler
      if (text.length < 3 || /^(um|uh|er|ah|like|you know)$/i.test(text)) {
        return;
      }
      
      // Add to current paragraph
      if (currentParagraph) {
        currentParagraph += ' ' + text;
      } else {
        currentParagraph = text;
      }
      
      // End paragraph on sentence endings or when it gets long enough
      if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?') || currentParagraph.length > 200) {
        // Ensure proper punctuation
        if (!/[.!?]$/.test(currentParagraph)) {
          currentParagraph += '.';
        }
        
        cleaned.push(currentParagraph);
        currentParagraph = '';
      }
    });
    
    // Add any remaining text
    if (currentParagraph) {
      if (!/[.!?]$/.test(currentParagraph)) {
        currentParagraph += '.';
      }
      cleaned.push(currentParagraph);
    }
    
    return cleaned;
  }

  downloadTranscript() {
    if (!this.currentTranscript.length || !this.currentMetadata) {
      return;
    }

    // Create header with video metadata
    const header = `VIDEO TITLE: ${this.currentMetadata.title}
CHANNEL: ${this.currentMetadata.channelName}
PUBLISHED: ${this.currentMetadata.publishDate}
TRANSCRIPT DOWNLOADED: ${new Date().toLocaleDateString()}
FORMAT: ${this.isTextCleaned ? 'Cleaned Text' : 'Original with Timestamps'}

========================================

`;
    
    const transcriptText = header + this.currentTranscript.join('\n\n');
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const suffix = this.isTextCleaned ? '_cleaned' : '_transcript';
    a.download = `${this.currentMetadata.title.replace(/[^a-z0-9]/gi, '_')}${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Initialize the sidebar when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new TranscriptSidebar();
});