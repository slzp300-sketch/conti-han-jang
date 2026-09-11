// Fetch sheet images for songs you name from worshipleader.tistory.com into ./sheets-inbox,
// saved as "제목 - 키.png" so the app can pick up the name and key when you add them.
//
//   node dev/fetch-sheets.mjs "내 구주 예수님" "주 행하신 위대한 일"
//   node dev/fetch-sheets.mjs --post 799
//
// One song at a time on purpose: the blog has ~800 posts, and mirroring all of them would hammer
// someone else's server and bury your archive in sheets you will never sing.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'sheets-inbox';
const SITE = 'https://worshipleader.tistory.com';
const UA = { 'User-Agent': 'Mozilla/5.0', 'Referer': SITE + '/' };

const get = async url => {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r;
};

// the post title reads like "곡이름(가사/악보/영상)-아티스트(A코드)" — pull the song and the key out
function parseTitle(raw) {
  const t = raw.replace(/&amp;/g, '&').trim();
  const song = (t.split(/[(\-]/)[0] || t).trim();
  const keys = [...t.matchAll(/([A-G][#b♭♯]?)\s*코드/g)].map(m => m[1].replace('♭', 'b').replace('♯', '#'));
  return { song, keys: [...new Set(keys)] };
}

async function postSheet(id) {
  const html = await (await get(`${SITE}/${id}`)).text();
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || `post-${id}`;
  // the entry images are signed kakaocdn URLs; the first one in the article is the sheet
  const urls = [...html.matchAll(/https:\/\/blog\.kakaocdn\.net\/[^"'\s\\]+\.(?:png|jpg|jpeg)\?[^"'\s\\]+/g)]
    .map(m => m[0].replace(/&amp;/g, '&'));
  if (!urls.length) return null;
  return { id, ...parseTitle(title), url: urls[0] };
}

async function findPosts(term) {
  const html = await (await get(`${SITE}/search/${encodeURIComponent(term)}`)).text();
  const ids = [...new Set([...html.matchAll(/href="\/(\d+)"/g)].map(m => m[1]))];
  // the search page also links the blog's own notice posts; keep the ones whose title mentions 악보
  const out = [];
  for (const id of ids.slice(0, 12)) {
    const hit = await postSheet(id);
    if (hit && hit.song.replace(/\s/g, '').includes(term.replace(/\s/g, '').slice(0, 4))) out.push(hit);
    if (out.length >= 3) break;
  }
  return out;
}

const safe = s => s.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();

async function save(hit) {
  const buf = Buffer.from(await (await get(hit.url)).arrayBuffer());
  const key = hit.keys[0] ? ` - ${hit.keys[0]}` : '';
  const ext = hit.url.includes('.jpg') || hit.url.includes('.jpeg') ? 'jpg' : 'png';
  const name = `${safe(hit.song)}${key}.${ext}`;
  await writeFile(join(OUT, name), buf);
  return { name, kb: Math.round(buf.length / 1024) };
}

const args = process.argv.slice(2);
if (!args.length) { console.log('쓰기: node dev/fetch-sheets.mjs "곡 제목" ["다른 곡" ...]  |  --post 799'); process.exit(1); }
await mkdir(OUT, { recursive: true });

if (args[0] === '--post') {
  for (const id of args.slice(1)) {
    const hit = await postSheet(id);
    if (!hit) { console.log(`${id}: 악보 이미지를 찾지 못했습니다`); continue; }
    const r = await save(hit);
    console.log(`${id}: ${r.name} (${r.kb}KB)`);
  }
} else {
  for (const term of args) {
    const hits = await findPosts(term);
    if (!hits.length) { console.log(`"${term}": 찾지 못했습니다`); continue; }
    for (const hit of hits) {
      const r = await save(hit);
      console.log(`"${term}" → ${r.name} (${r.kb}KB)  ${SITE}/${hit.id}`);
    }
  }
}
console.log(`\n${OUT}/ 에 저장했습니다. 곡 카드의 악보 넣기에서 한꺼번에 고르면 제목과 키가 따라 들어갑니다.`);
