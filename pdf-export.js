// A preview article becomes exactly one PDF page. Browser print pagination is never involved.
(() => {
  let libraries;
  const script = src => new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src; el.onload = resolve; el.onerror = () => reject(new Error('PDF 도구를 불러오지 못했습니다. 다시 시도해 주세요.'));
    document.head.appendChild(el);
  });
  async function create(pages, onProgress = () => {}) {
    if (!pages.length) throw new Error('PDF로 저장할 곡을 먼저 추가해 주세요.');
    if (!libraries) libraries = Promise.all([
      script('/vendor/html2canvas-1.4.1.min.js'), script('/vendor/jspdf-4.2.1.umd.min.js')
    ]).catch(e => { libraries = null; throw e; });
    await libraries;
    await document.fonts?.ready;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:210mm;z-index:-10000;pointer-events:none;background:white;';
    // Freeze every page before yielding so edits during export cannot mix different layouts.
    const snapshots = pages.map(page => page.cloneNode(true));
    document.body.appendChild(host);
    try {
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      for (let i = 0; i < snapshots.length; i++) {
        onProgress(i + 1, snapshots.length);
        const page = snapshots[i];
        page.style.boxShadow = 'none';
        host.replaceChildren(page);
        await Promise.all([...page.querySelectorAll('img')].map(async img => {
          await img.decode();
          if (!img.naturalWidth) throw new Error('악보를 읽지 못했습니다. 다시 넣고 시도해 주세요.');
        }));
        const canvas = await window.html2canvas(page, {
          scale: 2.5, backgroundColor: '#fff', logging: false, useCORS: true,
          windowWidth: 1200, windowHeight: 1200, scrollX: 0, scrollY: 0,
          onclone: async doc => { await doc.fonts?.ready; }
        });
        if (i) pdf.addPage('a4', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', .98), 'JPEG', 0, 0, 210, 297);
        canvas.width = canvas.height = 0; // Release each full-resolution canvas on phones.
      }
      return pdf.output('blob');
    } finally { host.remove(); }
  }
  window.ContiPDF = { create };
})();