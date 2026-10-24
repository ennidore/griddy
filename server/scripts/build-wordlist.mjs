// Builds a Croatian word list: the most frequent words (FrequencyWords hr_50k)
// that the hunspell hr_HR dictionary accepts as valid, after expanding its
// suffix rules. Usage:
//   node build-wordlist.mjs <hr_HR.aff> <hr_HR.dic> <hr_50k.txt> <existing.txt> <target> <out.txt>
import fs from 'node:fs';

const [affPath, dicPath, freqPath, existingPath, targetArg, outPath] = process.argv.slice(2);
const TARGET = Number(targetArg);
const ALPHABET = new Set('abcčćdđefghijklmnoprsštuvzž');
const BLOCK = ['jeb', 'pizd', 'pičk', 'kurac', 'kurc', 'kurv', 'drka', 'peder', 'govn', 'sranj', 'šupak', 'šupk', 'drolj', 'seronj', 'cigan'];

// ---- parse .aff
const aff = fs.readFileSync(affPath, 'utf8').split(/\r?\n/);
const aliases = [null]; // AF is 1-indexed
const sfx = new Map(); // flag -> [{ strip, add, cond: RegExp }]
let needAffix = null;
let forbidden = null;
let circumfix = null;
for (const raw of aff) {
  const line = raw.replace(/\s+#.*$/, '').trim();
  const parts = line.split(/\s+/);
  if (parts[0] === 'NEEDAFFIX') needAffix = parts[1];
  else if (parts[0] === 'FORBIDDENWORD') forbidden = parts[1];
  else if (parts[0] === 'CIRCUMFIX') circumfix = parts[1];
  else if (parts[0] === 'AF' && parts.length === 2 && !/^\d+$/.test(parts[1])) aliases.push(parts[1]);
  else if (parts[0] === 'SFX' && parts.length >= 5) {
    const [, flag, strip, addRaw, cond] = parts;
    const [add, contFlags = ''] = addRaw.split('/');
    // Skip rules whose result itself needs another affix or is circumfix-only.
    const cont = contFlags.match(/../g) || [];
    if (cont.includes(needAffix) || cont.includes(circumfix)) continue;
    if (!sfx.has(flag)) sfx.set(flag, []);
    sfx.get(flag).push({
      strip: strip === '0' ? '' : strip,
      add: add === '0' ? '' : add,
      cond: new RegExp(`${cond === '.' ? '' : cond}$`, 'u'),
    });
  }
}

// ---- expand .dic
const valid = new Set();
const dic = fs.readFileSync(dicPath, 'utf8').split(/\r?\n/).slice(1);
for (const entry of dic) {
  if (!entry) continue;
  const [stem, flagRef = ''] = entry.split('/');
  const flagStr = /^\d+$/.test(flagRef) ? aliases[Number(flagRef)] || '' : flagRef;
  const flags = flagStr.match(/../g) || [];
  if (flags.includes(forbidden)) continue;
  if (!flags.includes(needAffix)) valid.add(stem);
  for (const f of flags) {
    for (const r of sfx.get(f) || []) {
      if (!stem.endsWith(r.strip) || !r.cond.test(stem)) continue;
      valid.add(stem.slice(0, stem.length - r.strip.length) + r.add);
    }
  }
}

// ---- pick by frequency
const playable = (w) =>
  w.length >= 3 && w.length <= 16 && [...w].every((c) => ALPHABET.has(c)) && !BLOCK.some((b) => w.includes(b));

const existing = fs
  .readFileSync(existingPath, 'utf8')
  .split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.trim().normalize('NFC'))
  .filter(playable);

const chosen = new Set(existing);
let scanned = 0;
for (const line of fs.readFileSync(freqPath, 'utf8').split(/\r?\n/)) {
  if (chosen.size >= TARGET) break;
  const word = line.split(' ')[0]?.normalize('NFC');
  scanned++;
  if (word && playable(word) && valid.has(word)) chosen.add(word);
}

const sorted = [...chosen].sort((a, b) => a.localeCompare(b, 'hr'));
const header = [
  `# Croatian word list (${chosen.size} words).`,
  '# Built from the most frequent words in FrequencyWords hr_50k (OpenSubtitles 2018, CC BY-SA 4.0)',
  '# that the hunspell hr_HR dictionary (LibreOffice) accepts, plus the original hand-written starter list.',
  '# One word per line, lowercase. Digraphs (lj, nj, dž) are written as two letters.',
];
fs.writeFileSync(outPath, `${header.join('\n')}\n${sorted.join('\n')}\n`);

const byLen = {};
for (const w of sorted) byLen[w.length] = (byLen[w.length] || 0) + 1;
console.log(
  JSON.stringify({ hunspellForms: valid.size, existing: existing.length, scannedFreq: scanned, total: sorted.length, byLen }),
);
