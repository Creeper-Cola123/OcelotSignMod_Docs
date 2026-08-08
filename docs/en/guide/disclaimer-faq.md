# Disclaimer & FAQ

---

## Disclaimer

1. This mod only provides frameworks and functions related to signs. Players or server administrators shall bear full responsibility for any custom content imported via resource packs (including but not limited to images, fonts, texts, etc.). It is strictly prohibited to use this mod to create or disseminate any illegal or non-compliant content. **The mod author shall not be held liable for any disputes arising from user-created content.**

2. This mod is completely free and open-source, and has never been sold on any e-commerce platforms (such as Taobao, Xianyu, etc.), nor has it ever been published on NetEase Minecraft. **If you have purchased this mod for money, you have been scammed. Please apply for a refund and report the merchant as soon as possible!** Support the official version and resist resale.

3. There is no official forum for this mod at present. **The only official communication group is displayed on the "Contact Us" page inside the mod.** Do not trust any third-party channels or unofficial groups to avoid being defrauded.

4. Although tests have been conducted prior to release, modifying game content always comes with risks. **You are strongly recommended to back up your game saves before installing or updating the mod.** The author shall not be responsible for data loss or save corruption caused by mod conflicts, improper operations or other reasons.

---

## Frequently Asked Questions (FAQ)

### Q1: Why is there a color difference between the pattern on the sign and the sign block itself?

**A:** This is determined by the underlying rendering characteristics of Minecraft and counts as a normal phenomenon. As an add-on for MishangUC, this mod inherits the vanilla text component mechanism. Even if identical color codes are set for the text and the block in code, visual discrepancies will still appear on-screen due to different rendering pipelines.

- **Blocks** adopt **World Shaders**, which perform smooth interpolation based on the light level of surrounding blocks to calculate realistic shadows and brightness variations.
- **Texts or patterns on signs** are drawn as a second overlay layer with an **independent font shader**, which responds far less sensitively to ambient lighting.

Eliminating this color gap completely requires a full rewrite of the underlying rendering system, which involves extremely high development difficulty and may trigger additional mod conflicts. Therefore, this color difference cannot be fully removed at the current stage.

### Q2: Why do sign layout and alignment shift after installing mods like Caxton or Modern UI?

**A:** The font layout and alignment of this mod largely rely on Minecraft's native font rendering engine. The aforementioned mods deeply replace or alter the underlying text rendering mechanism. Different rendering engines calculate kerning, line height and character size in distinct ways, which leads to offset text, messed-up layouts or changed character dimensions.

No universal fix is available for this issue. **We advise sticking to one fixed font rendering environment for a single world or server and avoid switching such rendering mods midway.**

### Q3: Why can't I view patterns on signs, or texts turn into hollow squares (garbled characters), or nothing displays at all?

**A:** This issue is normally caused by **improper resource pack loading**.

If you join a multiplayer server or load a specific world that references custom content, the corresponding custom resource pack must be properly installed and enabled in the in-game resource pack menu. Missing resource packs prevent the game from locating target images or font files, resulting in error placeholder squares or invisible content.

### Q4: What is the future development plan for the Ocelot Sign Mod?

**A:** Before its official release, the Ocelot Sign Mod has already gone through multi-version internal testing on two servers, and its core features have stabilized. No large-scale feature updates are planned in the short term. Future development will focus on porting to newer Minecraft versions, bug fixes, and a small amount of supplementary content. Due to limited bandwidth, the author will not follow every Minecraft version — only a subset of mainstream versions will be selected for updates, and there are no plans to backport to versions older than 1.19 (exclusive). Future plans include releasing an expansion resource pack containing road sign graphics from other countries/regions, and an open player-submission channel is being considered. Everyone is welcome to submit self-made graphics and help build the resource pack ecosystem.

Please note: the above is the development plan for the **Ocelot Sign Mod** only, not for the Mishang Urban Construction mod. For plans regarding MishangUC, please refer to content published by the MishangUC author.

### Q5: Why does the mod crash or report errors when running on Forge/NeoForge?

**A:** This mod and its prerequisite mod are developed exclusively for the Fabric platform. There are currently no official adaptation plans for Forge/NeoForge, and nearly **all** of the error reports received so far come from cross-platform usage. Loading through Sinytra Connector is unstable and easily leads to compatibility issues. If you still need to use it cross-platform, you may look for a third-party Sinytra Connector-compatible build of MishangUC. **This is not an officially recommended approach — please back up your world before trying. The author takes no responsibility for any save corruption or other issues caused by doing so. This mod is built for Fabric, and the author will not handle issues triggered by loading the Fabric mod on Forge via Sinytra Connector — your understanding is appreciated.**

If you still intend to try it, the following workarounds have been provided by other players and are for reference only:

- **Method 1.** Download the unofficial Sinytra Connector fix build of MishangUC made by a community member: <https://www.curseforge.com/minecraft/mc-mods/mishang-urban-construction-sinytra-connector-fix>, then install the Ocelot Sign Mod.
- **Method 2.** When loading this mod via Sinytra Connector crashes with a `NoSuchMethodError`, delete the converted mod files inside the `mods/.connector` directory, then restart the game so it re-runs the conversion. Binary inspection has shown that the `.class` bytecode files produced by the two conversion runs differ.

**Even with the above workarounds, we strongly discourage running this mod through Sinytra Connector — running a Fabric mod on Forge is inherently extremely unstable.**

### Q6: Why can't I see the text on a sign when I am far away?

**A:** This behavior is caused by the rendering mechanism of the prerequisite mod, MishangUC. The Ocelot Sign Mod reuses the sign logic from MishangUC directly, so it is normal that text disappears at long distance. A community member has provided a workaround for reference:

- **Method 1.** Install the "I See You Over There!" mod. This optimization mod lets you customize the render distance of Minecraft entities and block entities, fixing the issue of far-distance content not rendering while also offering fine-grained performance configuration options.

  Download: <https://modrinth.com/mod/i-see-you-over-there>

### Q7: Will this mod be adapted for Minecraft Transit Railway (MTR)?

**A:** No. The two mods have unrelated features and underlying mechanisms, so there are no adaptation plans. Please do not report MTR-related issues to the Ocelot Sign Mod — the two mods are entirely independent.

### Q8: How do I determine whether an issue comes from the prerequisite mod MishangUC or from the Ocelot Sign Mod?

**Troubleshooting steps:**

- Disable the Ocelot Sign Mod and check whether the issue still occurs.
- Disable both the Ocelot Sign Mod and its prerequisite MishangUC, and check whether the issue still occurs.

Note: if the issue is confirmed to come from the prerequisite mod MishangUC, please submit the report through the MishangUC feedback channel, attaching the game log, mod version, game version, and reproduction steps so the developers can investigate.

If the issue is confirmed to come from the Ocelot Sign Mod, please submit the report through the Ocelot Sign Mod feedback channel, attaching the game log, mod version, game version, and reproduction steps so the developers can investigate.

### Q9: I bought the Ocelot Sign Mod on an e-commerce platform (Taobao, Xianyu, etc.) or on NetEase Minecraft. What should I do?

**A:** Please apply for a refund as soon as possible and report the seller to the official platform or to the mod author. Support the official version and resist resale! This mod has never authorized any e-commerce platform or individual to engage in commercial sales. Players are advised not to be deceived and to help maintain a healthy gaming ecosystem together.

### Q10: Can I develop a derivative work based on the Ocelot Sign Mod under the LGPL 3.0 license?

**A:** Yes, you can. You are completely free to develop derivative works based on the Ocelot Sign Mod, but you must strictly comply with the LGPL 3.0 open-source license. This means the modified core code must also remain open-source, and you must clearly credit the original author and indicate the source when publishing.

If you intend to develop a derivative work, it is recommended that you contact the original author in advance to discuss potential collaboration.

The following behaviors are **not** permitted:

1. Adding any malicious, destructive, or privacy-stealing code to the mod using the open-source code.
2. Impersonating the original author of the Ocelot Sign Mod.
3. Uploading the Ocelot Sign Mod or any modified version to e-commerce platforms (such as Taobao, Xianyu, etc.) for commercial sale.
4. Republishing the mod on the NetEase Minecraft Mod Center as paid content.
5. Failing to comply with the license, or not clearly crediting the original author when using or modifying the code.

**Disclaimer:** In addition, for all forks and derivative works of the Ocelot Sign Mod, if any bug, crash, or dispute arises during use, please contact the developer of that fork or derivative mod directly. The original author assumes no joint liability whatsoever.

---

## Related Links

- [Home](/en/)
- [Basic Usage of Signs](/en/guide/sign-usage.html)
- [Custom Font & Texture Resource Pack](/en/guide/resource-pack.html)
- [Rare Traffic Signs Explained](/en/guide/rare-traffic-signs.html)
- [Creative Plaza](/en/guide/creative-plaza.html)
- [中文版本：免责声明与常见问题](/guide/disclaimer-faq.html)