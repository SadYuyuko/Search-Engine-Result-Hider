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
  'safeRegexTest', 'stripRuleComment', 'parseRulesetContent', 'getInvalidRegexFlags', 'parseConditionPart',
  'tokenizeCondExpr', 'parseCondExprTokens', 'analyzeCondExpr', 'foldCondExpr',
  'evalDynamicLeaf', 'evalCondAST', 'extractBalancedParens', 'findIfOccurrences',
  'stripIfConditions', 'isCondExprCore', 'looksLikeCondExpr', 'isScriptRuleLine', 'isElementRuleLine',
  'absorbStandaloneExpr', 'parseRuleWithConditions', 'extractIfConditions', 'validateCondition',
  'analyzeRule', 'validateRule', 'parsePrefixedRegexRule', 'escapeWildcardPart', 'wildcardToRegex',
  'ruleToRegex', 'validateUrlWildcard', 'evaluateCondition', 'collectSubscriptionRules',
].map((n) => extractFn(src, n));

const consts = src.match(/const SUPPORTED_REGEX_FLAGS = 'imsu';/)[0];
const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

const moduleBody = `
${consts}
${langMatch}
const window = { location: { hostname: 'www.google.com', pathname: '/search', search: '?q=x', href: 'https://www.google.com/search?q=x' } };
function getSearchEngine() { return 'google'; }
function getSearchCategory() { return 'web'; }
const currentConfig = { debug: false };
function t(key, params = {}) {
  const texts = LANG_TEXTS['zh-CN'] || {};
  let text = texts[key] || key;
  for (const [k, v] of Object.entries(params)) text = text.replaceAll('{' + k + '}', v);
  return text;
}
${fns.join('\n')}
return { collectSubscriptionRules, parseRulesetContent, isScriptRuleLine, isElementRuleLine, validateRule, validateUrlWildcard };
`;
const api = new Function(moduleBody)();

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// ---- 元素规则判定(uBO DOM 规则) ----
const elementRules = [
  'example.com##.ad',
  '##.ad',
  '~example.com##.ad',
  'example.com,foo.com##.ad',
  'example.com##div[title="x"]',
  'example.com#@#.ad',
  'example.com#$#alert(1)',
  'example.com#@$#alert(1)',
  'example.com#?#div:has(> span)',
  'example.com#@?#div:has(> span)',
  'example.com#%#window.x=1',
  'example.com#@%#window.x=1',
];
for (const rule of elementRules) {
  assert(`E: 元素规则跳过 ${rule}`, api.isElementRuleLine(rule) === true);
}

const scriptRules = [
  '/foo##bar/',
  'title/.*##.*/',
  'text/.*##.*/',
  '*://example.com/##x',
  '@/foo##bar/',
  '@*://example.com/*',
  '@title/.*##.*/',
  'host $= ".example.com"',
  'path *= "/download/"',
  'example.com',
  '*://*.example.com/*',
];
for (const rule of scriptRules) {
  assert(`E: 脚本规则保留 ${rule}`, api.isElementRuleLine(rule) === false);
}

// ---- 订阅规则过滤(保留) ----
const keep = [
  '!scheme="https"',
  '! title *= "ad"',
  '!host $= ".example.com"',
  '!(title *= "x" | url *= "y")',
  '*://*.example.com/*',
  '/example\\.(net|org)/',
  'title*="example"i',
  '*://*.example.edu/* @if($category="images")',
  '@*://example.com/*',
  '@1*://example.com/*',
  '*://x.com/* @if(title *= "@if(y)")',
  '*://x.com/* # comment',
  '*://example.com/a|b/*',
  'path $= "x|y"',
  '*://*.google.com/url/* @if(title *= "x")',
];
for (const line of keep) {
  assert(`F: 保留 ${line}`, api.collectSubscriptionRules([line]).length === 1);
}

// ---- 订阅规则过滤(丢弃) ----
const drop = [
  '! comment',
  '! Title: Some List',
  '[Adblock Plus 2.0]',
  '@@||example.com^',
  'example.com##.ad',
  'example.com#@#.ad',
  'example.com#?#div:has(> span)',
  '# comment',
  '*://bad domain/*',
];
for (const line of drop) {
  assert(`F: 跳过 ${line}`, api.collectSubscriptionRules([line]).length === 0);
}

// ---- uBO 网络过滤规则拒绝(回归) ----
const networkDrop = [
  '||example.com^',
  '||example.com^$third-party',
  '||example.com^$document',
  '|https://example.com/ad',
];
for (const line of networkDrop) {
  assert(`N: 跳过uBO网络规则 ${line}`, api.collectSubscriptionRules([line]).length === 0);
  assert(`N: 校验拒绝 ${line}`, api.validateUrlWildcard(line) === false && api.validateRule(line) === false);
}

const networkKeep = [
  '*://example.com/a|b/*',
  '*://example.com/?x=a|b',
  'example.com',
];
for (const line of networkKeep) {
  assert(`N: 管道符路径仍有效 ${line}`, api.validateRule(line) === true);
}

// ---- frontmatter 剥离 ----
const content = '---\nname: Test\n---\n# c\n!scheme="https"\n*://*.example.com/*\n';
const { lines, meta } = api.parseRulesetContent(content);
const collected = api.collectSubscriptionRules(lines.map((l) => l.trim()));
assert('F1: frontmatter 剥离', meta.name === 'Test');
assert('F2: 组合过滤结果', JSON.stringify(collected) === JSON.stringify(['!scheme="https"', '*://*.example.com/*']));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
