## <img src="https://github.com/user-attachments/assets/92954a5d-7157-40ed-9309-b9d75bf2bd32" width="30" height="30" align="center"> 搜索引擎结果屏蔽器

### 1.1 简介

[中文](README.md) | [English](README.en.md) | 交流群 [TG](https://t.me/+qBqMTqjc4Xk5M2Jh)

在仅支持安装脚本的浏览器上实现复杂规则屏蔽搜索结果功能  
支持包括ublacklist基础规则在内的URL匹配、正则匹配、标题匹配、白名单匹配、高亮目标结果以及结果摘要(snippet)匹配  
当前支持搜索引擎：Bing、Google、DuckDuckGo、Yandex、Brave，Yahoo

安装源 [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://update.greasyfork.org/scripts/552394/%E6%90%9C%E7%B4%A2%E5%BC%95%E6%93%8E%E7%BB%93%E6%9E%9C%E5%B1%8F%E8%94%BD%E5%99%A8.user.js)

使用支持安装脚本的浏览器打开直接安装

### 1.2 当前功能：

- 基础/高级语法匹配结果
- 一键屏蔽域名
- 统计命中规则和调试输出
- 导入/导出规则到TXT
- 规则错误检测
- 规则订阅
- Webdav同步
- 脚本管理器菜单  
┣ 打开面板  
┣ 语言切换  
┣ 自定义高亮颜色  
┣ 开关错误检测  
┣ 开关悬浮球显示  
┣ 开关面板居中：默认居中，切换后根据悬浮球位置显示在屏幕四角  
┗ 切换悬浮球功能：  
　┗ 🟢点击展开面板  
　┗ 🔵点击显示被屏蔽结果，长按悬浮球打开配置面板，被屏蔽结果的屏蔽按钮再次点击则取消屏蔽

### 1.3 关于Webdav：

1. 自动同步每小时去重合并同步一次，手动上传/下载则为覆盖同步
2. 同步依赖跨域请求权限，地址只支持https和完整路径，如坚果云`https://dav.jianguoyun.com/dav/your_folder/`
3. 同步配置在刷新后生效

### 1.4 关于订阅：

1. 订阅同步频率为每天一次，只支持`.txt`或`.yaml`远程链接，例如`https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Other/rules.txt`
2. 订阅规则在本地规则后追加应用，由于脚本可分配性能有限，规则总数建议不超过3w条避免手机爆炸🤳💥
3. 脚本扩展有限不支持`##`DOM等语法规则，通过订阅导入会自动清除

### 1.5 注意：

1. 一键屏蔽逻辑：屏蔽`example.com`并加入规则`*://example.com/*`（开启屏蔽域名为`*://*.example.com/*`），取消屏蔽不删除源规则而是新增白名单`@*://example.com/*`（开启屏蔽域名为`@*://*.example.com/*`）
2. 规则优先级：本地白名单 > 本地黑名单 > 订阅白名单 > 订阅黑名单

## 规则说明

### 2.1 URL匹配：

| 规则 | 说明 |
| --- | --- |
| `*://www.example.com/*` | 匹配`example.com` |
| `*://*.example.com/*` | 匹配`example.com`及其所有子域名 |
| `*://*.example.com/path/*` | 匹配`example.com`特定路径 |
| `*://*.example.*` | 匹配`example.com`所有顶级域名 |

在脚本中添加域名规则时可不加`*://*.`前缀直接写域名(如`example.com`)，但对于需要同时在ublacklist使用的规则必须加上

### 2.2 正则匹配：

| 规则 | 说明 |
| --- | --- |
| `/pattern/flags` | 使用正则表达式匹配URL，如`/example\.(com\|net)/i` |
| `title/pattern/flags` | 使用正则表达式匹配标题，如`title/.*屏蔽.*/i` |
| `text/pattern/flags` | 使用正则表达式匹配摘要内容，如`text/.*广告.*/i` |

普通正则使用浏览器支持的 JavaScript `RegExp` flags，支持`i`、`m`、`s`、`u`，其中 `s` 会转换为跨行匹配；不支持`g`、`y`，脚本规则只判断是否匹配不执行全局提取

### 2.3 标题匹配：

| 规则 | 说明 |
| --- | --- |
| `title/.*示例.*/` | 匹配标题包含`示例`的结果 |
| `title/^示例.*/` | 匹配标题以`示例`开头的搜索结果 |
| `title/.*示例(A\|B).*/` | 匹配标题包含`示例A`或`示例B`的结果 |
| `title/.*示例(A\|B).*/i` | 忽略大小写，匹配除上条结果外还包含`示例a`或`示例b`的结果 |
| `title/.*示例AbC.*/i` | 忽略大小写，匹配除`示例AbC`外还包含`示例ABC`等结果 |
| `title/^(?=.*示例1)(?=.*(?:示例2)).*/i` | 忽略大小写和前后顺序，匹配同时出现`示例1`和`示例2`的结果 |
| `title/^(?=.*示例1)(?=.*(?:示例2\|示例3)).*/i` | 同上，但匹配同时出现`示例1和示例2`或`示例1和示例3`的结果 |

### 2.4 摘要匹配：

| 规则 | 说明 |
| --- | --- |
| `text/.*示例.*/` | 匹配结果的网页描述内容(snippet)中包含`示例`的搜索结果，此规则不会匹配标题 |
| `text/.*示例abc.*/i` | 同上，加i忽略大小写 |

### 2.5 白名单匹配：

| 规则 | 说明 |
| --- | --- |
| `@*://*.com/*` | 放行所有以`.com`结尾域名页面 |
| `@*://example.com/*` | 放行`example.com`主站 |
| `@*://*.example.com/*` | 放行`example.com`及其所有子域名 |
| `@*://example.com/abc/*` | 只放行`example.com`特定路径 |
| `@*://*.example.com/abc/*` | 只放行`example.com`子域名特定路径 |

### 2.6 高亮规则：

| 规则 | 说明 |
| --- | --- |
| `@N *://*.example.com/*` | 给`example.com`及其子域名的搜索结果加上颜色边框 |
| `@N title/.*示例.*/` | 给匹配到标题带有`示例`的结果加上颜色边框 |

优先级：高亮 > 白名单但黑名单 > 高亮  
注意：`@N` 只支持5种颜色，即`@1`～`@5`，通过脚本菜单打开自定义颜色面板

### 2.7 复合规则：

**注意：**
 - 在规则后添加 `@if(...)` 作为附加条件，多个 `@if` 条件同时生效(逻辑与`&`，可转换为单个`@if`)，复合规则匹配默认忽略大小写
 - 条件表达式也可单独使用不需要套 `@if(...)`，如 `host $= ".example.com"`、`path *= "/download/"`，对所有搜索结果生效
 - 单个 `@if` 内支持逻辑运算：`|` 或、`&` 与、`!` 非，可用 `( )` 括号嵌套分组，优先级 `!` > `&` > `|`
 - `!` 取反的是条件本身。当结果缺少标题等被比较内容时，该条件视为不成立，取反后即为成立，如 `!(title *= "关键词")` 会命中无标题的结果

**`@if` 支持条件：**

| 条件类型 | 语法 | 说明 |
| --- | --- | --- |
| 搜索引擎 | `$site = "google"` | 仅在指定搜索引擎中生效，可写`google`、`bing`、`duckduckgo`(`ddg`)、`yandex`、`brave`、`yahoo`，忽略大小写，分隔符可用`=`或`:` |
| 搜索类型 | `$category = "images"` | 仅在指定搜索类型中生效，可写`web`、`images`、`videos`、`news`，由当前页 URL 推断，网页搜索默认为`web` |
| 搜索站点 | `site = "google.com.hk"` | 仅在指定搜索引擎地区站点中生效 |
| 标题包含 | `title *= "关键词"` | 标题中包含指定字符串`关键词` |
| 标题精确 | `title = "关键词"` | 标题精确匹配指定字符串`关键词` |
| 标题前缀 | `title ^= "关键词"` | 标题以指定字符串`关键词`开头 |
| 标题后缀 | `title $= "关键词"` | 标题以指定字符串`关键词`结尾 |
| 标题正则 | `title =~ /正则/`(或简写 `title/正则/`) | 标题匹配正则表达式，`=~` 可省略，结尾加`i`忽略大小写 |
| URL精确 | `url = "https://example.com/"` | URL与指定字符串完全一致 |
| URL前缀 | `url ^= "https://abc.example.com"` | URL以指定字符串开头 |
| URL后缀 | `url $= ".pdf"` | URL以指定字符串结尾 |
| URL包含 | `url *= "example"` | URL中包含指定字符串`example` |
| URL正则 | `url =~ /正则/`(或简写 `url/正则/`) | URL匹配正则表达式，`=~` 可省略，结尾加`i`忽略大小写 |
| URL主机 | `host $= ".example.com"` | 结果URL的主机名(hostname)匹配；`$=`兼容裸域，即`host $= ".example.com"`同时命中`example.com`与`www.example.com` |
| URL路径 | `path *= "/download/"` | 结果URL的路径+查询串(pathname+search)匹配 |
| URL协议 | `scheme = "https"` | 结果URL的协议匹配，如`https`/`http` |
| 逻辑运算 | `\|` 或、`&` 与、`!` 非 | 组合任意条件 |
| 括号分组 | `( )` | 嵌套组合子条件 |

`title`/`url`/`host`/`path`/`scheme` 均支持 `=`、`^=`、`$=`、`*=`、`=~`(及省略`=~`的简写如 `host/正则/`)，比较默认忽略大小写，`=~` 大小写由正则 flags 决定。兼容 uBlacklist 规则中的大小写修饰符 `i`(如 `title $= "Domain" i`)，此写法仅用于识别和兼容规则，脚本默认忽略大小写

**复合规则示例：**

| 规则 | 说明 |
| --- | --- |
| `*://*.example.com/* @if(title *= "关键词")` | 屏蔽`example.com`的标题中含有`关键词`的结果 |
| `*://*.example.com/* @if(title *= "关键词1" \| title *= "关键词2")` | 屏蔽`example.com`的标题中含`关键词1`或`关键词2`的结果 |
| `*://*.example.com/* @if(title =~ /关键词1\|关键词2/)` | 上条规则的正则写法，结尾需加`i`才会忽略大小写 |
| `*://*.example.com/* @if(url *= "test")` | 屏蔽`example.com`的URL中含`test`的结果，如`example.com/*/test/*` |
| `*://*.example.com/* @if(title *= "关键词" & !(url *= "test"))` | 屏蔽`example.com`的标题含`关键词`且URL中不含`test`的结果 |
| `*://*.example.com/* @if(site = "google.com.hk")` | 仅在Google HK中屏蔽`example.com` |
| `*://*.example.com/* @if($site = "google")` | 仅在Google中屏蔽`example.com` |
| `*://*.amazon.com/* @if($category = "images")` | 仅在图片搜索中屏蔽`amazon.com` |
| `*://*.example.com/* @if($site = "google") @if(title *= "示例")` | 仅在Google中屏蔽标题含`示例`的`example.com`的结果 |
| `*://*.example.com/* @if(title *= "a" \| title *= "b") @if(!(url *= "c"))` | 屏蔽标题含`a`或`b`且URL不含`c`的`example.com`的结果 |
| `title/.*示例.*/ @if($site = "google")` | 仅在Google中屏蔽标题含`示例`的结果 |
| `text/.*示例.*/ @if($site = "google" \| $site = "bing")` | 在Google或Bing中都屏蔽网页描述含`示例`的结果 |
| `path *= "/download/"` | 屏蔽路径含`/download/`的结果 |
| `host $= ".example.com" & path *= "/download/"` | 屏蔽`example.com`下路径含`/download/`的结果 |
| `@1 path $= ".pdf"` | 高亮路径以`.pdf`结尾的结果 |

## 测试

### 3.1 环境要求

- Node.js 14+ 
- 无需安装额外依赖

### 3.2 运行测试

将脚本放至test目录运行，包括条件表达式、搜索引擎匹配、引擎包含、优先级、独立表达式测试

```bash
# 运行所有测试
node test/test-cond-expr.cjs
node test/test-engine-match.cjs
node test/test-include-engine.cjs
node test/test-priority.cjs
node test/test-standalone-expr.cjs

# 运行特定测试
node test/test-cond-expr.cjs 2>&1 | grep "FAIL"
```

成功输出如 `10 passed, 0 failed`

### 3.3 调试模式

使用[网页调试](https://greasyfork.org/zh-CN/scripts/475228)脚本或桌面端浏览器F12开发者工具 → Console标签查看输出

输入命令查看对应输出

```bash
// 查看当前配置
console.log('当前配置:', GM_getValue('searchfilter_blocker'));

// 查看编译后的规则
console.log('编译规则:', compiledRules);

// 查看搜索引擎识别
console.log('搜索引擎:', getSearchEngine());

// 查看当前页面结果数量
console.log('结果数量:', document.querySelectorAll('div.g').length);

// 监控规则匹配性能
console.time('规则匹配');
checkRuleMatchOptimized(url, domain, title, snippet, subdomainLevels);
console.timeEnd('规则匹配');

// 监控DOM查询性能
console.time('结果查询');
document.querySelectorAll(selector);
console.timeEnd('结果查询');
```

正常输出

```bash
// 正常启动
[屏蔽] 引擎: google, 选择器: "div.g, div.MjjYud", 匹配数量: 15
[屏蔽] 未处理的新结果数量: 15
[屏蔽] 共屏蔽 3 个结果

// 表示：成功识别Google引擎，找到15个结果，屏蔽了3个
```

错误输出

```bash
// 规则语法错误
规则预编译失败: *://example.com/* Error: Invalid regex pattern

// 表示：规则语法有误，需要检查规则格式
```

## 截图

<img width="450" height="288" alt="01" src="https://github.com/user-attachments/assets/8523f109-84d1-4eba-b8d5-678b0a824340" />
<br/>
<img width="200" height="133" alt="03" src="https://github.com/user-attachments/assets/32cdce71-23b3-4ed9-9ac7-9220af80beb1" />
