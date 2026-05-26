# LeetSpace v0.1.0

## 下载与安装

### 普通用户安装

1. 下载 `leetspace-v0.1.0.zip`。
2. 解压压缩包。
3. 打开 Chrome 的 `chrome://extensions/`。
4. 开启“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择解压后的插件目录。
7. 打开 `leetcode.cn` 或 `leetcode.com` 使用 LeetSpace。

### 开发者源码安装

```bash
git clone <repo-url>
cd leetspace
npm install
npm run build
```

然后在 `chrome://extensions/` 中加载项目下的 `dist/` 目录。

## 主要功能

- 侧边栏今日计划与题单分组管理。
- 支持扫描题单页面和粘贴题单链接导入。
- 支持同步力扣 AC 进度，提交通过后自动更新插件状态。
- 支持笔记管理、完整笔记库和 Markdown 预览。
- 支持 AI 辅助解题提示与自动识别当前题目。
- 支持悬浮窗进度展示与做题计时器。
- 支持题单批量导入笔记，并按题单名分类。

## 注意事项

- 力扣进度同步需要浏览器已登录对应力扣账号。
- AI 功能需要在插件设置中自行配置 API Key。
- 如果从源码安装，不能直接加载项目根目录，必须先构建生成 `dist/`。

## 校验

发布前已执行：

```bash
npm run build
npm audit --audit-level=moderate
```

结果：构建通过，依赖审计 0 vulnerabilities。
