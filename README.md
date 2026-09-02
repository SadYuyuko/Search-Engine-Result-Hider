# Search Engine Result Hider
## 搜索引擎结果屏蔽器
### [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394) 安装  
[中文](README.md) | [English](README.en.md)  
在仅支持安装脚本的浏览器上实现复杂规则屏蔽搜索结果功能  
支持包括ublacklist基础规则在内的URL匹配、正则匹配、标题匹配、白名单匹配、高亮目标结果以及结果摘要(snippet)匹配  
当前支持搜索引擎：Bing、Google、DuckDuckGo、Yandex、Brave，Yahoo  
交流群 [TG](https://t.me/+qBqMTqjc4Xk5M2Jh)  
  
**当前功能：**  
- 一键屏蔽域名
- 统计命中规则数量和调试输出
- 导入/导出规则到TXT
- 规则错误检测
- 规则订阅
- Webdav同步
- 脚本管理器菜单  
  ┣ 直接打开面板  
  ┣ 开关屏蔽功能  
  ┣ 隐藏悬浮球  
  ┣ 语言切换  
  ┣ 自定义高亮结果颜色  
  ┣ 开关面板居中：默认居中，切换后根据悬浮球位置显示在屏幕四角  
  ┗ 切换悬浮球功能：  
 　 ┗ 🟢点击展开面板  
　  ┗ 🔵点击显示被屏蔽结果，长按悬浮球打开配置面板，被屏蔽结果的屏蔽按钮再次点击则取消屏蔽
  
**关于Webdav：**  
1. 自动同步每小时去重合并同步一次，手动上传/下载则为覆盖同步。目前仅在单设备上测试过，理论上可以和ublacklist同步同一配置文件，但不保证不会出现文件错误替换逻辑问题，请提前备份文件  
2. Webdav同步依赖跨域请求权限，且地址只支持https，最好使用单独应用密码而非主密码  
3. 地址请填写完整文件夹路径，如坚果云`https://dav.jianguoyun.com/dav/your_folder/`  
4. 同步配置在刷新后生效  
  
**注意：**  
1. 订阅同步频率为每天一次，支持最多3条订阅且只支持.txt远程链接，例如`https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/rules.txt`，应用优先级在本地规则之后。由于脚本可分配性能有限，规则总数建议不超过2w条避免手机爆炸🤳💥  
2. 脚本扩展有限不支持`##`DOM语法规则，通过订阅导入会自动清除  
3. 在脚本中添加域名规则时可不使用`*://*.`前缀直接写域名，但对于需要同时在ublacklist使用的规则必须加上  
<br>
  
### 基础规则：  
**URL匹配：**  
`*://www.example.com/*` – 匹配`example.com`  
`*://*.example.com/*` – 匹配`example.com`及其所有子域名  
`*://*.example.com/path/*` – 匹配`example.com`特定路径  
`*://*.example.*` – 匹配`example.com`所有顶级域名  
  
**标题匹配：**  
`title/.*示例.*/` – 匹配标题包含`示例`的结果  
`title/^示例.*/` – 匹配标题以`示例`开头的搜索结果  
`title/.*示例(A|B).*/` – 匹配标题包含`示例A`或`示例B`的结果  
`title/.*示例(A|B).*/i` – 加i忽略大小写，匹配除上条结果外还包含`示例a`或`示例b`的结果  
`title/.*示例AbC.*/i` – 加i忽略大小写，匹配除`示例AbC`外还包含`示例ABC`等结果  
`title/^(?=.*示例1)(?=.*(?:示例2)).*/i` - 忽略前后顺序，匹配同时出现`示例1`和`示例2`的结果  
`title/^(?=.*示例1)(?=.*(?:示例2|示例3)).*/i` - 同上，但匹配`示例1+示例2`或`示例1+示例3`的结果  
  
**白名单匹配：**  
`@*://*.com/*` – 放行所有以`.com`结尾域名页面  
`@*://example.com/*` – 放行`example.com`主站  
`@*://*.example.com/*` – 放行`example.com`及其所有子域名  
`@*://example.com/abc/*` – 只放行`example.com`特定路径  
`@*://*.example.com/abc/*` – 只放行`example.com`子域名特定路径  
  
  **高亮规则：**  
`@1 *://*.example.com/*` – 给`example.com`及其子域名的搜索结果加上颜色边框  
`@1 title/.*示例.*/` – 给匹配到标题带有`示例`的结果加上颜色边框  
优先级：高亮＞白名单，但黑名单＞高亮  
注意：只支持5种颜色，即`@1`～`@5`，通过脚本菜单打开自定义颜色面板  
  
**复合规则：**  
`*://*.example.com/* @if(title *= "示例")` - 屏蔽`example.com`的标题中含有`示例`的结果，复合规则的标题规则默认忽略大小写  
`*://*.example.com/* @if(title *= "关键词1" | title *= "关键词2" | title *= "关键词3")` - 上条规则的多关键词支持    
`*://*.example.com/* @if(title =~ /关键词1|关键词2|关键词3/)` - 上条规则的正则写法  
`@if (Google) { *://*.example.com/* }` - 仅在Google中屏蔽该`example.com`  
`@if (site = "google.com.hk") { *://*.example.com/* }` - 仅在Google HK中屏蔽`example.com`  
`@if(Google) { *://*.example.com/* @if(title *= "示例") @if(site = "google.com") }` - 仅在Google中，屏蔽`example.com`的搜索结果中标题含有`示例`的结果  
  
**摘要匹配：**  
`text/.*示例.*/` – 匹配结果的网页描述内容(snippet)中包含`示例`的搜索结果，此规则不会匹配标题  
`text/.*示例abc.*/i` – 同上，加i忽略大小写  
<br>  

### 截图：  
<img width="460" height="285" alt="01" src="https://github.com/user-attachments/assets/8523f109-84d1-4eba-b8d5-678b0a824340" />
<br>
<img width="214" height="206" alt="02" src="https://github.com/user-attachments/assets/e486984a-2d00-4639-94d1-cf37474cd860" />
<br>
<img width="200" height="133" alt="03" src="https://github.com/user-attachments/assets/dfb3aadc-5cdb-4da7-925f-e18d9f8c3a8f" />
