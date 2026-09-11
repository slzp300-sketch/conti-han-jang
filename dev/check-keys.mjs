// 받아 둔 악보의 키가 맞는지 블로그 글에서 근거를 찾는다.
//
//   node dev/check-keys.mjs "내구주예수님" "은혜" ...
//
// 한 글에 여러 키가 올라와 있으면 이름에 "(C/A/Bb코드)" 처럼 여러 개가 붙는다.
// 받을 때는 글의 첫 이미지 하나만 가져왔으므로, 여러 키를 단 글에서 받은 악보는
// 이름에 붙은 키와 실제 그림이 어긋날 수 있다. 그런 글을 골라내는 것이 목적이다.

import { readdir } from 'node:fs/promises';

const SITE = 'https://worshipleader.tistory.com';
const UA = { 'User-Agent': 'Mozilla/5.0', Referer: SITE + '/' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const get = async url => {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
};

function parseTitle(raw) {
  const t = raw.replace(/&amp;/g, '&').trim();
  const song = (t.split(/[(\-]/)[0] || t).trim();
  const keys = [...t.matchAll(/([A-G][#b♭♯]?)\s*코드/g)].map(m => m[1].replace('♭', 'b').replace('♯', '#'));
  return { song, keys: [...new Set(keys)], raw: t };
}

// 본문에 이미지가 몇 장인지도 센다 — 여러 장이면 키마다 한 장씩일 가능성이 높다
async function inspect(id) {
  const html = await get(`${SITE}/${id}`);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const imgs = [...html.matchAll(/<img[^>]+src="(https:\/\/(?:blog\.kakaocdn\.net|t1\.daumcdn\.net)\/[^"]+)"/g)];
  return { id, ...parseTitle(title), images: imgs.length };
}

async function findPost(term) {
  const html = await get(`${SITE}/search/${encodeURIComponent(term)}`);
  const ids = [...new Set([...html.matchAll(/href="\/(\d+)"/g)].map(m => m[1]))];
  for (const id of ids.slice(0, 10)) {
    const hit = await inspect(id);
    const squeeze = s => s.replace(/\s/g, '');
    if (squeeze(hit.song).includes(squeeze(term).slice(0, 4))) return hit;
    await sleep(300);
  }
  return null;
}

const terms = process.argv.slice(2);
if (!terms.length) { console.log('쓰기: node dev/check-keys.mjs "곡 제목" ...'); process.exit(1); }

for (const term of terms) {
  try {
    const hit = await findPost(term);
    if (!hit) { console.log(`${term}\t찾지 못함`); continue; }
    const flag = hit.keys.length > 1 ? '  ← 여러 키, 첫 그림만 받았으므로 확인 필요' : '';
    console.log(`${term}\t키 ${hit.keys.join('/') || '없음'}\t그림 ${hit.images}장\t${SITE}/${hit.id}${flag}`);
  } catch (e) { console.log(`${term}\t실패: ${e.message}`); }
  await sleep(500);
}
