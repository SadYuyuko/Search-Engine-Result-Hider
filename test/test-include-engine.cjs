const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '7.7.2.js');
const src = fs.readFileSync(file, 'utf8');

// 头部 @match/@include
const header = src.slice(0, src.indexOf('==/UserScript=='));
const matchLines = [...header.matchAll(/^\/\/\s*@match\s+(\S+)/gm)].map((m) => m[1]);
const includeLines = [...header.matchAll(/^\/\/\s*@include\s+\/(.+)\/$/gm)].map((m) => m[1]);
if (!includeLines.length) throw new Error('no @include lines found');

function matchPatternMatches(host, pattern) {
  const m = pattern.match(/^\*:\/\/(\*\.)?([^\/\*]+)\/\*$/);
  if (!m) return false;
  const [, star, domain] = m;
  return star ? host === domain || host.endsWith('.' + domain) : host === domain;
}
const scriptRuns = (host) =>
  matchLines.some((p) => matchPatternMatches(host, p)) ||
  includeLines.some((re) => new RegExp(re).test('https://' + host + '/'));

// SELECTORS.match(引擎检测)
const selStart = src.indexOf('const SELECTORS = {');
const selEnd = src.indexOf('  // 引擎检测');
const selText = src.slice(selStart, selEnd).trim();
const objText = selText.slice(selText.indexOf('{'), selText.lastIndexOf('}') + 1);
const SELECTORS = eval(`(${objText})`);
function detectEngine(host) {
  for (const name of Object.keys(SELECTORS)) {
    const def = SELECTORS[name];
    if (def && def.match && def.match.test(host)) return name;
  }
  return 'other';
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

const hosts = [
  'bing.com', 'www.bing.com', 'cn.bing.com', 'bing.cn', 'deep.sub.bing.com',
  'google.com', 'www.google.com', 'google.co.jp', 'google.com.tw', 'www.google.com.hk',
  'www.google.com.br', 'google.cn', 'www.google.de', 'google.co.uk', 'google.events', 'deep.sub.google.com',
  'duckduckgo.com', 'www.duckduckgo.com', 'lite.duckduckgo.com', 'ddg.gg', 'www.ddg.gg',
  'yandex.ru', 'www.yandex.ru', 'yandex.com', 'www.yandex.com', 'ya.ru', 'www.ya.ru',
  'yandex.kz', 'yandex.com.tr', 'www.yandex.com.tr', 'yandex.events', 'deep.sub.yandex.ru',
  'search.brave.com', 'brave.com', 'deep.sub.brave.com',
  'search.yahoo.com', 'search.yahoo.co.jp', 'yahoo.co.jp', 'search.foo.yahoo.co.jp', 'deep.sub.yahoo.com',
  'example.com', 'www.example.org', 'bing.com.evil.com', 'notgoogle.com', 'yahoo.com.evil.net',
];

for (const host of hosts) {
  const eng = detectEngine(host);
  const runs = scriptRuns(host);
  assert(`${host}: 引擎判定(${eng})与脚本运行(${runs})一致`, (runs && eng !== 'other') || (!runs && eng === 'other'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
