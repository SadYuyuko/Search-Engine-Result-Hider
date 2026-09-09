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
    else if (text[i] === '}') { depth--; if (depth === 0) break; }
  }
  return text.slice(start, i + 1);
}

const fns = ['safeRegexTest', 'matchDomainEntryType', 'checkDynamicConditions']
  .map((n) => extractFn(src, n));

// Extract checkRuleMatchOptimized
const crmStart = src.indexOf('function checkRuleMatchOptimized(');
const crmOpen = src.indexOf('{', crmStart);
let depth = 0, crmEnd = crmOpen;
for (let i = crmOpen; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { crmEnd = i + 1; break; } }
}
const checkFn = src.slice(crmStart, crmEnd);

const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

const body = fns.join('\n') + '\n' + checkFn + '\n' + langMatch + `
const t = (key) => (LANG_TEXTS['zh-CN'] || {})[key] || key;
return { safeRegexTest, matchDomainEntryType, checkDynamicConditions, checkRuleMatchOptimized, t, LANG_TEXTS };`;

const env = new Function(body)();

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

function doCheck(cr, url, host, title, snippet, sl) {
  const fnStr = env.checkRuleMatchOptimized.toString()
    .replace(/^function\s*\(/, '(compiledRules, safeRegexTest, matchDomainEntryType, checkDynamicConditions, t, ')
    .replace(/\}$/, '}$');
  const tFn = env.t.toString();
  const wrapper = new Function('cr', 'safeRegexTest', 'matchDomainEntryType', 'checkDynamicConditions', 't', 'url', 'host', 'title', 'snippet', 'sl',
    tFn + '\nconst checkRuleMatchOptimized = ' + fnStr + ';\nreturn checkRuleMatchOptimized(cr, safeRegexTest, matchDomainEntryType, checkDynamicConditions, t, url, host, title, snippet, sl);'
  );
  return wrapper(cr, env.safeRegexTest, env.matchDomainEntryType, env.checkDynamicConditions, env.t,
    url, host, title, snippet, sl);
}

function isBlocked(r) { return r && r.blocked === true; }
function getSrc(r) { return r ? r.source : null; }

function addWlDomain(cr, domain, type) {
  if (!cr.whitelistDomains.has(domain)) cr.whitelistDomains.set(domain, []);
  cr.whitelistDomains.get(domain).push(type);
}
function addWlUrl(cr, pattern) {
  cr.whitelistUrlPatterns.push(new RegExp(pattern));
}
function addBlDomain(cr, domain, type, rule, source) {
  if (!cr.domains.has(domain)) cr.domains.set(domain, []);
  cr.domains.get(domain).push({ type, originalRule: rule, source });
}
function addBlUrl(cr, pattern, rule, source) {
  cr.urls.push({ regex: new RegExp(pattern), originalRule: rule, source });
}

const host = 'www.google.com';
const url = 'https://www.google.com/search?q=test';
const sl = ['www.google.com', 'google.com'];

let cr, r;

// 基础
cr = makeCR();
assert('无规则 → 不屏蔽', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'google.com', 'wildcard', 'google.com', '本地规则');
assert('仅本地黑名单 → 屏蔽', isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addWlDomain(cr, 'google.com', 'wildcard');
assert('仅白名单 → 不屏蔽', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// 核心优先级
cr = makeCR();
addWlDomain(cr, 'google.com', 'wildcard');
addBlDomain(cr, 'google.com', 'wildcard', 'google.com', '本地规则');
assert('T1:本地白名单 > 本地黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'google.com', 'wildcard', 'google.com', '本地规则');
addWlDomain(cr, 'google.com', 'wildcard');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T2:本地黑名单 > 订阅白名单', isBlocked(r) && getSrc(r) === '本地规则');

cr = makeCR();
addWlDomain(cr, 'google.com', 'wildcard');
addBlDomain(cr, 'google.com', 'wildcard', 'google.com', '订阅规则1');
assert('T3:白名单 > 订阅黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

// URL pattern
cr = makeCR();
addWlUrl(cr, 'google\\.com');
addBlUrl(cr, 'google\\.com', 'google.com', '本地规则');
assert('T4:URL白名单 > URL本地黑名单', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlUrl(cr, 'google\\.com', 'google.com', '本地规则');
addWlUrl(cr, 'google\\.com');
r = doCheck(cr, url, host, 'title', null, sl);
assert('T5:URL本地黑名单 > URL订阅白名单', isBlocked(r) && getSrc(r) === '本地规则');

// 不同域名
cr = makeCR();
addBlDomain(cr, 'bing.com', 'wildcard', 'bing.com', '本地规则');
assert('T6:不匹配的本地黑名单不影响其他引擎', !isBlocked(doCheck(cr, url, host, 'title', null, sl)));

cr = makeCR();
addBlDomain(cr, 'google.com', 'wildcard', 'google.com', '本地规则');
addWlDomain(cr, 'bing.com', 'wildcard');
assert('T7:不匹配的白名单不影响本地黑名单', isBlocked(doCheck(cr, url, host, 'title', null, sl)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
