# 콘티 한 장

Covenant 찬양팀 콘티 편집 페이지. 서버 없이 `index.html` 하나로 동작하는 정적 사이트입니다.

## 배포 (Vercel + GitHub)

1. 이 폴더에서 터미널을 열고:
   ```
   git init
   git add .
   git commit -m "콘티 한 장 첫 배포"
   ```
2. GitHub에서 새 저장소(예: `conti-han-jang`)를 만들고, 안내에 나오는 두 줄을 실행:
   ```
   git remote add origin https://github.com/<아이디>/conti-han-jang.git
   git push -u origin main
   ```
   (브랜치 이름이 `master`로 잡히면 `git branch -M main` 먼저)
3. vercel.com → Add New… → Project → 방금 만든 저장소 Import
   - Framework Preset: **Other**
   - Build Command / Output Directory: 비워 두기
   - Deploy
4. 이후엔 `index.html`을 바꾸고 `git commit` → `git push` 하면 자동으로 다시 배포됩니다.

## 참고

- 콘티 데이터는 각자 브라우저(IndexedDB)에 저장됩니다. 서버에는 아무것도 남지 않습니다.
- 키 바꾸기(코드 인식)는 tesseract.js를 CDN에서 불러옵니다. 배포된 사이트에서 동작합니다.
