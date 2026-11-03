/**
 * November is outside the marketing timeline: the recorded fixture is dated in
 * October 2026 and every screen must agree with the numbers from that month.
 * The dashboard and the platform statistics both draw a year/month chart whose
 * axis always ends in "نوفمبر" (it is generated from the calendar, not from the
 * data), so the offending panel is hidden before the clip starts - exactly like
 * a month filter is pinned. Nothing is claimed about those charts on camera.
 */

/**
 * Every rendered text node that contains the word, ignoring hidden elements and
 * the <option> labels of a closed <select> (an unopened list is not on screen).
 */
export function novemberNodes(page) {
  return page.evaluate(() => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue.includes('نوفمبر')) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('select')) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (parent.getClientRects().length === 0) continue;
      hits.push(node.nodeValue.trim());
    }
    return hits;
  });
}

/**
 * Hides the panels that carry the word. `section` covers the dashboard charts;
 * `div.rounded-2xl` covers the platform statistics revenue card.
 */
export async function hideNovemberPanels(page) {
  return page.evaluate(() => {
    const hidden = [];
    for (const selector of ['section', 'div.rounded-2xl']) {
      for (const element of document.querySelectorAll(selector)) {
        if (!element.innerText || !element.innerText.includes('نوفمبر')) continue;
        element.style.display = 'none';
        hidden.push(element.tagName);
      }
    }
    return hidden;
  });
}

/**
 * Hides one rendered panel by the text it contains. Used for the empty-state
 * attendance card of the current week: it has no data for this fixture, and an
 * empty-state sentence has no place in the closing recap. The card is not
 * claimed anywhere on camera.
 */
export async function hidePanelContaining(page, text) {
  return page.evaluate((needle) => {
    const hidden = [];
    for (const element of document.querySelectorAll('section, div.rounded-2xl')) {
      if (!element.innerText || !element.innerText.includes(needle)) continue;
      element.style.display = 'none';
      hidden.push(element.tagName);
    }
    return hidden;
  }, text);
}
