# Cyrene DSH Plugins — 昔涟 dsh 插件

> 把《崩坏：星穹铁道》"昔涟"（Cyrene）的 **Live2D 桌宠** 与 **珍珠白粉色主题** 移植为 DeepSeek Harness (dsh) 插件。

## 插件列表

| 插件 | 说明 | 类型 |
|------|------|------|
| `@dsh-local/cyrene-skin` | 昔涟 pearl-white 白调 + 粉色系主题，覆盖 DSH 设计 token | client-plugin |
| `@dsh-local/cyrene-pet` | 昔涟 Live2D 桌宠：会话状态驱动动作、粒子背景、全页渐变、可缩放拖动 | dual-half-plugin |

## 功能

### 皮肤（cyrene-skin）
- 把昔涟的珍珠白 + 粉色配色映射到 DSH 的 `--dsw-alias-*` 设计 token
- 亮/暗双配色（暗色为深紫黑 + 亮粉）
- 粉色选区、焦点环、链接色

### 桌宠（cyrene-pet）
- **真实 Live2D 模型渲染**（WebGL，呼吸/眨眼物理）
- **会话状态驱动动作**：thinking / tool / review / done / failed 阶段自动播放对应动作
- **全页粒子动效** + **全页渐变背景**（移植自昔涟聊天界面）
- **四边四角缩放**（像 Windows 窗口一样拖拽边缘缩放）
- **拖动 reposition** + **点击随机表情**（4 秒自动回正）
- **位置/缩放持久化**
- **插件配置卡片**（可折叠）：粒子 / 背景渐变 / 待机动画 / 阶段动作 开关

## 安装

```sh
# 从仓库安装
dsh plugin --profile web add "github:<你的用户名>/cyrene-dsh-plugins#main:packages/dsh-cyrene-skin"
dsh plugin --profile web add "github:<你的用户名>/cyrene-dsh-plugins#main:packages/dsh-cyrene-pet"
```

或本地开发：

```sh
git clone https://github.com/<你的用户名>/cyrene-dsh-plugins.git
cd cyrene-dsh-plugins
dsh plugin --profile web add link:$(pwd)/packages/dsh-cyrene-skin
dsh plugin --profile web add link:$(pwd)/packages/dsh-cyrene-pet
```

安装后**重启 `dsh web`** 并刷新页面。

## 架构

```
packages/
├── dsh-cyrene-skin/          # 皮肤插件（client-only）
│   └── lib/
│       ├── index.js          # 宿主空载体
│       └── client.js         # 浏览器半区：token 覆盖 + 全局样式
└── dsh-cyrene-pet/           # 桌宠插件（dual-half）
    ├── lib/
    │   ├── index.js          # 宿主：会话事件 → 状态机 + API + 资源路由
    │   └── client.js         # 浏览器：Live2D 渲染 + 粒子 + 交互 + 设置卡片
    └── assets/cyrene/        # Live2D 模型 + Cubism Core
```

## 依赖

浏览器半区动态加载（CDN）：
- `pixi.js@7.4.2`（jsdelivr）
- `pixi-live2d-display` cubism4 构建（jsdelivr）
- Cubism Core 与 Live2D 模型由插件自身资源路由提供（`/cyrene-pet/*`）

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
