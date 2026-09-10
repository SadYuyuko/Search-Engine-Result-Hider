## <img src="https://github.com/user-attachments/assets/92954a5d-7157-40ed-9309-b9d75bf2bd32" width="30" height="30" align="center"> Search Engine Result Hider

### 1.1 Introduction

[中文](README.md) | [English](README.en.md) | Discussion [TG](https://t.me/+qBqMTqjc4Xk5M2Jh)  
Implements complex-rule blocking of search results on browsers that only support installing user scripts.  
Supports uBlacklist basic rules, URL matching, regex matching, title matching, whitelist matching, highlighting target results, and result snippet matching.  
Currently supported search engines: Bing, Google, DuckDuckGo, Yandex, Brave, Yahoo.

Install sources [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://update.greasyfork.org/scripts/552394/%E6%90%9C%E7%B4%A2%E5%BC%95%E6%93%8E%E7%BB%93%E6%9E%9C%E5%B1%8F%E8%94%BD%E5%99%A8.user.js)

Click the links in a browser that supports installing user scripts to install directly.

### 1.2 Features:
- Basic/advanced syntax matching
- One-click domain blocking
- Display matched rule counts and debug output
- Import/export rules to TXT
- Rule error detection
- Rule subscriptions
- WebDAV synchronization
- Script manager menu  
┣ Open configuration panel  
┣ Language switching  
┣ Edit highlight result colors  
┣ Toggle error detection on/off  
┣ Toggle floating bubble visibility  
┣ Toggle panel centering: centered by default; when disabled, the panel appears in one of four corners based on the floating bubble's position  
┗ Toggle floating bubble function:  
　┗ 🟢 Click to open the panel  
　┗ 🔵 Click to toggle visibility of blocked results; long-press to open the configuration panel. Clicking the block button on a blocked result unblocks it.

### 1.3 About WebDAV:
1. Auto-sync runs once per hour, performing deduplication and merging. Manual upload/download performs an overwrite sync.
2. Only HTTPS addresses and full folder path are supported, e.g., for Nutstore: `https://dav.jianguoyun.com/dav/your_folder/`
3. Sync configuration takes effect after refreshing the page.

### 1.4 About Subscription:
1. Subscriptions update once per day. Only remote `.txt` or `.yaml` file links are supported, e.g. `https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Other/rules.txt`.
2. Subscription rules are appended after local rules, due to the limited performance the script can allocate, it is recommended that the total number of rules not exceed 30,000 to avoid performance issues on mobile devices.
3. The script has limited extensions and does not support DOM-type syntax rules such as `##`. Such rules will be automatically removed when imported via subscription.

### 1.5 Notes:
1. One-click blocking logic: Block `example.com` and add the rule `*://example.com/*` (block domain name is enabled as `*://*.example.com/*`). Unblocking does not delete the source rule but instead creates a whitelist `@*://example.com/*` (domain block enabled is `@*://*.example.com/*`).
2. Subscription and WebDAV sync requires cross-origin request permissions, if there is a permission request in a pop-up select `Always allow`.
3. Rule priority: local whitelist > local blacklist > subscription whitelist > subscription blacklist

## Rule Description

### 2.1 URL Matching:

| Rule | Description |
| --- | --- |
| `*://www.example.com/*` | matches `example.com` |
| `*://*.example.com/*` | matches `example.com` and all its subdomains |
| `*://*.example.com/path/*` | matches a specific path under `example.com` |
| `*://*.example.*` | matches `example.com` across all top-level domains |

When adding domain name rules in the script, you can write the domain directly without the `*://*.` prefix (e.g. `example.com`), but rules used in uBlacklist must include the full prefix.  
URL wildcard rules match from the beginning of the URL following match-pattern semantics; `*://` matches http/https only, host wildcards `*` do not cross path separators, and a leading `*.` also matches the bare domain.

### 2.2 Regex Matching:

| Rule | Description |
| --- | --- |
| `/pattern/flags` | Use regex to match URL, e.g. `/example\.(com\|net)/i` |
| `title/pattern/flags` | Use regex to match title, e.g. `title/.*block.*/i` |
| `text/pattern/flags` | Use regex to match snippet, e.g. `text/.*ad.*/i` |

Regular expressions use the browser-supported JavaScript `RegExp` flags `i`, `m`, `s`, `u`, where `s` uses the native dotAll flag (dot matches newlines); `g` and `y` are not supported. The script only checks whether a rule matches and does not perform global extraction.

### 2.3 Title Matching:

| Rule | Description |
| --- | --- |
| `title/.*example.*/` | matches results whose title contains `example` |
| `title/^example.*/` | matches results whose title starts with `example` |
| `title/.*example(A\|B).*/` | matches results whose title contains `exampleA` or `exampleB` |
| `title/.*example(A\|B).*/i` | same as above, but case-insensitive (also matches `examplea` and `exampleb`) |
| `title/.*exampleAbC.*/i` | case-insensitive; matches `exampleAbC`, `exampleABC`, etc. |
| `title/^(?=.*keyword1)(?=.*(?:keyword2)).*/i` | matches results containing both `keyword1` and `keyword2`, regardless of order |
| `title/^(?=.*keyword1)(?=.*(?:keyword2\|keyword3)).*/i` | same as above, but matches `keyword1` + `keyword2` or `keyword1` + `keyword3` |

### 2.4 Snippet Matching:

| Rule | Description |
| --- | --- |
| `text/.*example.*/` | matches results whose snippet/description contains `example`. This rule does not match titles. |
| `text/.*example.*/i` | same as above, case-insensitive. |

### 2.5 Whitelist Matching:

| Rule | Description |
| --- | --- |
| `@*://*.com/*` | allow all pages whose domain ends with `.com` |
| `@*://example.com/*` | allow the main site `example.com` |
| `@*://*.example.com/*` | allow `example.com` and all its subdomains |
| `@*://example.com/abc/*` | allow only the specific path `/abc` on `example.com` |
| `@*://*.example.com/abc/*` | allow only the specific path `/abc` on subdomains of `example.com` |

### 2.6 Highlighting Rules:

| Rule | Description |
| --- | --- |
| `@N *://*.example.com/*` | adds a colored border to results from `example.com` and its subdomains |
| `@N title/.*example.*/` | adds a colored border to results whose title contains `example` |

Priority: highlight > whitelist, but blacklist > highlight  
Note: `@N` only supports 5 colors, numbered `@1` through `@5`. Open the custom color panel via the script menu.

### 2.7 Composite Rules:

**Notes:**
1. Append `@if(...)` to a rule to add extra conditions. Multiple `@if` conditions take effect simultaneously (logical AND `&`, which can be combined into a single `@if`). Matching of composite rules is case-insensitive by default.
2. A condition expression can also stand alone as a full rule without wrapping `@if(...)`, e.g. `host $= ".example.com"`, `path *= "/download/"`. It applies to all search results.
3. Inside a single `@if()` you can use full logical operators: `|` OR, `&` AND, `!` NOT, with `( )` parentheses for grouping. Operator precedence: `!` > `&` > `|`. 
4. `!` negates the condition itself. When a result lacks the compared content (e.g. no title), the condition is treated as false, so its negation is true; e.g. `!(title *= "keyword")` also matches results without a title.

**Supported conditions in `@if()`:**

| Condition Type | Syntax | Description |
| --- | --- | --- |
| Search Engine | `$site = "google"` | only apply on the specified search engine; accepts `google`/`bing`/`duckduckgo` (`ddg`)/`yandex`/`brave`/`yahoo`, case-insensitive, `=` or `:` separator |
| Search Category | `$category = "web"` | only apply on the specified search type; accepts `web`/`images`/`videos`/`news`, inferred from the current page URL, defaults to `web` on web search |
| Site | `site = "google.com.hk"` | only apply on the specified regional site of the search engine |
| Title Contains | `title *= "keyword"` | title contains the specified string |
| Title Exact | `title = "Example Domain"` | title exactly matches the specified string |
| Title Prefix | `title ^= "Example"` | title starts with the specified string |
| Title Suffix | `title $= "Domain"` | title ends with the specified string |
| Title Regex | `title =~ /regex/` (or shorthand `title/regex/`) | title matches regex; `=~` can be omitted, add `i` for case-insensitive |
| URL Exact | `url = "https://example.com/"` | URL exactly matches the specified string |
| URL Prefix | `url ^= "https://abc.example.com"` | URL starts with the specified string |
| URL Suffix | `url $= ".pdf"` | URL ends with the specified string |
| URL Contains | `url *= "example"` | URL contains the specified string |
| URL Regex | `url =~ /regex/` (or shorthand `url/regex/`) | URL matches regex; `=~` can be omitted, add `i` for case-insensitive |
| URL Host | `host $= ".example.com"` | matches the result URL's hostname; `$=` also matches the bare domain, i.e. `host $= ".example.com"` matches both `example.com` and `www.example.com` |
| URL Path | `path *= "/download/"` | matches the result URL's pathname + search |
| URL Scheme | `scheme = "https"` | matches the result URL's protocol, e.g. `https`/`http` |
| Logical Ops | `\|` OR, `&` AND, `!` NOT | combine any conditions |
| Grouping | `( )` | nest sub-conditions |

`title`/`url`/`host`/`path`/`scheme` all support `=`, `^=`, `$=`, `*=`, `=~` (and the shorthand without `=~`, e.g. `host/regex/`); string comparisons are case-insensitive by default, while `=~` case sensitivity follows the regex flags. Compatible with the case modifier `i` in uBlacklist rules (e.g. `title $= "Domain" i`). This syntax is only used to recognize and be compatible with such rules; the script ignores case by default.

**Composite rule examples:**

| Rule | Description |
| --- | --- |
| `*://*.example.com/* @if(title *= "keyword")` | block results from `example.com` whose title contains `keyword` |
| `*://*.example.com/* @if(title *= "kw1" \| title *= "kw2")` | block results whose title contains `kw1` or `kw2` |
| `*://*.example.com/* @if(title =~ /kw1\|kw2/)` | regex form, add `i` for case-insensitive |
| `*://*.example.com/* @if(url *= "test")` | block results whose URL contains `test`, e.g. `example.com/*/test/*` |
| `*://*.example.com/* @if(title *= "keyword" & !(url *= "test"))` | block results whose title contains `keyword` and whose URL does NOT contain `test` |
| `*://*.example.com/* @if(site = "google.com.hk")` | block `example.com` only on Google HK |
| `*://*.example.com/* @if($site = "google")` | block `example.com` only on Google |
| `*://*.amazon.com/* @if($category = "images")` | block `amazon.com` only on image search |
| `*://*.example.com/* @if($site = "google") @if(title *= "example")` | block results from `example.com` whose title contains `example`, only on Google |
| `*://*.example.com/* @if(title *= "a" \| title *= "b") @if(!(url *= "c"))` | block results whose title contains `a` or `b` AND whose URL does not contain `c` (multiple `@if` are ANDed; `!` applies to the group) |
| `title/.*example.*/ @if($site = "google")` | block results whose title contains `example`, only on Google |
| `text/.*example.*/ @if($site = "google" \| $site = "bing")` | block results whose snippet contains `example` on both Google and Bing |
| `path *= "/download/"` | block results whose path contains `/download/` |
| `host $= ".example.com" & path *= "/download/"` | block `example.com` results whose path contains `/download/` |
| `@1 path $= ".pdf"` | highlight results whose path ends with `.pdf` |

## Testing

### 3.1 Requirements

- Node.js 14+
- No additional dependencies required

### 3.2 Running the tests

Place the test folder and the script in the same directory to run; tests automatically read the `.js` script from the parent directory, covering conditional expression parsing and recognition, `@if` condition extraction and URL path conflicts, search engine detection and `@match/@include` consistency, priority, standalone expressions, wildcard escaping and regex flags, rule filtering (element/uBO network rules), import cancellation, cross-origin permissions, and rule source labeling tests.

```bash
# Run all tests
node test/test-cond-expr.cjs
node test/test-if-cond.cjs
node test/test-engine.cjs
node test/test-priority.cjs
node test/test-standalone-expr.cjs
node test/test-regex.cjs
node test/test-rule-filter.cjs
node test/test-import-cancel.cjs
node test/test-connect.cjs
node test/test-rule-source.cjs

# Run a specific test
node test/test-cond-expr.cjs 2>&1 | grep "FAIL"
```

A successful run outputs something like `10 passed, 0 failed`.

### 3.3 Debug mode

Use the [网页调试](https://greasyfork.org/zh-CN/scripts/475228) script, or the desktop browser F12 developer tools → Console tab, to view the output.

Enter the following commands to see the corresponding output.

```bash
// View the current configuration
console.log('当前配置:', GM_getValue('searchfilter_blocker'));

// View the compiled rules
console.log('编译规则:', compiledRules);

// View the search engine detection
console.log('搜索引擎:', getSearchEngine());

// View the number of results on the current page
console.log('结果数量:', document.querySelectorAll('div.g').length);

// Monitor rule matching performance
console.time('规则匹配');
checkRuleMatchOptimized(url, domain, title, snippet, subdomainLevels);
console.timeEnd('规则匹配');

// Monitor DOM query performance
console.time('结果查询');
document.querySelectorAll(selector);
console.timeEnd('结果查询');
```

Normal output

```bash
// Normal startup
[屏蔽] 引擎: google, 选择器: "div.g, div.MjjYud", 匹配数量: 15
[屏蔽] 未处理的新结果数量: 15
[屏蔽] 共屏蔽 3 个结果

// Indicates: the Google engine was detected, 15 results were found, and 3 were hidden
```

Error output

```bash
// Rule syntax error
规则预编译失败: *://example.com/* Error: Invalid regex pattern

// Indicates: the rule syntax is incorrect, check the rule format
```

## Screenshots

<img width="450" height="288" alt="01" src="https://github.com/user-attachments/assets/8523f109-84d1-4eba-b8d5-678b0a824340" />
<br/>
<img width="200" height="133" alt="03" src="https://github.com/user-attachments/assets/32cdce71-23b3-4ed9-9ac7-9220af80beb1" />
