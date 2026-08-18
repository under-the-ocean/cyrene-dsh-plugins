# Cyrene DSH Plugin — 昔涟 dsh 插件

> 把《崩坏：星穹铁道》"昔涟"（Cyrene）的 **Live2D 桌宠** 与 **珍珠白粉色主题** 移植为 DeepSeek Harness (dsh) 插件。

## 插件

`dsh-cyrene` — 一个插件同时提供主题 + 桌宠：

| 功能 | 说明 |
|------|------|
| **昔涟主题** | pearl-white 白调 + 粉色系，覆盖 DSH 设计 token（亮/暗双配色） |
| **Live2D 桌宠** | 真实 Live2D 模型渲染（WebGL，呼吸/眨眼物理） |
| **会话状态驱动** | thinking / tool / review / done / failed 阶段自动播放对应动作 |
| **粒子动效** | 全页粉色-紫色粒子背景（移植自昔涟聊天界面） |
| **背景渐变** | 全页渐变背景（亮色白粉 / 暗色深紫黑） |
| **四边四角缩放** | 像 Windows 窗口一样拖拽边缘缩放 |
| **拖动 + 点击表情** | 拖动 reposition，点击随机表情（4 秒自动回正） |
| **位置/缩放持久化** | 重启后恢复 |
| **配置卡片** | 可折叠插件配置：粒子 / 渐变 / 待机动画 / 阶段动作 / 显示桌宠 |

## 安装

### 从 npm（推荐）

```sh
dsh plugin --profile web add dsh-cyrene
```

### 从 GitHub

```sh
dsh plugin --profile web add "github:<你的用户名>/dsh-cyrene-plugins#main:packages/dsh-cyrene"
```

### 本地开发

```sh
git clone https://github.com/<你的用户名>/dsh-cyrene-plugins.git
cd dsh-cyrene-plugins
dsh plugin --profile web add link:$(pwd)/packages/dsh-cyrene
```

安装后**重启 `dsh web`** 并刷新页面。

## 架构

```
packages/dsh-cyrene/
├── lib/
│   ├── index.js          # 宿主：会话事件 → 状态机 + API + 资源路由
│   └── client.js         # 浏览器：主题 token + Live2D + 粒子 + 交互 + 设置卡片
└── assets/cyrene/        # Live2D 模型 + Cubism Core
```

## 依赖

浏览器半区动态加载（CDN）：
- `pixi.js@7.4.2`（jsdelivr）
- `pixi-live2d-display` cubism4 构建（jsdelivr）
- Cubism Core 与 Live2D 模型由插件自身资源路由提供（`/cyrene/*`）

## 移植来源与授权

本项目是 **Cyrene-Agent**（[原项目](https://github.com/Playa/cyrene-agent)）的 dsh 插件移植。详见 [MODEL_LICENSE.md](./MODEL_LICENSE.md)。

- **Live2D 模型作者**：B 站 UP 主 `是依七哒`（[空间链接](https://space.bilibili.com/457683484)），已获得**完全授权**使用、修改、再分发
- **原项目**：Cyrene-Agent（MIT License，Copyright © 2026 Playa）
- **底层角色 IP**：昔涟（Cyrene）出自《崩坏：星穹铁道》，归 HoYoverse / 米哈游所有

## 免责声明

本插件是**粉丝同人项目**，与 HoYoverse / 米哈游无关。昔涟角色 IP 不得用于商业用途。

## License

- 代码：MIT（见 [LICENSE](./LICENSE)）
- Live2D 模型：见 [MODEL_LICENSE.md](./MODEL_LICENSE.md)
