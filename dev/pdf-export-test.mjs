// Export six synthetic A4 previews through the same PDF exporter used by the app.
import { readFile, writeFile } from 'node:fs/promises';
import './print-layout-test.mjs';
let html = await readFile(new URL('print-layout-test.html', import.meta.url), 'utf8');
html = html.replace('@media all', '@media print');
html += `<script src="/pdf-export.js"></script><button id="export-test">미리보기 6쪽 PDF 저장</button><script>
document.title = 'PDF export regression: six previews';
document.querySelector('#export-test').addEventListener('click', async () => {
  const button = document.querySelector('#export-test');
  button.disabled = true;
  try {
    const blob = await ContiPDF.create([...document.querySelectorAll('.page')]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'preview-six-pages.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    button.textContent = 'PDF 생성 완료: 6쪽';
  } catch(e) { button.textContent = '실패: ' + e.message; }
  button.disabled = false;
});
</script>`;
await writeFile(new URL('pdf-export-test.html', import.meta.url), html);
console.log('Open http://localhost:5173/dev/pdf-export-test.html and export the six pages');