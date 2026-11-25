import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

// The atelier ships as one HTML file. Run the actual worker algorithm
// without a browser or an additional copy of its code.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function analyse93(');
const end = html.indexOf('\nconst form93', start);
assert.ok(start >= 0 && end > start, 'Le code de l’analyse doit être présent dans l’atelier');
const analyse = runInNewContext('(' + html.slice(start, end).trim() + ')');

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
  const sections = Array.from(propose([{start:0},{start:24},{start:40},{start:76}], [1,2,3,4], 100));
  assert.deepEqual(sections.map(section => section.name), ['Partie 1','Partie 2','Partie 3','Partie 4']);
  assert.deepEqual(sections.map(section => section.start), [0,24,50,76]);
  assert.deepEqual(sections.map(section => section.end), [24,50,76,100]);
  assert.ok(sections.every(section => section.guided && section.leadIn === .5));
});
