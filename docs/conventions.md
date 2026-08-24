# 数学与图形学约定

本文件规定 gfxvis 可视化与文章使用的数学、图形学、渲染与交互约定。实现或修改可视化之前请先阅读。

## 坐标系与映射

- **数学约定**:右手系,z 轴向上。曲面/场等数学对象一律用数学坐标 (x, y, z) 定义,例如曲面 z = f(x, y)。
- **Three 世界**:右手系,y 轴向上(Three 原生约定)。相机统一使用 `createCamera` + `OrbitControls`(带阻尼)。
- **唯一映射**:数学坐标进入 Three 世界必须经过 `src/visualizations/core/coords.ts` 的 `mathToWorld(x, y, z) = (x, z, -y)`,禁止在 3D 场景里手写等价坐标。
  - 该映射 det = +1,保右手系;数学 +z(上)映射为世界 +y(上)。
  - 点与方向向量共用同一线性映射;射线拾取需按逆映射换算(数学 x = world x,数学 y = −world z)。
- **2D 画布**:使用数学坐标,屏幕 y 向上;坐标变换统一走 `core/plot2d.ts` 的 `createPlot2D`。

## 方向与符号

- 法线朝上:数学法线 n_z > 0;曲面切平面由 r_x = (1, 0, f_x)、r_y = (0, 1, f_y) 叉积张成,n = r_x × r_y = (−f_x, −f_y, 1)。
- 二维旋度以逆时针为正(∇×F > 0 逆时针);散度正 = 源、负 = 汇;梯度指向函数上升最快的方向。
- 3D 曲面上的梯度箭头有两种模式(默认水平):水平模式画二维梯度 (φ_x, φ_y, 0)(z = 0,方向与 2D 一致);曲面模式画沿曲面最陡上升切线方向 (φ_x, φ_y, |∇φ|²)(切于曲面,水平投影即 2D 梯度);∇φ = 0 时隐藏。
- 3D 轴色沿用图形学 RGB 约定:x 红、y 绿、z 蓝;2D 一律使用主题 token,不硬编码颜色。

## 记号与命名

- 记号:标量场 φ(x, y);向量场 F = (P, Q);函数 f 及其偏导 f_x、f_y;微分算子用 ∇(grad / div / curl)。
- 目录与文件:demo 场景放 `src/visualizations/demos/<kebab-name>/`;框架基础设施组件/Hook 放 `src/components/framework/<PascalCase>.tsx`;React island Demos 放 `src/components/demos/<PascalCase>.tsx`;共享工具放 `src/visualizations/core/`(math / colormap / plot2d / coords);预设场 id 用 kebab-case。
- 框架与共享层:Three 工具集中在 `core/three-utils.ts`(灯光 / 网格 / 标记 / 曲面材质与透明度 / `disposeObject` / `buildColoredGrid`),2D 绘制辅助在 `core/plot2d.ts`(`drawAxes` / `drawPolyline` / `drawPoint` / `drawSegment` / `drawArrow`),数值与网格采样在 `core/math.ts`(`sampleGrid` / `forEachCube`);React 侧复用 `components/framework/` 下的 `useCanvas2D` / `useViewer3D` / `useVectorDrag` hooks 与 `ExpandableDemo` / `PresetSelector` / `CapsuleTabs` / `ParamSlider` / `Checkbox` / `InlineMath` 组件;预设场唯一来源是 `demos/scalar-field/field.ts` 的 `FIELDS2D`(圆族 / 抛物线族自带可选 `levelCurve`)。
  - **InlineMath 属性转义**: JSX 静态双引号属性中传 TeX 必须用**单个反斜杠**（`<InlineMath tex="\mathbb{R}^3" />`），严禁双反斜杠；JS 表达式/模板字符串中才使用**双反斜杠**（``tex={`\\hat{\\mathbf{x}} = ${v}`}``）。
- 文章放 `src/content/posts/<category>/<slug>.mdx`,frontmatter 沿用现有 schema。
- MDX 排版(CommonMark 加粗与中文):`**...**` 的边界不要紧贴中文。闭合 `**` 后紧跟中文会被 CommonMark 误配(同一段有多个加粗时更严重),渲染成字面 `**` 或加粗错位;开头 `**` 后紧跟中文引号则无法开启加粗。正确写法:**两侧都加空格、保持对称**,如 `落到 **线性组合(linear combination)** 上`(紧贴一侧时至少让闭合 `**` 后接空格或标点);不要把中文引号包进 `**` 内侧(写 `**输出能到哪里**`,不要写 `**"输出能到哪里"**`)。
- 文章标点:中文语句一律用**全角标点**(`,` `;` `:` `?` `!` → `，` `；` `：` `？` `！`;中文引号用 `“ ”` 成对,不用 ASCII `"`;包中文内容的括号用 `（）`)。公式、代码(含 MDX 顶部 `import` 与 JSX)、Markdown 链接 `[文字](url)`、英文术语与数字内部,一律保持英文标点(如 `(linear combination)`、`(x,y)`、`rank(A)` 不变)。

## 渲染与交互

- 交互组件一律以 `client:visible` 挂载;SSR 无副作用(DOM 访问只发生在 `useEffect` 内)。
- 交互手势统一:2D 画布 = 左键拖拽(探针 / 切点等自身交互)、滚轮 = 光标中心缩放、中键拖拽 = 平移(`core/canvas2d.ts`);3D = 左键/中键拖拽旋转、滚轮缩放、右键平移(`core/viewer3d.ts` + `core/controls.ts` 统一参数)。
- **Transform Gizmo 拖拽体系 (2D & 3D 对偶规范)**:
  - **核心层**: `src/visualizations/core/common/interaction.ts` 统一定义交互常数(`FADE_DELAY_MS = 1200`, `FADE_DURATION_MS = 500`, `FADE_EASE_EXPONENT = 1.2`)、淡出动画解算器 `computeFadeOpacity` 与零跳变(Zero-jump)相对位移约束投影。
  - **视觉层级规范**:
    - **基础物理/数学点常驻**: 2D 向量端点与 3D 空间探针点始终以 100% 不透明度常驻渲染，保留饱满的圆点与坐标标注;
    - **Transform Gizmo 覆盖层智能呼出**: 鼠标悬停到点附近时平滑展开轴向与平面控件，鼠标移开后经 1.2s 常亮延时 + 0.5s 平滑淡出;
    - **悬浮与聚焦明暗 (Focus & Dimming)**: 当前鼠标悬停或抓取的轴/平面/中心点强高亮(自发光 `1.0` / 亮金色 `#facc15` / 尺寸 `1.15x`)，其余未激活控件适度暗化，形成鲜明焦点。
  - **2D Transform Gizmo**: 通过 `useVectorDrag` + `core/2d/plot2d.ts` 的 `drawDragGizmo` 实现，支持 `"free"`(自由平面拖动)、`"axes"`(XY 坐标轴双向箭头)与 `"directions"`(自定义子空间/切线方向箭头与 Badge)。
  - **3D Transform Gizmo**: 通过 `core/3d/gizmo3d.ts` 的 `createTransformGizmo3D` + `attachGizmo3D` 实现，支持 `"volume"`(自由空间 3 轴箭头 + 3 平面色块 + 中心球体)与 `"surface"`(曲面约束点 + XY 平面色块 + $z=f(x,y)$ 自动吸附)。
- 2D 画布默认等比例轴(`canvas2d` 的 `equalScale` 默认开启,无 UI 开关):视图恒为画布等比的居中矩形,xy 每单位像素相同,请求区域完整可见;缩放按同一系数作用于两轴,平移/尺寸变化保持比例。非等比(`equalScale: false`)仅作内部回退,当前无 demo 使用。
- 3D 交互统一走共享层:`core/viewer3d.ts`(renderer/camera/controls/resize/主题/清理)与 `core/3d/gizmo3d.ts` / `core/3d/drag3d.ts`(raycast 拖拽,拖拽时禁用 controls);3D 场景的坐标由 `core/3d/coords.ts` 的 `mathToWorld` 唯一映射。
- 每个 demo 自带"坐标轴"开关(默认开启):2D 用 `drawAxes`(含刻度 / 网格),3D 用 `core/3d/axes3d.ts` 的彩色轴线组(x 红 / y 绿 / z 蓝),scene API 提供 `setAxesVisible(v)`。
- 交互区增强:每个 demo 由 `ExpandableDemo` 包裹,右上角"展开"进入伪全屏固定浮层(非 Fullscreen API),× 关闭恢复;同一实例状态保留;画布高度用 CSS 变量 `--demo-height`(默认 2D 20rem / 3D 28rem,展开 70vh)。
  - **CanvasToolbar 放置规范（严防 UI 重叠）**:
    - `<CanvasToolbar>` **必须且只能**作为 Canvas 画布容器（具备 `relative overflow-hidden` 类）的**直接子元素**，严禁放置在外部的 Card/Flex 顶层容器中；
    - 画布容器高度必须绑定 `h-[var(--demo-height,28rem)]`（2D 为 `20rem`），确保 S/M/L 预设与拖拽缩放正常工作；
    - 严禁在 Demo 顶部控制栏自制重复的“复位”或“关闭/全屏”按钮，统一由 `CanvasToolbar`（画布视野复位 + 展开）与 `ExpandableDemo`（全局模态关闭）分别承载。
- 3D 曲面默认半透明(opacity≈0.55、depthWrite=false)并带开关,保证箭头/标记可见;切换时同步 transparent/opacity/depthWrite。
- 主题:2D 用 `watchTheme` 触发重绘;3D 监听 `html` 的 class 变化,重设 `setClearColor` 并重渲;颜色从 CSS 变量读取(`readThemeColors`),禁止硬编码。
- 数值微分统一走 `core/common/math.ts`(中心差分:梯度 / 散度 / 旋度),默认步长 h = 1e-4。
- 资源清理:Three 场景销毁时遍历 dispose 几何体 / 材质 / 纹理并移除 canvas;React effect cleanup 必须完整。
- 禁止重复造轮子:不要复制 `disposeObject`、灯光 / 网格 / 曲面材质、顶点着色网格构建等代码,一律从 `core/3d/three-utils.ts` 引入;2D 画布挂载走 `useCanvas2D`(组件内只调 `redraw()` / `setBounds()`),3D 场景挂载 / 清理走 `useViewer3D`(`setup` 里做初始状态与 `attachGizmo3D` / `attachDrag3D`,清理由 hook 完成)。

## 工程约定

工程约定(TS 优先、pnpm、lint / format 等)见根目录 `AGENTS.md`,此处不重复。

- 行尾统一 LF(由 `.gitattributes` 强制),文本文件 UTF-8 无 BOM(见 `.editorconfig`)。
