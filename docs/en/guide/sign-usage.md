# Basic Usage of Signs | MishangUC

This mod adds sign blocks with various textures.

---

## I. Sign Categories

Signs in the MishangUC mod are mainly divided into the following three types:

### 1. Hanging Signs

1. This type of sign should be hung below a block, and text can be entered on both sides. If a solid block or a sign pole block is connected above, a sign pole will be displayed.
2. The text on the sign is bound to its placement direction; direct rotation is not currently supported. If you need to place a block with NBT data, ensure the placement direction matches the direction it was obtained in; otherwise, text will not appear on the corresponding side. For example, if you obtain a sign facing north/south and place it facing east/west, the original text on the north/south sides will not display.

### 2. Wall Signs

1. This type of sign can be placed on any surface of a block (side, top, bottom), with only one writable face.
2. Wall signs have two special variants: **Invisible Sign** and **Invisible Glow Sign**. The models of these two sign types are invisible, with only text visible. When a player holds either type, placed invisible signs will show an outline for easy identification.

### 3. Standing Signs

1. Placed on the ground or floating, supporting the original 16 directions. Like hanging signs, both sides can have text input.
2. A pole will appear when a block is placed underneath. While empty-handed, hold `Shift` and click the sign to manually toggle the pole visibility.

---

## II. Basic Text Editing

When a player right-clicks a sign, the editing interface opens (click the corresponding side for hanging/standing signs). The sign supports multi-line text, with each line independently configurable for the following properties:

### 1. Basic Styles

Bold, italic, underline, strikethrough, random text, etc.

### 2. Text Size

Default value: `6`. Full-size signs (including both invisible variants) have a default of `8`.

### 3. Offset (X/Y/Z)

Adjusts text offset along the three axes.

> ⚠️ Adjust the Z-axis carefully, as it may cause text to float off the plane or clip behind the sign and become invisible.

### 4. Scale (X/Y)

Stacks with text size. Setting scale to `0` will hide the text.

> There is no Z-axis scaling, as it serves no purpose on a 2D plane.

### 5. Rotation

Supports rotation around the X, Y, and Z axes.

### 6. Alignment

Supports horizontal and vertical alignment.

### 7. Color & Outline

- **Text Color**: Built-in 16 colors / custom color.
- **Outline Color**: Disabled, auto-match text color (vanilla glow behavior), built-in color, glowing variant of built-in color / custom color.

### 8. Shadow

> ⚠️ Not recommended. Enabling shadows for multi-directional text may cause rendering order issues.

### 9. Absolute Mode

When enabled, this line will be ignored during the "Rearrange" function.

---

## III. Advanced Typography & Editing Features

### 1. Button & Value Adjustment

#### Basic Controls

- **Left-click**: Adjust
- **Right-click / Shift+Left-click**: Reverse adjust
- **Middle mouse wheel / Alt+Shift+Left-click**: Reset to default

Mouse wheel scrolling can also be used directly.

#### Speed Multipliers

- Hold `Ctrl` for **×8 speed**
- Hold `Alt` for **1/8 speed**

#### Custom Value Input

Click "Set Custom Value" then the target button, or press `Tab` to focus and `Ctrl+E` to enter a value.

> Color support: color name (e.g., `red`) or hex code (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`). For outline, enter `none` (disabled) or `auto` (automatic).

### 2. Text Layout & Multi-Selection

#### Auto Layout

Click "Adjust Position" to arrange lines from top to bottom based on text size (with 1/8 line spacing, excluding lines with Absolute Mode enabled). Different vertical alignments operate independently.

#### Multi-Selection

Hold `Ctrl` or `Shift` to select multiple lines for batch settings or input. Button increments apply relative changes; custom values or defaults apply uniformly to all selected lines.

#### Cross-Block Overflow

Text remains visible beyond the sign area. To center text between two single-block signs, type on the left sign, set center alignment, and offset right by 8 units.

### 3. Back Side Copy & Flip

#### Copy from Back Side

Hanging/standing signs can directly copy text from the opposite side. During copying, X offset, horizontal alignment, and in-text arrows (e.g., `→`) are automatically reversed, ideal for double-sided signs.

#### Flip

Select a single line and click "Flip" to reverse its X offset, alignment, and arrows. Hold `Ctrl` and click "Flip" to apply to all lines.

### 4. Rendering Notes

#### Z-Fighting

Easily occurs with translucent text + bold / translucent outline.

#### Opacity Behavior

When outline color is set to "auto", its opacity follows the text. If a specific color is chosen, it is unaffected by text opacity.

#### Transparency Occlusion

Translucent text may prevent translucent content behind it (stained glass, water, clouds) from rendering.

---

## IV. Keyboard Shortcuts (1.19.4+)

### 1. Focus Navigation

`Tab` switches between text area and button area; arrow keys navigate between buttons/text lines.

> Example: Press `Tab` to select "Bold", press `Enter` to toggle, press `Right Arrow` to "Italic" and `Enter` to toggle.

### 2. Quick Styles

| Shortcut | Action |
| --- | --- |
| `Ctrl + I` | Italic |
| `Ctrl + S` | Strikethrough |
| `Ctrl + U` | Underline |
| `Ctrl + O` | Obfuscated |

> Note: `Ctrl+B` conflicts with narrator and is not used for bold.

### 3. Line Operations

| Action | Shortcut |
| --- | --- |
| New line | `Ctrl+Shift+=` or `Ctrl+Numpad+` |
| Delete line | `Ctrl+-` or `Ctrl+Numpad-` |
| Move line | `Ctrl+Shift+Up/Down Arrow` |

---

## V. Special Format Commands

Enter the following special commands in text lines to insert custom content:

### 1. Data Components & Graphics

- `-json <code>`: Custom JSON text (lenient mode, quotes for keys/values optional).
  - Example: `-json {text:Some Text, color:red, bold:true}`
- `-nbt <component>`: Use NBT for text (1.21.5+ only).
- `-rect <width> <height>`: Draws a rectangle of specified size (affected by text size and scale).
- `-texture <path>`: Displays a texture (resource pack dependent; online images not supported). Using `-nbt {sprite: 'block/lava_still'}` is recommended for stability and animated texture support.

### 2. Built-in Patterns (-pattern)

Using built-in pattern names avoids alignment/size inconsistencies from fonts or Unicode.

#### Basic Arrows & Directions

| Pattern | Usage |
| --- | --- |
| (empty) | `-pattern empty` |
| ← | `-pattern arrow-left` or `-pattern al` |
| → | `-pattern arrow-right` or `-pattern ar` |
| ↑ | `-pattern arrow-up` or `-pattern arrow-top` or `-pattern au` or `-pattern at` |
| ↓ | `-pattern arrow-down` or `-pattern arrow-bottom` or `-pattern ad` or `-pattern ab` |
| ← (thin) | `-pattern arrow-left-thin` |
| → (thin) | `-pattern arrow-right-thin` |
| ↑ (thin) | `-pattern arrow-up-thin` |
| ↓ (thin) | `-pattern arrow-down-thin` |

#### Diagonal Arrows

| Usage |
| --- |
| `-pattern arrow-left-up` / `-pattern arrow-left-top` / `-pattern alu` / `-pattern alt` |
| `-pattern arrow-right-up` / `-pattern arrow-right-top` / `-pattern aru` / `-pattern art` |
| `-pattern arrow-left-down` / `-pattern arrow-left-bottom` / `-pattern ald` / `-pattern alb` |
| `-pattern arrow-right-down` / `-pattern arrow-right-bottom` / `-pattern ard` / `-pattern arb` |

#### Turn Arrows

| Usage |
| --- |
| `-pattern arrow-left-turn-up` / `-pattern altu` |
| `-pattern arrow-right-turn-up` / `-pattern artu` |
| `-pattern arrow-left-turn-down` / `-pattern altd` |
| `-pattern arrow-right-turn-down` / `-pattern artd` |

#### Bidirectional Arrows & Circles

| Usage |
| --- |
| `-pattern arrow-left-right` / `-pattern alr` |
| `-pattern arrow-up-down` / `-pattern aud` |
| `-pattern circle-small` / `-pattern small-circle` |
| `-pattern circle-medium` / `-pattern medium-circle` / `-pattern circle` / `-pattern O` |

#### Prohibition & U-Turn

| Usage |
| --- |
| `-pattern ban` |
| `-pattern u-turn-left-down` / `-pattern u-turn-left-bottom` / `-pattern uld` / `-pattern ulb` |
| `-pattern u-turn-right-down` / `-pattern u-turn-right-bottom` / `-pattern urd` / `-pattern urb` |
| `-pattern u-turn-left-up` / `-pattern u-turn-right-top` / `-pattern ulu` / `-pattern ult` |
| `-pattern u-turn-right-up` / `-pattern u-turn-right-top` / `-pattern uru` / `-pattern urt` |

#### Crosses & Squares

| Usage |
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

> ⚠️ Note: Custom styles are not supported for patterns. For complex styling, use the `-texture` format or vanilla sprite components (example: `-nbt {sprite: xxx}`).

---

## VI. Item Interaction Features

### 1. Waxing & Dewaxing (Honeycomb)

Using a honeycomb on a sign applies wax, which locks editing and glow state.

Dewaxing with honeycomb is only available in Creative mode (not Survival).

### 2. Glow Effect (Glow Ink Sac / Ink Sac)

- **Glow Ink Sac**: Makes text glow (brightest in darkness, no effect on outline or block light level).
- **Ink Sac**: Removes text glow.

> For hanging and standing signs, waxing and glowing are applied independently to each side. In non-Creative modes, each successful wax/glow action consumes the corresponding item.