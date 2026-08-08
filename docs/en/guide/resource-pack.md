# Custom Font & Texture Resource Pack | MishangUC & Ocelot Sign Mod

To apply your favorite artistic fonts or custom images to in-game signs, you can achieve this by creating a resource pack tailored for the MishangUC mod.

> All texture and font files are stored inside the resource pack. When used on a multiplayer server, every player must install this identical resource pack; otherwise, other users will only see error codes instead of your customized signs.

---

## I. Build the Basic Resource Pack Structure

### 1. Create the Root Folder

Create a blank new folder on your local computer and assign a name to it. For demonstration purposes, this guide uses the folder name `MyCustomPack`.

### 2. Write the pack.mcmeta Metadata File

Inside the `MyCustomPack` folder, create a new text document and rename it to `pack.mcmeta` (including the file extension). Open the file with Notepad or another code editor, paste the following content, then save changes:

```json
{
  "pack": {
    "pack_format": 15,
    "description": "Custom Font & Texture Resource Pack for Signs"
  }
}
```

> 📌 Note: `pack_format` indicates the compatible Minecraft game version. Common values: `13` for 1.19.4, `15` for 1.20~1.20.1, `18` for 1.20.2, `34` for 1.21, etc. Modify this value according to your installed game version.

### 3. Set Up the Assets Folder and Namespace

Create a folder named `assets` within `MyCustomPack`. Open the `assets` folder and make another folder to serve as your custom **Namespace**. This example uses `my_pack` as the namespace folder name.

> Namespaces only support lowercase letters, digits and underscores; no other special characters are permitted. You will need to prefix all referenced in-game resources with `my_pack:` later on.

#### Directory Structure Preview

```text
MyCustomPack/
 ├── pack.mcmeta
 └── assets/
     └── my_pack/  <-- Your custom namespace
```

---

## II. Import & Configure Custom Fonts (Native to MishangUC)

### 1. Place Font Files

Inside `assets/my_pack/`, create a subfolder named `font`. Rename your prepared TrueType font (`.ttf`) file using only lowercase letters, digits and underscores (e.g. `custom_font.ttf`), then move the renamed font file into the `font` folder.

### 2. Create the Font JSON Configuration File

In the same `font` folder, create a new JSON text file (e.g. `title_style.json`; this filename becomes the font ID you call in-game). Insert the code below and save:

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

#### Parameter Explanations

- `"type": "ttf"`: Declares that a custom TTF font is being used.
- `"file": "my_pack:custom_font.ttf"`: Defines the file path for the font, referencing your custom namespace folder `my_pack`.
- `"size": 12.0`: Base render size of the font in-game.
- `"oversample": 8.0`: Supersampling multiplier that improves font clarity and edge smoothness when zoomed in or rendered at high resolutions; higher values consume more video memory.
- `legacy_unicode`: If your custom TTF font lacks rare Chinese characters or special symbols, this segment fills missing glyphs with vanilla Minecraft characters to prevent garbled text or missing block placeholders.

### 3. Call the Custom Font In-Game

Within MishangUC, the syntax for text components on signs is: `-json <code>` (flexible JSON mode where quotation marks for keys and values are optional).

After loading the resource pack, add a new line of text in the sign editor and input the following command:

```text
-json {text:"Sample Text Display", color:gold, font:"my_pack:title_style"}
```

> ⚠️ Important Note: The font value follows the format `namespace:json_filename`, do **NOT** append the `.json` file extension!
>
> For additional details on text components, refer to: [https://minecraft.wiki/w/Text_component_format](https://minecraft.wiki/w/Text_component_format)

---

## III. Import & Use Custom Textures (Native to MishangUC)

MishangUC comes with numerous built-in `-pattern` textures, but you need the `-texture` command to load external custom images onto signs.

### 1. Place Image Files

For example , if you create a `textures` subfolder under `assets/my_pack/`, and an additional `icon` folder inside it for organized file management.

Then your image must be in `.png` format with a **1:1** aspect ratio. Rename the image using only lowercase letters, digits and underscores (e.g. `logo.png`), then move it to the `icon` folder.

### 2. Call the Custom Texture In-Game

Add a new text line to the sign and paste the following command directly:

```text
-texture my_pack:icon/logo.png
```

The image will render directly on the sign. You may adjust its X/Y offset, scaling factor and other parameters via the in-game UI buttons, just like editing regular text.

> ⚠️ Caution: External web links are unsupported; only local file paths within the resource pack work.

---

## IV. Register Custom Textures & Fonts to In-Game List (Exclusive for Ocelot Sign Mod)

The Ocelot Sign Mod supports registering custom textures and fonts to its native UI panel via JSON configuration files, enabling one-click insertion for players.

> ⚠️ **Critical Reminder**: The registration JSON files **must be placed under the `ocelotsignmod` namespace** to append entries to the mod's built-in list. Your actual texture and font assets can remain stored under your personal namespace (e.g. `my_pack`).

### 1. Register Custom Textures

Create the file `custom_patterns.json` under the path `assets/ocelotsignmod/patterns/`:

#### Directory Structure Preview

```text
MyCustomPack/
 ├── pack.mcmeta
 └── assets/
     ├── my_pack/
     │   └── textures/
     │       └── icon/
     │           └── logo.png
     └── ocelotsignmod/        <-- Mandatory fixed namespace
         └── patterns/
             └── custom_patterns.json
```

#### JSON File Template

```json
[
  {
    "name": "Display Name of Texture",
    "texture": "my_pack:icon/logo.png",
    "insert": "-texture my_pack:icon/logo.png"
  },
  {
    "name": "Second Custom Texture",
    "texture": "my_pack:textures/custom/arrow.png",
    "insert": ""
  }
]
```

#### Field Descriptions

- `"name"`: Visible name shown in the mod's UI texture list.
- `"texture"`: Resource path pointing to your texture file, referencing your custom `my_pack` namespace normally.
- `"insert"`: Command automatically pasted into the sign editor when the Insert button is clicked. Leave this field blank to auto-generate the `-texture <texture path>` command.

### 2. Register Custom Fonts

Create the file `custom_fonts.json` under `assets/ocelotsignmod/fonts/`:

```json
[
  {
    "font_id": "my_pack:title_style",
    "name": "Heading Font"
  }
]
```

#### Field Descriptions

- `"font_id"`: Unique font ID formatted as `namespace:json_filename`.
- `"name"`: User-friendly font name displayed inside the mod UI.

### 3. Advanced Custom UI Definition (Advanced Feature)

Beyond using the default "Custom Resource Pack" category, you can write JSON files to create an independent dedicated menu tab on the left sidebar of the in-game UI. Multi-level folder structures and texture whitelist filtering are fully supported.

> These JSON definition files can be stored under your personal namespace.

#### File Path & Directory Layout

Create a JSON file with any filename (e.g. `road_signs_ui.json`) inside `assets/<your_namespace>/ui_definitions/`:

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── ui_definitions/
             └── road_signs_ui.json
```

#### Full JSON Structure & UI Mapping Explanation

The complete advanced UI configuration code with annotated comments is provided below for reference:

```json
{
  "tab": "patterns",
  "category_name": "My Custom Road Signs",
  "header_text": "Descriptive text displayed at the very top of the right-side panel.",
  "sections": [
    {
      "title": "Arrow Markers (Section Header)",
      "description": "Grey descriptive text below the section title.",
      "basePath": "my_pack:textures/signs/",
      "useSubfolders": true,
      "subFolders": [
        {"dirName": "black", "displayName": "Black Arrows"},
        {"dirName": "white", "displayName": "White Arrows"}
      ],
      "filterMode": "NONE",
      "filterList": []
    },
    {
      "title": "Special Textures (Second Section)",
      "description": "Example demonstrating whitelist filtering functionality.",
      "basePath": "my_pack:textures/special/",
      "useSubfolders": false,
      "filterMode": "WHITELIST",
      "filterList": ["logo.png", "banner.png"]
    }
  ]
}
```

#### Detailed Field Explanations & UI Mapping

**Global & Left Sidebar Settings**

- `"tab"`: Defines which top-level main tab the custom menu belongs to; valid options are `"patterns"` (texture list) and `"fonts"` (font list).
- `"category_name"`: Name of the collapsible menu entry shown on the left sidebar, listed alongside default entries like "Mishang Built-in Patterns" and "Road Signs".

**Right Main Content Panel**

After clicking the sidebar entry defined by `category_name`, the right panel loads the following content:

- `"header_text"`: Intro text displayed inside the light blue header box at the top of the right panel.
- `"sections"`: Scrollable content blocks on the right panel, formatted as an array where each array item represents one independent content section.

**Individual Section Configuration**

For each entry within the `sections` array:

- `"title"`: Section heading highlighted in orange text.
- `"description"`: Small grey explanatory text placed directly under the section title.
- `"basePath"`: Root resource scan path used by the mod, formatted as `namespace:folder_path/`.
- `"useSubfolders"`: Toggles nested subfolder tab functionality.
  - When set to `true`, clickable tab buttons generate under the section title to switch textures from different subfolders.
- `"subFolders"`: Defines tab labels when `useSubfolders` is enabled.
  - `"dirName"`: Actual subfolder name the mod reads from under `basePath`.
  - `"displayName"`: Visible button label shown to players in the UI.
- `"filterMode"`: Texture filtering rule for automatic folder scanning:
  - `"NONE"`: No filtering; display all textures inside the target folder.
  - `"WHITELIST"`: Whitelist mode; only show textures listed in `filterList`.
  - `"BLACKLIST"`: Blacklist mode; hide textures listed in `filterList` and display all remaining assets.
- `"filterList"`: Filename array paired with filtering modes, fill in full texture filenames such as `["test.png", "error.png"]`.
- `"isFontMode"`: Mandatorily set to `true` if the top-level `tab` key is assigned `"fonts"`; switches the section to render a font list grid instead of texture previews.
- `"fontList"`: Required when `isFontMode` is enabled; lists available fonts with the format `[{"fontId": "my_pack:title_style", "displayName": "My Custom Heading Font"}]`.

---

## V. Import JSON Models Exported from BlockBench

The Ocelot Sign Mod supports JSON 3D models exported from BlockBench, letting players render arbitrary custom 3D assets in-game via the Custom Model Block item.

### 1. Place Core Model JSON File

The mod automatically scans and registers all model files inside the `custom_models` directory. Move your BlockBench exported model JSON file to `assets/<your_namespace>/models/custom_models/`.

#### Directory Structure Preview

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── models/
             └── custom_models/
                 └── my_sign.json
```

BlockBench exported models must comply with vanilla Minecraft block model standards, example below:

```json
{
  "parent": "block/cube_all",
  "textures": {
    "all": "my_pack:block/my_sign_texture"
  }
}
```

### 2. Create Optional Model Definition File (Recommended)

Without a definition file, the model will use its raw filename as the display name in the selection menu. To assign a custom friendly name, create a matching JSON definition file at `assets/<your_namespace>/model_definitions/my_sign.json`:

```json
{
  "model_id": "my_sign",
  "localized_name": "My Custom Road Sign"
}
```

### 3. Place Model Texture Files

Textures referenced in the model JSON must be placed at the assigned path, typically `assets/<namespace>/textures/block/`:

```text
MyCustomPack/
 └── assets/
     └── my_pack/
         └── textures/
             └── block/
                 └── my_sign_texture.png
```

### 4. BlockBench Export Guidelines

Follow these rules when designing models in BlockBench:

1. **Model Dimensions**: Standard Minecraft block space is a `16×16×16` unit cube; restrict your model within the bounds of a single block.
2. **Texture Resolution**: Use square textures with standard resolutions (`16×16`, `32×32`, `64×64`, etc.) and a strict **1:1** aspect ratio.
3. **Naming Rules**: Model IDs and texture filenames can only use lowercase letters, digits and underscores.
4. **Export Format**: Select **Export Block Model** to export as native Minecraft block model JSON format.
5. **Facing Direction**: BlockBench models default to facing South (positive Z-axis). The mod auto-rotates the model according to block placement orientation, so no manual rotation adjustments are needed.

### 5. Use Custom Model Blocks In-Game

1. Obtain the Custom Model Block item via Creative inventory or game commands.
2. Right-click the item to open the model selection panel.
3. Select your registered custom model (e.g. "My Custom Road Sign") from the list.
4. Confirm selection; the item tooltip will display `Model: xxx (+NBT)` to verify successful binding.
5. Place the block in the world to view the rendered custom 3D model.

### 6. Multiplayer Server Usage Notes

All connected players on a multiplayer server must install the identical resource pack containing your custom models and textures. Otherwise, other players will only see the default rotating missing texture placeholder.

---

## VI. Package & Install the Resource Pack

Once all files are arranged correctly, compress the folder into a Minecraft-compatible `.zip` archive.

1. Open the `MyCustomPack` root folder.
2. Select the entire `assets` folder and the `pack.mcmeta` file simultaneously.
3. Right-click the selected items and choose **Send to → Compressed (zipped) folder** (or equivalent archive tool options).
4. Rename the generated `.zip` archive to your preferred name (e.g. `MyServerPack.zip`).

Launch Minecraft, navigate to **Options → Resource Packs → Open Resource Pack Folder**. Move your `.zip` archive into this folder, then enable the resource pack inside the game to finish setup.
