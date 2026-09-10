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

const fns = [
  'safeRegexTest', 'stripRuleComment', 'getInvalidRegexFlags', 'parseConditionPart',
  'tokenizeCondExpr', 'parseCondExprTokens', 'analyzeCondExpr', 'foldCondExpr',
  'evalDynamicLeaf', 'evalCondAST', 'extractBalancedParens', 'findIfOccurrences',
  'stripIfConditions', 'isCondExprCore', 'looksLikeCondExpr', 'absorbStandaloneExpr',
  'parseRuleWithConditions', 'extractIfConditions', 'validateCondition', 'analyzeRule', 'validateRule',
  'validateUrlWildcard', 'ruleToRegex', 'parsePrefixedRegexRule', 'escapeWildcardPart',
  'wildcardToRegex', 'evaluateCondition',
].map((n) => extractFn(src, n));

const consts = src.match(/const SUPPORTED_REGEX_FLAGS = 'imsu';/)[0];
const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

const moduleBody = `
${consts}
${langMatch}
const window = { location: { hostname: 'www.google.com', pathname: '/search', search: '?q=x', href: 'https://www.google.com/search?q=x' } };
function getSearchEngine() { return 'google'; }
function getSearchCategory() { return 'web'; }
function t(key, params = {}) {
  const texts = LANG_TEXTS['zh-CN'] || {};
  let text = texts[key] || key;
  for (const [k, v] of Object.entries(params)) text = text.replaceAll('{' + k + '}', v);
  return text;
}
${fns.join('\n')}
return { findIfOccurrences, extractIfConditions, stripIfConditions, extractBalancedParens, validateRule };
`;
const api = new Function(moduleBody)();

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// ---- @if 括号提取 ----
const src1 = '@if(title *= "a)b")';
const p1 = api.extractBalancedParens(src1, 3);
assert('P1: 双引号内右括号不截断', !!p1 && p1.content === 'title *= "a)b"');
assert('P2: endIndex 到真正的右括号', !!p1 && p1.endIndex === src1.length);

const p3 = api.extractBalancedParens("@if(title *= 'a)b')", 3);
assert('P3: 单引号内右括号不截断', !!p3 && p3.content === "title *= 'a)b'");

const c4 = api.extractIfConditions('*://x/* @if(title =~ /\\(a/)');
assert('P4: 转义左括号条件完整', c4.length === 1 && c4[0] === 'title =~ /\\(a/');

const c5 = api.extractIfConditions('*://x/* @if(title =~ /a\\)b/)');
assert('P5: 转义右括号不提前闭合', c5.length === 1 && c5[0] === 'title =~ /a\\)b/');

const c6 = api.extractIfConditions('*://x/* @if(title =~ /[(]a[)]/)');
assert('P6: 正则字符类内括号忽略', c6.length === 1 && c6[0] === 'title =~ /[(]a[)]/');

const c7 = api.extractIfConditions('*://x/* @if((title *= "a") | (title *= "b)"))');
assert('P7: 引号与分组混合', c7.length === 1 && c7[0] === '(title *= "a") | (title *= "b)")');

const p8 = api.extractBalancedParens('@if(title *= "a(b")', 3);
assert('P8: 引号内左括号不增加深度', !!p8 && p8.content === 'title *= "a(b"');

assert('P9: 真正不闭合返回 null', api.extractBalancedParens('@if((title *= "a")', 3) === null);

const s1 = api.stripIfConditions('*://x/* @if(title *= "a)b")');
assert('P10: 剥离后核心规则与条件通过', s1.coreRule === '*://x/*' && s1.staticPass === true);

const s2 = api.stripIfConditions('*://x/* @if(title =~ /\\(a/)');
assert('P11: 转义括号条件可剥离', s2.coreRule === '*://x/*' && s2.staticPass === true);

const s3 = api.stripIfConditions('*://x/* @if(title *= "a)b") @if(url *= "x")');
assert('P12: 多个 @if 均正确剥离', s3.coreRule === '*://x/*');

// ---- 引号/正则体内 @if 扫描 ----
let s = api.stripIfConditions('*://x.com/* @if(title *= "@if(y)")');
assert('Q1: 引号内 @if 不产生伪剥离', s.coreRule === '*://x.com/*' && s.staticPass === true);
let c = api.extractIfConditions('*://x.com/* @if(title *= "@if(y)")');
assert('Q2: 引号内 @if 不产生伪条件', c.length === 1 && c[0] === 'title *= "@if(y)"');
assert('Q3: 引号内 @if 规则校验通过', api.validateRule('*://x.com/* @if(title *= "@if(y)")') === true);
assert('Q4: 纯引号 @if 独立表达式有效', api.validateRule('title *= "@if(y)"') === true);

s = api.stripIfConditions('title/foo@if(bar)/');
assert('Q5: title 正则体内 @if 不被剥离', s.coreRule === 'title/foo@if(bar)/');
assert('Q6: title 正则体内 @if 规则校验通过', api.validateRule('title/foo@if(bar)/') === true);

s = api.stripIfConditions('*://x.com/* @if(title =~ /a@if(b)/)');
assert('Q7: 条件正则体内 @if 不产生伪剥离', s.coreRule === '*://x.com/*');
c = api.extractIfConditions('*://x.com/* @if(title =~ /a@if(b)/)');
assert('Q8: 条件正则体内 @if 不产生伪条件', c.length === 1 && c[0] === 'title =~ /a@if(b)/');
assert('Q9: 条件正则体内 @if 规则校验通过', api.validateRule('*://x.com/* @if(title =~ /a@if(b)/)') === true);

s = api.stripIfConditions('*://x.com/* @if(title *= "@if(y)") @if($site="google")');
assert('Q10: 混合多条件核心规则正确', s.coreRule === '*://x.com/*' && s.staticPass === true);
c = api.extractIfConditions('*://x.com/* @if(title *= "@if(y)") @if($site="google")');
assert('Q11: 混合多条件数量正确', c.length === 2 && c[0] === 'title *= "@if(y)"' && c[1] === '$site="google"');

s = api.stripIfConditions('title/.*示例.*/ @if($site = "google")');
assert('Q12: 前导正则后的 @if 正常剥离', s.coreRule === 'title/.*示例.*/' && s.staticPass === true);
assert('Q13: 前导正则复合规则校验通过', api.validateRule('title/.*示例.*/ @if($site = "google")') === true);

s = api.stripIfConditions('host/\\.example\\.com$/i @if(title *= "x")');
assert('Q14: 表达式正则后的 @if 正常剥离', s.coreRule === 'host/\\.example\\.com$/i' && s.staticPass === true);

s = api.stripIfConditions('*://x.com/?q=~/foo @if(title *= "x")');
assert('Q15: URL查询含=~/不误判正则', s.coreRule === '*://x.com/?q=~/foo' && s.staticPass === true);

assert('Q16: 未闭合条件仍报错', api.validateRule('*://x.com/* @if((title *= "a")') === false);
assert('Q17: 未闭合条件不剥离', api.stripIfConditions('*://x.com/* @if((title *= "a")').coreRule === '*://x.com/* @if((title *= "a")');

// ---- URL 路径含关键字段不误吞 @if(回归) ----
const pathConflictCases = [
  '*://x.com/title/y @if(title *= "a")',
  '*://x.com/a/url/y @if(title *= "a")',
  '*://x.com/host/y @if(title *= "a")',
  '*://x.com/path/y @if(title *= "a")',
  '*://x.com/scheme/y @if(title *= "a")',
  '*://*.google.com/url/* @if(title *= "x")',
  '*://x.com/a/title/b/url/c @if(url *= "q")',
];
for (const rule of pathConflictCases) {
  const occ = api.findIfOccurrences(rule);
  assert(`X1: @if检测 ${rule}`, occ.length === 1);
  const stripped = api.stripIfConditions(rule);
  const expectedCore = rule.replace(/ @if\(.*\)$/, '');
  assert(`X1b: 剥离后保留核心 ${rule}`, stripped.coreRule === expectedCore && stripped.staticPass === true);
  assert(`X1c: 规则校验通过 ${rule}`, api.validateRule(rule) === true);
}

s = api.stripIfConditions('*://x.com/url/* @if(title *= "a") @if($site = "google")');
assert('X2: 多@if与路径冲突同时剥离', s.coreRule === '*://x.com/url/*' && s.staticPass === true);

const noOccCases = [
  'url/foo@if(bar)/',
  '@url/foo@if(bar)/i',
  'title/foo@if(bar)/',
  '@1 title/foo@if(bar)/i',
];
for (const rule of noOccCases) {
  assert(`X3: 行首简写正则体内 @if 不产生伪条件 ${rule}`, api.findIfOccurrences(rule).length === 0);
}

s = api.stripIfConditions('scheme/https?\\/\\// @if(title *= "x")');
assert('X4: 行首 scheme 简写正则后的 @if 正常剥离', s.coreRule === 'scheme/https?\\/\\//' && s.staticPass === true);
s = api.stripIfConditions('path/\\/download/ @if(title *= "x")');
assert('X5: 行首 path 简写正则后的 @if 正常剥离', s.coreRule === 'path/\\/download/' && s.staticPass === true);

s = api.stripIfConditions('*://x/* @if(url/foo@if(bar)/)');
assert('X6: 条件内 url 简写正则含 @if 文本正常', s.coreRule === '*://x/*' && s.staticPass === true);
c = api.extractIfConditions('*://x/* @if(url/foo@if(bar)/)');
assert('X6b: 条件完整提取', c.length === 1 && c[0] === 'url/foo@if(bar)/');
assert('X6c: 规则校验通过', api.validateRule('*://x/* @if(url/foo@if(bar)/)') === true);

s = api.stripIfConditions('*://x/* @if(title/foo@if(bar)/)');
assert('X7: 条件内 title 简写正则含 @if 文本正常', s.coreRule === '*://x/*' && s.staticPass === true);
assert('X7b: 规则校验通过', api.validateRule('*://x/* @if(title/foo@if(bar)/)') === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
