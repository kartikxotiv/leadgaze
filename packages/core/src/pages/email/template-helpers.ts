import { replaceTemplateVariables } from '../../lib/email/template-utils';

export function workspaceVariableMap(variables: any[]) {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    if (variable?.key) {
      acc[String(variable.key)] = String(variable.value ?? '');
    }

    return acc;
  }, {});
}

export function renderEmailTemplate(
  template: any,
  variables: any[],
  context: Record<string, unknown> = {},
) {
  const data = {
    ...workspaceVariableMap(variables),
    ...context,
  };

  return {
    subject: replaceTemplateVariables(template?.subject ?? '', data),
    body: replaceTemplateVariables(
      template?.html_body ?? template?.text_body ?? '',
      data,
    ),
  };
}

export function renderEmailContent(
  value: string,
  variables: any[],
  context: Record<string, unknown> = {},
) {
  return replaceTemplateVariables(value, {
    ...workspaceVariableMap(variables),
    ...context,
  });
}
