import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createPublicationServer } from '../publication/server.mjs';

test('Un enseignant publie les deux fichiers et le lecteur ouvre le lien sans identifiants',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'motif-publication-'));
  const password='motif-test-password-only';
  const publisherOrigin='https://publier.example.test';
  const publicOrigin='https://lire.example.test';
  const server=createPublicationServer({
    atelierOrigin:'https://atelier.example.test',publisherOrigin,publicOrigin,password,storage:directory,
  });
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  async function call(path,{method='GET',headers={},body}={}) {
    const multipart=body&&new Response(body);
    const data=multipart&&Buffer.from(await multipart.arrayBuffer());
    return new Promise((resolve,reject)=>{
      const req=request({hostname:'127.0.0.1',port:server.address().port,path,method,
        headers:{...headers,...(data?{'Content-Type':multipart.headers.get('content-type'),'Content-Length':data.length}:{})}},res=>{
        const chunks=[];
        res.on('data',chunk=>chunks.push(chunk));
        res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));
        res.on('error',reject);
      });
      req.on('error',reject);
      req.end(data||undefined);
    });
  }
  const id='ani-kuni-0123456789abcdef0123456789abcdef';
  const credentials='Basic '+Buffer.from('enseignant:'+password).toString('base64');
  const form=new FormData();
  const html='<!doctype html><title>Ani Kuni</title>';
  const image=Uint8Array.from([255,216,255,217]);
  form.append('html',new Blob([html],{type:'text/html'}),'index.html');
  form.append('cover',new Blob([image],{type:'image/jpeg'}),'index-apercu.jpg');
  const publishHost=new URL(publisherOrigin).host, publicHost=new URL(publicOrigin).host;
  try {
    const challenge=await call('/publish',{headers:{Host:publishHost}});
    assert.equal(challenge.status,401);
    await challenge.text();
    const session=await call('/publish',{headers:{Host:publishHost,Authorization:credentials}});
    assert.match(await session.text(),/motif-publisher-ready/);
    const send=origin=>call('/publish/'+id,{method:'POST',body:form,
      headers:{Host:publishHost,Origin:origin,Authorization:credentials}});
    const crossOrigin=await send(publicOrigin);
    assert.equal(crossOrigin.status,403);
    await crossOrigin.text();
    const publication=await send(publisherOrigin);
    assert.equal(publication.status,201);
    const {url}=await publication.json();
    assert.equal(url,publicOrigin+'/'+id+'/index.html');
    const page=await call(new URL(url).pathname,{headers:{Host:publicHost}});
    assert.equal(await page.text(),html);
    const cover=await call('/'+id+'/index-apercu.jpg',{headers:{Host:publicHost}});
    assert.equal(cover.headers.get('content-type'),'image/jpeg');
    assert.deepEqual(new Uint8Array(await cover.arrayBuffer()),image);
    const repeated=await send(publisherOrigin);
    assert.equal(repeated.status,400);
    await repeated.json();
    const publicPost=await call('/publish/'+id,{method:'POST',headers:{Host:publicHost}});
    assert.equal(publicPost.status,404);
  } finally {
    server.close();
    await once(server,'close');
    await rm(directory,{recursive:true,force:true});
  }
});

test('Le Worker gratuit stocke la fiche et sa miniature dans une seule entrée KV',async()=>{
  const {default:worker}=await import('../publication/worker.mjs');
  const values=new Map();
  const env={
    MOTIF_ATELIER_ORIGIN:'https://atelier.example.test',
    MOTIF_PUBLISHER_ORIGIN:'https://publier.example.test',
    MOTIF_PUBLIC_ORIGIN:'https://lire.example.test',
    MOTIF_PUBLISH_PASSWORD:'test-password-for-motif-only',
    FICHES:{
      get:async key=>values.get(key)||null,
      put:async(key,value)=>values.set(key,await new Response(value).arrayBuffer()),
    },
  };
  const publisher=env.MOTIF_PUBLISHER_ORIGIN, reader=env.MOTIF_PUBLIC_ORIGIN;
  const id='test-0123456789abcdef0123456789abcdef';
  const authorization='Basic '+btoa('enseignant:'+env.MOTIF_PUBLISH_PASSWORD);
  assert.equal((await worker.fetch(new Request(publisher+'/publish'),env)).status,401);
  const form=new FormData();
  form.append('html',new Blob(['<title>Test MOTIF</title>'],{type:'text/html'}),'index.html');
  form.append('cover',new Blob([Uint8Array.of(255,216,255,217)],{type:'image/jpeg'}),'index-apercu.jpg');
  const packed=new Response(form);
  const data=await packed.arrayBuffer();
  const send=origin=>worker.fetch(new Request(publisher+'/publish/'+id,{method:'POST',body:data,headers:{
    Authorization:authorization,Origin:origin,'Content-Length':data.byteLength,'Content-Type':packed.headers.get('Content-Type'),
  }}),env);
  assert.equal((await send(reader)).status,403);
  const result=await send(publisher);
  assert.equal(result.status,201);
  assert.equal(values.size,1);
  const {url}=await result.json();
  assert.equal(await (await worker.fetch(new Request(url),env)).text(),'<title>Test MOTIF</title>');
  const image=await worker.fetch(new Request(reader+'/'+id+'/index-apercu.jpg'),env);
  assert.equal(image.headers.get('Content-Type'),'image/jpeg');
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()),Uint8Array.of(255,216,255,217));
  assert.equal((await send(publisher)).status,409);
});
