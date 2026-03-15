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

export async function fetchPdfAsBase64(): Promise<string> {
  if (cachedPdfBase64) return cachedPdfBase64;

  const response = await fetch(location.href);
  const blob = await response.blob();

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
