import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function helper(name,next){
  const index=html.indexOf('function '+name+'(');
  const start=html.lastIndexOf('\n',index)+1;
  const end=html.indexOf('\n'+next,start);
  assert.ok(index>=0&&end>start);
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

test('Le dépôt des deux fichiers utilise un seul commit et récupère un changement simultané',async()=>{
  const commitFiles=helper('commitDemoFiles','async function demoBase64');
  let head='first', treeCount=0, branchUpdates=0;
  const blobs=[];
  const request=async(token,path,method,body)=>{
    assert.equal(token,'mock');
    if (path==='/git/blobs') {
      assert.equal(method,'POST');
      blobs.push(body.content);
      return {sha:'blob'+blobs.length};
    }
    if (path==='/git/ref/heads/main') return {object:{sha:head}};
    if (path.startsWith('/git/commits/')) return {tree:{sha:'tree-'+head}};
    if (path==='/git/trees') {
      assert.equal(body.base_tree,'tree-'+head);
      assert.deepEqual(Array.from(body.tree,entry=>entry.path),
        ['fiches/ani-kuni.html','fiches/ani-kuni-apercu.jpg']);
      assert.equal(body.tree[0].sha,'blob1');
      assert.equal(body.tree[1].sha,'blob2');
      return {sha:'publication-tree-'+ ++treeCount};
    }
    if (path==='/git/commits') {
      assert.equal(body.parents[0],head);
      return {sha:'publication-'+treeCount};
    }
    assert.equal(path,'/git/refs/heads/main');
    assert.equal(method,'PATCH');
    assert.equal(body.force,false);
    branchUpdates++;
    if (branchUpdates===1) {
      head='parallel';
      throw Object.assign(Error('Conflit'),{status:422});
    }
    assert.equal(body.sha,'publication-2');
  };
  await commitFiles('mock',[
    {name:'ani-kuni.html',content:'PGh0bWw+'},
    {name:'ani-kuni-apercu.jpg',content:'/9j/'},
  ],request);
  assert.deepEqual(blobs,['PGh0bWw+','/9j/']);
  assert.equal(branchUpdates,2);
});
