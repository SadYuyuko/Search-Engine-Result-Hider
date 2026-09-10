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
  'evalDynamicLeaf', 'evalCondAST', 'extractBalancedParens', 'findIfOccurrences', 'stripIfConditions',
  'evaluateCondition', 'isCondExprCore', 'looksLikeCondExpr', 'absorbStandaloneExpr',
  'parseRuleWithConditions', 'validateUrlWildcard', 'ruleToRegex', 'parsePrefixedRegexRule',
  'escapeWildcardPart', 'wildcardToRegex', 'matchWildcardDomainPattern', 'extractSimpleWhitelistDomain', 'matchSimpleDomain',
  'compileRuleRegex', 'checkDynamicConditions', 'matchDomainEntryType', 'buildRuleIndex',
  'checkRuleMatchOptimized',
].map((n) => extractFn(src, n));

const consts = src.match(/const SUPPORTED_REGEX_FLAGS = 'imsu';/)[0];
const langMatch = src.match(/const LANG_TEXTS = \{[\s\S]*?\n  \};/)[0];

const moduleBody = `
${consts}
${langMatch}
let compiledRules;
const validationCache = new Map();
const subdomainCache = new Map();
let currentEngine = 'google';
let currentSite = 'www.google.com';
let currentCategory = 'web';
const window = { location: { get hostname() { return currentSite; } } };
function getSearchEngine() { return currentEngine; }
function getSearchCategory() { return currentCategory; }
function t(key, params = {}) {
  const texts = LANG_TEXTS['zh-CN'] || {};
  let text = texts[key] || key;
  for (const [k, v] of Object.entries(params)) text = text.replaceAll('{' + k + '}', v);
  return text;
}
const currentConfig = { rules: [], debug: false };
let subscriptions = [];
function getSubscriptions() { return subscriptions; }
function getAllSubscriptionRules() {
  const rules = [];
  subscriptions.filter(s => s.enabled).forEach(s => {
    if (s.rules && Array.isArray(s.rules)) rules.push(...s.rules);
  });
  return rules;
}
${fns.join('\n')}
return {
  buildRuleIndex,
  checkRuleMatchOptimized,
  getCR: () => compiledRules,
  setState: (rules, subs) => { currentConfig.rules = rules; subscriptions = subs; },
};
`;

const api = new Function(moduleBody)();

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// 本地与订阅重复规则：来源必须按位置区分
api.setState(
  ['@*://*.example.com/*', '*://*.example.com/*'],
  [{ url: 's1', enabled: true, rules: ['@*://*.example.com/*'] }],
);
api.buildRuleIndex();
let cr = api.getCR();
const wl = cr.whitelistDomains.get('example.com') || [];
assert('R1: 本地白名单标记为本地来源', wl.some(e => e.source === '本地规则'));
assert('R2: 订阅白名单标记为订阅来源', wl.some(e => e.source === '订阅1'));
const bl = cr.domains.get('example.com') || [];
assert('R3: 本地黑名单标记为本地来源', bl.some(e => e.source === '本地规则'));
const r4 = api.checkRuleMatchOptimized('https://example.com/', 'example.com', 't', null, ['example.com']);
assert('R4: 重复规则不再丢失本地白名单优先级', !r4 || r4.blocked !== true);

// 本地/订阅各自独有规则
api.setState(['*://*.local.com/*'], [{ url: 's1', enabled: true, rules: ['*://*.sub.com/*'] }]);
api.buildRuleIndex();
cr = api.getCR();
assert('R5: 本地独有规则来源正确', cr.domains.get('local.com')[0].source === '本地规则');
assert('R6: 订阅独有规则来源正确', cr.domains.get('sub.com')[0].source === '订阅1');

// 禁用订阅跳过，标签保留原始序号
api.setState([], [
  { url: 's1', enabled: false, rules: ['*://*.off.com/*'] },
  { url: 's2', enabled: true, rules: ['*://*.on.com/*'] },
]);
api.buildRuleIndex();
cr = api.getCR();
assert('R7: 禁用订阅不加载', !cr.domains.has('off.com'));
assert('R8: 启用订阅保留原始序号标签', cr.domains.get('on.com')[0].source === '订阅2');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
