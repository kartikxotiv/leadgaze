export function replaceTemplateVariables(template: string, data: Record<string, unknown>) {
  if (!template) return '';

  return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = trimmedKey.split('.').reduce((obj: unknown, pathKey: string) => {
      if (obj && typeof obj === 'object' && pathKey in obj) {
        return (obj as Record<string, unknown>)[pathKey];
      }

      return undefined;
    }, data as unknown);

    return value !== undefined && value !== null ? String(value) : match;
  });
}

export function getAvailableVariables() {
  return [
    { label: 'First Name', value: '{{first_name}}' },
    { label: 'Last Name', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
    { label: 'Company', value: '{{company_name}}' },
  ];
}

export function renderTemplate(html: string, variables: Record<string, unknown>) {
  return html.replaceAll(/{{\s*(\w+)\s*}}/g, (_, key) => String(variables[key] ?? ''));
}
