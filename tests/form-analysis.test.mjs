import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

// The atelier ships as one HTML file. Run the actual worker algorithm
// without a browser or an additional copy of its code.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function analysisFrames(');
const end = html.indexOf('\nconst form93', start);
assert.ok(start >= 0 && end > start, 'Le code de l’analyse doit être présent dans l’atelier');
const {analyse93:analyse,findReprises,nearbyBoundaries} = runInNewContext(html.slice(start,end) + '\n({analyse93,findReprises,nearbyBoundaries})');

const sampleRate = 11025;
const sectionSeconds = 14;

function tones(frequencies) {
  const sectionLength = sampleRate * sectionSeconds;
  return Float32Array.from({length:sectionLength * frequencies.length}, (_, index) => {
    const frequency = frequencies[Math.floor(index / sectionLength)];
    return .4 * Math.sin(2 * Math.PI * frequency * index / sampleRate);
  });
}

test('Une partie qui revient après une partie différente retrouve sa famille', () => {
  const sections = Array.from(analyse(tones([220, 660, 220]), sampleRate, 'medium'));
  assert.deepEqual(sections.map(section => section.name), ['A', 'B', 'A']);
  assert.equal(sections[0].group, sections[2].group);
  assert.notEqual(sections[0].group, sections[1].group);
  assert.equal(sections[0].start, 0);
  assert.equal(sections.at(-1).end, 3 * sectionSeconds);
  for (let index = 1; index < sections.length; index++) {
    assert.equal(sections[index - 1].end, sections[index].start);
    assert.ok(Math.abs(sections[index].start - index * sectionSeconds) < 1);
  }
});

test('Un signal homogène ne crée pas de frontières artificielles', () => {
  const sections = Array.from(analyse(tones([220, 220, 220]), sampleRate, 'medium'));
  assert.equal(sections.length, 1);
  assert.equal(sections[0].end, 3 * sectionSeconds);
});

test('Un audio très court reste entièrement couvert par une section', () => {
  const sections = Array.from(analyse(new Float32Array(sampleRate), sampleRate, 'fine'));
  assert.equal(sections.length, 1);
  assert.equal(sections[0].start, 0);
  assert.equal(sections[0].end, 1);
});

test('Le pré-découpage conserve les intitulés du PDF et privilégie les repères audio proches', () => {
  const start = html.indexOf('function proposeDocumentSections(');
  const end = html.indexOf("\n$('analyse93').onclick", start);
  assert.ok(start >= 0 && end > start);
  const propose = runInNewContext('(' + html.slice(start,end).trim() + ')');
  const sections = Array.from(propose([
    {start:0,end:10}, {start:10,end:18}, {start:32,end:43}, {start:74,end:81},
    {start:83,end:91}, {start:91,end:100},
  ], [1,2,3,4], 100));
  assert.deepEqual(sections.map(section => section.name), ['Partie 1','Partie 2','Partie 3','Partie 4']);
  assert.deepEqual(sections.map(section => section.start), [10,32,null,83]);
  assert.deepEqual(sections.map(section => section.end), [18,43,null,91]);
  assert.ok(sections.every(section => section.guided && section.leadIn === .5));
  const validated={...sections[1],name:'Refrain',start:35,end:50,verified:true};
  const rerun=Array.from(propose([{start:10,end:18},{start:52,end:65}], [1,2,3,4], 100,[validated]));
  assert.equal(rerun[1].name,'Refrain');
  assert.equal(rerun[1].start,35);
  assert.equal(rerun[1].end,50);
  assert.equal(rerun[1].verified,true);
  assert.equal(rerun[2].start,52);
  const noEvidence = Array.from(propose([{start:0,end:100}], [1,2,3,4], 100));
  assert.ok(noEvidence.every(section => section.start === null && section.end === null));
});


test('La recherche retrouve un passage répété et écarte le passage de référence', () => {
  const reference = {start:1,end:8};
  const matches = Array.from(findReprises(tones([220,660,220]),sampleRate,reference));
  assert.ok(matches.some(match=>Math.abs(match.start-29)<2));
  assert.ok(matches.every(match=>match.end<=reference.start || match.start>=reference.end));
  assert.equal(findReprises(tones([220,660]),sampleRate,{start:3,end:12}).length,0);
});


test('L’affinage local retrouve une transition proche et se tait sur un son uniforme', () => {
  const near=Array.from(nearbyBoundaries(tones([220,660]),sampleRate,12,3));
  assert.ok(near.some(time=>Math.abs(time-14)<.5));
  assert.equal(nearbyBoundaries(tones([220,220]),sampleRate,12,3).length,0);
});
