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
  let depth = 0, i = open;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) break; }
  }
  return text.slice(start, i + 1);
}

const fns = ['safeRegexTest', 'matchDomainEntryType', 'checkDynamicConditions']
  .map((n) => extractFn(src, n));

const crmMarker = 'function checkRuleMatchOptimized(';
const crmStart = src.indexOf(crmMarker);
const crmOpen = src.indexOf('{', crmStart);
let depth = 0, crmEnd = crmOpen;
for (let i = crmOpen; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { crmEnd = i + 1; break; } }
}
const checkFn = src.slice(crmStart, crmEnd);

const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

// Build module: all functions share the same scope with `compiledRules` via closure
const moduleBody = `
let compiledRules;
${fns.join('\n')}
${checkFn}
${langMatch}
const t = (key) => (LANG_TEXTS['zh-CN'] || {})[key] || key;
return { safeRegexTest, matchDomainEntryType, checkDynamicConditions, checkRuleMatchOptimized, t, setCR: (cr) => { compiledRules = cr; } };
`;

const env = new Function(moduleBody)();

function doCheck(cr, url, host, title, snippet, sl) {
  env.setCR(cr);
  return env.checkRuleMatchOptimized(url, host, title, snippet, sl);
}

let pass = 0; let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

function makeCR() {
  return {
    domains: new Map(), urls: [], titles: [], texts: [],
    whitelistDomains: new Map(), whitelistUrlPatterns: [], whitelistTitlePatterns: [], whitelistTextPatterns: [],
    whitelistConditionalDomains: new Map(), whitelistConditionalRules: [],
    conditionalRules: [], conditionalDomains: new Map(),
    highlightDomains: new Map(), highlightUrls: [], highlightTitles: [], highlightTexts: [],
    highlightConditionalRules: [], highlightConditionalDomains: new Map(),
  };
}

function isBlocked(r) { return r && r.blocked === true; }
function getSrc(r) { return r ? r.source : null; }

function addWlDomain(cr, domain, type) {
  if (!cr.whitelistDomains.has(domain)) cr.whitelistDomains.set(domain, []);
  cr.whitelistDomains.get(domain).push({type, source: '本地规则'});
}
function addWlDomainSub(cr, domain, type) {
  if (!cr.whitelistDomains.has(domain)) cr.whitelistDomains.set(domain, []);
  cr.whitelistDomains.get(domain).push({type, source: '订阅规则1'});
}
function addWlUrl(cr, pattern) {
  cr.whitelistUrlPatterns.push({regex: new RegExp(pattern), source: '本地规则'});
}
function addWlUrlSub(cr, pattern) {
  cr.whitelistUrlPatterns.push({regex: new RegExp(pattern), source: '订阅规则1'});
}
function addBlDomain(cr, domain, type, rule, source) {
  if (!cr.domains.has(domain)) cr.domains.set(domain, []);
  cr.domains.get(domain).push({type, originalRule: rule, source});
}
function addBlUrl(cr, pattern, rule, source) {
  cr.urls.push({regex: new RegExp(pattern), originalRule: rule, source});
}
function addBlTitle(cr, pattern, rule, source) {
  cr.titles.push({regex: new RegExp(pattern), originalRule: rule, source});
}
function addBlText(cr, pattern, rule, source) {
  cr.texts.push({regex: new RegExp(pattern), originalRule: rule, source});
}

const host = 'www.example.com';
const url = 'https://www.example.com/page';
const sl = ['www.example.com', 'example.com'];

let cr, r;

// ==================== 基础 ====================
cr = makeCR();
assert('无规则 → 不屏蔽', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
assert('仅本地黑名单 → 屏蔽', isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addWlDomain(cr, 'example.com', 'wildcard');
assert('仅白名单 → 不屏蔽', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== 核心优先级 ====================
cr = makeCR();
addWlDomain(cr, 'example.com', 'wildcard');
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
assert('T1:本地白名单 > 本地黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
addWlDomainSub(cr, 'example.com', 'wildcard');
assert('T2:本地黑名单 > 订阅白名单', isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addWlDomain(cr, 'example.com', 'wildcard');
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '订阅规则1');
assert('T3:白名单 > 订阅黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== URL pattern ====================
cr = makeCR();
addWlUrl(cr, 'example\\.com');
addBlUrl(cr, 'example\\.com', 'example.com', '本地规则');
assert('T4:URL白名单 > URL本地黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlUrl(cr, 'example\\.com', 'example.com', '本地规则');
addWlUrlSub(cr, 'example\\.com');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T5:URL本地黑名单 > URL订阅白名单', isBlocked(r) && getSrc(r) === '本地规则');

// ==================== 不同域名 ====================
cr = makeCR();
addBlDomain(cr, 'other.com', 'wildcard', 'other.com', '本地规则');
assert('T6:不匹配的本地黑名单不影响其他引擎', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
addWlDomain(cr, 'other.com', 'wildcard');
assert('T7:不匹配的白名单不影响本地黑名单', isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== 订阅黑名单（阶段5）====================
cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T8:订阅黑名单 → 屏蔽', isBlocked(r) && getSrc(r) === '订阅规则1');

cr = makeCR();
addBlUrl(cr, 'example\\.com', 'example.com', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T9:订阅URL黑名单 → 屏蔽', isBlocked(r) && getSrc(r) === '订阅规则1');

// ==================== 订阅黑名单 + 本地白名单 优先级 ====================
cr = makeCR();
addWlDomain(cr, 'example.com', 'wildcard');
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '订阅规则1');
assert('T10:本地白名单 > 订阅黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== 本地黑名单正常阶段3处理 ====================
cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T11:本地黑名单正常屏蔽（阶段3）', isBlocked(r) && getSrc(r) === '本地规则');

// ==================== 标题/文本规则 ====================
cr = makeCR();
addBlTitle(cr, 'blocked', '标题规则', '本地规则');
assert('T12:本地标题黑名单 → 屏蔽', isBlocked(doCheck(cr, url, host, 'blocked title', null, sl)));

cr = makeCR();
addBlTitle(cr, 'blocked', '标题规则', '订阅规则1');
r = doCheck(cr, url, host, 'blocked title', null, sl);
assert('T13:订阅标题黑名单 → 屏蔽', isBlocked(r) && getSrc(r) === '订阅规则1');

cr = makeCR();
addBlText(cr, 'blocked', '文本规则', '本地规则');
assert('T14:本地文本黑名单 → 屏蔽', isBlocked(doCheck(cr, url, host, 'title', 'blocked snippet', sl)));

cr = makeCR();
addBlText(cr, 'blocked', '文本规则', '订阅规则1');
r = doCheck(cr, url, host, 'title', 'blocked snippet', sl);
assert('T15:订阅文本黑名单 → 屏蔽', isBlocked(r) && getSrc(r) === '订阅规则1');

// ==================== 混合来源：本地 + 订阅同时存在 ====================
cr = makeCR();
addBlDomain(cr, 'example.com', 'wildcard', 'local-domain', '本地规则');
addBlDomain(cr, 'example.com', 'wildcard', 'sub-domain', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T16:本地和订阅都匹配时，返回本地规则（阶段3优先）', isBlocked(r) && getSrc(r) === '本地规则');

// ==================== 阶段5仅匹配订阅，不再重复匹配本地 ====================
cr = makeCR();
addBlUrl(cr, 'example\\.com/page', 'example.com/page', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T17:仅订阅URL黑名单可独立屏蔽（阶段5订阅路径）', isBlocked(r) && getSrc(r) === '订阅规则1');

// ==================== 订阅白名单可以阻止订阅黑名单 ====================
cr = makeCR();
addWlUrlSub(cr, 'example\\.com');
addBlUrl(cr, 'example\\.com', 'example.com', '订阅规则1');
assert('T18:订阅白名单 > 订阅黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== exact 类型域名匹配 ====================
// exact 类型只精确匹配 level === lowerDomain，不跨子域
cr = makeCR();
addBlDomain(cr, 'www.example.com', 'exact', 'www.example.com', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, ['www.example.com', 'example.com']);
assert('T19a:订阅精确域名(exact)匹配自身 → 屏蔽', isBlocked(r) && getSrc(r) === '订阅规则1');

cr = makeCR();
addBlDomain(cr, 'other.com', 'exact', 'other.com', '订阅规则1');
r = doCheck(cr, url, host, 'title', null, ['www.example.com', 'example.com']);
assert('T19b:订阅精确域名(exact)不匹配其他域名', !isBlocked(r));

// ==================== 空 snippet 不触发文本匹配 ====================
cr = makeCR();
addBlText(cr, 'something', 'text-rule', '订阅规则1');
assert('T20:snippet为空时不匹配文本规则', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// ==================== 高亮与屏蔽共存 ====================
cr = makeCR();
cr.highlightDomains.set('example.com', [{N: 2, type: 'wildcard'}]);
addBlDomain(cr, 'example.com', 'wildcard', 'example.com', '本地规则');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T21:高亮+屏蔽同时返回', r && r.highlight === 2 && r.blocked === true);

cr = makeCR();
cr.highlightDomains.set('example.com', [{N: 3, type: 'wildcard'}]);
r = doCheck(cr, url, host, 'title', null, sl);
assert('T22:仅高亮无屏蔽', r && r.highlight === 3 && !r.blocked);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
