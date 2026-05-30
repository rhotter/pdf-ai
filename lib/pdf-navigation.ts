export function navigateToPage(page: number): void {
  // When running in the side panel, send a message to the content script.
  // When running in the content script, navigate directly.
  if (chrome?.tabs) {
    // Side panel context — message the content script
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "navigate-to-page", page });
      }
    });
  } else {
    // Content script context — navigate directly
    window.location.hash = `page=${page}`;
    window.location.reload();
  }
}
