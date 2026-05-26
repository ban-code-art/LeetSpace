# LeetSpace

LeetSpace 是一个面向 LeetCode / 力扣的 Chrome MV3 侧边栏插件，提供刷题计划、题单导入、笔记沉淀、AI 辅助、进度同步和做题计时等能力。

## 功能特性

- 今日计划：按题单分组管理刷题任务，支持折叠、删除和进度统计。
- 题单导入：支持从当前页面扫描题单，也支持粘贴力扣题单链接导入。
- 力扣进度同步：可同步力扣账号中已 AC 的题目进度；提交通过后也会自动标记完成。
- 笔记系统：支持最近笔记、完整笔记库、Markdown 预览/源码切换、题单批量导入笔记。
- AI 辅助：自动识别当前题目信息，提供简洁的思路、解法、复杂度和避坑提示。
- 悬浮窗：显示今日进度，并提供播放/暂停/重置计时器。
- 设置页：基础设置与高级设置分离，支持 AI API、自定义提示词和悬浮窗配置。

## 安装到 Chrome

### 方式一：下载已打包版本（推荐普通用户）

1. 在 GitHub Releases 下载最新的插件压缩包。
2. 解压压缩包，得到插件目录。
3. 打开 Chrome 的 `chrome://extensions/`。
4. 开启“开发者模式”。
5. 点击“加载已解压的扩展程序”。
6. 选择刚刚解压出来的插件目录。
7. 打开 `leetcode.cn` 或 `leetcode.com` 页面使用插件。

### 方式二：从源码构建安装（推荐开发者）

```bash
git clone <your-repo-url>
cd leetspace
npm install
npm run build
```

然后在 Chrome 的 `chrome://extensions/` 中加载项目下的 `dist/` 目录。

> 注意：如果只是从 GitHub 拉取源码，不能直接加载项目根目录；需要先执行 `npm run build` 生成 `dist/`，或者下载 Releases 中已经构建好的插件包。

## 本地开发

```bash
npm install
npm run dev
```

开发模式会持续构建到 `dist/`。

## 构建

```bash
npm run build
```

构建产物位于 `dist/`。

## AI 配置

进入插件侧边栏的“设置”，在高级设置中配置 AI Provider、API Key、模型和 Base URL。

API Key 只保存在浏览器本地的 `chrome.storage.local`，不会提交到仓库。

## 权限说明

- `sidePanel`：提供 Chrome 侧边栏界面。
- `storage`：保存计划、笔记、设置和计时数据。
- `activeTab` / `tabs`：读取当前页面题目信息和打开完整笔记页。
- `https://leetcode.cn/*` / `https://leetcode.com/*`：扫描题目、题单和同步 AC 状态。

## 发布说明

当前项目为开发者模式安装版本。如需发布到 Chrome Web Store，需要额外准备隐私政策、商店截图、详细说明和打包 zip。

## 注意事项

- 力扣进度同步需要浏览器已登录对应站点账号。
- AI 功能需要自行配置可用的 API Key。
- `dist/` 为构建产物，默认不提交到 GitHub。
