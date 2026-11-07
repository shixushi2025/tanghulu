export function initializeCovers() {
    document.querySelectorAll<HTMLImageElement>('[data-cover-media] img').forEach(image => {
      if (image.dataset.bound) return;
      image.dataset.bound = 'true';
      let timer: ReturnType<typeof setTimeout> | undefined;
      let observer: IntersectionObserver | undefined;
      const cleanup = () => { clearTimeout(timer); observer?.disconnect(); };
      const fail = () => {
        cleanup();
        image.closest('[data-cover-media]')?.setAttribute('data-image-error', 'true');
        image.removeAttribute('src');
      };
      image.addEventListener('error', fail, { once: true });
      image.addEventListener('load', cleanup, { once: true });
      if (image.complete) {
        if (image.naturalWidth === 0) fail();
        return;
      }
      // Start the deadline only when a remote lazy image enters the viewport.
      if (new URL(image.src, location.href).origin !== location.origin) {
        observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            observer?.disconnect();
            timer = setTimeout(fail, 8000);
          }
        });
        observer.observe(image);
      }
    });
  }


