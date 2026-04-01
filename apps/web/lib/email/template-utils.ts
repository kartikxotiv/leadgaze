/**
 * Replaces placeholders in a template string with actual data.
 * Supports {{variable_name}} format.
 */
export function replaceTemplateVariables(
  template: string,
  data: Record<string, any>,
): string {
  if (!template) return '';
  
  return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    
    // Support nested paths like lead.first_name if needed
    const value = trimmedKey.split('.').reduce((obj, k) => obj?.[k], data);
    
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Gets the list of available variables for the CRM.
 */
export function getAvailableVariables() {
  return [
    { label: 'First Name', value: '{{first_name}}' },
    { label: 'Last Name', value: '{{last_name}}' },
    { label: 'Email', value: '{{email}}' },
  ];
}
