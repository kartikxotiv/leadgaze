(function () {
  const scriptEl = document.currentScript;
  let baseUrl = 'https://app.leadgaze.com';
  if (scriptEl && scriptEl.src.startsWith('http')) {
    baseUrl = new URL(scriptEl.src).origin;
  } else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }

  async function initForm(container) {
    const formId = container.getAttribute('data-leadgaze-form');
    if (!formId) return;

    if (container.hasAttribute('data-lg-initialized')) return;
    container.setAttribute('data-lg-initialized', 'true');

    try {
      // 1. Fetch form definition
      const res = await fetch(`${baseUrl}/api/v1/forms/${formId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch form definition');
      const json = await res.json();
      const { form, publicKey, fields } = json.data;

      // 2. Render Form HTML
      container.innerHTML = `
        <div class="lg-form-wrapper" style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          max-width: 450px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #e4e4e7;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          padding: 24px;
          color: #18181b;
          box-sizing: border-box;
        ">
          <div class="lg-form-header" style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; line-height: 1.25; color: #09090b;">${form.heading}</h3>
            <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">${form.subheading}</p>
          </div>
          <form class="lg-form-element" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="lg-form-fields" style="display: flex; flex-direction: column; gap: 12px;">
              ${fields.map(field => {
                const requiredStar = field.is_required ? '<span style="color: #ef4444; margin-left: 2px;">*</span>' : '';
                const fieldPlaceholder = `Enter your ${field.label.toLowerCase()}`;
                
                if (field.field_type === 'textarea') {
                  return `
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 12px; font-weight: 600; color: #27272a;">${field.label}${requiredStar}</label>
                      <textarea name="${field.field_name}" placeholder="${fieldPlaceholder}" ${field.is_required ? 'required' : ''} style="
                        font-family: inherit;
                        font-size: 13px;
                        padding: 8px 12px;
                        border: 1px solid #e4e4e7;
                        border-radius: 6px;
                        min-height: 80px;
                        resize: vertical;
                        outline: none;
                        box-sizing: border-box;
                        width: 100%;
                      "></textarea>
                    </div>
                  `;
                }

                return `
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 12px; font-weight: 600; color: #27272a;">${field.label}${requiredStar}</label>
                    <input type="${field.field_type === 'number' ? 'number' : 'text'}" name="${field.field_name}" placeholder="${fieldPlaceholder}" ${field.is_required ? 'required' : ''} style="
                      font-family: inherit;
                      font-size: 13px;
                      padding: 8px 12px;
                      border: 1px solid #e4e4e7;
                      border-radius: 6px;
                      height: 36px;
                      outline: none;
                      box-sizing: border-box;
                      width: 100%;
                    "/>
                  </div>
                `;
              }).join('')}
            </div>
            
            <button type="submit" class="lg-submit-button" style="
              font-family: inherit;
              background-color: ${form.button_color};
              color: #ffffff;
              border: none;
              border-radius: 6px;
              height: 38px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              transition: opacity 0.2s;
              width: 100%;
              margin-top: 4px;
            ">Submit Inquiry</button>
            <div class="lg-status-message" style="display: none; font-size: 13px; line-height: 1.5; text-align: center;"></div>
          </form>
        </div>
      `;

      // 3. Attach submit handler
      const formEl = container.querySelector('.lg-form-element');
      const submitBtn = container.querySelector('.lg-submit-button');
      const statusMsg = container.querySelector('.lg-status-message');

      // Add hover effect
      submitBtn.addEventListener('mouseenter', () => submitBtn.style.opacity = '0.9');
      submitBtn.addEventListener('mouseleave', () => submitBtn.style.opacity = '1');

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        statusMsg.style.display = 'none';

        const formDataObj = new FormData(formEl);
        const payload = {
          custom_fields: {}
        };

        // Extract and map fields correctly
        for (const [key, val] of formDataObj.entries()) {
          if (key === 'first_name') payload.first_name = val;
          else if (key === 'last_name') payload.last_name = val;
          else if (key === 'email') payload.email = val;
          else if (key === 'phone_number') payload.phone_number = val;
          else if (key === 'company_name') payload.company_name = val;
          else if (key === 'notes') payload.notes = val;
          else payload.custom_fields[key] = val;
        }

        // Add display name helper
        if (payload.first_name) {
          payload.name = payload.last_name ? `${payload.first_name} ${payload.last_name}` : payload.first_name;
        }

        try {
          const response = await fetch(`${baseUrl}/api/v1/connectors/website/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Connector-Public-Key': publicKey,
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (response.ok && result.success) {
            formEl.reset();
            statusMsg.innerText = form.success_message;
            statusMsg.style.color = '#15803d'; // green-700
            statusMsg.style.display = 'block';

            if (form.redirect_url && form.redirect_url.trim() !== '' && form.redirect_url !== 'null' && form.redirect_url !== 'undefined') {
              setTimeout(() => {
                window.location.href = form.redirect_url;
              }, 1500);
            }
          } else {
            throw new Error(result.message || 'Submission failed');
          }
        } catch (error) {
          console.error('Leadgaze submit error:', error);
          statusMsg.innerText = error.message || 'An error occurred. Please try again.';
          statusMsg.style.color = '#b91c1c'; // red-700
          statusMsg.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
      });
    } catch (e) {
      console.error('Leadgaze embed initialize error:', e);
      container.innerHTML = `<p style="color: #b91c1c; font-size: 13px; text-align: center;">Failed to load lead capture form.</p>`;
    }
  }

  // Initialize all form widgets on page load
  document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('[data-leadgaze-form]');
    targets.forEach(initForm);
  });
  
  // Also run immediately if DOM is already parsed
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    const targets = document.querySelectorAll('[data-leadgaze-form]');
    targets.forEach(initForm);
  }
})();
