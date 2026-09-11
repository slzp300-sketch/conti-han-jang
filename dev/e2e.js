// Drive the real app over a sheet and score what it read.
// On index.html:  fetch('/dev/e2e.js').then(r=>r.text()).then(eval)
//   await __run(620)                              generated sheet, 620px wide
//   await __runURL('/samples/a.png', 640, 'ju')   real scan, shrunk to 640px
//   __score()

// ---- ground truth: the chord row above each staff, in order ----
window.__truths = {
  // 주 행하신 위대한 일 (G)
  ju: [
    ['G', 'D', 'Em7', 'C'],
    ['G', 'D', 'Em7', 'C', 'G'],
    ['D', 'Em7', 'C', 'Em7'],
    ['C', 'G', 'D', 'Em7'],
    ['C', 'G', 'D', 'Em7', 'C'],
    ['G', 'D', 'Em7', 'C'],
  ],
  // 내 구주 예수님 / Shout to the Lord (A)
  nae: [
    ['A', 'E', 'F#m7', 'E', 'D'],
    ['A/C#', 'D', 'A/E', 'F#m7', 'G', 'Bm7/F#', 'Esus4', 'E7'],
    ['A/C#', 'D', 'A/E', 'F#m7', 'G', 'Bm7/F#', 'Esus4', 'E7'],
    ['A', 'F#m7', 'D', 'Esus4', 'E7', 'A', 'F#m7', 'Dmaj7', 'Esus4', 'E7'],
    ['F#m7', 'D', 'E', 'F#m', 'E/G#', 'E7'],
    ['A', 'F#m7', 'D', 'Esus4', 'E7', 'A', 'F#m7', 'Dmaj7', 'Esus4', 'E7'],
    ['F#m7', 'D', 'E7', 'A', 'D2/A', 'A'],
  ],
};

// ---- a generated sheet, for regression checks without any file ----
window.__sheet = function (W) {
  const BIG_W = 1600, g = 13, FS = 30;
  const SYS = [
    { ch: ['G', 'D', 'Em7', 'C'],       ly: '주 따르며지 - 나 온 - 순간의 -   승리와수 -많 은-실 - 수 -' },
    { ch: ['G', 'D', 'Em7', 'C', 'G'],  ly: '저 하늘위무 - 지 개 - 천국의 -  소망과언 -약 의-증 - 거 -' },
    { ch: ['C', 'G', 'D', 'Em7'],       ly: '벅 찬가슴으로  -    더 큰목소리로 -' },
    { ch: ['G', 'D', 'Em7', 'C'],       ly: '기 뻐-하 - 며   노래-하 - 라  주 여-기 -계시네 -' },
  ];
  window.__truth = SYS.map(s => s.ch);
  const rowH = g * 14;
  const big = document.createElement('canvas');
  big.width = BIG_W; big.height = rowH * SYS.length + g * 6;
  const x = big.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, big.width, big.height);
  x.textBaseline = 'alphabetic';
  SYS.forEach((s, i) => {
    const top = g * 3 + i * rowH, usable = BIG_W - g * 12;
    x.fillStyle = '#000'; x.font = `bold ${FS}px "Times New Roman", serif`;
    s.ch.forEach((t, k) => x.fillText(t, g * 6 + k * usable / s.ch.length, top));
    x.strokeStyle = '#000'; x.lineWidth = 1.2;
    for (let L = 0; L < 5; L++) { const yy = top + g * 1.6 + L * g; x.beginPath(); x.moveTo(g * 2, yy); x.lineTo(BIG_W - g * 2, yy); x.stroke(); }
    x.fillStyle = '#000';
    for (let n = 0; n < 14; n++) {
      const nx = g * 6 + n * (usable / 14), ny = top + g * 1.6 + (n % 5) * g * 0.5 + g;
      x.beginPath(); x.ellipse(nx, ny, g * 0.42, g * 0.32, -0.3, 0, 7); x.fill();
      x.beginPath(); x.moveTo(nx + g * 0.4, ny); x.lineTo(nx + g * 0.4, ny - g * 2.6); x.lineWidth = 1.4; x.stroke();
    }
    x.font = `${FS * 0.72}px "Malgun Gothic", sans-serif`;
    x.fillText(s.ly, g * 6, top + g * 9.2);
  });
  return shrink(big, W);
};

function shrink(src, W) {
  const f = W / src.width;
  const c = document.createElement('canvas');
  c.width = W; c.height = Math.round(src.height * f);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// the app keeps the conti in IndexedDB, so an earlier sheet survives a reload — drop it first,
// otherwise every run silently re-reads the first image you ever added
async function clearSheets() {
  let guard = 0;
  while (document.querySelector('button.x') && guard++ < 12) {
    document.querySelector('button.x').click();
    await new Promise(r => setTimeout(r, 400));
  }
}
async function feed(canvas) {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const input = document.querySelector('.drop input[type=file]');
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'sheet.png', { type: 'image/png' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1800));
  document.querySelector('button.pick').click();
  await new Promise(r => setTimeout(r, 700));
  [...document.querySelectorAll('button.tab')].find(b => b.title.includes('키 바꾸기')).click();
  await new Promise(r => setTimeout(r, 700));
  document.querySelector('.find').click();
  return { w: canvas.width, h: canvas.height };
}

window.__run = async function (W) {
  await clearSheets();
  return feed(window.__sheet(W || 620));
};

// load a real scan, shrink it to `W`, and run the app over it
window.__runURL = async function (url, W, truthKey) {
  await clearSheets();
  window.__truth = window.__truths[truthKey] || [];
  const img = await new Promise((res, rej) => { const p = new Image(); p.onload = () => res(p); p.onerror = rej; p.src = url; });
  const full = document.createElement('canvas');
  full.width = img.width; full.height = img.height;
  full.getContext('2d').drawImage(img, 0, 0);
  return feed(W && W < img.width ? shrink(full, W) : full);
};

// The app asks the user to confirm the sheet's own key, and repairForKey leans on it. Setting it is
// part of normal use, so measure with it set as well as with the auto guess.
window.__setFromKey = async function (k) {
  const sel = document.querySelector('.key-row select');
  sel.value = k;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  return sel.value;
};

// score the boxes against the truth, grouping boxes into rows by their vertical position
window.__score = function () {
  // a corrected box reads "raw → final (왜 고쳤는지)"; an untouched one reads "text → 전조결과".
  // Score the final reading, not the raw one.
  const finalText = title => {
    const m = title.match(/^(.+?) → (.+?) \((?:키에 맞춰 고침|같은 모양의 코드에 맞춰 고침)\)/);
    const t = m ? m[2] : title.split(' →')[0];
    return t.replace(/\s*\(읽을 수 없음[^)]*\)\s*$/, '').trim();
  };
  const boxes = [...document.querySelectorAll('.cbox')].map(b => ({
    text: finalText(b.title),
    flag: b.className.replace('cbox', '').trim(),
    top: +b.style.top.replace('%', ''), left: +b.style.left.replace('%', ''),
  }));
  boxes.sort((a, b) => a.top - b.top);
  const rows = [];
  boxes.forEach(b => {
    const g = rows.find(r => Math.abs(r.top - b.top) < 2.5);
    if (g) { g.items.push(b); g.top = (g.top * (g.items.length - 1) + b.top) / g.items.length; }
    else rows.push({ top: b.top, items: [b] });
  });
  rows.sort((a, b) => a.top - b.top);
  rows.forEach(r => r.items.sort((a, b) => a.left - b.left));
  const truth = window.__truth || [];
  let hit = 0, want = 0, extra = 0;
  const lines = [];
  const n = Math.max(rows.length, truth.length);
  for (let i = 0; i < n; i++) {
    const t = truth[i] || [], got = rows[i] ? rows[i].items.map(b => b.text) : [];
    const pool = got.slice();
    let h = 0;
    t.forEach(c => { const k = pool.indexOf(c); if (k >= 0) { h++; pool.splice(k, 1); } });
    hit += h; want += t.length; extra += pool.length;
    lines.push(`${i + 1}단  기대 [${t.join(' ')}]  읽음 [${got.join(' ')}]  → ${h}/${t.length}${pool.length ? '  잘못: ' + pool.join(',') : ''}`);
  }
  return {
    total: `${hit}/${want} 맞음 (${want ? Math.round(hit / want * 100) : 0}%), 잘못 읽은 상자 ${extra}개`,
    rows: rows.length, lines,
    status: document.querySelector('.key-status')?.textContent,
  };
};
'e2e loaded';
