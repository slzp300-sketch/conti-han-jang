// Fetch sheet images for songs you name from worshipleader.tistory.com into ./sheets-inbox,
// saved as "제목 - 키.png" so the app can pick up the name and key when you add them.
//
//   node dev/fetch-sheets.mjs "내 구주 예수님" "주 행하신 위대한 일"
//   node dev/fetch-sheets.mjs --post 799
//   node dev/fetch-sheets.mjs --category C      (a whole key category, ~100 songs)
//
// Named songs or one key category at a time — not the whole blog. Requests are spaced out; files
// that are already there are skipped, so a re-run only picks up what is missing.

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

// walk a key category's paged list and collect its post ids, in order
async function categoryPosts(letter) {
  const cat = `${SITE}/category/${encodeURIComponent(letter + '코드 찬양목록')}`;
  const ids = [];
  for (let page = 1; page <= 40; page++) {
    const html = await (await get(`${cat}?page=${page}`)).text();
    // only the list entries carry data-tiara-plink; a plain href scan also drags in the sidebar's
    // "recent / popular" links, which belong to other categories
    const list = [...html.matchAll(/data-tiara-plink="\/(\d+)"/g)].map(m => m[1]);
    const fresh = [...new Set(list)].filter(id => !ids.includes(id));
    if (!fresh.length) break;
    ids.push(...fresh);
    await sleep(300);
  }
  return ids;
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

if (args[0] === '--category') {
  const letter = (args[1] || 'C').toUpperCase();
  const have = new Set(await readdir(OUT).catch(() => []));
  const ids = await categoryPosts(letter);
  console.log(`${letter}코드 찬양목록: 글 ${ids.length}개\n`);
  let saved = 0, skipped = 0, missed = 0;
  for (const [n, id] of ids.entries()) {
    try {
      const hit = await postSheet(id);
      if (!hit) { missed++; console.log(`  [${n + 1}/${ids.length}] ${id}: 악보 없음`); continue; }
      const key = hit.keys[0] ? ` - ${hit.keys[0]}` : '';
      const ext = hit.url.includes('.jpg') || hit.url.includes('.jpeg') ? 'jpg' : 'png';
      const name = `${safe(hit.song)}${key}.${ext}`;
      if (have.has(name)) { skipped++; console.log(`  [${n + 1}/${ids.length}] ${name} — 이미 있음`); continue; }
      const r = await save(hit);
      saved++; console.log(`  [${n + 1}/${ids.length}] ${r.name} (${r.kb}KB)`);
    } catch (e) { missed++; console.log(`  [${n + 1}/${ids.length}] ${id}: ${e.message}`); }
    await sleep(400);   // the blog is somebody's server, not an API
  }
  console.log(`\n받음 ${saved} · 건너뜀 ${skipped} · 실패 ${missed}`);
} else if (args[0] === '--post') {
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
