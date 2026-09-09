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

function extractNamed(text, marker) {
  const idx = text.indexOf(marker);
  if (idx === -1) throw new Error('not found: ' + marker);
  const open = text.indexOf('{', idx);
  let depth = 0;
  let end = open;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  return text.slice(idx, end);
}

const fns = [
  'safeRegexTest',
  'stripRuleComment',
  'getInvalidRegexFlags',
  'parseConditionPart',
  'tokenizeCondExpr',
  'parseCondExprTokens',
  'analyzeCondExpr',
  'foldCondExpr',
  'evalDynamicLeaf',
  'evalCondAST',
  'extractBalancedParens',
  'stripIfConditions',
  'evaluateCondition',
  'isCondExprCore',
  'looksLikeCondExpr',
  'absorbStandaloneExpr',
  'parseRuleWithConditions',
  'extractIfConditions',
  'validateCondition',
  'analyzeRule',
  'validateUrlWildcard',
  'ruleToRegex',
  'parsePrefixedRegexRule',
  'wildcardToRegex',
  'checkDynamicConditions',
  'matchDomainEntryType',
].map((n) => extractFn(src, n));

const checkFn = extractNamed(src, 'function checkRuleMatchOptimized(');
const consts = src.match(/const SUPPORTED_REGEX_FLAGS = 'imsu';/)[0];
const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

const moduleBody = `
${consts}
${langMatch}
let compiledRules;
let currentEngine = 'google';
let currentSite = 'www.google.com';
const window = { location: { get hostname() { return currentSite; } } };
function getSearchEngine() { return currentEngine; }
function t(key, params = {}) {
  const texts = LANG_TEXTS['zh-CN'] || {};
  let text = texts[key] || key;
  for (const [k, v] of Object.entries(params)) text = text.replaceAll('{' + k + '}', v);
  return text;
}
${fns.join('\n')}
${checkFn}
return {
  safeRegexTest, stripRuleComment, parseRuleWithConditions, analyzeRule, looksLikeCondExpr,
  isCondExprCore, evalCondAST, checkDynamicConditions, checkRuleMatchOptimized, t,
  setEngine: (e, s) => { currentEngine = e; if (s) currentSite = s; },
  setCR: (cr) => { compiledRules = cr; },
};
`;

const m = new Function(moduleBody)();

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
  m.setCR(cr);
  return m.checkRuleMatchOptimized(url, host, title, snippet, sl);
}

function isBlocked(r) { return r && r.blocked === true; }

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

m.setEngine('google', 'www.google.com');

// ---- 识别 ----
assert('L1: host后缀像表达式', m.looksLikeCondExpr('host $= ".example.com"') === true);
assert('L2: path包含像表达式', m.looksLikeCondExpr('path *= "/download/"') === true);
assert('L3: 组合像表达式', m.looksLikeCondExpr('host $= ".example.com" & path *= "/download/"') === true);
assert('L4: 取反像表达式', m.looksLikeCondExpr('!title *= "ad"') === true);
assert('L5: 域名不像表达式', m.looksLikeCondExpr('example.com') === false);
assert('L6: URL通配不像表达式', m.looksLikeCondExpr('*://*.example.com/*') === false);
assert('L7: title/正则不像表达式', m.looksLikeCondExpr('title/foo/i') === false);
assert('L8: text/不像表达式', m.looksLikeCondExpr('text/ad/') === false);
assert('L9: 裸正则不像表达式', m.looksLikeCondExpr('/example\\.com/') === false);
assert('L10: host简写正则像表达式', m.looksLikeCondExpr('host/\\.example\\.com$/i') === true);

// ---- 解析 ----
let p = m.parseRuleWithConditions('host $= ".example.com"');
assert('P1: 独立host无core', p.coreRule === '' && p.staticPass === true && p.dynamicConditions.length === 1);
assert('P1a: host裸域命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://example.com/') === true);
assert('P1b: host子域命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://www.example.com/') === true);
assert('P1c: 其他域不命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://badexample.com/') === false);

p = m.parseRuleWithConditions('path *= "/download/"');
assert('P2: 独立path', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 1);
assert('P2a: path命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://x.com/download/a') === true);
assert('P2b: path未命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://x.com/dl/a') === false);

p = m.parseRuleWithConditions('host $= ".example.com" & path *= "/download/"');
assert('P3: 组合表达式', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 1);
assert('P3a: 双条件命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://dl.example.com/download/x') === true);
assert('P3b: 仅host不命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://dl.example.com/other') === false);

p = m.parseRuleWithConditions('@host $= ".example.com"');
assert('P4: 白名单独立表达式', p.coreRule === '@' && p.staticPass && p.dynamicConditions.length === 1);

p = m.parseRuleWithConditions('host $= ".example.com" @if(title *= "kw")');
assert('P5: 独立表达式+@if', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 2);
assert('P5a: 双条件都真', m.checkDynamicConditions(p.dynamicConditions, 'has kw', 'https://example.com/') === true);
assert('P5b: 标题不满足', m.checkDynamicConditions(p.dynamicConditions, 'no', 'https://example.com/') === false);

p = m.parseRuleWithConditions('example.com');
assert('P6: 普通域名不吸收', p.coreRule === 'example.com' && p.dynamicConditions.length === 0 && p.staticPass);

p = m.parseRuleWithConditions('*://*.example.com/*');
assert('P7: URL通配不吸收', p.coreRule === '*://*.example.com/*' && p.dynamicConditions.length === 0);

p = m.parseRuleWithConditions('title/foo/i');
assert('P8: title正则不吸收', p.coreRule === 'title/foo/i' && p.dynamicConditions.length === 0);

p = m.parseRuleWithConditions('*://*.example.com/* @if(title *= "kw")');
assert('P9: 旧复合规则仍剥离@if', p.coreRule === '*://*.example.com/*' && p.dynamicConditions.length === 1);

p = m.parseRuleWithConditions('@if(host $= ".example.com")');
assert('P10: 仅@if行视为表达式', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 1);
assert('P10a: 仅@if行可求值', m.evalCondAST(p.dynamicConditions[0], 't', 'https://www.example.com/') === true);

p = m.parseRuleWithConditions(m.stripRuleComment('host $= ".example.com" # note'));
assert('P11: 注释剥离后解析', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 1);

p = m.parseRuleWithConditions('title *= "kw" | url $= ".pdf"');
assert('P12: 标题或url后缀', p.coreRule === '' && p.staticPass);
assert('P12a: 标题命中', m.evalCondAST(p.dynamicConditions[0], 'has kw', 'https://x.com/a.html') === true);
assert('P12b: url命中', m.evalCondAST(p.dynamicConditions[0], 'plain', 'https://x.com/a.pdf') === true);
assert('P12c: 都不命中', m.evalCondAST(p.dynamicConditions[0], 'plain', 'https://x.com/a.html') === false);

p = m.parseRuleWithConditions('host/\\.example\\.com$/i');
assert('P13: host简写正则', p.coreRule === '' && p.staticPass);
assert('P13a: 简写命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://www.example.com/') === true);

p = m.parseRuleWithConditions('!title *= "ad"');
assert('P14: 独立取反', p.coreRule === '' && p.staticPass);
assert('P14a: 无ad命中', m.evalCondAST(p.dynamicConditions[0], 'normal', 'https://x.com/') === true);
assert('P14b: 有ad不命中', m.evalCondAST(p.dynamicConditions[0], 'ad here', 'https://x.com/') === false);

p = m.parseRuleWithConditions('$site = "google"');
assert('P15: $site在google折叠恒真', p.coreRule === '' && p.staticPass && p.dynamicConditions.length === 0);

m.setEngine('bing', 'www.bing.com');
p = m.parseRuleWithConditions('$site = "google"');
assert('P16: $site在bing静态丢弃', p.staticPass === false);
m.setEngine('google', 'www.google.com');

p = m.parseRuleWithConditions('scheme = "https"');
assert('P17: scheme独立', p.coreRule === '' && p.staticPass);
assert('P17a: https命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://x.com/') === true);
assert('P17b: http不命中', m.evalCondAST(p.dynamicConditions[0], 't', 'http://x.com/') === false);

p = m.parseRuleWithConditions('host $= ".example.com" i');
assert('P18: 独立表达式兼容i修饰', p.coreRule === '' && p.staticPass);
assert('P18a: i修饰仍命中', m.evalCondAST(p.dynamicConditions[0], 't', 'https://WWW.EXAMPLE.COM/') === true);

// ---- 校验 ----
assert('V1: host独立规则有效', m.analyzeRule('host $= ".example.com"').valid === true);
assert('V2: path独立规则有效', m.analyzeRule('path *= "/download/"').valid === true);
assert('V3: 组合有效', m.analyzeRule('host $= ".example.com" & path *= "/download/"').valid === true);
assert('V4: 白名单独立有效', m.analyzeRule('@host $= ".example.com"').valid === true);
assert('V5: 高亮独立有效', m.analyzeRule('@1 path $= ".pdf"').valid === true);
assert('V6: 域名规则仍有效', m.analyzeRule('example.com').valid === true);
assert('V7: URL通配仍有效', m.analyzeRule('*://*.example.com/*').valid === true);
assert('V8: 残缺表达式无效', m.analyzeRule('host $= ').valid === false);
assert('V9: 未知字段无效', m.analyzeRule('foo $= "bar"').valid === false);
assert('V10: 独立+行尾注释有效', m.analyzeRule('host $= ".example.com" # x').valid === true);
assert('V11: 仅@if行有效', m.analyzeRule('@if(path *= "/download/")').valid === true);
assert('V12: 空@if仍无效', m.analyzeRule('@if()').valid === false);
assert('V13: title包含独立有效', m.analyzeRule('title *= "广告"').valid === true);
assert('V14: 高亮越界仍无效', m.analyzeRule('@9 host $= ".example.com"').valid === false);
assert('V15: 复合旧写法仍有效', m.analyzeRule('*://*.example.com/* @if(title *= "kw")').valid === true);

// ---- 匹配引擎 ----
const slEx = ['www.example.com', 'example.com'];
const urlEx = 'https://www.example.com/download/setup.exe';
const urlOther = 'https://other.net/page';
const slOther = ['other.net'];

function addExpr(cr, rule, source) {
  const parsed = m.parseRuleWithConditions(m.stripRuleComment(rule));
  if (!parsed.staticPass) return parsed;
  cr.conditionalRules.push({
    type: 'expr',
    originalRule: rule,
    source: source || '本地规则',
    conditions: parsed.dynamicConditions,
  });
  return parsed;
}

function addWlExpr(cr, rule, source) {
  const parsed = m.parseRuleWithConditions(m.stripRuleComment(rule));
  if (!parsed.staticPass) return parsed;
  cr.whitelistConditionalRules.push({
    type: 'expr',
    conditions: parsed.dynamicConditions,
    source: source || '本地规则',
  });
  return parsed;
}

let cr = makeCR();
addExpr(cr, 'host $= ".example.com"');
assert('M1: 独立host屏蔽', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));
assert('M1b: 独立host不误伤', !isBlocked(doCheck(cr, urlOther, 'other.net', 't', null, slOther)));
assert('M1c: 裸域也屏蔽', isBlocked(doCheck(cr, 'https://example.com/', 'example.com', 't', null, ['example.com'])));

cr = makeCR();
addExpr(cr, 'path *= "/download/"');
assert('M2: 独立path屏蔽', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));
assert('M2b: 无该路径不屏蔽', !isBlocked(doCheck(cr, 'https://www.example.com/page', 'www.example.com', 't', null, slEx)));

cr = makeCR();
addExpr(cr, 'host $= ".example.com" & path *= "/download/"');
assert('M3: 组合命中', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));
assert('M3b: 组合缺path', !isBlocked(doCheck(cr, 'https://www.example.com/page', 'www.example.com', 't', null, slEx)));
assert('M3c: 组合缺host', !isBlocked(doCheck(cr, 'https://other.net/download/x', 'other.net', 't', null, slOther)));

cr = makeCR();
addExpr(cr, 'title *= "广告"');
assert('M4: 独立title屏蔽', isBlocked(doCheck(cr, urlOther, 'other.net', '含广告标题', null, slOther)));
assert('M4b: 标题不含不屏蔽', !isBlocked(doCheck(cr, urlOther, 'other.net', '正常标题', null, slOther)));

cr = makeCR();
{
  const parsed = m.parseRuleWithConditions('@host $= ".example.com"');
  cr.whitelistConditionalRules.push({ type: 'expr', conditions: parsed.dynamicConditions, source: '本地规则' });
  cr.domains.set('example.com', [{ type: 'wildcard', originalRule: 'example.com', source: '本地规则' }]);
}
assert('M5: 独立表达式白名单放行', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
{
  const parsed = m.parseRuleWithConditions('path $= ".pdf"');
  cr.highlightConditionalRules.push({ type: 'expr', conditions: parsed.dynamicConditions, N: 2 });
}
let r = doCheck(cr, 'https://x.com/a.pdf', 'x.com', 't', null, ['x.com']);
assert('M6: 独立表达式高亮', r && r.highlight === 2 && !r.blocked);
r = doCheck(cr, 'https://x.com/a.txt', 'x.com', 't', null, ['x.com']);
assert('M6b: 非pdf不高亮', !r || !r.highlight);

cr = makeCR();
addExpr(cr, 'host $= ".example.com"', '订阅规则1');
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('M7: 订阅独立表达式可屏蔽', isBlocked(r) && r.source === '订阅规则1');

cr = makeCR();
addExpr(cr, 'url $= ".pdf"');
assert('M8: 独立url后缀', isBlocked(doCheck(cr, 'https://x.com/a.pdf', 'x.com', 't', null, ['x.com'])));
assert('M8b: 非pdf url', !isBlocked(doCheck(cr, 'https://x.com/a.html', 'x.com', 't', null, ['x.com'])));

cr = makeCR();
addExpr(cr, 'scheme = "http"');
assert('M9: 独立http协议', isBlocked(doCheck(cr, 'http://x.com/', 'x.com', 't', null, ['x.com'])));
assert('M9b: https不命中', !isBlocked(doCheck(cr, 'https://x.com/', 'x.com', 't', null, ['x.com'])));

cr = makeCR();
{
  const parsed = m.parseRuleWithConditions('@path *= "/safe/"');
  cr.whitelistConditionalRules.push({ type: 'expr', conditions: parsed.dynamicConditions, source: '本地规则' });
  addExpr(cr, 'host $= ".example.com"');
}
assert('M10: 路径白名单压过host黑名单', !isBlocked(doCheck(cr, 'https://www.example.com/safe/a', 'www.example.com', 't', null, slEx)));
assert('M10b: 非安全路径仍屏蔽', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addExpr(cr, 'host $= ".example.com" @if(title *= "kw")');
assert('M11: 独立表达式与@if同时生效', isBlocked(doCheck(cr, urlEx, 'www.example.com', 'has kw', null, slEx)));
assert('M11b: @if不满足不屏蔽', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 'plain', null, slEx)));

// ---- 白名单 × 独立表达式优先级 ----
cr = makeCR();
addWlExpr(cr, '@host $= ".example.com"');
addExpr(cr, 'host $= ".example.com"');
assert('W1: 本地表达式白名单 > 本地表达式黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addExpr(cr, 'host $= ".example.com"');
addWlExpr(cr, '@host $= ".example.com"', '订阅规则1');
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('W2: 本地表达式黑名单 > 订阅表达式白名单', isBlocked(r) && r.source === '本地规则');

cr = makeCR();
cr.whitelistDomains.set('example.com', [{type: 'wildcard', source: '本地规则'}]);
addExpr(cr, 'path *= "/download/"');
assert('W3: 本地域名白名单 > 本地表达式黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addWlExpr(cr, '@host $= ".example.com"');
cr.domains.set('example.com', [{type: 'wildcard', originalRule: 'example.com', source: '订阅规则1'}]);
assert('W4: 本地表达式白名单 > 订阅域名黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addWlExpr(cr, '@host $= ".example.com"', '订阅规则1');
addExpr(cr, 'host $= ".example.com"', '订阅规则1');
assert('W5: 订阅表达式白名单 > 订阅表达式黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addExpr(cr, 'host $= ".example.com"');
cr.whitelistDomains.set('example.com', [{type: 'wildcard', source: '订阅规则1'}]);
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('W6: 本地表达式黑名单 > 订阅域名白名单', isBlocked(r) && r.source === '本地规则');

cr = makeCR();
cr.whitelistUrlPatterns.push({regex: /example\.com/, source: '本地规则'});
addExpr(cr, 'path *= "/download/"');
assert('W7: 本地URL白名单 > 本地表达式黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addWlExpr(cr, '@host $= ".example.com"');
cr.highlightDomains.set('example.com', [{N: 2, type: 'wildcard'}]);
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('W8: 高亮+本地表达式白名单 → 仅高亮', r && r.highlight === 2 && !r.blocked);

cr = makeCR();
addExpr(cr, 'host $= ".example.com"');
cr.highlightDomains.set('example.com', [{N: 3, type: 'wildcard'}]);
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('W9: 高亮+本地表达式黑名单 → 两者都返回', r && r.highlight === 3 && r.blocked === true);

cr = makeCR();
addWlExpr(cr, '@host $= ".other.com"');
addExpr(cr, 'host $= ".example.com"');
assert('W10: 未命中的表达式白名单不放行', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

p = m.parseRuleWithConditions('@if(host $= ".example.com")');
assert('W11a: 仅@if行是黑名单表达式', p.coreRule === '' && p.standaloneExpr && !p.coreRule.startsWith('@'));
p = m.parseRuleWithConditions('@host $= ".example.com"');
assert('W11b: @host 是白名单表达式', p.coreRule === '@' && p.standaloneExpr);

cr = makeCR();
addWlExpr(cr, '@title *= "官方"');
addExpr(cr, 'host $= ".example.com"');
assert('W12: 标题白名单放行同源host黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', '官方站点', null, slEx)));
assert('W12b: 标题不匹配则host黑名单仍生效', isBlocked(doCheck(cr, urlEx, 'www.example.com', '普通标题', null, slEx)));

cr = makeCR();
addWlExpr(cr, '@path *= "/safe/"', '订阅规则1');
addExpr(cr, 'host $= ".example.com"', '订阅规则1');
assert('W13: 订阅路径白名单 > 订阅host黑名单', !isBlocked(doCheck(cr, 'https://www.example.com/safe/a', 'www.example.com', 't', null, slEx)));
assert('W13b: 订阅路径白名单未命中则订阅host仍屏蔽', isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addWlExpr(cr, '@host $= ".example.com"');
addExpr(cr, 'path *= "/download/"', '订阅规则1');
assert('W14: 本地host白名单压过订阅path黑名单', !isBlocked(doCheck(cr, urlEx, 'www.example.com', 't', null, slEx)));

cr = makeCR();
addExpr(cr, 'path *= "/download/"');
addWlExpr(cr, '@host $= ".example.com"', '订阅规则1');
r = doCheck(cr, urlEx, 'www.example.com', 't', null, slEx);
assert('W15: 本地path黑名单压过订阅host白名单', isBlocked(r) && r.source === '本地规则');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
