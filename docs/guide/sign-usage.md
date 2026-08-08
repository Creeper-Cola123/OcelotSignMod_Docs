# 告示牌基本使用方法 | 迷上城建

本模组添加了多种纹理的告示牌方块。

---

## 一、告示牌分类

《迷上城建》模组中的告示牌主要分为以下三种类型：

### 1. 悬挂的告示牌

1. 此类告示牌应悬挂在方块下方，两侧均可输入文字。如果上方连接固体方块或告示牌杆方块，则会显示告示牌杆。
2. 告示牌的文字与放置方向绑定，暂不支持直接旋转。如果你需要放置带有 NBT 的方块，则需确保放置方向与获取方向一致，否则相应侧面将不显示文字。例如，如果你获取了朝南/北的告示牌，若放置为朝东/西，原有的南北侧文字将无法显示。

### 2. 墙上的告示牌

1. 此类告示牌可放置在方块的任何表面（侧面、顶面、底面），只有一个面可以输入文字。
2. 墙上的告示牌有两种特殊的形式：**"隐形告示牌"** 和 **"隐形的发光告示牌"**。这两类告示牌的自身模型不可见，只有文字可见；当玩家手持这两种告示牌时，已放置的隐形告示牌会显示描边以便于辨认。

### 3. 直立的告示牌

1. （这一类告示牌）放置在地面或悬空，支持原版的 16 种朝向，和悬挂的告示牌一样，两侧均可输入文字。
2. 底部有方块时会显示杆子。空手状态下，按住 Shift 并点击告示牌可手动切换杆子的显示状态。

---

## 二、文本编辑基础

当玩家右键点击告示牌界面，即可进入编辑界面（悬挂/直立告示牌需点击对应面）。告示牌支持多行文本，每行均可独立设置以下的属性：

### 1. 基础样式

加粗、倾斜、下划线、删除线、随机文本等。

### 2. 文本大小

默认值为 `6`，完整大小的告示牌（含两种隐形变体）默认值为 `8`。

### 3. 偏移 (X/Y/Z)

可调整文字在三个坐标轴上的偏移。

> ⚠️ 请谨慎调整 Z 轴，可能导致文本脱离平面悬空或陷入告示牌后方变得不可见。

### 4. 缩放 (X/Y)

与文本大小效果叠加。若缩放设为 `0` 将导致文本不显示。

> 这一类没有 Z 轴缩放，因 2D 平面调整 Z 轴缩放无意义。

### 5. 旋转

支持围绕 X、Y、Z 轴旋转。

### 6. 对齐方式

支持水平对齐和垂直对齐。

### 7. 颜色与描边

- **文本颜色**：内置 16 色 / 自定义。
- **描边颜色**：不显示、自动匹配文本颜色（同原版发光）、内置颜色、内置颜色对应的发光色 / 自定义。

### 8. 阴影

> ⚠️ 不建议开启，多方向文本同时开启可能导致显示次序异常。

### 9. 绝对模式

开启后，在使用"重新排列"功能时，该行将被忽略。

---

## 三、高级排版与编辑功能

### 1. 按钮与数值调节

#### 基础操作

- **左键点击**：调整
- **右键 / Shift+左键**：反向调整
- **中键滚轮 / Alt+Shift+左键**：恢复默认

亦可直接滚动鼠标滚轮调节。

#### 倍速调节

- 按住 `Ctrl` 为 **8 倍速**
- 按住 `Alt` 为 **1/8 倍速**

#### 自定义值输入

点击"设置自定义值"后点击目标按钮，或按 `Tab` 聚焦后按 `Ctrl + E` 进行输入。

> 颜色支持：颜色名称（如 `red`）或十六进制（`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`）。描边可输入 `none`（不显示）或 `auto`（自动）。

### 2. 文本排版与多选

#### 自动排版

点击"调整位置"可根据文本大小从上到下依次排列各行（留有 1/8 行距，开启绝对模式的除外），不同垂直对齐方向互不干扰。

#### 多选操作

按住 `Ctrl` 或 `Shift` 可多选文本行进行批量设置或输入。按钮增减将应用相对变化，设置自定义值或默认值将统一为相同值。

#### 跨方块溢出

文本超出告示牌区域依然可见。若需在双格告示牌中间居中文字，你可以在左侧告示牌输入，设为居中并向右偏移 8 格。

### 3. 背面复制与翻转

#### 从背面复制

悬挂/直立告示牌可直接复制另一面文字。复制时，X 轴偏移、水平对齐方式及文本内的箭头（如 `→`）将自动反向，非常适合制作双面导向牌。

#### 翻转

选中单行点击"翻转"，该行的 X 轴偏移、对齐、箭头即反向；按住 `Ctrl` 点击"翻转"可作用于所有行。

### 4. 渲染注意事项

#### 深度冲突 (Z-fighting)

半透明文本 + 加粗 / 半透明描边易产生此问题。

#### 不透明度机制

描边颜色为"自动"时，其不透明度随文本；若指定特定颜色，则不受文本不透明度影响。

#### 透明度遮挡

半透明文本可能导致其后方的半透明内容（如染色玻璃、水、云）无法显示。

---

## 四、键盘控制快捷键 (1.19.4+)

### 1. 焦点切换

`Tab` 在文本区和按钮区切换，方向键在按钮/文本行间移动。

> 例如：按 `Tab` 选中"加粗"，按 `Enter` 切换状态，按右方向键至"斜体"并按 `Enter` 切换。

### 2. 快捷样式

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl + I` | 斜体 |
| `Ctrl + S` | 删除线 |
| `Ctrl + U` | 下划线 |
| `Ctrl + O` | 模糊处理 |

> 注：`Ctrl+B` 与讲述人冲突，不作加粗功能。

### 3. 行操作

| 操作 | 快捷键 |
| --- | --- |
| 新建行 | `Ctrl + Shift + =` 或 `Ctrl + 小键盘 +` |
| 删除行 | `Ctrl + -` 或 `Ctrl + 小键盘 -` |
| 移动行 | `Ctrl + Shift + 向上/向下键` |

---

## 五、特殊格式调用

在文本行中可输入以下特殊指令调用特殊内容：

### 1. 数据组件与图形

- `-json <代码>`：自定义 JSON 文本（宽容模式，键/值可省略引号）。
  - 例：`-json {text:一段文本, color:red, bold:true}`
- `-nbt <组件>`：使用 NBT 指定文本（仅限 1.21.5+）。
- `-rect <宽> <高>`：生成指定大小矩形（受文本大小及缩放影响）。
- `-texture <路径>`：显示纹理（取决于资源包，不支持网络图片）。更推荐使用 `-nbt {sprite: 'block/lava_still'}`，因其更稳定且支持动态纹理。

### 2. 内置图案 (-pattern)

直接输入内置图案名称可避免不同字体或 Unicode 带来的不对称/大小不一问题：

#### 基础箭头与方向

| 图案预览 | 调用方法 |
| --- | --- |
| （空图案） | `-pattern empty` |
| ← | `-pattern arrow-left` 或 `-pattern al` |
| → | `-pattern arrow-right` 或 `-pattern ar` |
| ↑ | `-pattern arrow-up` 或 `-pattern arrow-top` 或 `-pattern au` 或 `-pattern at` |
| ↓ | `-pattern arrow-down` 或 `-pattern arrow-bottom` 或 `-pattern ad` 或 `-pattern ab` |
| ←（细） | `-pattern arrow-left-thin` |
| →（细） | `-pattern arrow-right-thin` |
| ↑（细） | `-pattern arrow-up-thin` |
| ↓（细） | `-pattern arrow-down-thin` |

#### 斜向箭头

| 调用方法 |
| --- |
| `-pattern arrow-left-up` / `-pattern arrow-left-top` / `-pattern alu` / `-pattern alt` |
| `-pattern arrow-right-up` / `-pattern arrow-right-top` / `-pattern aru` / `-pattern art` |
| `-pattern arrow-left-down` / `-pattern arrow-left-bottom` / `-pattern ald` / `-pattern alb` |
| `-pattern arrow-right-down` / `-pattern arrow-right-bottom` / `-pattern ard` / `-pattern arb` |

#### 转弯箭头

| 调用方法 |
| --- |
| `-pattern arrow-left-turn-up` / `-pattern altu` |
| `-pattern arrow-right-turn-up` / `-pattern artu` |
| `-pattern arrow-left-turn-down` / `-pattern altd` |
| `-pattern arrow-right-turn-down` / `-pattern artd` |

#### 双向箭头与圆形

| 调用方法 |
| --- |
| `-pattern arrow-left-right` / `-pattern alr` |
| `-pattern arrow-up-down` / `-pattern aud` |
| `-pattern circle-small` / `-pattern small-circle` |
| `-pattern circle-medium` / `-pattern medium-circle` / `-pattern circle` / `-pattern O` |

#### 禁行与掉头

| 调用方法 |
| --- |
| `-pattern ban` |
| `-pattern u-turn-left-down` / `-pattern u-turn-left-bottom` / `-pattern uld` / `-pattern ulb` |
| `-pattern u-turn-right-down` / `-pattern u-turn-right-bottom` / `-pattern urd` / `-pattern urb` |
| `-pattern u-turn-left-up` / `-pattern u-turn-right-top` / `-pattern ulu` / `-pattern ult` |
| `-pattern u-turn-right-up` / `-pattern u-turn-right-top` / `-pattern uru` / `-pattern urt` |

#### 十字与方形

| 调用方法 |
| --- |
| `-pattern cross-small` / `-pattern small-scross` |
| `-pattern cross-medium` / `-pattern medium-cross` / `-pattern cross` / `-pattern X` |
| `-pattern cross-large` / `-pattern large-cross` |
| `-pattern square-small` / `-pattern small-square` |
| `-pattern square-medium` / `-pattern medium-square` / `-pattern square` |
| `-pattern square-large` / `-pattern large-square` |
| `-pattern square-slant-small` / `-pattern small-slant-square` |
| `-pattern square-slant-medium` / `-pattern medium-slant-square` |
| `-pattern square-slant-large` / `-pattern large-slant-square` |

> ⚠️ 样式不支持自定义指定。如果需要使用更多复杂的样式，建议使用 `-texture` 格式，或原版的精灵图组件（示例：`-nbt {sprite: xxx}`）。

---

## 六、物品交互功能

### 1. 涂蜡与脱蜡（蜜脾）

对告示牌使用蜜脾可涂蜡，涂蜡后无法编辑、无法改变发光状态。

创造模式下可使用蜜脾脱蜡（生存模式无法脱蜡）。

### 2. 发光效果（荧光墨囊 / 墨囊）

- **荧光墨囊**：使文本发光（暗处最亮显示，不影响描边，不增强方块亮度）。
- **墨囊**：取消文本发光。

> 对于悬挂和直立告示牌，涂蜡和发光操作是两侧独立处理。非创造模式下，每次成功的涂蜡/发光操作均会消耗对应物品。