import { test, expect } from 'vitest';
import { rate, miss, ans, psize, pn, hwDone, hsh } from './logic.ts';
import type { Student, Homework, Question } from '../types.ts';

test('rate and miss calculations work correctly for attendance', () => {
  const student: Student = {
    id: 's1',
    n: 'Elif Yılmaz',
    lv: 'A1',
    p: 40,
    a: 'gggygg',
    c: 'c1',
    e: 'elif@ornek.com',
    pw: '1234',
    h: {},
    goal: 10,
    kn: [],
    cp: [],
    td: {},
    sd: {},
    nxt: 0,
    tc: 0,
    wl: 0,
    tpass: {},
  };

  expect(miss(student)).toBe(1);
  expect(rate(student)).toBe(83); // 5/6 = 83.33% -> 83%

  const perfectStudent = { ...student, a: 'gggggg' };
  expect(miss(perfectStudent)).toBe(0);
  expect(rate(perfectStudent)).toBe(100);

  const studentWithExcluded = { ...student, a: 'g-gy-g' };
  expect(miss(studentWithExcluded)).toBe(1);
  expect(rate(studentWithExcluded)).toBe(75); // 3 out of 4 counted = 75%
});

test('ans resolves correct answer string for all question kinds', () => {
  const mc1: Question = { k: 'mc', q: 'Sample', o: ['A', 'B', 'C'], c: 'B' };
  expect(ans(mc1)).toBe('B');

  const mc2: Question = { k: 'mc', q: 'Sample', o: ['A', 'B', 'C'], a: 0 };
  expect(ans(mc2)).toBe('A');

  const fill: Question = { k: 'fill', q: 'Sample ___', a: 'am' };
  expect(ans(fill)).toBe('am');

  const order: Question = { k: 'order', q: 'Sample', w: ['I', 'am', 'here'] };
  expect(ans(order)).toBe('I am here');

  const listen: Question = { k: 'listen', s: 'Nice to meet you', o: ['Nice', 'Thank you'] };
  expect(ans(listen)).toBe('Nice to meet you');
});

test('psize returns 4 for small puzzle IDs and 10 for larger ones', () => {
  expect(psize(1)).toBe(4);
  expect(psize(10)).toBe(4);
  expect(psize(11)).toBe(10);
});

test('pn generates deterministic titles for puzzle art', () => {
  const title1 = pn(1);
  const title2 = pn(1);
  expect(title1).toBe(title2);
  expect(title1.includes('#1')).toBe(true);
});

test('hwDone handles writing and test homework requirements', () => {
  const s: Student = {
    id: 's1',
    n: 'Test',
    lv: 'A1',
    p: 0,
    a: 'g',
    c: 'c1',
    e: 't@e.com',
    pw: '123',
    h: {},
    goal: 10,
    kn: [],
    cp: [],
    td: {},
    sd: {},
    nxt: 0,
    tc: 0,
    wl: 0,
    tpass: {},
  };

  const writeHw: Homework = {
    id: 101,
    t: 'Write intro',
    due: 'Tomorrow',
    type: 'write',
    topic: '',
    to: ['s1'],
    q: [],
  };

  expect(hwDone(writeHw, s)).toBe(false);
  s.h[101] = { score: null, text: 'Hello, I am student.' };
  expect(hwDone(writeHw, s)).toBe(true);

  const testHw: Homework = {
    id: 102,
    t: 'Quiz HW',
    due: 'Friday',
    type: 'test',
    topic: '',
    pass: 70,
    to: ['s1'],
    q: [],
  };

  expect(hwDone(testHw, s)).toBe(false);
  s.h[102] = { score: 65, text: '' };
  expect(hwDone(testHw, s)).toBe(false);
  s.h[102] = { score: 70, text: '' };
  expect(hwDone(testHw, s)).toBe(true);
});

test('hsh creates consistent hash codes', () => {
  expect(hsh('1234')).toBe(hsh('1234'));
  expect(hsh('1234')).not.toBe(hsh('5678'));
});
