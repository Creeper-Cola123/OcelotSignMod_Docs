# 制作字体图案资源包 | 迷上城建与豹猫指示牌模组

为了让你的告示牌使用你喜欢的艺术字体，或展示特定的图片，你可以通过制作迷上城建模组的资源包来实现。

> 这些图案与字体文件存储在资源包里。如果在多人服务器使用，必须让所有玩家都装上这个资源包，否则别人看你的告示牌只能看到错误代码。

---

## 一、构建资源包的基础框架

### 1. 创建根目录

在你的电脑上新建一个空白文件夹并命名，例如本教程命名为 `MyCustomPack`。

### 2. 编写 pack.mcmeta 描述文件

在 `MyCustomPack` 文件夹内，新建一个文本文档，将名字和后缀改为 `pack.mcmeta`。用记事本或其他代码编辑器打开它，输入以下内容并保存：

```json
{
  "pack": {
    "pack_format": 15,
    "description": "告示牌自定义字体与图案资源包"
  }
}
```

> 📌 `pack_format` 代表适用的游戏版本（例如 1.19.4 通常是 `13`，1.20~1.20.1 是 `15`，1.20.2 是 `18`，1.21 是 `34` 等）。请根据你游玩的版本修改此数值。

### 3. 建立 Assets 文件夹与命名空间

在 `MyCustomPack` 文件夹内，新建一个名为 `assets` 的文件夹。进入 `assets`，新建一个代表你**命名空间（Namespace）**的文件夹。例如本教程命名为 `my_pack`。

> 命名空间只能使用小写字母、数字、下划线，不允许出现除了这些字符外的其他字符。后续你在游戏中调用资源时，都会带有 `my_pack:` 的前缀。

#### 目录结构示意

```text
MyCustomPack/
 ├── pack.mcmeta
 └── assets/
     └── my_pack/  <-- 这是你的命名空间
```

---

## 二、引入并配置自定义字体（迷上城建原生）

### 1. 放置字体文件

在 `assets/my_pack/` 文件夹内，新建一个名为 `font` 的文件夹。将你准备好的 `.ttf` 格式的 TrueType 字体文件重命名为只有小写字母、数字、下划线的格式，比如 `custom_font.ttf`，然后放进 `font` 文件夹。

### 2. 编写字体 JSON 配置文件

在同一个 `font` 文件夹下，新建一个 JSON 文本文档，例如 `title_style.json`（这个名字将是你游戏中调用的字体 ID）。打开它并输入：

```json
{
    "providers": [
        {
            "type": "ttf",
            "file": "my_pack:custom_font.ttf",
            "size": 12.0,
            "oversample": 8.0
        },
        {
            "type": "legacy_unicode",
            "sizes": "minecraft:font/glyph_sizes.bin",
            "template": "minecraft:font/unicode_page_%s.png"
        }
    ]
}
```

#### 参数说明

- `"type": "ttf"`：声明我们使用的是 TTF 自定义字体。
- `"file": "my_pack:custom_font.ttf"`：告诉游戏去哪里找字体。`my_pack` 是命名空间，对应刚才的文件夹名。
- `"size": 12.0`：字体在游戏内的基础渲染大小。
- `"oversample": 8.0`：超采样倍率（清晰度）。数值越大，字体在游戏中放大或高分辨率下就越清晰边缘越平滑，但也会占用更多显存。
- `legacy_unicode`：如果你的自定义 `.ttf` 字体库不全（比如缺了某些生僻字或特殊符号），这一段会让游戏自动使用 Minecraft 原版的字符来填补空白，防止显示出"未知方块（乱码）"。

### 3. 在游戏中调用该字体

在迷上城建模组当中，在告示牌内使用文本组件的格式是：`-json <代码>`（自定义 JSON 文本，宽容模式，键/值可省略引号）。

加载资源包后，在告示牌编辑界面添加一行文本，输入：

```text
-json {text:"这是一段测试文字", color:gold, font:"my_pack:title_style"}
```

> ⚠️ 注意：`font` 的值是 **命名空间:json文件名**，不要加 `.json` 后缀！
>
> 有关更多与文本组件相关的内容，可参阅：[https://zh.minecraft.wiki/w/%E6%96%87%E6%9C%AC%E7%BB%84%E4%BB%B6](https://zh.minecraft.wiki/w/%E6%96%87%E6%9C%AC%E7%BB%84%E4%BB%B6)

---

## 三、引入并调用自定义图案 (Texture)（迷上城建原生）

迷上城建模组虽然内置了大量的 `-pattern` 图案，但如果你想显示任意外部图片，就需要用到 `-texture` 来加载图片。

### 1. 放置图片文件

假设在 `assets/my_pack/` 文件夹下，我们新建了一个 `icon` 文件夹。

比如将你的图片（必须是 `.png` 格式，长宽比必须是 **1:1**）重命名，只能使用小写字母、数字、下划线，例如 `logo.png`，然后放入 `icon` 文件夹中。

### 2. 在游戏中调用图案

在告示牌新建一行文本，直接输入：

```text
-texture my_pack:icon/logo.png
```

图片将会被渲染在告示牌上。你可以像调整文字一样，使用界面的按钮调整图片的 X/Y 偏移、缩放大小等。

> ⚠️ 注意：这里不支持网络链接，只支持本地资源包内的路径。

---

## 四、将自定义图案和字体注册到游戏列表（豹猫的指示牌专属）

豹猫的指示牌模组支持通过 JSON 配置文件将自定义的图案和字体注册到模组自带的 UI 界面中，方便玩家直接点击插入。

> ⚠️ **核心注意**：注册列表的 JSON 文件**必须放在 `ocelotsignmod` 命名空间下**（以追加到模组原生列表中），但你的图片和字体本体依然可以放在自己的命名空间（如 `my_pack`）下！

### 1. 自定义图案注册

在资源包的 `assets/ocelotsignmod/patterns/` 目录下创建 `custom_patterns.json` 文件：

#### 目录结构示意

```text
MyCustomPack/
 ├── pack.mcmeta
 └── assets/
     ├── my_pack/
     │   └── textures/
     │       └── icon/
     │           └── logo.png
     └── ocelotsignmod/        <-- 必须是这个命名空间
         └── patterns/
             └── custom_patterns.json
```

#### JSON 文件格式

```json
[
  {
    "name": "图案显示名称",
    "texture": "my_pack:icon/logo.png",
    "insert": "-texture my_pack:icon/logo.png"
  },
  {
    "name": "另一个图案",
    "texture": "my_pack:textures/custom/arrow.png",
    "insert": ""
  }
]
```

#### 字段说明

- `"name"`：图案在 UI 列表中显示的名称。
- `"texture"`：图案贴图的资源路径，这里可以正常引用你自己的命名空间 `my_pack:`。
- `"insert"`：点击"插入"按钮时向告示牌输入的内容。如果留空，则自动插入 `-texture <贴图路径>`。

### 2. 自定义字体注册

在资源包的 `assets/ocelotsignmod/fonts/` 目录下创建 `custom_fonts.json` 文件：

```json
[
  {
    "font_id": "my_pack:title_style",
    "name": "标题字体"
  }
]
```

#### 字段说明

- `"font_id"`：字体 ID，格式为 **命名空间:字体JSON文件名**。
- `"name"`：字体在 UI 列表中显示的友好名称。

### 3. 高级自定义 UI 定义（进阶功能）

除了使用默认的"自定义资源包"分类，你还可以通过编写 JSON 文件，在游戏界面的左侧边栏独立创建一个全新的、专属的分类菜单（支持多级文件夹结构、图片白名单过滤等）。

> 这部分 JSON 支持放在你自己的命名空间下。

#### 放置路径与目录结构

在 `assets/<你的命名空间>/ui_definitions/` 下创建任意名称的 JSON 文件（例如 `road_signs_ui.json`）。

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── ui_definitions/
             └── road_signs_ui.json
```

#### JSON 结构与界面对应关系解析

下面的代码展示了一个高级 UI 的完整结构，请仔细对比注释来理解它们在游戏界面中出现的位置：

```json
{
  "tab": "patterns",
  "category_name": "我的自定义路牌",
  "header_text": "这是显示在右侧界面最顶部的说明文字。",
  "sections": [
    {
      "title": "箭头标识 (区块标题)",
      "description": "这是显示在区块标题下方的灰色小字描述。",
      "basePath": "my_pack:textures/signs/",
      "useSubfolders": true,
      "subFolders": [
        {"dirName": "black", "displayName": "黑色箭头"},
        {"dirName": "white", "displayName": "白色箭头"}
      ],
      "filterMode": "NONE",
      "filterList": []
    },
    {
      "title": "特殊图案 (第二个区块)",
      "description": "这里展示了如何使用白名单过滤功能。",
      "basePath": "my_pack:textures/special/",
      "useSubfolders": false,
      "filterMode": "WHITELIST",
      "filterList": ["logo.png", "banner.png"]
    }
  ]
}
```

#### 详细字段说明 (UI 映射关系)

**【全局与左侧边栏】**

- `"tab"`：决定你的菜单出现在哪个顶部大标签页下。可选 `"patterns"`（图案列表）或 `"fonts"`（字体列表）。
- `"category_name"`：【左侧边栏】这是你在界面左侧边栏看到的折叠菜单的名字（与"迷上自带图案"、"路牌"等并列）。

**【右侧主内容区】**

当你点击左侧的 `category_name` 后，右侧主内容区会显示以下内容：

- `"header_text"`：【右侧最顶部】在浅蓝色背景框内显示的总说明文字。
- `"sections"`：【右侧内容区块】右侧主内容区可以向下滚动，并包含多个区块（Section）。这里填写一个列表（数组 `[]`），每个元素代表一个区块。

**【区块内部设置 (Sections)】**

针对 `sections` 列表里的每一个区块：

- `"title"`：该区块的标题（显示为显眼的橙色字体）。
- `"description"`：紧跟在标题下方的灰色说明文本。
- `"basePath"`：资源读取路径。模组会去这个路径下扫描图片。格式为 **命名空间:文件夹路径/**。
- `"useSubfolders"`：【内部切换标签】是否启用子文件夹。
  - 如果设为 `true`：会在区块的标题下方生成一行类似"标签页/按钮"的东西。点击不同的按钮，可以切换显示不同文件夹内的图片。
- `"subFolders"`：当你启用了 `useSubfolders` 时，在此定义标签页。
  - `"dirName"`：实际的子文件夹名称（例如 `black` 代表它会去读 `basePath` 下的 `black` 文件夹）。
  - `"displayName"`：【标签页按钮名称】玩家在界面上看到的按钮文字（例如"黑色箭头"）。
- `"filterMode"`：过滤模式。由于模组会自动扫描文件夹里的所有图片，你可以用它来排除不需要的图片。
  - `"NONE"`：不开启过滤，显示文件夹内所有图片。
  - `"WHITELIST"`：白名单模式。只显示 `filterList` 里填写的图片。
  - `"BLACKLIST"`：黑名单模式。隐藏 `filterList` 里填写的图片，显示其他所有图片。
- `"filterList"`：配合上面使用的过滤列表，填写完整的文件名，例如 `["test.png", "error.png"]`。
- `"isFontMode"`（针对字体）：如果你在开头将 `tab` 设为了 `"fonts"`，这里必须设为 `true`，此时区块内将渲染字体列表而不是图片网格。
- `"fontList"`（针对字体）：当开启 `isFontMode` 时，在这里定义你要显示的字体，格式类似于 `[{"fontId": "my_pack:title_style", "displayName": "我的标题字体"}]`。

---

## 五、玩家自定义从 BlockBench 导出的 JSON 模型

豹猫的指示牌支持玩家使用 BlockBench 导出的 JSON 模型文件，通过"自定义模型方块"在游戏中展示任意 3D 模型。

### 1. 放置模型 JSON 文件（核心必须）

模组会自动扫描并注册 `custom_models` 文件夹下的所有模型。将 BlockBench 导出的模型 JSON 文件放置在 `assets/<你的命名空间>/models/custom_models/` 目录下。

#### 目录结构示意

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── models/
             └── custom_models/
                 └── my_sign.json
```

BlockBench 导出的模型 JSON 需遵循 Minecraft 原版模型格式，例如：

```json
{
  "parent": "block/cube_all",
  "textures": {
    "all": "my_pack:block/my_sign_texture"
  }
}
```

### 2. 创建模型显示定义文件（可选，推荐）

如果只放模型文件，它在游戏选择界面的名字会默认是文件名（如 `my_sign`）。为了给模型起一个好听的中文名，需要在 `assets/<你的命名空间>/model_definitions/` 目录下创建一个**同名**的 JSON 配置文件：

#### 定义文件格式（`model_definitions/my_sign.json`）

```json
{
  "model_id": "my_sign",
  "localized_name": "我的自定义路牌"
}
```

### 3. 放置贴图文件

模型引用的贴图文件需放置在模型代码指向的路径，通常是 `assets/<命名空间>/textures/block/` 目录下：

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── textures/
             └── block/
                 └── my_sign_texture.png
```

### 4. BlockBench 导出注意事项

在使用 BlockBench 制作模型时，请注意以下几点：

1. **模型尺寸**：Minecraft 方块模型的标准尺寸为 `16×16×16` 单位。建议将模型尺寸控制在 1 个方块范围内。
2. **贴图尺寸**：贴图长宽建议为 `16×16`、`32×32`、`64×64` 等标准尺寸，长宽比例必须为 `1:1`。
3. **命名规范**：模型 ID、贴图文件名只能使用小写字母、数字、下划线。
4. **导出格式**：在 BlockBench 中选择 **"Export Block Model"** 导出为 Minecraft 原版模型 JSON 格式。
5. **面朝向**：BlockBench 中模型默认朝向南方（正 Z 方向），模组会根据方块放置时的朝向自动旋转模型，无需担心放置后的方向错误。

### 5. 在游戏中使用自定义模型方块

1. 获取"自定义模型方块"物品（可通过创造模式物品栏或命令获取）。
2. 右键点击物品，打开模型选择界面。
3. 在列表中选择你注册的模型（如"我的自定义路牌"）。
4. 选定模型后，物品会显示 `模型: xxx (+NBT)` 提示。
5. 将方块放置在游戏中，即可看到自定义模型渲染效果。

### 6. 多人服务器使用注意事项

在多人服务器中使用自定义模型方块时，所有玩家都需要安装包含相同模型定义和贴图的资源包，否则其他玩家只能看到一直旋转的默认错误贴图。

---

## 六、打包与安装

文件都放好后，我们需要将它们打包成游戏能识别的 `.zip` 压缩包。

1. 双击进入 `MyCustomPack` 文件夹。
2. 同时选中里面的 `assets` 文件夹 和 `pack.mcmeta` 文件。
3. 右键点击它们 → 选择"压缩为 ZIP 文件"（或添加到压缩文件...）。
4. 将生成的 `.zip` 压缩包重命名为你喜欢的名字（例如 `MyServerPack.zip`）。

启动 Minecraft，进入"选项"→"资源包"→"打开资源包文件夹"，将这个 `.zip` 文件放入文件夹内，并在游戏内启用它即可。
