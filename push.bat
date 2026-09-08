@echo off
chcp 65001 >nul
rem ============================================================
rem  PC で変えたもの（図鑑の画像など）を GitHub に送る。ダブルクリックするだけ。
rem  送ると数分後に公開サイト https://dhou1magus.github.io/dqmvi-wiki/ に反映される。
rem  初めて使うときは GitHub のログイン画面がブラウザに出ることがある（許可すればよい）。
rem ============================================================
cd /d "%~dp0"
echo [1/4] 変更を集める
git add -A
echo [2/4] 記録する
git commit -m "PC から更新"
echo [3/4] GitHub 側の変更を取り込む
git pull --rebase origin main
echo [4/4] GitHub に送る
git push origin main
echo.
if errorlevel 1 (
  echo ==== 送れませんでした。上のメッセージを Claude に貼ってください ====
) else (
  echo ==== 送りました。数分後にサイトに反映されます ====
)
pause
