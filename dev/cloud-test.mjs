// index.html 을 그대로 복사하면서 서버 자리만 가짜로 바꿔 dev/cloud-test.html 을 만든다.
// 앱 코드에 시험용 갈래를 두지 않으려는 것이다. 돌릴 때마다 새로 만드니 원본과 어긋나지 않는다.
//
//   node dev/cloud-test.mjs        →  http://localhost:5173/dev/cloud-test.html
//
// 진짜 서버를 붙인 뒤에도 이 파일은 그대로 쓸 수 있다. 인터넷 없이 로그인·동기화 흐름만
// 확인할 때 쓴다.

import { readFile, writeFile } from 'node:fs/promises';

const src = await readFile('index.html', 'utf8');

const swaps = [
  // 실제 열쇠가 들어 있든 비어 있든 가짜 서버로 바꾼다 — 시험이 진짜 서버를 건드리면 안 된다
  [/const CLOUD = \{[^}]*\};/,
   "const CLOUD = { url: 'http://mock.local', anon: 'mock-anon-key' };"],
  [/const SB_LIB = '[^']*';/,
   "const SB_LIB = '/dev/mock-supabase.js';"],
];

let out = src;
for (const [re, to] of swaps) {
  if (!re.test(out)) { console.error(`찾지 못했습니다: ${re}`); process.exit(1); }
  out = out.replace(re, to);
}

await writeFile('dev/cloud-test.html', out);
console.log('dev/cloud-test.html 을 만들었습니다 → http://localhost:5173/dev/cloud-test.html');
