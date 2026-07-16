const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function normalizeRedirectPath(path: string | null | undefined) {
  const normalized = path?.trim();

  if (!normalized) {
    return "/";
  }

  if (normalized.startsWith("/") || URL_SCHEME_PATTERN.test(normalized)) {
    return normalized;
  }

  return `/${normalized}`;
}
