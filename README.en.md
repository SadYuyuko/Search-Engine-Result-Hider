## Search Engine Result Hider
## A tool to hide unwanted search results
### <img src="https://github.com/user-attachments/assets/92954a5d-7157-40ed-9309-b9d75bf2bd32" width="30" height="30" align="center"> [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) Install
[中文](README.md) | [English](README.en.md)  
Block unwanted search results with complex rule matching on browsers that only support user scripts.  
Supports uBlacklist compatible basic rules, URL matching, regex matching, title matching, whitelist matching, highlighting target results, and matching result snippet text.  
Currently supported search engines: Bing, Google, DuckDuckGo, Yandex, Brave, Yahoo  

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
　  ┗ 🔵 Click to toggle visibility of blocked results; long-press toopen the configuration panel. Clicking the block button on a blocked result unblocks it.  

**About WebDAV:**  
1. Auto-sync runs once per hour, performing deduplication and merging. Manual upload/download performs an overwrite sync. Currently tested only in single-device setups. In theory, it can sync the same configuration file as uBlacklist, but no guarantees are made regarding file overwrite logic conflicts. Always back up your files first.  
2. WebDAV sync requires cross-origin request permissions; only HTTPS addresses are supported. It is strongly recommended to use an app-specific password rather than your main account password.  
3. Provide the full folder path in the address field, e.g., for Nutstore: `https://dav.jianguoyun.com/dav/your_folder/`  
4. Sync configuration takes effect after refreshing the page.  

**Notes:**  
1. Subscriptions update once per day. Only remote `.txt` file links are supported, with a maximum of 3 subscriptions. Subscription rules are applied after local rules. Due to the limited performance budget of user scripts, the total number of rules should not exceed 20,000 to avoid performance issues on mobile devices.  
2. `##` DOM syntax rules are not supported. Such rules will be automatically removed when imported via subscription.  
3. When adding domain name rules in the script, you can write the domain directly without the `*://*.` prefix, but rules used in uBlacklist must include the full prefix.  
<br>

### Basic Rules:  

**URL Matching:**  
`*://www.example.com/*` – matches `example.com`  
`*://*.example.com/*` – matches `example.com` and all its subdomains  
`*://*.example.com/path/*` – matches a specific path under `example.com`  
`*://*.example.*` – matches `example.com` across all top-level domains  

**Title Matching:**  
`title/.*example.*/` – matches results whose title contains `example`  
`title/^example.*/` – matches results whose title starts with `example`  
`title/.*example(A|B).*/` – matches results whose title contains `exampleA` or `exampleB`  
`title/.*example(A|B).*/i` – same as above, but case-insensitive (also matches `examplea` and `exampleb`)  
`title/.*exampleAbC.*/i` – case-insensitive; matches `exampleAbC`, `exampleABC`, etc.  
`title/^(?=.*keyword1)(?=.*(?:keyword2)).*/i` – matches results containing both `keyword1` and `keyword2`, regardless of order  
`title/^(?=.*keyword1)(?=.*(?:keyword2|keyword3)).*/i` – same as above, but matches `keyword1` + `keyword2` or `keyword1` + `keyword3`  

**Whitelist Matching:**  
`@*://*.com/*` – allow all pages whose domain ends with `.com`  
`@*://example.com/*` – allow the main site `example.com`  
`@*://*.example.com/*` – allow `example.com` and all its subdomains  
`@*://example.com/abc/*` – allow only the specific path `/abc` on `example.com`  
`@*://*.example.com/abc/*` – allow only the specific path `/abc` on subdomains of `example.com`  

**Highlighting Rules:**  
`@1 *://*.example.com/*` – adds a colored border to results from `example.com` and its subdomains  
`@1 title/.*example.*/` – adds a colored border to results whose title contains `example`  
Priority: highlight > whitelist, but blacklist > highlight  
Note: Only 5 highlight colors are supported, numbered `@1` through `@5`. Open the custom color panel via the script menu.  

**Composite Rules:**  
`*://*.example.com/* @if(title *= "keyword")` – block results from `example.com` whose title contains the `keyword`. Title rules in composite rules are case-insensitive by default  
`*://*.example.com/* @if(title *= "keyword1" | title *= "keyword2" | title *= "keyword3")` – multi-keyword support for the above rule  
`*://*.example.com/* @if(title =~ /keyword1|keyword2|keyword3/)` – regex form of the above rule, the rule need `i` to case-insensitive (`title =~ /.../i`)  
`@if (Google) { *://*.example.com/* }` – block `example.com` only on Google  
`@if (site = "google.com.hk") { *://*.example.com/* }` – block `example.com` only on Google HK  
`@if(Google) { *://*.example.com/* @if(title *= "keyword") @if(site = "google.com") }` – block results from `example.com` whose title contains `keyword`, only on Google  

**Snippet Matching:**  
`text/.*example.*/` – matches results whose snippet/description contains `example`. This rule does not match titles.  
`text/.*example.*/i` – same as above, case-insensitive.  
<br>

### Screenshots:  
<img width="460" height="285" alt="01" src="https://github.com/user-attachments/assets/8523f109-84d1-4eba-b8d5-678b0a824340" />  
<br>
<img width="214" height="206" alt="02" src="https://github.com/user-attachments/assets/e486984a-2d00-4639-94d1-cf37474cd860" />
<br>
<img width="200" height="133" alt="03" src="https://github.com/user-attachments/assets/32cdce71-23b3-4ed9-9ac7-9220af80beb1" />
