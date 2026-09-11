# dev — 코드 인식 벤치

키 바꾸기(♯) OCR을 손볼 때 쓰는 측정 도구다. 앱에는 포함되지 않고, 배포에도 영향이 없다.

CDN(tesseract.js)을 쓰기 때문에 파일을 직접 열지 말고 로컬 서버로 열어야 한다.

```bash
node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((q,s)=>{const f=path.join(process.cwd(),q.url==='/'?'/index.html':decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end('404')}s.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':'application/octet-stream','Cache-Control':'no-store'});s.end(d)})}).listen(5173,()=>console.log('http://localhost:5173'))"
```

`.claude/launch.json`의 `conti` 설정도 같은 서버를 띄운다.

| 파일 | 무엇을 재나 |
| --- | --- |
| `ocr-bench.html` | 확대·전처리 방식(smooth / 단계적 / nearest+샤픈 / Sauvola) × PSM |
| `ocr-bench2.html` | 띠 전체 vs 코드행만 크롭 × PSM 6·7·11·13 — 가사가 섞인 현실 조건 |
| `ocr-bench3.html` | 확대 목표(40·56·72px)와 세 시야 앙상블 투표 |
| `ocr-bench4.html` | 한 장 안에서 같은 모양 코드끼리 교차 투표 |
| `ocr-bench5.html` | 실제 페이지에서 띠를 떼고 코드행을 자르는 과정을 눈으로 확인 |
| `e2e.js` | 앱 UI를 그대로 몰아서 돌리고 채점 |

벤치 1~4는 악보를 생성해서 쓴다. 코드 글자 높이(cap)를 7·9·12px로 두는데, 이게 저해상도 캡처에서 실제로 나오는 크기다.

`e2e.js`는 `index.html`을 연 상태에서:

```js
fetch('/dev/e2e.js').then(r => r.text()).then(eval)
await __run(620)   // 가로 620px 악보를 넣고 코드 찾기까지 실행
__score()          // 기대값과 대조
```

앱이 콘티를 IndexedDB에 저장하므로 `__run`은 먼저 기존 악보를 지운다. 이걸 빼먹으면 재로딩해도 **직전 이미지가 계속 쓰여서** 해상도를 바꾼 게 반영되지 않는다.

측정 결과와 버린 시도는 `../CLAUDE.md`에 정리돼 있다.
