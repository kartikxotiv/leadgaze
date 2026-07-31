import { sharedI18nResolver } from '@kit/i18n/resolver';

export async function i18nResolver(language: string, namespace: string) {
  return sharedI18nResolver(language, namespace);
}
