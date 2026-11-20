// The component preview routes (/preview/components) are a development and review aid. They are
// on in development and test, and off in a production build unless explicitly enabled.

export function previewEnabled(env: {
  readonly NODE_ENV?: string | undefined;
  readonly YUYIN_PREVIEW_ROUTES?: string | undefined;
}): boolean {
  return env.NODE_ENV !== "production" || env.YUYIN_PREVIEW_ROUTES === "1";
}
