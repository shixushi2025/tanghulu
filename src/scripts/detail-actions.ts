import { readStored, writeStored } from '../lib/dom';
export function initializeDetailActions() {


      const runtimeData = document.getElementById('item-runtime-data');
      const itemId = runtimeData?.dataset.itemId || '';
      const itemTitle = runtimeData?.dataset.itemTitle || '';
      const STORAGE_KEY = `rated:${itemId}`;
      const ratingButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rating-fruit'));
      const feedback = document.getElementById('rating-feedback');

      function formatCount(value: number) {
        const count = Number(value) || 0;
        return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
      }

      async function initViews() {
        const response = await fetch(`/api/views/${itemId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }).catch(() => null);
        if (!response?.ok) return;
        const { count } = await response.json();
        const element = document.getElementById('view-count');
        if (element) element.textContent = formatCount(count);
      }

      async function initRatings() {
        const response = await fetch(`/api/ratings/${itemId}`).catch(() => null);
        if (!response?.ok) return;
        const { average, count } = await response.json();
        const averageElement = document.getElementById('community-avg');
        const countElement = document.getElementById('community-count');
        if (averageElement) averageElement.textContent = average ? average.toFixed(1) : '暂无';
        if (countElement) countElement.textContent = String(count || 0);
      }

      function paintRating(score: number) {
        ratingButtons.forEach((button) => {
          const active = Number(button.dataset.score) <= score;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', String(Number(button.dataset.score) === score));
        });
      }

      function initRatingInput() {
        const saved = Number(readStored(STORAGE_KEY) || 0);
        if (saved) {
          paintRating(saved);
          if (feedback) feedback.textContent = '你已经评过了，可以重新选择。';
        }

        ratingButtons.forEach((button) => {
          button.addEventListener('pointerenter', () => paintRating(Number(button.dataset.score)));
          button.addEventListener('focus', () => paintRating(Number(button.dataset.score)));
          button.addEventListener('pointerleave', () => paintRating(Number(readStored(STORAGE_KEY) || 0)));
          button.addEventListener('blur', () => paintRating(Number(readStored(STORAGE_KEY) || 0)));
          button.addEventListener('click', async () => {
            const score = Number(button.dataset.score);
            ratingButtons.forEach((entry) => { entry.disabled = true; });
            paintRating(score);
            if (feedback) feedback.textContent = '正在把这颗糖挂上去…';

            const response = await fetch(`/api/ratings/${itemId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ score }),
            }).catch(() => null);

            ratingButtons.forEach((entry) => { entry.disabled = false; });
            if (!response?.ok) {
              paintRating(Number(readStored(STORAGE_KEY) || 0));
              if (feedback) feedback.textContent = '这次没挂上，请稍后再试。';
              return;
            }

            writeStored(STORAGE_KEY, String(score));
            const { average, count } = await response.json();
            const averageElement = document.getElementById('community-avg');
            const countElement = document.getElementById('community-count');
            if (averageElement) averageElement.textContent = average ? average.toFixed(1) : '—';
            if (countElement) countElement.textContent = String(count || 0);
            if (feedback) feedback.textContent = `谢谢你留下 ${score} 颗糖。`;
          });
        });
      }

      document.getElementById('share-button')?.addEventListener('click', async () => {
        const button = document.getElementById('share-button');
        try {
          if (navigator.share) {
            await navigator.share({ title: `${itemTitle} · 糖葫芦`, url: location.href });
          } else {
            await navigator.clipboard.writeText(location.href);
            if (button) button.textContent = '链接已复制 ✓';
          }
        } catch (error) { if (button && !(error instanceof DOMException && error.name === 'AbortError')) button.textContent = '复制失败，请复制地址栏链接'; }
      });

      if (itemId) {
        initViews();
        initRatings();
        initRatingInput();
      }

}
