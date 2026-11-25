export const idPattern=/^[a-z0-9-]{1,56}-[a-f0-9]{32}$/;
export const maxBody=27*1024*1024;

export function publisherPage(atelierOrigin,publicOrigin) {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Publication MOTIF</title>
  <main><h1>Publication MOTIF</h1><p id="status" role="status">Préparation de la fiche…</p></main>
  <script>
  const atelier=${JSON.stringify(atelierOrigin)};
  const expected=${JSON.stringify(publicOrigin)};
  const message=document.getElementById('status');
  const parentWindow=window.opener;
  if (!parentWindow) message.textContent='Ouvre cette fenêtre depuis le menu Partager de MOTIF.';
  else {
    let publishing=false;
    window.addEventListener('message',async event=>{
      if (publishing||event.origin!==atelier||event.source!==parentWindow||event.data?.type!=='motif-publish') return;
      publishing=true;
      message.textContent='Envoi de la fiche et de sa miniature…';
      const {id,html,cover}=event.data;
      const form=new FormData();
      form.append('html',html,'index.html');
      form.append('cover',cover,'index-apercu.jpg');
      try {
        const response=await fetch('/publish/'+encodeURIComponent(id),{method:'POST',body:form});
        const result=await response.json();
        if (!response.ok) throw Error(result.error);
        if (new URL(result.url).origin!==expected) throw Error('Adresse publique invalide.');
        message.textContent='Fiche en ligne. Tu peux fermer cette fenêtre.';
        parentWindow.postMessage({type:'motif-published',url:result.url},atelier);
      } catch {
        message.textContent='La publication a échoué. Relance-la depuis MOTIF.';
        parentWindow.postMessage({type:'motif-publish-error'},atelier);
      }
    });
    parentWindow.postMessage({type:'motif-publisher-ready'},atelier);
  }
  </script></html>`;
}

export const readerPolicy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; connect-src data: blob:; frame-ancestors *";
export const publisherPolicy="default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'";
