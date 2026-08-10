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
- 3D 轴色沿用图形学 RGB 约定:x 红、y 绿、z 蓝;2D 一律使用主题 token,不硬编码颜色。

## 记号与命名

- 记号:标量场 φ(x, y);向量场 F = (P, Q);函数 f 及其偏导 f_x、f_y;微分算子用 ∇(grad / div / curl)。
- 目录与文件:demo 场景放 `src/visualizations/demos/<kebab-name>/`;React island 放 `src/components/visualization/<PascalCase>.tsx`;共享工具放 `src/visualizations/core/`(math / colormap / plot2d / coords);预设场 id 用 kebab-case。
- 文章放 `src/content/posts/<category>/<slug>.mdx`,frontmatter 沿用现有 schema。

## 渲染与交互

- 交互组件一律以 `client:visible` 挂载;SSR 无副作用(DOM 访问只发生在 `useEffect` 内)。
- 交互手势统一:2D 画布 = 左键拖拽(探针 / 切点等自身交互)、滚轮 = 光标中心缩放、中键拖拽 = 平移(`core/canvas2d.ts`);3D = 左键/中键拖拽旋转、滚轮缩放、右键平移(`core/viewer3d.ts` + `core/controls.ts` 统一参数)。
- 3D 交互统一走共享层:`core/viewer3d.ts`(renderer/camera/controls/resize/主题/清理)与 `core/drag3d.ts`(raycast 拖拽,拖拽时禁用 controls);3D 场景的坐标由 `core/coords.ts` 的 `mathToWorld` 唯一映射。
- 每个 demo 自带"坐标轴"开关(默认开启):2D 用 `drawAxes`(含刻度 / 网格),3D 用 `core/axes3d.ts` 的彩色轴线组(x 红 / y 绿 / z 蓝),scene API 提供 `setAxesVisible(v)`。
- 交互区增强:每个 demo 由 `ExpandableDemo` 包裹,右上角"展开"进入伪全屏固定浮层(非 Fullscreen API),× 关闭恢复;同一实例状态保留;画布高度用 CSS 变量 `--demo-height`(默认 2D 20rem / 3D 28rem,展开 70vh)。
- 主题:2D 用 `watchTheme` 触发重绘;3D 监听 `html` 的 class 变化,重设 `setClearColor` 并重渲;颜色从 CSS 变量读取(`readThemeColors`),禁止硬编码。
- 数值微分统一走 `core/math.ts`(中心差分:梯度 / 散度 / 旋度),默认步长 h = 1e-4。
- 资源清理:Three 场景销毁时遍历 dispose 几何体 / 材质 / 纹理并移除 canvas;React effect cleanup 必须完整。

## 工程约定

工程约定(TS 优先、pnpm、lint / format 等)见根目录 `AGENTS.md`,此处不重复。

- 行尾统一 LF(由 `.gitattributes` 强制),文本文件 UTF-8 无 BOM(见 `.editorconfig`)。
