(function () {
  const scriptEl = document.currentScript;
  let baseUrl = 'https://app.leadgaze.com';
  if (scriptEl && scriptEl.src.startsWith('http')) {
    baseUrl = new URL(scriptEl.src).origin;
  } else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }

  function initWidget(container) {
    const formId = container.getAttribute('data-leadgaze-form');
    if (!formId) return;

    if (container.hasAttribute('data-lg-widget-initialized')) return;
    container.setAttribute('data-lg-widget-initialized', 'true');

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${baseUrl}/embed/${formId}`;
    iframe.style.width = '100%';
    iframe.style.height = '150px'; // Initial load placeholder height
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.background = 'transparent';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('data-leadgaze-iframe', formId);

    // Render iframe inside container
    container.innerHTML = '';
    container.appendChild(iframe);
  }

  // Handle auto-resizing messaging from child iframe
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'resize' && event.data.formId) {
      const iframe = document.querySelector(`iframe[data-leadgaze-iframe="${event.data.formId}"]`);
      if (iframe) {
        iframe.style.height = event.data.height + 'px';
      }
    }
  });

  // Load widgets on page load
  document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('[data-leadgaze-form]');
    targets.forEach(initWidget);
  });

  // Also run immediately if DOM is already parsed
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    const targets = document.querySelectorAll('[data-leadgaze-form]');
    targets.forEach(initWidget);
  }
})();
