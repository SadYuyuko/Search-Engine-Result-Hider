# Search Engine Result Hider
## A tool to hide unwanted search results  
### [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) (Recommended) Install with any userscript manager  
[中文](README.md) | [English](README.en.md)  
This script is trying to replicate the functionality of uBlacklist on mobile browsers that only support script installation. It also works on desktop browsers or mobile browsers with extension support, though [uBlacklist](https://addons.mozilla.org/zh-CN/firefox/addon/ublacklist) is the preferred option in those environments.  

Supports Bing, Google, and DuckDuckGo, with potential support for more search engines in the future. It includes uBlacklist basic rule compatibility as well as regex matching, URL matching, title matching, whitelist matching, and matching against the snippet text of search results.  

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
  ┗ Toggle floating bubble function: default click opens the panel; when toggled, click toggles visibility of blocked results, and clicking the block button on a blocked result allows unblocking (effective only for non‑regex domain rules)  

**About WebDAV:**  
1. Synchronizes automatically every hour. Auto‑sync merges files based on timestamps and deduplicates. Manual upload/download overwrites files. Currently tested only with single‑device synchronization. In theory, it can sync the same configuration file as uBlacklist, but no guarantees are made regarding file overwrite logic errors. Always back up your files first.  
2. WebDAV sync requires cross‑origin request permissions. You can deny this if not needed.  
3. Due to inherent limitations of script data storage, only HTTPS addresses are supported, and it is strongly recommended to use an app‑specific password rather than your main account password.  
4. Provide the full folder path in the address field, e.g., for Nutstore: `https://dav.jianguoyun.com/dav/your_folder/`  

**Notes:**  
1. Exporting to TXT relies on blob functionality. Please ensure your browser supports blob operations.  
2. Subscriptions update once per day. Only remote .txt file links are supported, with a maximum of 3 subscriptions. Subscription rules are applied after local rules. Due to script performance constraints, it is recommended to keep the total rule count under 30,000 to avoid performance issues on mobile devices.  
3. Due to script extension limitations, complex `@+if` whitelist conditions and `##` uBlock DOM syntax rules are not supported. Such rules will be automatically removed when imported via subscription.  

Rules are primarily intended for title and regex matching. When adding rules, you may omit the `*://*.` prefix and enter the domain directly for compatibility with uBlacklist rules.  

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

**Screenshots：**  

<img width="271" height="250" alt="12" src="https://github.com/user-attachments/assets/50544492-2a0d-4a25-9edf-58e05f0c323c" />  
---  
<img width="271" height="237" alt="34" src="https://github.com/user-attachments/assets/d56068eb-4bb7-4cf9-9449-c4bcbdbb6ac7" />  
---  
<img width="255" height="192" alt="0" src="https://github.com/user-attachments/assets/ebbe67e4-b5e4-428c-bb76-139d64aa915b" />  
