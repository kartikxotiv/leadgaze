export async function sharedI18nResolver(
  language: string,
  namespace: string,
) {
  try {
    const data = await import(`../locales/${language}/${namespace}.json`);
    return (data.default || data) as Record<string, string>;
  } catch (error) {
    return {};
  }
}
