const fs = require('fs');
const path = require('path');

const scriptDir = path.join(__dirname, '..');
const scriptFiles = fs.readdirSync(scriptDir).filter((name) => name.endsWith('.js')).sort();
if (!scriptFiles.length) throw new Error('no .js script found in ' + scriptDir);
const file = path.join(scriptDir, scriptFiles[0]);
console.log('Testing', file);
const src = fs.readFileSync(file, 'utf8');

function extractFn(text, fnName) {
  const marker = `function ${fnName}(`;
  let idx = text.indexOf(marker);
  if (idx === -1) throw new Error('fn not found: ' + fnName);
  const start = idx;
  const open = text.indexOf('{', idx);
  let depth = 0;
  let i = open;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return text.slice(start, i + 1);
}

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

// SELECTORS + getSearchEngine/getSearchCategory
const selectorsStart = src.indexOf('const SELECTORS = {');
const engineComment = src.indexOf('  // 引擎检测');
if (selectorsStart === -1 || engineComment === -1) throw new Error('SELECTORS block not found');
const selectorsBlock = src.slice(selectorsStart, engineComment).trim();
const selectorsObjectText = selectorsBlock.slice(selectorsBlock.indexOf('{'), selectorsBlock.lastIndexOf('}') + 1);

const fnBody = extractFn(src, 'getSearchEngine');
const catBody = extractFn(src, 'getSearchCategory');
const factory = new Function(
  'window',
  'SELECTORS',
  `let _engineCacheHost = '';
let _engineCacheResult = '';
${fnBody}
${catBody}
return { getSearchEngine, getSearchCategory };`,
);
const selectors = eval(`(${selectorsObjectText})`);

function detectEngine(host) {
  for (const name of Object.keys(selectors)) {
    const def = selectors[name];
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

// ---- 引擎检测 ----
const cases = [
  ['www.bing.com', 'bing'],
  ['bing.com', 'bing'],
  ['cn.bing.com', 'bing'],
  ['www.bing.com.hk', 'other'],
  ['www.google.com', 'google'],
  ['google.com', 'google'],
  ['google.com.hk', 'google'],
  ['www.google.co.jp', 'google'],
  ['google.cn', 'google'],
  ['duckduckgo.com', 'duckduckgo'],
  ['lite.duckduckgo.com', 'duckduckgo'],
  ['ddg.gg', 'duckduckgo'],
  ['www.ddg.gg', 'duckduckgo'],
  ['yandex.com', 'yandex'],
  ['yandex.ru', 'yandex'],
  ['ya.ru', 'yandex'],
  ['www.yandex.com.tr', 'yandex'],
  ['search.brave.com', 'brave'],
  ['search.yahoo.com', 'yahoo'],
  ['search.yahoo.co.jp', 'yahoo'],
  ['r.search.yahoo.com', 'yahoo'],
  ['example.com', 'other'],
  ['www.example.org', 'other'],
  ['bing.com.evil.com', 'other'],
  ['notgoogle.com', 'other'],
  ['yahoo.com.evil.net', 'other'],
];

for (const [host, expected] of cases) {
  const w = { location: { hostname: host } };
  const got = factory(w, selectors).getSearchEngine();
  assert(`${host} -> ${expected}`, got === expected);
}

assert('SELECTORS键序为引擎检测顺序', JSON.stringify(Object.keys(selectors)) === JSON.stringify(['bing', 'google', 'duckduckgo', 'yandex', 'brave', 'yahoo', 'other']));
assert('缓存:同hostname二次调用返回相同结果', factory({ location: { hostname: 'www.google.com' } }, selectors).getSearchEngine() === 'google');

// ---- 搜索分类检测 ----
const catCases = [
  [{ hostname: 'www.google.com', pathname: '/search', search: '?q=x' }, 'web'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?q=x&tbm=isch' }, 'images'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?udm=2&q=x' }, 'images'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?tbm=vid&q=x' }, 'videos'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?udm=7' }, 'videos'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?tbm=nws' }, 'news'],
  [{ hostname: 'www.google.com', pathname: '/search', search: '?udm=12' }, 'news'],
  [{ hostname: 'www.bing.com', pathname: '/images/search', search: '?q=x' }, 'images'],
  [{ hostname: 'www.bing.com', pathname: '/videos/search', search: '?q=x' }, 'videos'],
  [{ hostname: 'www.bing.com', pathname: '/news/search', search: '?q=x' }, 'news'],
  [{ hostname: 'www.bing.com', pathname: '/search', search: '?q=x' }, 'web'],
  [{ hostname: 'duckduckgo.com', pathname: '/', search: '?q=x&ia=images' }, 'images'],
  [{ hostname: 'duckduckgo.com', pathname: '/', search: '?iax=images' }, 'images'],
  [{ hostname: 'duckduckgo.com', pathname: '/', search: '?ia=videos' }, 'videos'],
  [{ hostname: 'duckduckgo.com', pathname: '/', search: '?ia=news' }, 'news'],
  [{ hostname: 'search.brave.com', pathname: '/images', search: '?q=x' }, 'images'],
  [{ hostname: 'images.search.yahoo.com', pathname: '/search/images', search: '?p=x' }, 'images'],
  [{ hostname: 'www.google.com', pathname: '/', search: '' }, 'web'],
];
for (const [loc, expected] of catCases) {
  const got = factory({ location: loc }, selectors).getSearchCategory(loc);
  assert(`category ${loc.hostname}${loc.pathname}${loc.search} -> ${expected}`, got === expected);
}

// ---- @match/@include 与引擎判定一致性 ----
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
