import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function helper(name,next){
  const start=html.indexOf('function '+name+'(');
  const end=html.indexOf('\n'+next,start);
  assert.ok(start>=0&&end>start);
  return runInNewContext('('+html.slice(start,end).trim()+')',{Blob,TextEncoder,URL});
}

test('L’image de partage est un fichier HTTPS placé à côté de la page',()=>{
  const target=helper('webExportTarget','async function exportCover');
  const head=helper('studentShareHead',"$('exportWeb').onclick");
  const page=target('https://demo.github.io/motif/ani-kuni.html');
  assert.equal(page.page,'ani-kuni.html');
  assert.match(head('A & B',page),/A &amp; B/);
  assert.match(head('A',page),/https:\/\/demo\.github\.io\/motif\/ani-kuni-apercu\.jpg/);
  assert.equal(target('https://demo.github.io/motif/').page,'index.html');
  assert.throws(()=>target('http://demo.github.io/motif/'));
});

test('Le ZIP enregistre le contenu, le CRC et le nombre de fichiers',async()=>{
  const zip=helper('webExportZip','function studentShareHead');
  const encoder=new TextEncoder();
  const archive=zip([
    {name:'index.html',data:encoder.encode('123456789')},
    {name:'index-apercu.jpg',data:Uint8Array.from([255,216,255,217])},
  ]);
  const bytes=await archive.arrayBuffer();
  const data=new DataView(bytes);
  const end=bytes.byteLength-22;
  assert.equal(data.getUint32(0,true),0x04034b50);
  assert.equal(data.getUint32(14,true),0xcbf43926);
  assert.equal(data.getUint32(end,true),0x06054b50);
  assert.equal(data.getUint16(end+10,true),2);
  assert.equal(data.getUint32(data.getUint32(end+16,true),true),0x02014b50);
});
