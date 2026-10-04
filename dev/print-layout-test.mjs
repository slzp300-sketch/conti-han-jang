// Generate a local browser regression fixture using the app's actual print CSS and fitting code.
// node dev/print-layout-test.mjs -> http://localhost:5173/dev/print-layout-test.html
import { readFile, writeFile } from 'node:fs/promises';
const app = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = app.match(/<style>([\s\S]*?)<\/style>/)[1].replace('@media print', '@media all');
const sheets = app.slice(app.indexOf('  function fitSheets(root)'), app.indexOf('  // tell the open crop panel'));
const forms = app.slice(app.indexOf('  const FORM_MAX_PT'), app.indexOf('  // ---------- image intake ----------'));
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400"><rect width="800" height="1400" fill="white"/><path d="M20 100H780M20 350H780M20 600H780M20 850H780M20 1100H780M20 1350H780" stroke="black" stroke-width="4"/></svg>');
const bar = '<div class="form-bar"><div class="lab">Song Form</div><div class="txt">V-C-V-C-B-C</div></div>';
const block = (ratio, withBar = true) => `<div class="block" data-ratio="${ratio}" data-scale="1">${withBar ? bar : ''}<div class="sheet"><img src="${image}" style="aspect-ratio:1/${ratio}"></div></div>`;
const pages = [block(1.75), block(2.5), block(1.75) + block(1.75), block(1.75) + block(1.75, false), block(.5), block(3)].map(b => `<article class="page">${b}</article>`).join('');
const js = sheets + forms + `
const root = document.querySelector('.pages');
fitFormBars(root); fitSheets(root);
window.printLayoutResult = [...root.children].map(page => {
  const rect = page.getBoundingClientRect();
  const children = [...page.querySelectorAll('.block')];
  const bottom = Math.max(...children.map(b => b.getBoundingClientRect().bottom));
  return { height: rect.height, width: rect.width, display: getComputedStyle(page).display,
    contentFits: bottom <= rect.bottom, a4Fits: rect.height <= 297 * 96 / 25.4,
    breakBefore: getComputedStyle(page).breakBefore };
});
window.printLayoutPass = printLayoutResult.length === 6 && printLayoutResult.every((r,i) => r.a4Fits && r.contentFits && r.display === 'block' && (!i || r.breakBefore === 'page'));
document.title = printLayoutPass ? 'PASS: 6 print layouts' : 'FAIL: print layout';
`;
await writeFile(new URL('print-layout-test.html', import.meta.url), `<!doctype html><meta charset="utf-8"><style>${css}</style><div class="app"><section class="preview"><div class="fit"><div class="pages">${pages}</div></div></section></div><script>${js}</script>`);
console.log('Open http://localhost:5173/dev/print-layout-test.html — title must say PASS: 6 print layouts');