# Search Engine Result Hider
## 搜索引擎结果屏蔽器
### [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) (推荐) 使用任意脚本管理器安装  
[中文](README.md) | [English](README.en.md)  
在仅支持安装脚本的移动端浏览器上尝试复刻ublacklist的功能，支持安装扩展的移动端和桌面端也可用但更推荐直接使用[ublacklist](https://addons.mozilla.org/zh-CN/firefox/addon/ublacklist)  
适用于Bing、Google、DuckDuckGo、Yandex，未来可能支持更多搜索引擎。支持包括ublacklist基础规则在内的正则匹配、URL匹配、标题匹配、白名单匹配、结果高亮以及搜索词条正文内容匹配。  
 
**当前功能：**  
- 屏蔽按钮一键屏蔽域名  
- 统计命中规则数量和调试输出  
- 导入导出规则到时间戳命名的TXT文件  
- 规则订阅和Webdav同步  
- 脚本管理器菜单设置  
  ┣ 直接打开面板  
  ┣ 开关屏蔽功能  
  ┣ 屏蔽二次确认  
  ┣ 隐藏悬浮球  
  ┣ 语言切换  
  ┣ 开关面板居中：默认居中，切换后根据悬浮球位置显示在4个角落  
  ┗切换悬浮球功能：默认点击展开面板，切换后点击显示被屏蔽结果，此模式下长按悬浮球打开配置面板，被屏蔽结果的屏蔽按钮再次点击取消屏蔽  
  
**关于Webdav：**  
1.每小时同步一次，自动同步会根据文件时间去重合并，手动上传下载则为覆盖文件。目前仅在单设备同步上测试过，理论上可以和ublacklist同步同一配置文件，但不保证不会出现文件错误替换逻辑问题，请提前备份文件  
2.Webdav同步依赖跨域请求权限  
3.脚本数据存储存在天然缺陷，因此地址只支持https，并且最好使用单独应用密码而非主密码  
4.地址请填写完整文件夹路径，如坚果云`https://dav.jianguoyun.com/dav/your_folder/`  

**注意：**  
1.导出到TXT依赖blob处理，请确保浏览器blob功能正常  
2.订阅每天同步一次，只支持.txt文件远程链接且最多支持3条订阅，逻辑为在本地规则后应用。由于脚本性能限制，规则总数建议不要超过3w条避免手机爆炸🤳💥  
3.由于脚本扩展有限，暂不支持`##`uBlock DOM语法规则，通过订阅导入会自动清除
    
规则主要倾向于标题和正则匹配。方便起见，在脚本中添加规则时可不使用`*://*.`前缀直接写域名，但对于需要同时在ublacklist使用的规则必须加上。  
  
### 以下为基础规则：  
**URL匹配：**  
`*://www.example.com/*` – 匹配`example.com`  
`*://*.example.com/*` – 匹配`example.com`及其所有子域名  
`*://*.example.com/path/*` – 匹配`example.com`特定路径  
`*://*.example.*` – 匹配`example.com`所有顶级域名  
  
**标题匹配：**  
`title/.*示例.*/` – 匹配标题包含`示例`的结果  
`title/^示例.*/` – 匹配标题以`示例`开头的搜索结果  
`title/.*示例(A|B).*/` – 匹配标题包含`示例A`和`示例B`的结果  
`title/.*示例(A|B).*/i` – 加i忽略大小写，匹配除上条结果外还包含`示例a`和`示例b`的结果  
`title/.*示例AbC.*/i` – 加i忽略大小写，匹配除`示例AbC`外还包含`示例ABC`等结果  
  
**白名单匹配：**  
`@*://*.com/*` – 放行所有以`.com`结尾域名页面  
`@*://example.com/*` – 放行`example.com`主站  
`@*://*.example.com/*` – 放行`example.com`及其所有子域名  
`@*://example.com/abc/*` – 只放行`example.com`特定路径  
`@*://*.example.com/abc/*` – 只放行`example.com`子域名特定路径
  
  **高亮规则：**  
`@1 *://*.example.com/*` – 给`example.com`及其子域名的搜索结果加上颜色边框  
`@1 title/.*示例.*/` – 给匹配到标题带有`示例`的结果加上颜色边框  
注意：高亮规则具有白名单效果，优先级 高亮>白名单>黑名单  
  
**复合规则：**  
`*://*.example.com/* @if(title *= "示例")` - 屏蔽`example.com`的搜索结果中标题含有`示例`的结果，复合规则的标题规则默认忽略大小写  
`@if (Google) { *://*.example.com/* }` - 仅在Google中屏蔽该`example.com`  
`@if (site = "google.com.hk") { *://*.example.com/* }` - 仅在Google HK中屏蔽`example.com`  
`@if(Google) { *://*.example.com/* @if(title *= "示例") @if(site = "google.com") }` - 仅在Google中，屏蔽`example.com`的搜索结果中标题含有`示例`的结果  
  
**正文匹配：**  
`text/.*示例.*/` – 匹配结果词条的网页描述内容中包含`示例`的搜索结果，此规则不会匹配标题  
`text/.*示例abc.*/i` – 同上，加i忽略大小写  
注意：正文匹配为脚本特有规则，无法在ublacklist中使用  
  
### 效果截图：  
  
<img width="464" height="300" alt="01" src="https://github.com/user-attachments/assets/998e772f-32be-4d0c-95de-7c2d65a4abd3" />  

---  
<img width="277" height="270" alt="02" src="https://github.com/user-attachments/assets/816f7952-8e19-408d-819c-497c6df1133c" />  

---  
<img width="256" height="192" alt="0" src="https://github.com/user-attachments/assets/89cb7c3a-8592-4fae-9677-9cf80c4abb11" />  
