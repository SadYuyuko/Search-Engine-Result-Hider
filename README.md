# Search Engine Result Hider
## 搜索引擎结果屏蔽器
### [Github](https://raw.githubusercontent.com/SadYuyuko/Search-Engine-Result-Hider/main/Search-Engine-Result-Hider_autoupdate.user.js) | [Greasy Fork](https://greasyfork.org/zh-CN/scripts/552394)(推荐) 使用任意脚本管理器安装  
用于在仅支持安装脚本的移动端浏览器上尝试复刻ublacklist的功能，支持安装扩展的移动端和桌面端也可用但更推荐直接使用[ublacklist](https://addons.mozilla.org/zh-CN/firefox/addon/ublacklist)  
适用于Bing、Google、DuckDuckGo，未来可能支持更多搜索引擎。支持包括ublacklist规则在内的正则匹配URL、标题匹配，以及搜索词条正文内容匹配  
 
**当前功能：**  
屏蔽按钮一键屏蔽域名  
统计命中规则数量和调试输出  
导入导出规则到时间戳命名的TXT文件  
规则订阅和Webdav同步  
脚本管理器菜单设置  
┗直接打开面板  
┗开关屏蔽功能  
┗屏蔽二次确认  
┗隐藏悬浮球  
┗开关面板居中：默认居中，切换后根据悬浮球位置显示在4个角落  
┗切换悬浮球功能：默认点击展开面板，切换后点击可显示隐藏的搜索结果  
  
**关于Webdav：**  
1.每小时同步一次，逻辑为本地规则最新则上传去重合并，云端最新则下载去重合并。目前仅在单设备同步上测试过，理论上可以和ublacklist同步同一配置文件，但不保证不会出现文件错误替换逻辑问题，请提前备份文件  
2.Webdav同步依赖跨域请求权限，若不需要可不同意  
3.因为脚本数据存储存在天然风险，地址只支持https，并且最好使用单独应用密码而非主密码  
4.地址请填写完整文件夹路径，如坚果云`https://dav.jianguoyun.com/dav/your_folder/`  

**注意：**  
1.导出到TXT依赖blob处理，请确保浏览器blob功能正常  
2.订阅每天同步一次，只支持.txt文件远程链接且最多支持3条订阅，逻辑为在本地规则后应用。由于脚本性能限制，规则总数建议不要超过2w条否则手机爆炸🤳💥  
3.由于脚本扩展有限，暂不支持`@`白名单规则和`##`uBlock DOM语法规则，通过订阅导入会自动清除
    
规则主要倾向于标题和正则匹配，添加规则时可不加`*://*.`前缀直接写域名，此用于兼容ublacklist规则  
### 以下为基础规则：  
**URL匹配：**  
`*://www.example.com/*` 匹配`example.com`  
`*://*.example.com/*` 匹配`example.com`及其所有子域  
`*://*.example.com/path/*` 匹配`example.com`的特定路径  
`*://*.example.*` 匹配`example.com`所有顶级域名  
**标题匹配：**  
`title/.*示例.*/` 匹配标题包含"示例"的结果  
`title/^示例.*/` 匹配标题以"示例"开头的搜索结果  
`title/.*示例(A|B).*/` 匹配标题包含"示例A"或"示例B"的结果  
`title/.*示例(A|B).*/i` 加i忽略大小写，匹配除上条结果外还包含"示例a"和"示例b"的结果  
`title/.*示例AbC.*/i` 加i忽略大小写，匹配除"示例AbC"外还包含"示例ABC"等的结果  
**正文匹配：**  
`text/.*示例.*/` 匹配结果词条的网页描述内容中包含"示例"的搜索结果，此规则不会匹配标题  
`text/.*示例abc.*/i` 同上，加i忽略大小写  
  
  
**效果截图：**  
  
<img width="541" height="499" alt="12" src="https://github.com/user-attachments/assets/50544492-2a0d-4a25-9edf-58e05f0c323c" />  
---  
<img width="542" height="474" alt="34" src="https://github.com/user-attachments/assets/d56068eb-4bb7-4cf9-9449-c4bcbdbb6ac7" />  
---
<img width="256" height="173" alt="0" src="https://github.com/user-attachments/assets/8107e0c1-7477-4222-8204-4d675b14b49d" />  
