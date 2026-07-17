'use client';

import { useEffect, useState, useRef } from 'react';

interface FormField {
  field_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
}

interface WebsiteConnectorEmbedPageProps {
  form: {
    id: string;
    heading: string;
    subheading: string;
    button_color: string;
    success_message: string;
    redirect_url: string;
  };
  publicKey: string;
  fields: FormField[];
}

export function WebsiteConnectorEmbedPage({ form, publicKey, fields }: WebsiteConnectorEmbedPageProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize handler to adjust iframe height in parent window
  useEffect(() => {
    const sendHeight = () => {
      if (containerRef.current) {
        // Use offsetHeight of the main wrapper to avoid body padding mismatches
        const height = containerRef.current.offsetHeight + 32; 
        window.parent.postMessage({ type: 'resize', height, formId: form.id }, '*');
      }
    };

    // Run after initial paint
    const timer = setTimeout(sendHeight, 100);

    // Watch for internal DOM mutations (e.g. error/success text rendering)
    const observer = new MutationObserver(sendHeight);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    }

    window.addEventListener('resize', sendHeight);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', sendHeight);
    };
  }, [form.id, statusMessage]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const payload: Record<string, any> = {
      custom_fields: {},
    };

    // Map fields
    for (const field of fields) {
      const val = formData[field.field_name] || '';
      if (field.field_name === 'first_name') payload.first_name = val;
      else if (field.field_name === 'last_name') payload.last_name = val;
      else if (field.field_name === 'email') payload.email = val;
      else if (field.field_name === 'phone_number') payload.phone_number = val;
      else if (field.field_name === 'company_name') payload.company_name = val;
      else if (field.field_name === 'notes') payload.notes = val;
      else payload.custom_fields[field.field_name] = val;
    }

    // Set combined name helper
    if (payload.first_name) {
      payload.name = payload.last_name ? `${payload.first_name} ${payload.last_name}` : payload.first_name;
    }

    try {
      const response = await fetch('/api/v1/connectors/website/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Connector-Public-Key': publicKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setFormData({});
        setStatusMessage({ text: form.success_message, type: 'success' });

        if (form.redirect_url && form.redirect_url.trim() !== '' && form.redirect_url !== 'null' && form.redirect_url !== 'undefined') {
          setTimeout(() => {
            window.parent.location.href = form.redirect_url;
          }, 1500);
        }
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setStatusMessage({ text: err.message || 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[450px] bg-card rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 text-zinc-900 dark:text-zinc-50"
      style={{ fontFamily: "sans-serif" }}
    >
      <div className="mb-5">
        <h3 className="text-xl font-bold tracking-tight mb-1">{form.heading}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{form.subheading}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => {
          const id = `field-${field.field_name}`;
          const isTextarea = field.field_type === 'textarea';

          return (
            <div key={field.field_name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center">
                {field.label}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {isTextarea ? (
                <textarea
                  id={id}
                  required={field.is_required}
                  value={formData[field.field_name] || ''}
                  onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                  className="w-full min-h-[90px] text-sm px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-shadow resize-y"
                />
              ) : (
                <input
                  id={id}
                  type={field.field_type === 'number' ? 'number' : 'text'}
                  required={field.is_required}
                  value={formData[field.field_name] || ''}
                  onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                  placeholder={`Enter your ${field.label.toLowerCase()}`}
                  className="w-full h-9 text-sm px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-shadow"
                />
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: form.button_color }}
          className="w-full h-9 mt-2 text-sm font-semibold text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
        </button>

        {statusMessage && (
          <div
            className={`p-3 rounded-md text-xs font-medium border text-center transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
            }`}
          >
            {statusMessage.text}
          </div>
        )}
      </form>
    </div>
  );
}
