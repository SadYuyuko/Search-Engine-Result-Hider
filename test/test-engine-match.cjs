const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '7.7.2.js');
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
const { getSearchEngine } = factory({ location: { hostname: 'www.google.com' } }, selectors);

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
