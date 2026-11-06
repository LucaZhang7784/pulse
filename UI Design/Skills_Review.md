# 本机设计 skills 评估

用途：全量盘点风格库，按 Pulse 常驻桌面工具场景筛选；不将互相冲突的风格机械叠加。

## 本轮主要方法

- high-end-visual-design：双层边界、克制材质和间距。
- frontend-design / design-taste-frontend：信息层次、状态与性能。
- brandkit：统一色彩和视觉语言。
- image-to-code / imagegen-frontend-mobile：参考画面的可读性与一致性；不采用手机框架。
- imagegen：已阅读；其适用边界建议原生 UI 用 HTML/CSS，本轮采用 Electron 精确渲染，不调用生成式绘图。
- gpt-taste：参考简洁表达；营销落地页、GSAP 与转化漏斗不适用于本任务。
- full-output-enforcement：交付完整预览和可重渲染源文件。
- canvas：图解类能力，本次无需另造图表。

## 本机风格库逐项筛选

| Skill | 判断 | 描述 |
|---|---|---|
| agentic | 已评估；风格或交互目标与常驻监测工具不匹配 | Conversational AI-first interface with minimal controls, clear outcomes, and delegated task flows for agentic workflows. |
| ant | 采纳局部原则：层次 / 对齐 / 克制材质 | Structured, enterprise-focused design system emphasizing clarity, consistency, and efficiency for data-dense web applications. |
| artistic | 已评估；风格或交互目标与常驻监测工具不匹配 | High-contrast, expressive style with creative typography and bold color choices for visually striking interfaces. |
| basic | 已评估；风格或交互目标与常驻监测工具不匹配 | Print-inspired visual language for books, magazines, and reports with editorial grids and expressive typography. |
| bento | 采纳局部原则：层次 / 对齐 / 克制材质 | Modular grid layout with card-like blocks, clear hierarchy, soft spacing, and subtle visual contrast for organized, scannable interfaces. |
| bold | 已评估；风格或交互目标与常驻监测工具不匹配 | Strong visual presence with heavyweight typography, high-contrast colors, and commanding layouts. |
| brutalism | 已评估；风格或交互目标与常驻监测工具不匹配 | Raw, anti-design aesthetic inspired by concrete architecture with unadorned elements, jarring layouts, and functional minimalism. |
| cafe | 已评估；风格或交互目标与常驻监测工具不匹配 | Cozy cafe-inspired interface with warm tones, soft typography, and clean layouts for a relaxed browsing experience. |
| claude | 已评估；风格或交互目标与常驻监测工具不匹配 | "A research-journal aesthetic printed on warm stone — authoritative, editorial, almost achromatic. Pages live on warm ivory parchment (never pure white), with near-black slate as the dominant ink." |
| claymorphism | 已评估；风格或交互目标与常驻监测工具不匹配 | Soft, rounded 3D-like shapes mimicking malleable clay with playful, puffy elements and colorful surfaces. |
| clean | 采纳局部原则：层次 / 对齐 / 克制材质 | Simplicity-focused design with ample whitespace, legible typography, and a limited color palette to reduce visual clutter. |
| codex | 已评估；风格或交互目标与常驻监测工具不匹配 | "A radically minimal, blank-canvas interface built as a pure edge-to-edge surface, with almost no color and typography carrying the visual weight. Black serves as the only filled color, the only divider, and the sole surface tone cards." |
| colorful | 已评估；风格或交互目标与常驻监测工具不匹配 | Vibrant, high-contrast palettes and gradients for engaging, memorable, and modern user experiences. |
| contemporary | 采纳局部原则：层次 / 对齐 / 克制材质 | Current-era minimalist design with bento grids, dark mode support, and high-performance accessible layouts. |
| corporate | 已评估；风格或交互目标与常驻监测工具不匹配 | Professional, brand-aligned design with structured grids, minimalist layouts, and consistent enterprise patterns. |
| cosmic | 已评估；风格或交互目标与常驻监测工具不匹配 | Futuristic sci-fi aesthetic with dark themes, vibrant neon accents, and immersive spatial elements. |
| creative | 已评估；风格或交互目标与常驻监测工具不匹配 | Playful, character-driven design with expressive typography and bold graphics for landing pages and creative projects. |
| dithered | 已评估；风格或交互目标与常驻监测工具不匹配 | Dot-pattern rendering technique that simulates shades with a limited palette for nostalgic, retro, high-contrast visuals. |
| doodle | 已评估；风格或交互目标与常驻监测工具不匹配 | Hand-drawn, sketch-like style with doodles, handwritten fonts, and imperfect lines for a playful, informal feel. |
| dramatic | 已评估；风格或交互目标与常驻监测工具不匹配 | High-contrast, theatrical design with bold layouts, immersive visuals, and unconventional compositions that command attention. |
| editorial | 已评估；风格或交互目标与常驻监测工具不匹配 | Magazine-inspired editorial layout with refined serif typography, structured grids, and elegant reading experiences. |
| enterprise | 采纳局部原则：层次 / 对齐 / 克制材质 | Dark-themed cloud-platform aesthetic with modular grids, glass-like panels, and strong data hierarchy for productivity dashboards. |
| expressive | 已评估；风格或交互目标与常驻监测工具不匹配 | Vibrant, personality-driven design with bold colors, playful graphics, and dynamic layouts that balance creativity with structure. |
| fantasy | 已评估；风格或交互目标与常驻监测工具不匹配 | Game-inspired fantasy aesthetic with bold, premium visuals, rich color palettes, and immersive thematic elements. |
| fiction | 已评估；风格或交互目标与常驻监测工具不匹配 | "A playful, energetic, cartoonesque interface inspired by friendly children's-book illustrations — warm cream backgrounds, big bold custom display typography, saturated brand color blocks, thick black outlines, generously rounded shapes" |
| flat | 已评估；风格或交互目标与常驻监测工具不匹配 | Two-dimensional minimalist style with vibrant colors, clean typography, and no 3D effects for fast, user-friendly interfaces. |
| friendly | 已评估；风格或交互目标与常驻监测工具不匹配 | Approachable, intuitive design with rounded elements, ample whitespace, and soft pastel color palettes. |
| futuristic | 采纳局部原则：层次 / 对齐 / 克制材质 | Forward-looking design with tech-inspired typography, modern layouts, and a sleek, innovation-driven aesthetic. |
| geometric | 采纳局部原则：层次 / 对齐 / 克制材质 | Geometric, structured design with clean typography, neutral colors, precise shapes, and intuitive layouts that stay out of the way. |
| glassmorphism | 采纳局部原则：层次 / 对齐 / 克制材质 | Frosted glass effect with translucent layers, subtle blur, and luminous borders for depth and modern elegance. |
| gradient | 已评估；风格或交互目标与常驻监测工具不匹配 | Smooth color transitions and gradient-rich surfaces for modern, playful interfaces with visual depth. |
| immersive | 已评估；风格或交互目标与常驻监测工具不匹配 | "An immersive, interactive, exhibit-style interface that blends storytelling, animation, and gamified elements to create a playful, experience-driven journey. The entire app sits on a single continuous brand-colored canvas (deep green)" |
| impeccable | 已评估；风格或交互目标与常驻监测工具不匹配 | "A modern, graphic, editorial-poster aesthetic — warm and confident — built on alternating cream and burnt orange sections, an amber brand color." |
| levels | 已评估；风格或交互目标与常驻监测工具不匹配 | Conversion-focused design that removes friction and guides users toward action through clarity, trust, and speed. |
| lingo | 已评估；风格或交互目标与常驻监测工具不匹配 | Playful, minimal design with bright colors, rounded shapes, tactile 3D borders, and friendly illustrations for approachable interfaces. |
| material | 采纳局部原则：层次 / 对齐 / 克制材质 | Google's Material Design with layered surfaces, dynamic theming, built-in motion, and responsive cross-platform patterns. |
| matrix | 已评估；风格或交互目标与常驻监测工具不匹配 | "A cyber-slick, dark-only Matrix-inspired interface defined by minimalist fashion, high-tech digital elements" |
| minimal | 采纳局部原则：层次 / 对齐 / 克制材质 | Stripped-back design emphasizing whitespace, clean typography, and restrained color for maximum clarity and focus. |
| modern | 已评估；风格或交互目标与常驻监测工具不匹配 | Contemporary editorial style with serif typography, minimal palettes, and clean layouts for polished digital products. |
| mono | 采纳局部原则：层次 / 对齐 / 克制材质 | Monospace-driven, matrix-inspired design with high-contrast elements, compact density, and a hacker-chic aesthetic. |
| neobrutalism | 已评估；风格或交互目标与常驻监测工具不匹配 | Modern take on brutalism with bold borders, vivid accent colors, and raw, high-contrast layouts on warm surfaces. |
| neon | 已评估；风格或交互目标与常驻监测工具不匹配 | Electric neon glow effects with high-contrast color pairings for bold, attention-grabbing interfaces. |
| neumorphism | 已评估；风格或交互目标与常驻监测工具不匹配 | Soft, extruded UI elements with inner and outer shadows on monochromatic surfaces for a tactile, embedded look. |
| pacman | 已评估；风格或交互目标与常驻监测工具不匹配 | Retro arcade-inspired design with pixel fonts, dotted borders, playful high-contrast colors, and 8-bit game aesthetics. |
| paper | 已评估；风格或交互目标与常驻监测工具不匹配 | Paper-textured, print-inspired design with minimal colors, clean serif/sans typography, and tactile surface qualities. |
| perspective | 已评估；风格或交互目标与常驻监测工具不匹配 | Spatial depth design with isometric views, vanishing points, and layered elements that guide attention through 3D-like realism. |
| power | 采纳局部原则：层次 / 对齐 / 克制材质 | High-end dark aesthetic with bold headings, monochromatic palette, and premium feel for premium brand experiences. |
| premium | 采纳局部原则：层次 / 对齐 / 克制材质 | Apple-inspired premium aesthetic with precise spacing, modern typography, and a refined, polished visual language. |
| professional | 采纳局部原则：层次 / 对齐 / 克制材质 | Polished, business-ready design with modern typography, structured layouts, and a trustworthy visual identity. |
| pulse | 已评估；风格或交互目标与常驻监测工具不匹配 | Dynamic, vibrant style with thick borders, geometric shapes, high-contrast colors, and expressive typography conveying motion and vitality. |
| refined | 采纳局部原则：层次 / 对齐 / 克制材质 | Carefully curated, modern minimal style with elegant serif typography and understated, sophisticated palettes. |
| retro | 已评估；风格或交互目标与常驻监测工具不匹配 | Throwback design with vintage-inspired typography, high-contrast retro palettes, and nostalgic visual elements. |
| riso | 已评估；风格或交互目标与常驻监测工具不匹配 | "A playful, joyful, two-color risograph print aesthetic built on a single warm off-white paper surface running through every section" |
| roku | 已评估；风格或交互目标与常驻监测工具不匹配 | App dashboard with purple-themed aesthetic, top-bar navigation, card-based layouts, and developer-first workflows. |
| sega | 已评估；风格或交互目标与常驻监测工具不匹配 | "A playful, arcade-inspired interface for games — built on the VT323 pixel typeface, hard-edged 0px corners, chunky pill buttons that physically press into solid offset blocks" |
| shadcn | 采纳局部原则：层次 / 对齐 / 克制材质 | Shadcn/ui-inspired design with minimal, clean components, monochrome palette, and utility-first patterns. |
| sketch | 已评估；风格或交互目标与常驻监测工具不匹配 | "A friendly, hand-drawn sketch interface inspired by pencil illustrations on warm cream paper. Soft teal brand accents, hand-written display headings, rounded pill controls." |
| skeumorphism | 已评估；风格或交互目标与常驻监测工具不匹配 | Real-world mimicry with textured surfaces, 3D effects, and familiar physical metaphors for intuitive digital interfaces. |
| sleek | 采纳局部原则：层次 / 对齐 / 克制材质 | Modern minimalist aesthetic with clean lines, intentional color palette, subtle interactions, and consistent spacing. |
| spacious | 采纳局部原则：层次 / 对齐 / 克制材质 | Generous whitespace, consistent padding, and grid-based layouts for clean, readable, and breathing interfaces. |
| square | 采纳局部原则：层次 / 对齐 / 克制材质 | Graceful, refined aesthetic with delicate typography, minimal palettes, and polished layouts that exude sophistication. |
| stitch | 已评估；风格或交互目标与常驻监测工具不匹配 | Clean, high-contrast enterprise design for data-driven workflows with intuitive drag-and-drop patterns and structured layouts. |
| storytelling | 已评估；风格或交互目标与常驻监测工具不匹配 | Narrative-driven design using visuals, copy, and interaction to guide users through engaging, emotionally resonant journeys. |
| terracotta | 已评估；风格或交互目标与常驻监测工具不匹配 | "A sun-baked, clay-toned editorial interface built on warm cream surfaces, ink-brown headlines set in a display serif, and a single terracotta accent." |
| tetris | 已评估；风格或交互目标与常驻监测工具不匹配 | Classic block-game inspired design with playful colors, bold display fonts, and compact, high-energy layouts. |
| vibrant | 已评估；风格或交互目标与常驻监测工具不匹配 | Lively, colorful design with bold playful typography, warm accents, and dynamic visual energy. |
| vintage | 已评估；风格或交互目标与常驻监测工具不匹配 | 1950s-1990s nostalgia with skeuomorphic touches, grainy textures, retro color palettes, and pixel-style typography. |

## 冲突处理

- 风格库存在不同字体、色板、边角规则；以 Windows 字体可用性和数据可读性优先。
- Pulse 同名 skill 是活力图形风格，与本项目没有实现关联。
- 网站英雄区、大幅插画、游戏化、装饰霓虹不用于生产浮层。
- 同一 skill 在 .codex / .agents 的别名不重复计为独立设计方法。
- 上表为本机风格库清单；已读取主设计方法和风格摘要，不声称运行了每个 skill 的完整工作流。
