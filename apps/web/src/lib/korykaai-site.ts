/** Main korykaai.com origin — PageInk lives on a subdomain but shares site chrome. */
export const KORYKAAI_SITE = "https://www.korykaai.com";

export const korykaaiLogoUrl = `${KORYKAAI_SITE}/assets/images/korykaai_logo.png`;

export function korykaaiPath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${KORYKAAI_SITE}${path.startsWith("/") ? path : `/${path}`}`;
}
