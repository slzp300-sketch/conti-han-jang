// 시험용 저장 서버. 브라우저에서 만든 그림(키를 바꾼 악보 등)을 디스크로 꺼내기 위한 것이다.
// 미리보기 창은 내려받기가 막혀 있고, 데이터 URL 을 결과로 통째로 넘기기에는 너무 크다.
//
//   node dev/save-server.mjs            → http://localhost:5174
//   fetch('http://localhost:5174/save?name=x.png', { method: 'POST', body: blob })
//
// 로컬 개발용이다. 127.0.0.1 에만 바인딩하고, 저장 위치를 samples/out 아래로 묶는다.

import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, normalize } from 'node:path';

const OUT = 'samples/out';
await mkdir(OUT, { recursive: true });

const cors = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

createServer(async (q, s) => {
  if (q.method === 'OPTIONS') { s.writeHead(204, cors); return s.end(); }
  const u = new URL(q.url, 'http://localhost');
  if (q.method !== 'POST' || u.pathname !== '/save') { s.writeHead(404, cors); return s.end('404'); }

  // 이름은 파일 하나로만 받는다 — 경로를 타고 올라가지 못하게
  const name = (u.searchParams.get('name') || 'out.png').replace(/[\\/:*?"<>|]/g, '_');
  const path = join(OUT, name);
  if (!normalize(path).startsWith(normalize(OUT))) { s.writeHead(400, cors); return s.end('bad name'); }

  const chunks = [];
  for await (const c of q) chunks.push(c);
  const buf = Buffer.concat(chunks);
  await writeFile(path, buf);
  console.log(`${path}  ${Math.round(buf.length / 1024)}KB`);
  s.writeHead(200, { ...cors, 'Content-Type': 'text/plain' });
  s.end(path);
}).listen(5174, '127.0.0.1', () => console.log('save server: http://localhost:5174  →  ' + OUT));
