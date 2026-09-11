@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [콘티 짜자] 변경 내용 올리는 중...
git add -A
git commit -m "update %date% %time:~0,5%"
git push
echo.
echo 끝났습니다. 1분 뒤 conti-han-jang.vercel.app 에 반영됩니다.
pause
