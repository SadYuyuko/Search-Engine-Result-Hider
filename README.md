# Search Engine Result Hider
## 搜索引擎结果屏蔽器
[Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394)(推荐) 使用任意脚本管理器安装  

在搜索引擎中屏蔽搜索结果词条，适用于Bing、Google、DuckDuckGo。支持包括ublacklist规则在内的正则匹配URL、标题匹配、正文内容匹配，可测试规则和调试输出，导入导出规则到剪贴板或时间戳命名的TXT文件，以及隐藏面板菜单  
  
适用于仅支持安装脚本的移动端浏览器(如Via、X等)，其他支持安装扩展的移动端和PC端也可用但更推荐直接使用[ublacklist](https://addons.mozilla.org/zh-CN/firefox/addon/ublacklist)  

规则主要倾向于标题和正则匹配，以下为常规示例：  

**URL匹配：**  
`*://www.example.com/*` 匹配example.com  
`*://*.example.com/*` 匹配example.com及其所有子域  
`*://*.example.com/path/*` 匹配example.com的特定路径  
`*://*.example.*` 匹配example.com所有顶级域名  
**标题匹配：**  
`title/.*示例.*/` 匹配标题包含"示例"的结果  
`title/^示例.*/` 匹配标题以"示例"开头的搜索结果  
`title/.*示例(A|B).*/` 匹配标题包含"示例A"或"示例B"的结果  
`title/.*示例(A|B).*/i` 加i忽略大小写，匹配除上条结果外还包含"示例a"和"示例b"的结果  
`title/.*示例AbC.*/i` 加i忽略大小写，匹配除"示例AbC"外还包含"示例ABC"等的结果  
**正文匹配：**  
`text/.*示例.*/` 匹配结果词条的网页描述内容中包含"示例"的搜索结果，此规则不会匹配标题  
`text/.*示例abc.*/i` 同上，加i忽略大小写  
添加规则时可不加`*://*.`前缀直接写域名，此用于兼容ublacklist规则  
  
**效果截图：**  
  
<img width="805" height="525" alt="1" src="https://github.com/user-attachments/assets/70fc482b-3c46-4eac-baa3-2290b919b431" />  
---  
<img width="258" height="87" alt="2" src="https://github.com/user-attachments/assets/ca2af56b-8d29-4959-896c-052bbc77fce6" />  
