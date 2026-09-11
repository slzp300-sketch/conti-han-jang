# 서버 붙이기 (10분)

악보 보관함을 팀이 같이 쓰고, 콘티는 각자 따로 두려면 서버가 필요합니다.
Supabase 무료 플랜을 씁니다. 데이터베이스·로그인·파일 보관이 한 곳에 있어서
지금처럼 빌드 없는 `index.html` 한 장으로도 붙일 수 있습니다.

계정 만들기는 제가 대신 해 드릴 수 없어서, 아래 1~3번만 직접 해 주세요.

## 1. 프로젝트 만들기

1. https://supabase.com 에서 GitHub 계정으로 로그인
2. **New project**
   - Name: `conti-jjaja`
   - Database Password: 아무거나 (적어 두세요, 쓸 일은 거의 없습니다)
   - Region: **Northeast Asia (Seoul)**
3. 2분쯤 기다리면 준비됩니다.

## 2. 표 만들기

왼쪽 **SQL Editor** → **New query** → 이 폴더의 [`schema.sql`](schema.sql) 내용을
통째로 붙여넣고 **Run**.

`Success. No rows returned` 이 나오면 된 겁니다.

## 3. 로그인 설정

왼쪽 **Authentication** → **Sign In / Providers**

- **Email** 이 켜져 있는지 확인 (기본값)
- **Confirm email** 은 켠 채로 둡니다 — 가입을 열어 두었으니 최소한 진짜
  메일 주소인지는 확인하는 게 좋습니다.

**URL Configuration** 에서
- Site URL: `https://conti-han-jang.vercel.app`

## 4. 열쇠 두 개 알려주기

왼쪽 **Project Settings** → **API** 에 있는 두 줄을 저에게 주세요.

- **Project URL** — `https://xxxxxxxx.supabase.co`
- **anon public** 키 — `eyJ...` 로 시작하는 긴 글자

이 둘은 앱에 그대로 박혀 브라우저에 노출되는 값입니다. 원래 그렇게 쓰라고 있는
공개 키라서 괜찮습니다. 실제 잠금은 위 SQL 의 규칙(RLS)이 합니다.

**`service_role` 키는 절대 주지 마세요.** 그건 모든 규칙을 무시하는 열쇠라
앱에 넣으면 안 됩니다.

## 알아 두실 것

- **무료 플랜은 1주일 동안 아무도 안 들어가면 프로젝트가 잠깐 멈춥니다.**
  대시보드에서 버튼 한 번이면 깨어납니다. 주마다 쓰는 콘티라 걸릴 일은 거의
  없습니다. 용량은 파일 1GB · DB 500MB 인데, 지금 악보 98장이 14MB니 넉넉합니다.
- **가입을 공개로 열면 주소를 아는 사람은 누구나 악보 보관함 전체를 봅니다.**
  받아 둔 악보들은 저작권이 있는 것들이라, 팀만 쓰실 거면 나중에라도
  `schema.sql` 맨 아래 주석대로 승인제로 바꾸는 걸 권합니다. SQL 세 줄이고
  앱은 손대지 않아도 됩니다.
- 서버를 붙여도 **로그인 없이 쓰던 방식은 그대로 남습니다.** 인터넷이 없거나
  로그인을 안 하면 지금처럼 이 브라우저에만 저장됩니다.
