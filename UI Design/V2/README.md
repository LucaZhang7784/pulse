# Pulse V2 · Smoked Glass Instrument

2026-10-10。基于上一轮 Dribbble 参考分析制作的原创 HTML/CSS 概念稿。参考原图未嵌入本稿。

## 查看

- `01-codex-smoked-glass.png`：深色编辑器背景 + Codex 详情。
- `02-antigravity-smoked-glass.png`：同一视觉系统下的 Antigravity 详情。
- `03-codex-daylight.png`：浅色工作桌面背景上的深色浮层。
- `04-codex-warm-white.png`：暖白强调色对照。
- `preview.html`：可切换上述方向；栏内 Codex / Antigravity 可点击。

## 改进

恢复悬浮栏的用量环、百分比与余额读数；保留指定服务顺序。烟熏表面使用局部边缘高光与柔和投影，选中服务有独立底座。详情页以额度大数字为主，分段仪表为辅，最近活跃会话放在内嵌表面，模型、强度和用量作用域明确区分。

本轮继续应用 high-end-visual-design 与 frontend-design 的材质、层次和一致性原则。沿用上一轮参考中的玻璃光影与数字层级，未复制原作布局或图形。设计判断来自用户查看、视觉层次、桌面工程、信息准确性四个视角。

## 边界

所有模型名、额度、余额、tokens、状态和时间均为演示值，不连接用户账户。tokens 中缓存属于输入的一部分，输入与输出相加为总量。Antigravity 的 5 小时 / 周额度是统一框架示意，生产布局应按实际返回的配额窗口和模型分组；不能将示意窗口当作接口能力。

背景为手绘代码编辑器示意，不是真实软件截图。CSS 背景模糊只展示画板内部的玻璃效果，不代表已经实现原生跨窗口 Acrylic/Mica。常驻栏宽 84px、详情宽 390px，实际落地需考虑可用工作区、紧凑模式、缩放与字体可读性。固定、关闭、刷新为设计位置示意，未绑定生产功能。

本目录仅为下一版设计预览，未修改生产 UI 或重新安装程序。

## 复现

项目根目录执行：`node_modules\.bin\electron "UI Design\V2\render.cjs"`。
