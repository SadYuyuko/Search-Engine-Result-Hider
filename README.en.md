# Search Engine Result Hider
## A tool to hide unwanted search results  
### [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) (Recommended) Install with any userscript manager  
[中文](README.md) | [English](README.en.md)  
This script is trying to replicate the functionality of uBlacklist on mobile browsers that only support script installation. It also works on desktop browsers or mobile browsers with extension support, though [uBlacklist](https://addons.mozilla.org/zh-CN/firefox/addon/ublacklist) is the preferred option in those environments.  

Supports Bing, Google, DuckDuckGo and Yandex, with potential support for more search engines in the future. It includes uBlacklist basic rule compatibility as well as regex matching, URL matching, title matching, whitelist matching, highlighting rules and matching against the snippet text of search results.  

**Current Features:**  
- One-click domain blocking via a block button  
- Display hit rule counts and debug output  
- Import/export rules to timestamped TXT files  
- Rule subscription and WebDAV synchronization  
- Script manager menu settings  
  ┣ Directly open the configuration panel  
  ┣ Toggle blocking on/off  
  ┣ Toggle block confirmation  
  ┣ Toggle floating bubble visibility  
  ┣ Language switching  
  ┣ Toggle panel centering: centered by default; when disabled, the panel appears in one of four corners based on the floating bubble's position  
  ┗ Toggle floating bubble function: default click opens the panel; when toggled, click toggles visibility of blocked results. In this mode, long press the floating ball to open the configuration panel, and clicking the block button on a blocked result allows unblocking  

**About WebDAV:**  
1. Synchronizes automatically every hour. Auto‑sync merges files based on timestamps and deduplicates. Manual upload/download overwrites files. Currently tested only with single‑device synchronization. In theory, it can sync the same configuration file as uBlacklist, but no guarantees are made regarding file overwrite logic errors. Always back up your files first.  
2. WebDAV sync requires cross‑origin request permissions. You can deny this if not needed.  
3. Due to inherent limitations of script data storage, only HTTPS addresses are supported, and it is strongly recommended to use an app‑specific password rather than your main account password.  
4. Provide the full folder path in the address field, e.g., for Nutstore: `https://dav.jianguoyun.com/dav/your_folder/`  

**Notes:**  
1. Exporting to TXT relies on blob functionality. Please ensure your browser supports blob operations.  
2. Subscriptions update once per day. Only remote .txt file links are supported, with a maximum of 3 subscriptions. Subscription rules are applied after local rules. Due to script performance constraints, it is recommended to keep the total rule count under 30,000 to avoid performance issues on mobile devices.  
3. Due to script extension limitations, `##` uBlock DOM syntax rules are not supported. Such rules will be automatically removed when imported via subscription.  
  
Rules tend to favor titles and regular matches. For convenience, you can add rules in script without using `*://*.` Prefix directly write domain name, but for the rules that need to be used in the ublacklist, you need to add it.    

### Basic Rule Syntax:  
**URL Matching:**  
`*://www.example.com/*` – matches `example.com`  
`*://*.example.com/*` – matches `example.com` and all its subdomains  
`*://*.example.com/path/*` – matches a specific path under `example.com`  
`*://*.example.*` – matches `example.com` across all top‑level domains  

**Title Matching:**  
`title/.*example.*/` – matches results whose title contains `example`  
`title/^example.*/` – matches results whose title starts with `example`  
`title/.*example(A|B).*/` – matches results whose title contains `exampleA` or `exampleB`  
`title/.*example(A|B).*/i` – same as above, but case‑insensitive (also matches `examplea` and `exampleb`)  
`title/.*exampleAbC.*/i` – case‑insensitive; matches `exampleAbC`, `exampleABC`, etc.  

**Snippet Matching:**  
`text/.*example.*/` – matches results whose snippet/description contains `example`. This rule does not match titles.  
`text/.*exampleabc.*/i` – same as above, case‑insensitive.  

**Whitelist Matching:**  
`@*://*.com/*` – allow all pages whose domain ends with `.com`  
`@*://example.com/*` – allow the main site `example.com`  
`@*://*.example.com/*` – allow `example.com` and all its subdomains  
`@*://example.com/abc/*` – allow only the specific path `/abc` on `example.com`  
`@*://*.example.com/abc/*` – allow only the specific path `/abc` on subdomains of `example.com`; block other paths and the main site  
  
**Composite rules:**  
`*://*.example.com/* @if(title *= "keyword")` - Block results from example.com whose title contains the keyword in search results  
`@if (Google) { *://*.example.com/* }` - Block this example.com only on Google  
`@if (site = "google.com.hk") { *://*.example.com/* }` - Block example.com only on Google HK  
`@if(Google) { *://*.example.com/* @if(title *= "keyword") @if(site = "google.com") }` - Block results from example.com whose title contains the keyword, only on Google  
  
**Highlighting Rules:**  
'@1 *://*.example.com/*' – Adds color borders to 'example.com' and its subdomains  
'@1 title/.*example.*/' – Add a color border to the result matched to the title with 'example'  
  
### Screenshots：  

<img width="464" height="300" alt="01" src="https://github.com/user-attachments/assets/998e772f-32be-4d0c-95de-7c2d65a4abd3" />  

---  
<img width="277" height="270" alt="02" src="https://github.com/user-attachments/assets/816f7952-8e19-408d-819c-497c6df1133c" />  

---  
<img width="256" height="192" alt="0" src="https://github.com/user-attachments/assets/89cb7c3a-8592-4fae-9677-9cf80c4abb11" />   
