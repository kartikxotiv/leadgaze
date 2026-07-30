import { sharedI18nResolver } from '@kit/i18n/resolver';

export async function i18nResolver(language: string, namespace: string) {
  try {
    const data = await import(
      `../../public/locales/${language}/${namespace}.json`
    );
    return data.default || data;
  } catch {
    return sharedI18nResolver(language, namespace);
  }
}
