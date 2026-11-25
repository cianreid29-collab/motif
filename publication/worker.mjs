import { idPattern, maxBody, publisherPage, readerPolicy, publisherPolicy } from './protocol.mjs';

const maxEntry=25*1024*1024;
const maxCover=1024*1024;
const files=new Map([['index.html','text/html; charset=utf-8'],['index-apercu.jpg','image/jpeg']]);
const reply=(body,status,headers={})=>new Response(body,{status,headers:{
  'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...headers,
}});
const failure=(error,status)=>reply(JSON.stringify({error}),status,{'Content-Type':'application/json'});

async function authorized(request,password) {
  if (typeof password!=='string'||!/^[!-~]{20,}$/.test(password)) return false;
  const encoder=new TextEncoder();
  const [provided,expected]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(request.headers.get('Authorization')||'')),
    crypto.subtle.digest('SHA-256',encoder.encode('Basic '+btoa('enseignant:'+password))),
  ]);
  const a=new Uint8Array(provided), b=new Uint8Array(expected);
  let different=0;
  for (let i=0;i<a.length;i++) different|=a[i]^b[i];
  return different===0;
}

async function store(request,env,id,publicOrigin) {
  if (request.headers.get('Origin')!==env.MOTIF_PUBLISHER_ORIGIN) return failure('Origine interdite.',403);
  const length=Number(request.headers.get('Content-Length'));
  if (!length||length>maxBody) return failure('Fiche trop grande ou taille inconnue.',413);
  if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data;')) return failure('Format invalide.',415);
  let form;
  try { form=await request.formData(); }
  catch { return failure('Fiche ou miniature invalide.',400); }
  const html=form.get('html'), cover=form.get('cover');
  if (!(html instanceof File)||!(cover instanceof File)||!html.size||cover.size<3||cover.size>maxCover||
      html.size+cover.size+4>maxEntry||html.type!=='text/html'||cover.type!=='image/jpeg') {
    return failure('Fiche ou miniature invalide, ou taille totale supérieure à 25 Mio.',400);
  }
  const jpeg=new Uint8Array(await cover.slice(0,3).arrayBuffer());
  if (jpeg[0]!==255||jpeg[1]!==216||jpeg[2]!==255) return failure('Miniature JPEG invalide.',400);
  // Store the HTML and JPEG in one entry so a reader cannot see a half-published document.
  const header=new ArrayBuffer(4);
  new DataView(header).setUint32(0,html.size);
  try {
    if (await env.FICHES.get(id,{type:'stream'})) return failure('Cette adresse existe déjà.',409);
    await env.FICHES.put(id,await new Blob([header,html,cover]).arrayBuffer());
  } catch {
    return failure('Stockage momentanément indisponible. Vérifie le quota gratuit.',503);
  }
  return reply(JSON.stringify({url:publicOrigin+'/'+id+'/index.html'}),201,{'Content-Type':'application/json'});
}

async function publicFile(request,env,path) {
  const [,id,file]=path.split('/');
  if (!idPattern.test(id)||!files.has(file)||path!=='/'+id+'/'+file||!['GET','HEAD'].includes(request.method)) {
    return reply(null,404);
  }
  const entry=await env.FICHES.get(id,{type:'arrayBuffer'});
  if (!entry||entry.byteLength<4) return reply(null,404);
  const split=4+new DataView(entry).getUint32(0);
  if (split<=4||split>=entry.byteLength) return reply(null,404);
  const start=file==='index.html'?4:split;
  const end=file==='index.html'?split:entry.byteLength;
  return reply(request.method==='HEAD'?null:new Uint8Array(entry,start,end-start),200,{
    'Content-Type':files.get(file),'Content-Length':String(end-start),'Cache-Control':'public, max-age=86400',
    'Content-Security-Policy':readerPolicy,
  });
}

export default {
  async fetch(request,env) {
    const {origin,pathname}=new URL(request.url);
    const publisher=env.MOTIF_PUBLISHER_ORIGIN,publicOrigin=env.MOTIF_PUBLIC_ORIGIN,atelier=env.MOTIF_ATELIER_ORIGIN;
    if (!env.FICHES||!publisher?.startsWith('https://')||!publicOrigin?.startsWith('https://')||
        !atelier?.startsWith('https://')||new Set([publisher,publicOrigin,atelier]).size!==3) {
      return reply('Service MOTIF à configurer.',503);
    }
    if (origin===publicOrigin) return publicFile(request,env,pathname);
    if (origin!==publisher) return reply(null,404);
    if (!await authorized(request,env.MOTIF_PUBLISH_PASSWORD)) {
      return reply('Connexion enseignant',401,{'WWW-Authenticate':'Basic realm="Publication MOTIF"'});
    }
    if (request.method==='GET'&&pathname==='/publish') {
      return reply(publisherPage(atelier,publicOrigin),200,{'Content-Type':'text/html; charset=utf-8',
        'Content-Security-Policy':publisherPolicy});
    }
    const id=pathname.slice('/publish/'.length);
    if (request.method!=='POST'||!pathname.startsWith('/publish/')||!idPattern.test(id)) return failure('Adresse inconnue.',404);
    return store(request,env,id,publicOrigin);
  },
};
