import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasProfanity, maskProfanity, normalizeWord } from '../src/moderation/profanity.js';

test('normalizes look-alikes, separators and repeats', () => {
  assert.equal(normalizeWord('K.U.R.A.C'), 'kurac');
  assert.equal(normalizeWord('kuuuurac'), 'kurac');
  assert.equal(normalizeWord('j3b3m'), 'jebem');
  assert.equal(normalizeWord('$h1t'), 'shit');
});

test('catches Croatian and English abuse, with or without diacritics', () => {
  for (const bad of ['jebem', 'odjebi', 'zajebavaš', 'pička', 'picka', 'pičkica', 'kurčina', 'kurcina', 'kurvo',
    'pizda', 'drolja', 'šupak', 'supak', 'seronja', 'sranje', 'govno', 'peder', 'ciganka',
    'fuck', 'FuCk1ng', 'motherfucker', 'sh1t', 'b1tch', 'k.u.r.a.c', 'kuuurac']) {
    assert.equal(hasProfanity(bad), true, bad);
  }
});

test('leaves ordinary words alone', () => {
  for (const ok of ['kuća', 'kurikulum', 'kurir', 'pick', 'picked', 'picking', 'picky', 'cocktail', 'Dickens',
    'scrape', 'cumulative', 'govoriti', 'jabuka', 'Ivana', 'Marko_92', 'pjesma', 'spremno',
    'debeli', 'idiot', 'kreten', 'assess', 'class', 'Šime', 'srna']) {
    assert.equal(hasProfanity(ok), false, ok);
  }
});

test('masks only the offending words', () => {
  assert.equal(maskProfanity('ajme kurac ovo je teško'), 'ajme k**** ovo je teško');
  assert.equal(maskProfanity('dobra igra!'), 'dobra igra!');
  assert.equal(maskProfanity('what the fuck'), 'what the f***');
});
