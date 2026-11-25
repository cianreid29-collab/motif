import { createServer } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { idPattern, maxBody, publisherPage, readerPolicy, publisherPolicy } from './protocol.mjs';

export function createPublicationServer({atelierOrigin,publisherOrigin,publicOrigin,password,storage}) {
  const publisher=new URL(publisherOrigin), publicSite=new URL(publicOrigin);
  const atelier=new URL(atelierOrigin);
  if (new Set([publisher.host,publicSite.host,atelier.host]).size!==3 ||
      [publisher,publicSite,atelier].some(url=>url.protocol!=='https:'&&url.hostname!=='localhost')) {
    throw Error('Configure trois adresses HTTPS distinctes pour l’atelier, la publication et la lecture.');
  }
  if (!password || password.length<20 || !storage) throw Error('Configure le mot de passe enseignant et le dossier de stockage.');
  const credential=Buffer.from('Basic '+Buffer.from('enseignant:'+password).toString('base64'));
  const json=(res,code,data)=>res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
  const publicFiles=new Map([['index.html','text/html; charset=utf-8'],['index-apercu.jpg','image/jpeg']]);

  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    const path=req.url.split('?',1)[0];
    const host=req.headers.host;
    if (host===publicSite.host && ['GET','HEAD'].includes(req.method)) {
      const [,id,file]=path.split('/');
      if (!idPattern.test(id)||!publicFiles.has(file)||path!=='/'+id+'/'+file) return res.writeHead(404).end();
      try {
        const data=await readFile(join(storage,id,file));
        res.writeHead(200,{'Content-Type':publicFiles.get(file),'Cache-Control':'public, max-age=86400',
          'Content-Security-Policy':readerPolicy});
        return res.end(req.method==='HEAD'?undefined:data);
      } catch { return res.writeHead(404).end(); }
    }
    if (host!==publisher.host) return res.writeHead(404).end();
    const provided=Buffer.from(req.headers.authorization||'');
    if (provided.length!==credential.length||!timingSafeEqual(provided,credential)) {
      return res.writeHead(401,{'WWW-Authenticate':'Basic realm="Publication MOTIF"','Cache-Control':'no-store'}).end('Connexion enseignant');
    }
    if (req.method==='GET'&&path==='/publish') {
      return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
        'Content-Security-Policy':publisherPolicy}).end(publisherPage(atelier.origin,publicSite.origin));
    }
    const id=path.slice('/publish/'.length);
    if (req.method!=='POST'||!path.startsWith('/publish/')||!idPattern.test(id)) return json(res,404,{error:'Adresse inconnue.'});
    if (req.headers.origin!==publisher.origin) return json(res,403,{error:'Origine interdite.'});
    if (!req.headers['content-type']?.startsWith('multipart/form-data;')) return json(res,415,{error:'Format invalide.'});
    let temp;
    try {
      let total=0;
      const chunks=[];
      for await (const chunk of req) {
        total+=chunk.length;
        if (total>maxBody) { json(res,413,{error:'Fiche trop grande.'}); return; }
        chunks.push(chunk);
      }
      const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':req.headers['content-type']}}).formData();
      const html=form.get('html'),cover=form.get('cover');
      if (!(html instanceof File)||!(cover instanceof File)||!html.size||cover.size<3||cover.size>1024*1024||
          html.size>25*1024*1024||html.type!=='text/html'||cover.type!=='image/jpeg') {
        return json(res,400,{error:'Fiche ou miniature invalide.'});
      }
      const jpeg=Buffer.from(await cover.arrayBuffer());
      if (jpeg[0]!==255||jpeg[1]!==216||jpeg[2]!==255) return json(res,400,{error:'Miniature JPEG invalide.'});
      await mkdir(storage,{recursive:true});
      temp=join(storage,'.'+randomUUID());
      await mkdir(temp);
      await Promise.all([
        writeFile(join(temp,'index.html'),Buffer.from(await html.arrayBuffer())),
        writeFile(join(temp,'index-apercu.jpg'),jpeg),
      ]);
      await rename(temp,join(storage,id));
      return json(res,201,{url:new URL('/'+id+'/index.html',publicSite).href});
    } catch {
      return json(res,400,{error:'La fiche n’a pas pu être enregistrée.'});
    } finally {
      if (temp) await rm(temp,{recursive:true,force:true}).catch(()=>{});
    }
  });
}

if (process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const env=process.env;
  createPublicationServer({
    atelierOrigin:env.MOTIF_ATELIER_ORIGIN,publisherOrigin:env.MOTIF_PUBLISHER_ORIGIN,
    publicOrigin:env.MOTIF_PUBLIC_ORIGIN,password:env.MOTIF_PUBLISH_PASSWORD,storage:env.MOTIF_STORAGE,
  }).listen(Number(env.PORT||8880),env.HOST||'127.0.0.1');
}
