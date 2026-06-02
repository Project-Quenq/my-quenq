export function trustedHtml(html: string) {
  // User-content render boundary: pass stored sanitizer output, never raw form input.
  return { __html: html };
}
