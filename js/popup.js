// popup.js
class MarkdownConverter {
    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '_'
        });
        
        this.setupTurndownRules();
        this.initializeEventListeners();
    }

    setupTurndownRules() {
        // Keep these elements as HTML
        this.turndownService.keep(['iframe', 'script', 'style']);
        
        // Custom rule for figures
        this.turndownService.addRule('figures', {
            filter: 'figure',
            replacement: (content, node) => {
                const img = node.querySelector('img');
                const caption = node.querySelector('figcaption');
                if (img) {
                    const alt = img.getAttribute('alt') || '';
                    const src = img.getAttribute('src') || '';
                    const captionText = caption ? caption.textContent : '';
                    return `\n\n![${alt}](${src})\n${captionText}\n\n`;
                }
                return content;
            }
        });
    }

    initializeEventListeners() {
        document.getElementById('convert').addEventListener('click', () => this.convertPage());
        document.getElementById('copy').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download').addEventListener('click', () => this.downloadMarkdown());
    }

    async convertPage() {
        try {
            this.updateStatus('Converting...', 'info');
            
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                throw new Error('No active tab found');
            }
    
            // Execute the content script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // This function runs in the context of the web page
                    try {
                        // Helper function to get iframe content
                        const getIframeContent = (iframe) => {
                            try {
                                // Check if we can access the iframe content
                                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (!iframeDoc) return '';
    
                                // Clone the iframe document to avoid modifications to the original
                                const iframeClone = iframeDoc.body.cloneNode(true);
                                
                                // Remove unwanted elements from iframe content
                                const unwantedInIframe = iframeClone.querySelectorAll(
                                    'script, style, nav, footer, aside, .ads, .comments'
                                );
                                unwantedInIframe.forEach(el => el.remove());
    
                                return `<div class="iframe-content">${iframeClone.innerHTML}</div>`;
                            } catch (e) {
                                console.warn('Could not access iframe content:', e);
                                return '';
                            }
                        };
    
                        // Create a clone of the document to work with
                        const documentClone = document.cloneNode(true);
                        
                        // Get all iframes before removing them
                        const iframes = documentClone.querySelectorAll('iframe');
                        let iframeContents = [];
    
                        // Collect iframe contents
                        iframes.forEach((iframe, index) => {
                            const originalIframe = document.querySelectorAll('iframe')[index];
                            const content = getIframeContent(originalIframe);
                            if (content) {
                                iframeContents.push(content);
                            }
                        });
                        
                        // Remove unwanted elements (except iframes, we handled them above)
                        const unwanted = documentClone.querySelectorAll(
                            'script, style, nav, footer, aside, .ads, .comments, [role="complementary"]'
                        );
                        unwanted.forEach(el => el.remove());
    
                        // Try to find the main content
                        const mainContent = documentClone.querySelector(
                            'main, article, .content, .post, .entry, [role="main"]'
                        );
    
                        // Prepare the content
                        let finalContent;
                        if (mainContent) {
                            finalContent = mainContent.innerHTML;
                        } else {
                            finalContent = document.body.innerHTML;
                        }
    
                        // Append iframe contents at the end of the main content
                        if (iframeContents.length > 0) {
                            finalContent += '<h2>Embedded Content</h2>';
                            finalContent += iframeContents.join('<hr>');
                        }
    
                        return {
                            title: document.title,
                            content: finalContent,
                            success: true
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }
            });
    
            // Rest of your existing code remains the same
            if (!results || !results[0] || !results[0].result) {
                throw new Error('Failed to get page content');
            }
    
            const { success, content, title, error } = results[0].result;
    
            if (!success) {
                throw new Error(`Failed to extract content: ${error}`);
            }
    
            const wrappedContent = `
                <div class="markdown-content">
                    <h1>${title}</h1>
                    ${content}
                </div>
            `;
    
            const markdown = this.turndownService.turndown(wrappedContent);
            const output = document.getElementById('output');
            output.value = markdown;
    
            document.getElementById('copy').disabled = false;
            document.getElementById('download').disabled = false;
            
            this.updateStatus('Conversion complete!', 'success');
            
            await chrome.storage.local.set({ 
                lastConversion: {
                    url: tab.url,
                    markdown: markdown,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Conversion error:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            
            document.getElementById('output').value = '';
            document.getElementById('copy').disabled = true;
            document.getElementById('download').disabled = true;
        }
    }

    async copyToClipboard() {
        const output = document.getElementById('output');
        try {
            await navigator.clipboard.writeText(output.value);
            this.updateStatus('Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            this.updateStatus('Error copying to clipboard', 'error');
        }
    }

    downloadMarkdown() {
        try {
            const output = document.getElementById('output');
            const blob = new Blob([output.value], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `webpage-${timestamp}.md`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.updateStatus('Downloaded successfully!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.updateStatus('Error downloading file', 'error');
        }
    }

    updateStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                status.textContent = '';
                status.className = 'status';
            }, 3000);
        }
    }
}

// Initialize the converter when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownConverter();
});