import { expect } from '@playwright/test';

const STYLE_ID = 'mkt-style';
const CURSOR_ID = 'mkt-cursor';

/**
 * Playwright's video does not capture the operating-system pointer, so the
 * recording needs an in-page cursor. It is deliberately plain: no captions, no
 * progress bar, no chapter text. All narrative text is composited later as a
 * PNG overlay, so it can never cover a control at click time.
 */
export async function installCursor(page) {
  await page.evaluate(({ styleId, cursorId }) => {
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #${cursorId} {
          position: fixed;
          left: 50vw;
          top: 54vh;
          width: 0;
          height: 0;
          z-index: 2147483647;
          pointer-events: none;
          transition: left .42s cubic-bezier(.22, 1, .36, 1),
                      top .42s cubic-bezier(.22, 1, .36, 1);
          filter: drop-shadow(0 6px 8px rgba(15, 23, 42, .38));
        }
        #${cursorId} svg {
          position: absolute;
          left: -7px;
          top: -5px;
          width: 54px;
          height: 66px;
          transform: rotate(-7deg);
          transform-origin: 7px 5px;
        }
        #${cursorId}-ring {
          position: absolute;
          left: -26px;
          top: -26px;
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 3px solid rgba(14, 165, 233, .9);
          background: rgba(14, 165, 233, .1);
          box-shadow: 0 0 0 6px rgba(14, 165, 233, .12),
                      0 0 26px rgba(14, 165, 233, .38);
          opacity: 0;
          transform: scale(.6);
          transition: transform .24s ease, opacity .24s ease,
                      background .24s ease;
        }
        #${cursorId}.is-clicking #${cursorId}-ring {
          opacity: 1;
          transform: scale(1.45);
          background: rgba(14, 165, 233, .24);
        }
        #${cursorId}.is-hovering #${cursorId}-ring {
          opacity: .55;
          transform: scale(1);
        }
        .mkt-target {
          outline: 4px solid rgba(14, 165, 233, .92) !important;
          outline-offset: 5px !important;
          border-radius: 14px !important;
          box-shadow: 0 0 0 10px rgba(14, 165, 233, .16) !important;
          transition: outline-color .18s ease, box-shadow .18s ease;
        }
      `;
      document.head.appendChild(style);
    }

    if (!document.getElementById(cursorId)) {
      const cursor = document.createElement('div');
      cursor.id = cursorId;
      cursor.innerHTML = `
        <div id="${cursorId}-ring"></div>
        <svg viewBox="0 0 54 66" aria-hidden="true">
          <path d="M7 4 L7 50 L18 38 L26 60 L36 55.5 L28 34 L45 32 Z"
                fill="#ffffff" stroke="#0f172a" stroke-width="3"
                stroke-linejoin="round" />
        </svg>
      `;
      document.body.appendChild(cursor);
    }
  }, { styleId: STYLE_ID, cursorId: CURSOR_ID });
}

export async function hold(page, milliseconds = 900) {
  await page.waitForTimeout(milliseconds);
}

export async function clearHighlight(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('.mkt-target')
      .forEach((element) => element.classList.remove('mkt-target'));
    document.getElementById('mkt-cursor')?.classList.remove('is-hovering');
  });
}

export async function focusOn(page, locator, { scroll = true, settleMs = 260 } = {}) {
  const target = locator.first();
  await expect(target).toBeVisible({ timeout: 30_000 });

  if (scroll) {
    await target.scrollIntoViewIfNeeded();
    await hold(page, settleMs);
  }

  await target.evaluate((element) => {
    document
      .querySelectorAll('.mkt-target')
      .forEach((other) => other.classList.remove('mkt-target'));
    element.classList.add('mkt-target');
  });

  await moveCursorTo(page, target);
  return target;
}

export async function moveCursorTo(page, locator) {
  const target = locator.first();
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Cannot move the marketing cursor: target has no box.');
  }
  await moveCursorToPoint(page, box.x + box.width / 2, box.y + box.height / 2);
}

export async function moveCursorToPoint(page, x, y) {
  await installCursor(page);
  await page.evaluate(({ x, y }) => {
    const cursor = document.getElementById('mkt-cursor');
    if (!cursor) return;
    cursor.classList.add('is-hovering');
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }, { x, y });
  await hold(page, 460);
}

export async function clickWithCursor(page, locator, { highlightMs = 320 } = {}) {
  const target = locator.first();
  await focusOn(page, target);
  await page.evaluate(() => {
    document.getElementById('mkt-cursor')?.classList.add('is-clicking');
  });
  await hold(page, 220);
  await target.click();
  await hold(page, highlightMs);
  await page.evaluate(() => {
    document.getElementById('mkt-cursor')?.classList.remove('is-clicking');
  });
}

export async function typeInto(page, locator, text, { clear = true, delay = 55 } = {}) {
  const target = locator.first();
  await focusOn(page, target, { scroll: false });
  if (clear) {
    await target.fill('');
  }
  await target.pressSequentially(text, { delay });
  await hold(page, 420);
}

export async function scrollBy(page, y, { settleMs = 700 } = {}) {
  await page.mouse.move(960, 540);
  await page.mouse.wheel(0, y);
  await hold(page, settleMs);
  await installCursor(page);
}

/**
 * Same movement as smoothScrollTo, but the target is a locator (so text
 * selectors work). Used by scenes that scroll to a section by its heading.
 */
export async function smoothScrollToLocator(
  page,
  locator,
  { offset = -120, settleMs = 900 } = {},
) {
  const target = locator.first();
  await expect(target).toBeVisible({ timeout: 30_000 });
  await target.evaluate((element, topOffset) => {
    const top = element.getBoundingClientRect().top + window.scrollY + topOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, offset);
  await hold(page, settleMs);
  await installCursor(page);
}

export async function smoothScrollTo(page, selector, { offset = -120, settleMs = 900 } = {}) {
  await page.evaluate(({ selector, offset }) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`No element for selector ${selector}`);
    const top = element.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, { selector, offset });
  await hold(page, settleMs);
  await installCursor(page);
}
