// 키 바꾸기를 시험하기 위한 사본을 만든다. 앱에서는 꺼 둔 기능이라 켠 판이 따로 필요하다.
// 서버도 떼어 낸다 — 시험하다 팀 보관함에 악보가 쌓이면 안 된다.
//
//   node dev/key-test.mjs   →  http://localhost:5173/dev/key-test.html
//
// 돌릴 때마다 index.html 에서 새로 만드니 원본과 어긋나지 않는다.

import { readFile, writeFile } from 'node:fs/promises';

const src = await readFile('index.html', 'utf8');

const swaps = [
  [/const KEY_CHANGE_ON = false;/, 'const KEY_CHANGE_ON = true;'],
  [/const CLOUD = \{[^}]*\};/, "const CLOUD = { url: '', anon: '' };"],
  // 인식 속을 들여다보려고 내부 함수를 창에 걸어 둔다. 시험 사본에만 있다.
  ['  // ---------- editor rendering ----------',
   '  window.__dbg = { findChords, parseChord, splitGlued, cropChordRow, findStaves, wordsToTokens, mergeRuns };\n  // ---------- editor rendering ----------'],
];

let out = src;
for (const [find, to] of swaps) {
  const hit = typeof find === 'string' ? out.includes(find) : find.test(out);
  if (!hit) { console.error(`찾지 못했습니다: ${find}`); process.exit(1); }
  out = out.replace(find, to);
}

await writeFile('dev/key-test.html', out);
console.log('dev/key-test.html 을 만들었습니다 → http://localhost:5173/dev/key-test.html');
