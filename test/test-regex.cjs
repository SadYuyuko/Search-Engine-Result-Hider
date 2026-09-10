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

const fns = ['escapeWildcardPart', 'wildcardToRegex', 'parsePrefixedRegexRule', 'ruleToRegex', 'compileRuleRegex', 'safeRegexTest']
  .map((n) => extractFn(src, n));

const api = new Function(`
${fns.join('\n')}
return { escapeWildcardPart, wildcardToRegex, parsePrefixedRegexRule, ruleToRegex, compileRuleRegex, safeRegexTest };
`)();

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

function match(rule, url) {
  const compiled = api.compileRuleRegex(rule);
  return api.safeRegexTest(compiled.regex, url);
}

// ---- 通配符元字符转义 ----
assert('W1: a+b 匹配字面量 a+b', match('*://example.com/a+b/*', 'https://example.com/a+b/'));
assert('W2: a+b 不匹配 ab', !match('*://example.com/a+b/*', 'https://example.com/ab/'));
assert('W3: (x) 匹配字面量 (x)', match('*://example.com/(x)/*', 'https://example.com/(x)/'));
assert('W4: [x] 匹配字面量 [x]', match('*://example.com/[x]/*', 'https://example.com/[x]/'));
assert('W5: {2} 匹配字面量 {2}', match('*://example.com/a{2}/*', 'https://example.com/a{2}/'));
assert('W6: a|b 匹配字面量 a|b', match('*://example.com/a|b/*', 'https://example.com/a|b/'));
assert('W7: a^b 匹配字面量 a^b', match('*://example.com/a^b/*', 'https://example.com/a^b/'));
assert('W8: a$b 匹配字面量 a$b', match('*://example.com/a$b/*', 'https://example.com/a$b/'));
assert('W9: 路径点号转义(file.txt 不匹配 filextxt)', !match('*://example.com/file.txt', 'https://example.com/filextxt'));
assert('W10: 路径点号正常匹配(file.txt)', match('*://example.com/file.txt', 'https://example.com/file.txt'));

// 原有规则回退
assert('W11: *.example.com 匹配子域', match('*://*.example.com/*', 'https://foo.example.com/x'));
assert('W12: example.com 不匹配 exampleXcom', !match('*://example.com/*', 'https://exampleXcom/'));
assert('W13: 星号仍为通配', match('*://example.com/a/*/b', 'https://example.com/a/xyz/b'));
assert('W14: 问号为字面量', match('*://example.com/a?b', 'https://example.com/a?b'));
assert('W15: 问号不是单字符通配', !match('*://example.com/a?b', 'https://example.com/axb'));
assert('W16: 保留用户转义点', match('*://example\\.com/*', 'https://example.com/'));
assert('W17: 显式 scheme 可用', match('https://example.com/*', 'https://example.com/x'));
assert('W18: 无斜杠模式点号转义', !api.safeRegexTest(new RegExp(api.wildcardToRegex('example.com')), 'exampleXcom'));

// 锚定与通配范围
assert('W19: 路径模式匹配自身', match('*://example.com/path/*', 'https://example.com/path/x'));
assert('W20: 路径模式匹配 http', match('*://example.com/path/*', 'http://example.com/path/x'));
assert('W21: 路径模式不匹配 query 中的伪 URL', !match('*://example.com/path/*', 'https://evil.com/?u=example.com/path/'));
assert('W22: 路径模式不匹配前缀域名', !match('*://example.com/path/*', 'https://evil.com/example.com/path/x'));
assert('W23: 主机通配不跨越路径', !match('*://*.example.com/path/*', 'https://evil.com/x.example.com/path/'));
assert('W24: 主机通配仍匹配多级子域', match('*://*.example.com/path/*', 'https://a.b.example.com/path/x'));
assert('W25: 显式 scheme 不匹配其他 scheme', !match('https://example.com/*', 'http://example.com/'));
assert('W26: 无 scheme 通配仍可用', match('*example*', 'https://any.example.org/x'));

// 裸域匹配(apex)
assert('W27: 裸域名规则匹配裸域', match('example.com', 'https://example.com/'));
assert('W28: 裸域名规则匹配子域', match('example.com', 'https://www.example.com/'));
assert('W29: *.路径模式匹配裸域', match('*://*.example.com/path/*', 'https://example.com/path/x'));
assert('W30: *.无路径模式匹配裸域', match('*://*.example.com/*', 'https://example.com/'));
assert('W31: *.顶级域通配匹配裸域', match('*://*.example.*', 'https://example.com/'));
assert('W32: 精确域名规则不匹配子域', !match('*://example.com/*', 'https://www.example.com/'));

// ---- 正则 s 标志 ----
assert('S1: title 转义点 + s 正常匹配', match('title/example\\.com/s', 'example.com'));
assert('S2: text 转义点 + s 正常匹配', match('text/example\\.com/s', 'example.com'));
assert('S3: s 使点号匹配换行', match('title/foo.bar/s', 'foo\nbar'));
assert('S4: 无 s 时点号不匹配换行', !match('title/foo.bar/', 'foo\nbar'));
assert('S5: 字符类内点号保持字面量', match('title/[.]com/s', 'a.com'));
assert('S6: 转义点不匹配任意字符', !match('title/a\\.b/s', 'axb'));
assert('S7: s 标志保留', (() => {
  const parsed = api.parsePrefixedRegexRule('title/foo/s', 6);
  return parsed.flags === 's' && parsed.pattern === 'foo';
})());
assert('S8: 多标志保留', (() => {
  const compiled = api.compileRuleRegex('title/foo/is');
  return compiled.regex.flags.includes('i') && compiled.regex.flags.includes('s');
})());
assert('S9: 旧式 (?s) 前缀仍可用', match('title/(?s)foo.bar/', 'foo\nbar'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
