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
  'safeRegexTest',
  'stripRuleComment',
  'parseRulesetContent',
  'getInvalidRegexFlags',
  'parseConditionPart',
  'tokenizeCondExpr',
  'parseCondExprTokens',
  'analyzeCondExpr',
  'foldCondExpr',
  'evalDynamicLeaf',
  'evalCondAST',
  'isCondExprCore',
  'looksLikeCondExpr',
].map((n) => extractFn(src, n));

  const consts = src.match(/const SUPPORTED_REGEX_FLAGS = 'imsu';/)[0];
const factory = new Function(
  consts + '\n' + fns.join('\n') + `\nreturn { safeRegexTest, getInvalidRegexFlags, parseConditionPart, tokenizeCondExpr, parseCondExprTokens, analyzeCondExpr, foldCondExpr, evalDynamicLeaf, evalCondAST, stripRuleComment, parseRulesetContent, isCondExprCore, looksLikeCondExpr };`,
);
const m = factory();

function condExpr(str, engine = 'google', siteHost = 'www.google.com', category = 'web') {
  const { ast, errors } = m.analyzeCondExpr(str, engine, siteHost, category);
  if (errors.length) return { errors: errors.map((e) => e.kind + (e.part ? ':' + e.part : '')) };
  const folded = m.foldCondExpr(ast);
  return folded.type === 'const' ? { const: folded.value } : { ast: folded };
}

function ev(folded, title, url) {
  if (folded.const !== undefined) return folded.const;
  return m.evalCondAST(folded.ast, title, url);
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// ---- 旧语法等价性 ----
let r = condExpr('$site = "google"', 'google');
assert('旧1: $site静态真->恒真', r.const === true);

r = condExpr('$site = "google"', 'bing');
assert('旧2: $site静态假->恒假', r.const === false);

r = condExpr('$site = "bing"', 'bing');
assert('旧2b: $site bing@bing 真', r.const === true);

r = condExpr('Google', 'google');
assert('旧2c: 裸引擎名已移除->unknown', r.errors && r.errors[0].startsWith('unknown'));
r = condExpr('Bing', 'bing');
assert('旧2d: 裸引擎名已移除2', r.errors && r.errors[0].startsWith('unknown'));

r = condExpr('title *= "kw1" | title *= "kw2"', 'google');
assert('旧3: 纯或->动态AST', !r.errors && !r.const && r.ast.type === 'or');
assert('旧3a: kw1命中', ev(r, 'has kw1 here', 'https://x.com/') === true);
assert('旧3b: kw2命中', ev(r, 'kw2 page', 'https://x.com/') === true);
assert('旧3c: 都不含->false', ev(r, 'nothing', 'https://x.com/') === false);
assert('旧3d: 无标题->false', ev(r, '', 'https://x.com/') === false);

r = condExpr('$site = "google" | title *= "x"', 'google');
assert('旧4: 静态or命中->无条件恒真', r.const === true);

r = condExpr('$site = "google" | title *= "x"', 'bing');
assert('旧4b: 静态or未命中->剩动态', !r.const && r.ast.type === 'leaf');
assert('旧4c: 标题含x', ev(r, 'xxx', 'https://x.com/') === true);
assert('旧4d: 标题不含x', ev(r, 'yyy', 'https://x.com/') === false);

r = condExpr('title = "AbC"', 'google');
assert('旧5: 标题精确(默认忽略大小写)', ev(r, 'abc', 'https://x.com/') === true && ev(r, 'abd', 'https://x.com/') === false);

r = condExpr('site = "google.com.hk"', 'google', 'www.google.com.hk');
assert('旧6: site静态命中', r.const === true);
r = condExpr('site = "google.com.hk"', 'google', 'www.bing.com');
assert('旧6b: site静态未命中', r.const === false);
r = condExpr('site("google.com.hk")', 'google', 'www.google.com.hk');
assert('旧6c: site(...) 旧括号形式兼容', r.const === true);

r = condExpr('title =~ /kw1|kw2/', 'google');
assert('旧7: 标题正则(正则内|不被切分)', !r.errors && r.ast.type === 'leaf');
assert('旧7a: kw1命中', ev(r, 'kw1 hit', 'https://x.com/') === true);
assert('旧7b: kw2命中', ev(r, 'xx kw2 xx', 'https://x.com/') === true);
assert('旧7c: 都不含', ev(r, 'kk', 'https://x.com/') === false);

r = condExpr('title =~ /a\\/b|c/i', 'google');
assert('旧8: 正则转义斜杠保留', !r.errors && ev(r, 'A/B', 'https://x.com/') === true);

r = condExpr('url *= "test"', 'google');
assert('旧9: url包含', ev(r, 't', 'https://ex.com/test/') === true && ev(r, 't', 'https://ex.com/other') === false);

// 多@if = AND: 两条 AST 需全部为真
r1 = condExpr('title *= "a"', 'google');
r2 = condExpr('!($site = "google")', 'bing');
assert('旧10: 多@if与(engine场景)', ev(r1, 'a t', 'https://x/') === true && r2.const === true);

// ---- 新语法 & ! ( ) ----
r = condExpr('title *= "a" & title *= "b"', 'google');
assert('新1: AND', !r.errors && ev(r, 'a and b', 'https://x/') === true && ev(r, 'only a', 'https://x/') === false);

r = condExpr('!title *= "a"', 'google');
assert('新2: !前缀叶子', !r.errors && r.ast.type === 'not');
assert('新2a: 无标题->取反命中', ev(r, '', 'https://x/') === true);
assert('新2b: 标题非a', ev(r, 'bbb', 'https://x/') === true);
assert('新2c: 标题含a->不命中', ev(r, 'aaa', 'https://x/') === false);

r = condExpr('!(title *= "a" | title *= "b")', 'google');
assert('新3: !(A|B)', !r.errors);
assert('新3a', ev(r, 'ccc', 'https://x/') === true);
assert('新3b', ev(r, 'bbb', 'https://x/') === false);

r = condExpr('title *= "a" & !(url *= "ads")', 'google');
assert('新4: 混合', ev(r, 'a t', 'https://x/page') === true && ev(r, 'a t', 'https://x/ads/1') === false);

r = condExpr('title *= "a" | title *= "b" & url *= "c"', 'google');
assert('新5: 优先级 & > |', !r.errors && r.ast.type === 'or');
assert('新5a: b含但url无c->false(&优先于|)', ev(r, 'bbb', 'https://x/') === false);
assert('新5b: b且url含c', ev(r, 'bbb', 'https://x/c/') === true);
assert('新5c: a即true', ev(r, 'aaa', 'https://x/') === true);

r = condExpr('(title *= "a" | title *= "b") & !($site = "google")', 'google');
assert('新6: 括号组与!()', !r.errors && r.const === false);

r = condExpr('(title *= "a" | title *= "b") & !($site = "bing")', 'google');
assert('新6b: 括号组&!($site=bing)在google', !r.const && ev(r, 'aaa', 'https://x/') === true && ev(r, 'ccc', 'https://x/') === false);

r = condExpr('!($site = "bing")', 'google');
assert('新7: 静态取反', r.const === true);
r = condExpr('!($site = "bing")', 'bing');
assert('新7b: 静态取反2', r.const === false);

r = condExpr('title *= "x" & ($site = "bing" | !($site = "google"))', 'google');
assert('新8: 复杂嵌套折叠(bing|!google 在google: false|false=false)', r.const === false);
r = condExpr('title *= "x" & ($site = "bing" | !($site = "yandex"))', 'google');
assert('新8b: 同上在google: false|true=true->剩title条件', !r.const && r.ast.type === 'leaf');

r = condExpr('!!title *= "a"', 'google');
assert('新9: 双重否定', !r.errors && r.ast.type === 'not');

// ---- 错误检测 ----
r = condExpr('foo', 'google');
assert('错1: 未知条件', r.errors && r.errors[0].startsWith('unknown'));
r = condExpr('title *= "a" &', 'google');
assert('错2: &缺右操作数', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('title *= "a" && title *= "b"', 'google');
assert('错3: 连续&', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('(title *= "a" | title *= "b"', 'google');
assert('错4: 括号未闭合', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('title *= "a")', 'google');
assert('错5: 多余右括号', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('& title *= "a"', 'google');
assert('错6: &开头', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('title *= "a" |', 'google');
assert('错7: |结尾', r.errors && r.errors.some((e) => e.startsWith('syntax')));
r = condExpr('', 'google');
assert('错8: 空串', r.errors);
r = condExpr('   ', 'google');
assert('错9: 全空白', r.errors);
r = condExpr('title =~ /x/g', 'google');
assert('错10: flags含g', r.errors && r.errors[0].startsWith('flags:g'));
r = condExpr('title =~ /(/)', 'google');
assert('错11: 正则无效', r.errors && r.errors[0].startsWith('regex'));
r = condExpr('title =~ /a\\', 'google');
assert('错12: 正则未闭合(tail转义)', r.errors);

// 引擎别名 ddg($site 值归一)
r = condExpr('$site = "DDG"', 'duckduckgo');
assert('旧11: DDG别名(大写)', r.const === true);

// ---- url 表达式系列(@if 内)----
r = condExpr('url = "https://ex.com/"', 'google');
assert('U1: url精确', !r.errors && ev(r, 't', 'https://ex.com/') === true && ev(r, 't', 'https://ex.com/x') === false);

r = condExpr('url = "HTTPS://EX.COM/"', 'google');
assert('U2: url精确忽略大小写', ev(r, 't', 'https://ex.com/') === true);

r = condExpr('url ^= "https://ex"', 'google');
assert('U3: url前缀', ev(r, 't', 'https://example.com/') === true && ev(r, 't', 'http://ex.com/') === false);

r = condExpr('url $= ".pdf"', 'google');
assert('U4: url后缀', ev(r, 't', 'https://x.com/a.pdf') === true && ev(r, 't', 'https://x.com/a.txt') === false);

r = condExpr('url =~ /\\.(pdf|doc)$/', 'google');
assert('U5: url正则(=~)', !r.errors && ev(r, 't', 'https://x.com/a.pdf') === true && ev(r, 't', 'https://x.com/a.doc') === true && ev(r, 't', 'https://x.com/a.txt') === false);
assert('U5b: url正则默认大小写敏感', ev(r, 't', 'https://x.com/a.PDF') === false);
r = condExpr('url =~ /\\.pdf$/i', 'google');
assert('U5c: 加i忽略大小写', ev(r, 't', 'https://x.com/a.PDF') === true);

r = condExpr('url/example\\.(com|net)/', 'google');
assert('U6: url简写(正则内括号与|整吞)', !r.errors && ev(r, 't', 'https://example.com/') === true && ev(r, 't', 'https://example.net/') === true && ev(r, 't', 'https://other.net/') === false);

r = condExpr('url/a&b|c/', 'google');
assert('U7: url简写(正则内&与|不切分)', !r.errors && ev(r, 't', 'https://x/a&b') === true && ev(r, 't', 'https://x/zzc') === true);

r = condExpr('url/example\\.net/i', 'google');
assert('U8: url简写带flags', !r.errors && ev(r, 't', 'https://EXAMPLE.NET/') === true);

r = condExpr('title/example/i', 'google');
assert('U9: title简写带flags', !r.errors && ev(r, 'EXAMPLE!', 'https://x/') === true && ev(r, 'other', 'https://x/') === false);

r = condExpr('title *= "a/b"', 'google');
assert('U10: 引号内斜杠不受正则判定影响', !r.errors && ev(r, 'a/b title', 'https://x/') === true);

r = condExpr('url/example\\.com/ | title *= "kw"', 'google');
assert('U11: url简写与或组合', ev(r, 'plain', 'https://example.com/') === true && ev(r, 'has kw', 'https://other.com/') === true && ev(r, 'none', 'https://other.com/') === false);

r = condExpr('url ^= "https://mp.weixin.qq.com" & !(title *= "ad")', 'google');
assert('U12: url前缀&取反组合', ev(r, 'normal', 'https://mp.weixin.qq.com/s/x') === true && ev(r, 'ads here', 'https://mp.weixin.qq.com/s/x') === false);

r = condExpr('!(url $= ".pdf")', 'google');
assert('U13: !取反url条件', !r.errors && ev(r, 't', 'https://x.com/a.html') === true && ev(r, 't', 'https://x.com/a.pdf') === false);

r = condExpr('url ^= "https://ex.com"', 'google');
assert('U14: url缺失->条件假', ev(r, 't', undefined) === false);
r = condExpr('!(url ^= "https://ex.com")', 'google');
assert('U14b: 取反后url缺失->真', ev(r, 't', undefined) === true);

r = condExpr('url =~ /x/g', 'google');
assert('U15: url正则非法flags(g)', r.errors && r.errors[0].startsWith('flags:g'));
r = condExpr('url/x/g', 'google');
assert('U15b: url简写非法flags', r.errors && r.errors[0].startsWith('flags:g'));
r = condExpr('url/example/g', 'google');
assert('U15c: url简写非法flags2', r.errors && r.errors.some((e) => e.startsWith('flags:g')));
r = condExpr('title/x/g', 'google');
assert('U15d: title简写非法flags', r.errors && r.errors[0].startsWith('flags:g'));
r = condExpr('url =~ /(/)', 'google');
assert('U16: url正则无效', r.errors && r.errors[0].startsWith('regex'));
r = condExpr('url ^= "https://ex" & url $= "/s/"', 'google');
assert('U17: 双url条件AND', ev(r, 't', 'https://ex.com/s/') === true && ev(r, 't', 'https://ex.com/other/') === false);

r = condExpr('url = ~"x"', 'google');
assert('U18: 乱写归unknown', r.errors && r.errors[0].startsWith('unknown'));

// ---- $site 变量(uBlacklist 引擎属性)----
r = condExpr('$site = "google"', 'google');
assert('S1: $site命中', r.const === true);
r = condExpr('$site = "google"', 'bing');
assert('S2: $site未命中', r.const === false);
r = condExpr('$site = "BING"', 'bing');
assert('S3: $site忽略大小写', r.const === true);
r = condExpr('$site = "ddg"', 'duckduckgo');
assert('S4: $site ddg别名', r.const === true);
r = condExpr('$site : "yandex"', 'yandex');
assert('S5: $site冒号形式', r.const === true);
r = condExpr('$site = "google" & title *= "x"', 'google');
assert('S6: $site与动态组合(google)', !r.const && ev(r, 'xx', 'https://x/') === true && ev(r, 'yy', 'https://x/') === false);
r = condExpr('$site = "google" & title *= "x"', 'bing');
assert('S6b: 组合在bing折叠恒假', r.const === false);
r = condExpr('$site = "google" | $site = "bing"', 'google');
assert('S7: $site多引擎或(google)', r.const === true);
r = condExpr('$site = "google" | $site = "bing"', 'bing');
assert('S7b: 多引擎或(bing)', r.const === true);
r = condExpr('$site = "google" | $site = "bing"', 'yandex');
assert('S7c: 多引擎或(yandex恒假)', r.const === false);
r = condExpr('$site = "foo"', 'google');
assert('S8: 未知站点值->静态假(不报错)', r.const === false && !r.errors);
r = condExpr('$site = google', 'google');
assert('S9: 值未加引号->unknown', r.errors && r.errors[0].startsWith('unknown'));
r = condExpr('!($site = "yandex")', 'google');
assert('S10: $site取反', r.const === true);
r = condExpr('$site = "bing" | $site = "yandex"', 'yandex');
assert('S11: $site多值或', r.const === true);
r = condExpr('$site = "yahoo-japan"', 'yahoo');
assert('S12: $site yahoo-japan别名命中', r.const === true);
r = condExpr('$site = "yahoo-japan"', 'google');
assert('S13: $site yahoo-japan非yahoo恒假', r.const === false);
r = condExpr('$site = "yahoo"', 'yahoo');
assert('S14: $site yahoo原值仍可用', r.const === true);

// ---- 行尾 # 注释剥离 ----
assert('C1: URL规则行尾注释', m.stripRuleComment('*://x.com/* # 注释') === '*://x.com/*');
assert('C2: 整行注释', m.stripRuleComment('# 注释') === '');
assert('C3: 空白+#注释', m.stripRuleComment('   # x') === '');
assert('C4: 正则内#保留', m.stripRuleComment('/a#b/') === '/a#b/');
assert('C5: 正则行尾注释', m.stripRuleComment('/a#b/ # note') === '/a#b/');
assert('C6: title正则内#保留+行尾注释', m.stripRuleComment('title/.*#.*/ # note') === 'title/.*#.*/');
assert('C7: text正则', m.stripRuleComment('text/a #b/') === 'text/a #b/');
assert('C8: 引号内#与行尾注释', m.stripRuleComment('*://x.com/* @if(title *= "a # b") # note') === '*://x.com/* @if(title *= "a # b")');
assert('C9: @if正则内括号配平', m.stripRuleComment('*://x.com/* @if(title =~ /a)b/) # x') === '*://x.com/* @if(title =~ /a)b/)');
assert('C10: site(...)括号计数', m.stripRuleComment('*://x.com/* @if(site("x.com") & title *= "y") # x') === '*://x.com/* @if(site("x.com") & title *= "y")');
assert('C11: 白名单注释', m.stripRuleComment('@*://x.com/* # 放行') === '@*://x.com/*');
assert('C12: 高亮@N注释', m.stripRuleComment('@1 /a#b/ # note') === '@1 /a#b/');
assert('C13: URL内非空白#保留', m.stripRuleComment('*://x.com/a#b') === '*://x.com/a#b');
assert('C14: 无注释原样', m.stripRuleComment('*://x.com/* @if(Google)') === '*://x.com/* @if(Google)');
assert('C15: #前无空格不截', m.stripRuleComment('title/.*a#b/') === 'title/.*a#b/');
assert('C16: @if后带空格', m.stripRuleComment('*://x.com/* @if (title *= "a") # c') === '*://x.com/* @if (title *= "a")');
assert('C17: 嵌套@if括号', m.stripRuleComment('*://x.com/* @if((title *= "a" | title *= "b") & !(url *= "c")) # x') === '*://x.com/* @if((title *= "a" | title *= "b") & !(url *= "c"))');
assert('C18: 引号内转义引号', m.stripRuleComment('*://x.com/* @if(title *= "a\\"b # c") # x') === '*://x.com/* @if(title *= "a\\"b # c")');
assert('C19: 尾部注释含#', m.stripRuleComment('*://x.com/* # a # b') === '*://x.com/*');
assert('C20: 高亮域名注释', m.stripRuleComment('@1 *://x.com/* # c') === '@1 *://x.com/*');
assert('C21: 独立表达式行尾注释', m.stripRuleComment('host $= ".example.com" # note') === 'host $= ".example.com"');
assert('C22: 独立表达式引号内#', m.stripRuleComment('title *= "a # b" # note') === 'title *= "a # b"');
assert('C23: 独立表达式正则行尾注释', m.stripRuleComment('host/\\.example\\.com$/i # x') === 'host/\\.example\\.com$/i');
assert('C24: 独立表达式白名单注释', m.stripRuleComment('@host $= ".example.com" # 放行') === '@host $= ".example.com"');
assert('C25: 独立表达式高亮注释', m.stripRuleComment('@1 path $= ".pdf" # hl') === '@1 path $= ".pdf"');

// ---- host / path / scheme 变量 ----
r = condExpr('host $= ".example.com"', 'google');
assert('H1: host后缀-子域', !r.errors && ev(r, 't', 'https://www.example.com/') === true);
assert('H2: host后缀-裸域兼容', ev(r, 't', 'https://example.com/') === true);
assert('H3: host后缀-负例', ev(r, 't', 'https://example.net/') === false && ev(r, 't', 'https://badexample.com/') === false);

r = condExpr('host $= "example.com"', 'google');
assert('H4: host后缀无点前缀', ev(r, 't', 'https://www.example.com/') === true && ev(r, 't', 'https://example.com/') === true);

r = condExpr('host = "www.example.com"', 'google');
assert('H5: host精确', ev(r, 't', 'https://www.example.com/x') === true && ev(r, 't', 'https://example.com/') === false);

r = condExpr('host ^= "www"', 'google');
assert('H6: host前缀', ev(r, 't', 'https://www.example.com/') === true && ev(r, 't', 'https://api.example.com/') === false);

r = condExpr('host *= "example"', 'google');
assert('H7: host包含', ev(r, 't', 'https://www.example.com/') === true);

r = condExpr('host =~ /(^|\\.)example\\.com$/i', 'google');
assert('H8: host正则', !r.errors && ev(r, 't', 'https://example.com/') === true && ev(r, 't', 'https://badexample.com/') === false);

r = condExpr('host/\\.example\\.com$/i', 'google');
assert('H9: host简写(正则含|不切分)', !r.errors && ev(r, 't', 'https://www.example.com/') === true && ev(r, 't', 'https://example.net/') === false);

r = condExpr('host $= ".example.com"', 'google');
assert('H10: 忽略大小写', ev(r, 't', 'https://WWW.EXAMPLE.COM/') === true);

r = condExpr('path *= "/download/"', 'google');
assert('P1: path包含', !r.errors && ev(r, 't', 'https://x.com/download/setup.exe') === true && ev(r, 't', 'https://x.com/dl/x') === false);

r = condExpr('path $= ".pdf"', 'google');
assert('P2: path后缀', ev(r, 't', 'https://x.com/a/file.pdf') === true);

r = condExpr('path ^= "/download"', 'google');
assert('P3: path前缀', ev(r, 't', 'https://x.com/download/setup.exe') === true);

r = condExpr('path = "/download/"', 'google');
assert('P4: path精确', ev(r, 't', 'https://x.com/download/') === true && ev(r, 't', 'https://x.com/download/x') === false);

r = condExpr('path =~ /^\\/download\\//i', 'google');
assert('P5: path正则(=~)', !r.errors && ev(r, 't', 'https://x.com/Download/a') === true);

r = condExpr('path/download/', 'google');
assert('P6: path简写', !r.errors && ev(r, 't', 'https://x.com/download/setup') === true);

r = condExpr('path *= "/dl/" & path *= ".zip"', 'google');
assert('P7: path双条件AND', ev(r, 't', 'https://x.com/a/dl/b.zip') === true && ev(r, 't', 'https://x.com/a/dl/b.rar') === false);

r = condExpr('path *= "/a%20b/"', 'google');
assert('P8: path含编码空格值(原样比较)', !r.errors && ev(r, 't', 'https://x.com/a%20b/c') === true && ev(r, 't', 'https://x.com/ab/c') === false);

r = condExpr('scheme = "https"', 'google');
assert('SC1: scheme精确', !r.errors && ev(r, 't', 'https://x.com/') === true && ev(r, 't', 'http://x.com/') === false);

r = condExpr('scheme = "HTTP"', 'google');
assert('SC2: scheme忽略大小写', ev(r, 't', 'http://x.com/') === true);

r = condExpr('scheme ^= "http"', 'google');
assert('SC3: scheme前缀', ev(r, 't', 'https://x.com/') === true);

r = condExpr('host $= ".example.com" & path *= "/download/" & scheme = "https"', 'google');
assert('M1: host&path&scheme组合', ev(r, 't', 'https://dl.example.com/download/x') === true && ev(r, 't', 'http://dl.example.com/download/x') === false);

r = condExpr('!(host $= ".example.com")', 'google');
assert('M2: host取反', ev(r, 't', 'https://other.com/') === true && ev(r, 't', 'https://example.com/') === false);

r = condExpr('host $= ".example.com"', 'google');
assert('M3: url缺失->假', ev(r, 't', undefined) === false);
r = condExpr('!(host $= ".example.com")', 'google');
assert('M3b: 取反后url缺失->真', ev(r, 't', undefined) === true);

r = condExpr('path $= ".pdf"', 'google');
assert('M4: 非法url->假', ev(r, 't', 'not a url') === false);

r = condExpr('host =~ /x/g', 'google');
assert('M5: host正则非法flags', r.errors && r.errors[0].startsWith('flags:g'));
r = condExpr('path/x/g', 'google');
assert('M5b: path简写非法flags', r.errors && r.errors[0].startsWith('flags:g'));

r = condExpr('scheme = "https" | host $= ".org"', 'google');
assert('M6: 与或组合', ev(r, 't', 'https://anything/') === true && ev(r, 't', 'http://x.org/') === true && ev(r, 't', 'http://x.com/') === false);

// ---- P0-3: flags u / P1-3: 订阅 frontmatter ----
r = condExpr('title =~ /\\u{4E2D}/u', 'google');
assert('F1: title =~ 支持u flag', !r.errors && ev(r, '中文字', 'https://x/') === true);
r = condExpr('url/example/u', 'google');
assert('F2: url简写支持u flag', !r.errors && ev(r, 't', 'https://example.com/') === true);
r = condExpr('title =~ /x/u', 'google');
assert('F3: flags预检不再拒u', !r.errors);

const stripEmpty = (ls) => ls.map(l => l.trim()).filter(l => l);
const pc1 = m.parseRulesetContent('---\nname: My Rules\n---\n*://*.example.com/*\n');
assert('R1: 标准frontmatter剥离', pc1.meta.name === 'My Rules' && stripEmpty(pc1.lines).length === 1 && stripEmpty(pc1.lines)[0] === '*://*.example.com/*');
const pc2 = m.parseRulesetContent('---\nname: "Quoted List"\n---\n/a#b/\n');
assert('R2: 引号name', pc2.meta.name === 'Quoted List' && stripEmpty(pc2.lines).length === 1);
const pc3 = m.parseRulesetContent('---\nname: X\n# comment in head\n---\n*://a.com/*\n*://b.com/*\n');
assert('R3: 多规则+头内注释行', pc3.meta.name === 'X' && stripEmpty(pc3.lines).length === 2);
const pc4 = m.parseRulesetContent('*://a.com/*\n---\nname: x\n---\n');
assert('R4: 非frontmatter开头(原样)', pc4.meta.name === undefined && stripEmpty(pc4.lines).length === 4);
const pc5 = m.parseRulesetContent('---\nname: Unclosed\n*://a.com/*\n');
assert('R5: frontmatter未闭合(原样处理)', pc5.meta.name === undefined && stripEmpty(pc5.lines).length === 3);
const pc6 = m.parseRulesetContent('---\n---\n*://a.com/*\n');
assert('R6: 空frontmatter', pc6.meta.name === undefined && stripEmpty(pc6.lines).length === 1);
const pc7 = m.parseRulesetContent('---\nother: value\nname: Multi List\nversion: 2\n---\n*://a.com/*\n');
assert('R7: name位于多键中间', pc7.meta.name === 'Multi List' && stripEmpty(pc7.lines).length === 1);

// ---- uBlacklist 独立 i 修饰符兼容(默认仍忽略大小写)----
r = condExpr('title *= "KW" i', 'google');
assert('I1: title包含+i修饰', !r.errors && ev(r, 'contains kw', 'https://x/') === true && ev(r, 'nothing', 'https://x/') === false);
r = condExpr('title $= "Domain" I', 'google');
assert('I2: 大写I修饰', !r.errors && ev(r, 'Example DOMAIN', 'https://x/') === true);
r = condExpr('title = "AbC" i', 'google');
assert('I3: title精确+i', !r.errors && ev(r, 'abc', 'https://x/') === true && ev(r, 'abd', 'https://x/') === false);
r = condExpr('url $= ".PDF" i', 'google');
assert('I4: url后缀+i', !r.errors && ev(r, 't', 'https://x.com/a.pdf') === true);
r = condExpr('host $= ".example.com" i', 'google');
assert('I5: host后缀+i', !r.errors && ev(r, 't', 'https://www.EXAMPLE.COM/') === true);
r = condExpr('path ^= "/DO" i', 'google');
assert('I6: path前缀+i', !r.errors && ev(r, 't', 'https://x.com/Download/a') === true && ev(r, 't', 'https://x.com/other') === false);
r = condExpr('scheme = "HTTPS" i', 'google');
assert('I7: scheme+i', !r.errors && ev(r, 't', 'https://x.com/') === true);
r = condExpr('$site = "GOOGLE" i', 'google');
assert('I8: $site+i', r.const === true);
r = condExpr('site = "GOOGLE.COM.HK" i', 'google', 'www.google.com.hk');
assert('I9: site+i', r.const === true);
r = condExpr('site("GOOGLE.COM.HK") i', 'google', 'www.google.com.hk');
assert('I10: site(...)括号形式+i', r.const === true);
r = condExpr('title *= "a"i', 'google');
assert('I11: 紧贴无空格i', !r.errors && ev(r, 'xa', 'https://x/') === true);
r = condExpr('title *= "a" ix', 'google');
assert('I12: i后多余字符->unknown', r.errors && r.errors[0].startsWith('unknown'));
r = condExpr('title *= "a" i | title *= "b" i', 'google');
assert('I13: 多条件带i或', !r.errors && ev(r, 'xx a', 'https://x/') === true && ev(r, 'zz', 'https://x/') === false);
r = condExpr('title *= "a" i & !(url *= "ads")', 'google');
assert('I14: 与&!组合带i', !r.errors && ev(r, 'a t', 'https://x/') === true && ev(r, 'a t', 'https://x/ads/') === false);
r = condExpr('url *= "example"', 'google');
assert('I15: 无i修饰回归(默认忽略大小写)', !r.errors && ev(r, 't', 'https://EXAMPLE.com/') === true);

// ---- $category 静态折叠 ----
r = condExpr('$category = "web"', 'google', 'www.google.com', 'web');
assert('CAT1: web页命中', r.const === true);
r = condExpr('$category = "images"', 'google', 'www.google.com', 'web');
assert('CAT2: web页images条件恒假', r.const === false);
r = condExpr('$category = "images"', 'google', 'www.google.com', 'images');
assert('CAT3: 图片页命中', r.const === true);
r = condExpr('$category : "videos"', 'google', 'www.google.com', 'videos');
assert('CAT4: 冒号形式', r.const === true);
r = condExpr('$category = "NEWS" i', 'google', 'www.google.com', 'news');
assert('CAT5: 忽略大小写+i修饰', r.const === true);
r = condExpr('$category = "images" & title *= "x"', 'google', 'www.google.com', 'web');
assert('CAT6: 与动态组合在web折叠恒假', r.const === false);
r = condExpr('$category = "images" & title *= "x"', 'google', 'www.google.com', 'images');
assert('CAT6b: 图片页剩title条件', !r.const && ev(r, 'xx', 'https://x/') === true && ev(r, 'yy', 'https://x/') === false);
r = condExpr('$category = "web" | $category = "images"', 'google', 'www.google.com', 'web');
assert('CAT7: 多类型或(web)', r.const === true);
r = condExpr('$category = "images" | $category = "videos"', 'google', 'www.google.com', 'web');
assert('CAT7b: 多类型或未命中恒假', r.const === false);
r = condExpr('!($category = "images")', 'google', 'www.google.com', 'web');
assert('CAT8: 取反(非图片页)', r.const === true);
r = condExpr('$category = "foo"', 'google', 'www.google.com', 'web');
assert('CAT9: 未知类型值->静态假(不报错)', r.const === false && !r.errors);
r = condExpr('$category = images', 'google');
assert('CAT10: 值未加引号->unknown', r.errors && r.errors[0].startsWith('unknown'));
r = condExpr('$site = "google" & $category = "images"', 'google', 'www.google.com', 'images');
assert('CAT11: $site与$category同时命中', r.const === true);
r = condExpr('$site = "google" & $category = "images"', 'google', 'www.google.com', 'web');
assert('CAT11b: $site命中但category不命中', r.const === false);

// ---- 条件表达式识别(行级判定) ----
const condTrueCases = [
  'host $= ".example.com"',
  'path *= "/download/"',
  'title *= "关键词"',
  'title ^= "关键词"',
  'title $= "关键词"',
  'title = "关键词"',
  'url =~ /example\\.(com|net)/',
  'url/example\\.(com|net)/',
  'host/\\.example\\.com$/i',
  'scheme = "https"',
  'scheme="http"',
  '$site = "google"',
  '$category = "images"',
  'site = "google.com.hk"',
  '!scheme = "https"',
  '(host $= "a" | title *= "b")',
  'host $= ".example.com" & path *= "/download/"',
  'title *= "example" i | title *= "domain" i',
];
for (const rule of condTrueCases) {
  assert(`D: 条件表达式识别 ${rule}`, m.looksLikeCondExpr(rule) === true);
}

const condFalseCases = [
  'https://example.com/?url=x',
  'https://example.com/?a=1&title=x',
  'https://example.com/path?host=x',
  'https://example.com/?site=x',
  'https://example.com/?path=x',
  'https://example.com/?scheme=http',
  'https://example.com/?url="x"',
  '*://*.example.com/*',
  '/example\\.com/',
  'title/foo/i',
  'text/ad/',
  'example.com',
  'https://example.com/',
];
for (const rule of condFalseCases) {
  assert(`D: 非条件表达式 ${rule}`, m.looksLikeCondExpr(rule) === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
