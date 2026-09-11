// Drive the real app over a generated low-resolution lead sheet and report what it read.
// Paste into the console on index.html, or eval it: fetch('/dev/e2e.js').then(r=>r.text()).then(eval)
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
  const f = W / BIG_W;
  const small = document.createElement('canvas');
  small.width = W; small.height = Math.round(big.height * f);
  const sx = small.getContext('2d');
  sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
  sx.fillStyle = '#fff'; sx.fillRect(0, 0, small.width, small.height);
  sx.drawImage(big, 0, 0, small.width, small.height);
  return small;
};

window.__run = async function (W) {
  // the app keeps the conti in IndexedDB, so an earlier sheet survives a reload — drop it first
  let guard = 0;
  while (document.querySelector('button.x') && guard++ < 10) {
    document.querySelector('button.x').click();
    await new Promise(r => setTimeout(r, 400));
  }
  const small = window.__sheet(W || 620);
  const blob = await new Promise(r => small.toBlob(r, 'image/png'));
  const input = document.querySelector('.drop input[type=file]');
  const dt = new DataTransfer(); dt.items.add(new File([blob], 'sheet.png', { type: 'image/png' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 1600));
  document.querySelector('button.pick').click();
  await new Promise(r => setTimeout(r, 700));
  [...document.querySelectorAll('button.tab')].find(b => b.title.includes('키 바꾸기')).click();
  await new Promise(r => setTimeout(r, 700));
  document.querySelector('.find').click();
  return 'running';
};

// score the boxes against the truth, grouping by the vertical band each box sits in
window.__score = function () {
  const boxes = [...document.querySelectorAll('.cbox')].map(b => ({
    text: b.title.split(' →')[0].replace(/ \(.*$/, '').trim(),
    flag: b.className.replace('cbox', '').trim(),
    top: +b.style.top.replace('%', ''), left: +b.style.left.replace('%', ''),
  })).sort((a, b) => a.top - b.top || a.left - b.left);
  const sys = [];
  boxes.forEach(b => {
    const g = sys.find(s => Math.abs(s.top - b.top) < 5);
    if (g) g.items.push(b); else sys.push({ top: b.top, items: [b] });
  });
  const truth = window.__truth;
  let hit = 0, want = 0, extra = 0;
  const lines = sys.map((s, i) => {
    const t = truth[i] || [];
    const pool = s.items.map(b => b.text);
    let h = 0;
    t.forEach(c => { const k = pool.indexOf(c); if (k >= 0) { h++; pool.splice(k, 1); } });
    hit += h; want += t.length; extra += pool.length;
    return `${i + 1}단  기대 [${t.join(' ')}]  읽음 [${s.items.map(b => b.text + (b.flag ? '*' : '')).join(' ')}]  → ${h}/${t.length}${pool.length ? ' 잘못 ' + pool.join(',') : ''}`;
  });
  truth.slice(sys.length).forEach((t, i) => { want += t.length; lines.push(`${sys.length + i + 1}단  기대 [${t.join(' ')}]  읽음 [] → 0/${t.length}`); });
  return { total: `${hit}/${want} 맞음, 잘못 읽은 상자 ${extra}개`, lines, status: document.querySelector('.key-status')?.textContent };
};
'e2e loaded';
