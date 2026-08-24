const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(String.fromCharCode(34), '&quot;')
    .replaceAll(String.fromCharCode(39), '&#039;');

const ONBOARDING_TEMPLATE = ({
  userName,
  workspaceName,
  productName,
  appUrl = 'https://app.leadgaze.com',
}: {
  userName: string;
  workspaceName: string;
  productName: string;
  appUrl?: string;
}) => {
  const baseUrl = appUrl || 'https://app.leadgaze.com';
  const logoUrl =
    baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
      ? 'https://app.leadgaze.com/images/lead-gaze-logo-main-screen.png'
      : `${baseUrl}/images/lead-gaze-logo-main-screen.png`;
  const name = escapeHtml(userName);
  const workspace = escapeHtml(workspaceName);
  const product = escapeHtml(productName);

  return `<!DOCTYPE html>
<html lang='en'>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Welcome to ${product}</title></head>
<body style='margin:0;background:#f8f9fc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif'>
<div style='padding:32px 16px'><div style='max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)'>
<div style='padding:32px 24px;text-align:center;border-bottom:4px solid #3953E7'>
<img src='${logoUrl}' alt='${product}' style='height:42px;margin-bottom:18px'>
<h1 style='margin:0 0 8px;font-size:24px;color:#1a1a1a'>Your workspace is ready</h1>
<p style='margin:0;font-size:16px;font-weight:600;color:#3953E7'>${workspace}</p>
</div>
<div style='padding:32px 24px'>
<p style='margin:0 0 24px;font-size:15px;line-height:1.6;color:#424242'>Hi <strong>${name}</strong>, welcome to <strong>${product}</strong>. Your workspace has been set up successfully and is ready for you.</p>
<div style='background:#f8f9fc;border:1px solid #e0e7ff;border-radius:8px;padding:16px;margin-bottom:24px'>
<p style='margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;color:#3953E7'>Workspace</p>
<p style='margin:0;font-size:16px;font-weight:600;color:#1a1a1a'>${workspace}</p>
</div>
<div style='text-align:center;margin-bottom:24px'><a href='${baseUrl}/home' style='display:inline-block;background:#3953E7;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:700'>Open Workspace</a></div>
<div style='background:#f0f4ff;border-left:4px solid #3953E7;padding:14px;border-radius:4px;font-size:12px;line-height:1.6;color:#424242'>Add your team, explore your selected products, and customize your workspace whenever you are ready.</div>
</div>
<div style='background:#f8f9fc;padding:20px 24px;text-align:center;border-top:1px solid #e0e7ff;font-size:12px;color:#999'>
<p style='margin:0 0 12px'>&copy; ${new Date().getFullYear()} ${product}. Operated by <a href='https://xotiv.com' style='color:#3953E7;text-decoration:none'>Xotiv Technologies Pvt. Ltd.</a></p>
<a href='${baseUrl}/help' style='color:#3953E7;text-decoration:none'>Help Center</a>
</div></div></div>
</body></html>`;
};

export default ONBOARDING_TEMPLATE;
