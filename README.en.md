## Search Engine Result Hider

## A tool to hide unwanted search results

### <img src="https://github.com/user-attachments/assets/92954a5d-7157-40ed-9309-b9d75bf2bd32" width="30" height="30" align="center"> [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) Install

[中文](README.md) | [English](README.en.md) | Discussion [TG](https://t.me/+qBqMTqjc4Xk5M2Jh)  
Block unwanted search results with complex rule matching on browsers that only support user scripts.  
Supports uBlacklist compatible basic rules, URL matching, regex matching, title matching, whitelist matching, highlighting target results, and matching result snippet text.  
Currently supported search engines: Bing, Google, DuckDuckGo, Yandex, Brave, Yahoo.

**Features:**
- One-click domain blocking via a block button
- Display matched rule counts and debug output
- Import/export rules to timestamped TXT files
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

**About WebDAV:**
1. Auto-sync runs once per hour, performing deduplication and merging. Manual upload/download performs an overwrite sync.
2. WebDAV sync requires cross-origin request permissions; only HTTPS addresses and full folder path are supported, e.g., for Nutstore: `https://dav.jianguoyun.com/dav/your_folder/`.
3. Sync configuration takes effect after refreshing the page.

**Notes:**
1. Subscriptions update once per day. Only remote `.txt` file links are supported, with a maximum of 3 subscriptions. Subscription rules are applied after local rules. A subscription file may start with YAML frontmatter (e.g. `---\nname: Ruleset name\n---`), which is stripped and its metadata read on import. Due to the limited performance budget of user scripts, the total number of rules should not exceed 20,000 to avoid performance issues on mobile devices.
2. `##` DOM syntax rules are not supported. Such rules will be automatically removed when imported via subscription.

### Basic Rules:

Comments are supported: a line starting with `#` is a comment; you can also append a comment after a rule (a space must precede `#`), e.g. `*://*.example.com/* # block example site`. A `#` inside quotes or a regular expression is NOT treated as a comment.

**URL Matching:**

| Rule | Description |
| --- | --- |
| `*://www.example.com/*` | matches `example.com` |
| `*://*.example.com/*` | matches `example.com` and all its subdomains |
| `*://*.example.com/path/*` | matches a specific path under `example.com` |
| `*://*.example.*` | matches `example.com` across all top-level domains |

When adding domain name rules in the script, you can write the domain directly without the `*://*.` prefix (e.g. `example.com`), but rules used in uBlacklist must include the full prefix.

**Regex Matching:**

| Rule | Description |
| --- | --- |
| `/pattern/flags` | Use regex to match URL, e.g. `/example\.(com\|net)/i` |
| `title/pattern/flags` | Use regex to match title, e.g. `title/.*block.*/i` |
| `text/pattern/flags` | Use regex to match snippet, e.g. `text/.*ad.*/i` |

Common regular uses browser-supported JavaScript `RegExp` flags, supports `i`,`m`,`s`,`u`, where `s` will be converted to cross-line matching; does not support `g`,`y`, script rules only determine whether to match without performing global extraction.

**Title Matching:**

| Rule | Description |
| --- | --- |
| `title/.*example.*/` | matches results whose title contains `example` |
| `title/^example.*/` | matches results whose title starts with `example` |
| `title/.*example(A\|B).*/` | matches results whose title contains `exampleA` or `exampleB` |
| `title/.*example(A\|B).*/i` | same as above, but case-insensitive (also matches `examplea` and `exampleb`) |
| `title/.*exampleAbC.*/i` | case-insensitive; matches `exampleAbC`, `exampleABC`, etc. |
| `title/^(?=.*keyword1)(?=.*(?:keyword2)).*/i` | matches results containing both `keyword1` and `keyword2`, regardless of order |
| `title/^(?=.*keyword1)(?=.*(?:keyword2\|keyword3)).*/i` | same as above, but matches `keyword1` + `keyword2` or `keyword1` + `keyword3` |

**Snippet Matching:**

| Rule | Description |
| --- | --- |
| `text/.*example.*/` | matches results whose snippet/description contains `example`. This rule does not match titles. |
| `text/.*example.*/i` | same as above, case-insensitive. |

**Whitelist Matching:**

| Rule | Description |
| --- | --- |
| `@*://*.com/*` | allow all pages whose domain ends with `.com` |
| `@*://example.com/*` | allow the main site `example.com` |
| `@*://*.example.com/*` | allow `example.com` and all its subdomains |
| `@*://example.com/abc/*` | allow only the specific path `/abc` on `example.com` |
| `@*://*.example.com/abc/*` | allow only the specific path `/abc` on subdomains of `example.com` |

**Highlighting Rules:**

| Rule | Description |
| --- | --- |
| `@N *://*.example.com/*` | adds a colored border to results from `example.com` and its subdomains |
| `@N title/.*example.*/` | adds a colored border to results whose title contains `example` |

Priority: highlight > whitelist, but blacklist > highlight  
Note: `@N` only supports 5 colors, numbered `@1` through `@5`. Open the custom color panel via the script menu.

**Composite Rules:**

Append `@if(...)` to a rule to add conditions. Multiple `@if()` blocks are combined with logical AND. Inside a single `@if()` you can use full logical operators: `|` OR, `&` AND, `!` NOT, with `( )` parentheses for grouping. Operator precedence: `!` > `&` > `|`. String matching within conditions is case-insensitive by default.

Note: `!` negates the condition itself. When a result lacks the compared content (e.g. no title), the condition is treated as false, so its negation is true; e.g. `!(title *= "keyword")` also matches results without a title.

Supported conditions in `@if()`:

| Condition Type | Syntax | Description |
| --- | --- | --- |
| Search Engine | `$site = "google"` | only apply on the specified search engine; accepts `google`/`bing`/`duckduckgo` (`ddg`)/`yandex`/`brave`/`yahoo`, case-insensitive, `=` or `:` separator |
| Site | `site = "google.com.hk"` | only apply on the specified site |
| Title Contains | `title *= "keyword"` | title contains the specified string |
| Title Exact | `title = "Example Domain"` | title exactly matches the specified string |
| Title Prefix | `title ^= "Example"` | title starts with the specified string |
| Title Suffix | `title $= "Domain"` | title ends with the specified string |
| Title Regex | `title =~ /regex/` (or shorthand `title/regex/`) | title matches regex; `=~` can be omitted, add `i` for case-insensitive |
| URL Exact | `url = "https://example.com/"` | URL exactly matches the specified string |
| URL Prefix | `url ^= "https://mp.weixin.qq.com"` | URL starts with the specified string |
| URL Suffix | `url $= ".pdf"` | URL ends with the specified string |
| URL Contains | `url *= "example"` | URL contains the specified string |
| URL Regex | `url =~ /regex/` (or shorthand `url/regex/`) | URL matches regex; `=~` can be omitted, add `i` for case-insensitive |
| URL Host | `host $= ".example.com"` | matches the result URL's hostname; `$=` also matches the bare domain, i.e. `host $= ".example.com"` matches both `example.com` and `www.example.com` |
| URL Path | `path *= "/download/"` | matches the result URL's pathname + search |
| URL Scheme | `scheme = "https"` | matches the result URL's protocol, e.g. `https`/`http` |
| Logical Ops | `\|` OR, `&` AND, `!` NOT | combine any conditions, e.g. `title *= "a" & !(url *= "ads")` |
| Grouping | `( )` | nest sub-conditions, e.g. `(title *= "a" \| title *= "b") & !($site = "google")` |

`title`/`url`/`host`/`path`/`scheme` all support `=`, `^=`, `$=`, `*=`, `=~` (and the shorthand without `=~`, e.g. `host/regex/`); string comparisons are case-insensitive by default, while `=~` case sensitivity follows the regex flags. The uBlacklist case-sensitivity modifier `i` (e.g. `title $= "Domain" i`) is recognized and ignored since comparisons are case-insensitive by default — the form is equivalent to omitting `i`, so uBlacklist rules can be imported as-is.

Composite rule examples:

| Rule | Description |
| --- | --- |
| `*://*.example.com/* @if(title *= "keyword")` | block results from `example.com` whose title contains `keyword` |
| `*://*.example.com/* @if(title *= "kw1" \| title *= "kw2")` | block results whose title contains `kw1` or `kw2` |
| `*://*.example.com/* @if(title =~ /kw1\|kw2/)` | regex form, add `i` for case-insensitive |
| `*://*.example.com/* @if(url *= "test")` | block results whose URL contains `test`, e.g. `example.com/*/test/*` |
| `*://*.example.com/* @if(url = "https://example.com/")` | block results whose URL exactly matches that string |
| `*://*.example.com/* @if(url ^= "https://mp.weixin.qq.com")` | block results whose URL starts with `https://mp.weixin.qq.com` |
| `*://*.example.com/* @if(url $= ".pdf")` | block results whose URL ends with `.pdf` |
| `*://*.example.com/* @if(url/\/article\/\d+/ \| title *= "ads")` | block results whose URL matches `/article/<digits>` or whose title contains `ads` (`url/.../` is the shorthand for `url =~ /.../`) |
| `*://*.example.com/* @if(host $= ".example.com" & path *= "/download/")` | block results whose host is `example.com` (incl. subdomains) and whose path contains `/download/` |
| `*://*.example.com/* @if(host $= ".mp.weixin.qq.com" \| path $= ".pdf")` | block results hosted by WeChat MP or whose path ends with `.pdf` |
| `*://*.example.com/* @if(scheme = "https" & !(path ^= "/amp/"))` | block `https` results from `example.com` whose path does not start with `/amp/` |
| `*://*.example.com/* @if($site = "google")` | block `example.com` only on Google |
| `*://*.example.com/* @if($site = "google" \| $site = "bing")` | block `example.com` on both Google and Bing |
| `*://*.example.com/* @if(site = "google.com.hk")` | block `example.com` only on Google HK |
| `*://*.example.com/* @if($site = "google") @if(title *= "example")` | block results from `example.com` whose title contains `example`, only on Google |
| `title/.*example.*/ @if($site = "google")` | block results whose title contains `example`, only on Google |
| `text/.*example.*/ @if($site = "google" \| $site = "bing")` | block results whose snippet contains `example` on both Google and Bing |
| `*://*.example.com/* @if(title *= "kw1" & title *= "kw2")` | block results whose title contains both `kw1` and `kw2` |
| `*://*.example.com/* @if(title *= "kw" & !(url *= "test"))` | block results whose title contains `kw` and whose URL does NOT contain `test` |
| `*://*.example.com/* @if(!($site = "google" \| $site = "bing"))` | block `example.com` on search engines other than Google and Bing (e.g. DDG, Yandex) |
| `*://*.example.com/* @if(title *= "a" \| title *= "b") @if(!(url *= "c"))` | block results whose title contains `a` or `b` AND whose URL does not contain `c` (multiple `@if` are ANDed; `!` applies to the group) |

### Screenshots:

<img width="450" height="288" alt="01" src="https://github.com/user-attachments/assets/8523f109-84d1-4eba-b8d5-678b0a824340" />
<br/>
<img width="300" height="288" alt="02" src="https://github.com/user-attachments/assets/e486984a-2d00-4639-94d1-cf37474cd860" />
<br/>
<img width="200" height="133" alt="03" src="https://github.com/user-attachments/assets/32cdce71-23b3-4ed9-9ac7-9220af80beb1" />
