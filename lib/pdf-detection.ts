export function isPdfPage(): boolean {
  // Check content type
  if (document.contentType === "application/pdf") return true;

  // Check URL pattern
  if (location.pathname.toLowerCase().endsWith(".pdf")) return true;

  // Check for PDF embed (Chrome's built-in PDF viewer)
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed) return true;

  return false;
}

let cachedPdfBase64: string | null = null;

async function fetchPdfBlob(): Promise<Blob> {
  if (location.protocol === "file:") {
    // fetch() doesn't support file:// URLs, use XHR instead
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", location.href, true);
      xhr.responseType = "blob";
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () =>
        reject(new Error("Failed to load local PDF. Make sure 'Allow access to file URLs' is enabled in the extension settings."));
      xhr.send();
    });
  }
  const response = await fetch(location.href);
  return response.blob();
}

export async function fetchPdfAsBase64(): Promise<string> {
  if (cachedPdfBase64) return cachedPdfBase64;

  const blob = await fetchPdfBlob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data URL prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      cachedPdfBase64 = base64;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
