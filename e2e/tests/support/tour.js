import { expect } from '@playwright/test';
import { accounts } from './accounts.js';

const OVERLAY_STYLE_ID = 'tour-style';
const OVERLAY_ID = 'tour-chrome';

/**
 * Installs the recording chrome: a readable Arabic lower-third, a progress
 * line, and a synthetic cursor. Playwright's video does not record the real
 * mouse pointer, so the cursor must be an in-page element.
 *
 * The overlay is appended to document.body and survives client-side routing.
 * Re-install it after any full page navigation.
 */
export async function installTourOverlay(page) {
  await page.evaluate(() => {
    if (!document.getElementById('tour-style')) {
      const style = document.createElement('style');
      style.id = 'tour-style';
      style.textContent = `
        #tour-chrome {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          pointer-events: none;
          direction: rtl;
          font-family: "Segoe UI", Tahoma, Arial, sans-serif;
          color: #fff;
          overflow: hidden;
        }
        #tour-progress {
          position: absolute;
          inset: 0 0 auto 0;
          height: 5px;
          background: rgba(148, 163, 184, .28);
        }
        #tour-progress-fill {
          height: 100%;
          width: 4%;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          box-shadow: 0 0 14px rgba(245, 158, 11, .65);
          transition: width .55s cubic-bezier(.22, 1, .36, 1);
        }
        #tour-caption {
          position: absolute;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          width: min(900px, calc(100vw - 56px));
          box-sizing: border-box;
          padding: 15px 22px 17px;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, .28);
          border-right: 5px solid #f59e0b;
          background: linear-gradient(135deg, rgba(15, 23, 42, .97), rgba(30, 41, 59, .93));
          box-shadow: 0 24px 70px rgba(2, 6, 23, .52);
          backdrop-filter: blur(10px);
          text-align: right;
          opacity: 0;
          translate: 0 14px;
        }
        #tour-caption.tour-in {
          animation: tour-caption-in .42s cubic-bezier(.22, 1, .36, 1) forwards;
        }
        @keyframes tour-caption-in {
          to { opacity: 1; translate: 0 0; }
        }
        .tour-kicker {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .1px;
          color: #fbbf24;
        }
        .tour-kicker .tour-mode {
          margin-inline-start: auto;
          padding: 2px 9px;
          border: 1px solid rgba(251, 191, 36, .38);
          border-radius: 999px;
          background: rgba(251, 191, 36, .12);
          color: #fde68a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .2px;
        }
        #tour-title {
          margin: 0;
          font-size: 26px;
          line-height: 1.25;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 16px rgba(0, 0, 0, .35);
        }
        #tour-subtitle {
          margin-top: 4px;
          font-size: 15px;
          line-height: 1.55;
          font-weight: 500;
          color: #cbd5e1;
        }
        #tour-cursor {
          position: absolute;
          left: calc(50vw);
          top: 54vh;
          width: 0;
          height: 0;
          z-index: 2147483647;
          transition: left .46s cubic-bezier(.22, 1, .36, 1),
                      top .46s cubic-bezier(.22, 1, .36, 1);
          filter: drop-shadow(0 4px 5px rgba(2, 6, 23, .45));
        }
        #tour-cursor svg {
          position: absolute;
          left: -4px;
          top: -3px;
          width: 39px;
          height: 48px;
          transform: rotate(-9deg);
          transform-origin: 4px 3px;
        }
        #tour-cursor-ring {
          position: absolute;
          left: -20px;
          top: -20px;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 3px solid rgba(251, 191, 36, .95);
          background: rgba(251, 191, 36, .12);
          box-shadow: 0 0 0 5px rgba(251, 191, 36, .14),
                      0 0 22px rgba(251, 191, 36, .4);
          transition: transform .22s ease, opacity .22s ease, background .22s ease;
        }
        #tour-cursor.tour-clicking #tour-cursor-ring {
          transform: scale(1.55);
          opacity: .38;
          background: rgba(251, 191, 36, .26);
        }
        .tour-target {
          outline: 3px solid rgba(251, 191, 36, .95) !important;
          outline-offset: 4px !important;
          border-radius: 12px !important;
          box-shadow: 0 0 0 8px rgba(251, 191, 36, .17) !important;
          transition: outline-color .2s ease, box-shadow .2s ease;
        }
        @media (max-width: 720px) {
          #tour-caption { padding: 12px 16px 14px; bottom: 14px; }
          #tour-title { font-size: 21px; }
          #tour-subtitle { font-size: 13px; }
        }
      `;
      document.head.appendChild(style);
    }

    if (document.getElementById('tour-chrome')) {
      return;
    }

    const chrome = document.createElement('div');
    chrome.id = 'tour-chrome';
    chrome.dir = 'rtl';
    chrome.innerHTML = `
      <div id="tour-progress"><div id="tour-progress-fill"></div></div>
      <div id="tour-caption" class="tour-in">
        <div class="tour-kicker">
          <span id="tour-chapter">مقدمة</span>
          <span class="tour-mode">نسخة معاينة</span>
        </div>
        <p id="tour-title">نظام إدارة السنتر</p>
        <p id="tour-subtitle">جولة عربية سريعة في أدوار المنصة</p>
      </div>
      <div id="tour-cursor">
        <div id="tour-cursor-ring"></div>
        <svg viewBox="0 0 39 48" aria-hidden="true">
          <path d="M4 3 L4 37 L13 28 L19 45 L27 41.5 L21 25 L34 23.5 Z"
                fill="#ffffff" stroke="#0f172a" stroke-width="2.6"
                stroke-linejoin="round" />
        </svg>
      </div>
    `;
    document.body.appendChild(chrome);
  });
}

export async function setCaption(
  page,
  { chapter, title, subtitle, progress = 0 },
) {
  await installTourOverlay(page);
  await page.evaluate(
    ({ chapter, title, subtitle, progress }) => {
      const chapterEl = document.getElementById('tour-chapter');
      const titleEl = document.getElementById('tour-title');
      const subtitleEl = document.getElementById('tour-subtitle');
      const fill = document.getElementById('tour-progress-fill');
      const caption = document.getElementById('tour-caption');

      if (chapterEl) chapterEl.textContent = chapter;
      if (titleEl) titleEl.textContent = title;
      if (subtitleEl) subtitleEl.textContent = subtitle;
      if (fill) fill.style.width = `${Math.max(3, Math.min(100, progress))}%`;

      if (caption) {
        caption.classList.remove('tour-in');
        void caption.offsetWidth;
        caption.classList.add('tour-in');
      }
    },
    { chapter, title, subtitle, progress },
  );
}

export async function hold(page, milliseconds = 900) {
  await page.waitForTimeout(milliseconds);
}

export async function clearFocus(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('.tour-target')
      .forEach((element) => element.classList.remove('tour-target'));
  });
}

export async function focusOn(page, locator, { scroll = true } = {}) {
  const target = locator.first();
  await expect(target).toBeVisible({ timeout: 30_000 });

  if (scroll) {
    await target.scrollIntoViewIfNeeded();
    await hold(page, 260);
  }

  await target.evaluate((element) => {
    document
      .querySelectorAll('.tour-target')
      .forEach((other) => other.classList.remove('tour-target'));
    element.classList.add('tour-target');
  });

  await moveCursorTo(page, target);
  return target;
}

export async function moveCursorTo(page, locator) {
  const target = locator.first();
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Cannot move the tour cursor: target has no bounding box.');
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursorToPoint(page, x, y);
}

export async function moveCursorToPoint(page, x, y) {
  await installTourOverlay(page);
  await page.evaluate(
    ({ x, y }) => {
      const cursor = document.getElementById('tour-cursor');
      if (!cursor) return;
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    },
    { x, y },
  );
  await hold(page, 520);
}

export async function clickWithCursor(page, locator) {
  const target = locator.first();
  await focusOn(page, target, { scroll: true });
  await page.evaluate(() => {
    document.getElementById('tour-cursor')?.classList.add('tour-clicking');
  });
  await hold(page, 180);
  await target.click();
  await hold(page, 260);
  await page.evaluate(() => {
    document.getElementById('tour-cursor')?.classList.remove('tour-clicking');
  });
}

export async function typeInto(page, locator, text, { clear = true } = {}) {
  const target = locator.first();
  await focusOn(page, target, { scroll: true });
  if (clear) {
    await target.fill('');
  }
  await target.pressSequentially(text, { delay: 70 });
  await hold(page, 380);
}

export async function chapter(page, details) {
  await installTourOverlay(page);
  await setCaption(page, details);
  await expect(page.locator('#tour-chapter')).toHaveText(details.chapter);
  await expect(page.locator('#tour-title')).toHaveText(details.title);
  await expect(page.locator('#tour-subtitle')).toHaveText(details.subtitle);
  await expect(page.locator('#tour-cursor')).toBeAttached();
  await hold(page, details.holdMs ?? 850);
}

export async function openLogin(page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-phone').waitFor({ state: 'visible' });
  await installTourOverlay(page);
  await hold(page, 400);
}

/**
 * Signs in through the real form while recording. No storage or token is
 * injected. If the login page was not navigated to by the caller, the current
 * page must already be on /login.
 */
export async function signInWithTour(
  page,
  role,
  { beforeSubmit, expectedPath } = {},
) {
  const account = accounts[role];
  if (!account) {
    throw new Error(`Unknown role "${role}"`);
  }

  await installTourOverlay(page);
  const phone = page.locator('#login-phone');
  const password = page.locator('#login-password');
  const submit = page.locator('button[type="submit"]').first();

  await expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();
  await expect(phone).toBeVisible();
  await expect(password).toBeVisible();

  await typeInto(page, phone, account.phone);
  await typeInto(page, password, account.password);

  if (beforeSubmit) {
    await beforeSubmit();
  }

  await focusOn(page, submit);
  const signInResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/Authentication/SignIn') &&
      response.request().method() === 'POST',
    { timeout: 45_000 },
  );

  await clickWithCursor(page, submit);

  const response = await signInResponse;
  if (response.status() !== 200) {
    throw new Error(
      `Sign-in for ${role} returned HTTP ${response.status()}: ${await response.text()}`,
    );
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 60_000,
  });

  if (expectedPath) {
    await page.waitForURL((url) => url.pathname === expectedPath, {
      timeout: 60_000,
    });
  }

  await page.waitForLoadState('domcontentloaded');
  await installTourOverlay(page);
  await hold(page, 1_300);
}

export async function signOutWithTour(page) {
  await installTourOverlay(page);
  const logoutButton = page
    .getByRole('button', { name: 'تسجيل خروج' })
    .first();
  await expect(logoutButton).toBeVisible({ timeout: 20_000 });
  await clickWithCursor(page, logoutButton);
  await page.waitForURL('**/login', { timeout: 45_000 });
  await page.locator('#login-phone').waitFor({ state: 'visible' });
  await installTourOverlay(page);
  await hold(page, 700);
}

export async function clickSidebarLink(page, href, { wait = true } = {}) {
  const link = page.locator(`a[href="${href}"]`).first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  await clickWithCursor(page, link);
  if (wait) {
    await page.waitForURL((url) => url.pathname === href, {
      timeout: 45_000,
    });
    await page.waitForLoadState('domcontentloaded');
    await installTourOverlay(page);
    await hold(page, 650);
  }
}
