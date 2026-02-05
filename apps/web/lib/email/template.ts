export function renderTemplate(html: string, variables: Record<string, any>) {
    return html.replaceAll(/{{\s*(\w+)\s*}}/g, (_, key) => {
        return variables[key] ?? "";
    });
}

export function validateTemplateVars(
    provided: Record<string, any>,
    required: string[] = [],
) {
    const missing = required.filter(v => !(v in provided));
    if (missing.length) {
        throw new Error(`Missing variables: ${missing.join(", ")}`);
    }
}
