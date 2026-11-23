# Shortcode Picker Plugin

The **Shortcode Picker** plugin adds an **Insert shortcode** button to the toolbar of the default Markdown editor in Grav's new admin (Admin2). The button opens a searchable list of every shortcode registered on the site and inserts the chosen one at the cursor.

The list is built from the live [Shortcode Core](https://github.com/getgrav/grav-plugin-shortcode-core) registry, so it includes:

- the shortcodes shipped with Shortcode Core (`[notice]`, `[columns]`, `[details]`, …);
- shortcodes added by other plugins and by your theme;
- shortcodes created with Shortcode Builder or any other tool that registers them with Shortcode Core.

No list has to be maintained by hand: when a plugin adds or removes a shortcode, the picker follows.

Site administrators can also:

- **show a preview** of a shortcode: a screenshot or an animated GIF, a short description and a ready-made example, so authors see what they are about to insert;
- **hide shortcodes** that authors should not use, such as internal aliases.

## Requirements

- Grav `>= 2.0`
- [Admin2](https://github.com/getgrav/grav-plugin-admin2) `>= 2.0.8` and the [API](https://github.com/getgrav/grav-plugin-api) plugin `>= 1.0.14`
- [Shortcode Core](https://github.com/getgrav/grav-plugin-shortcode-core) `>= 5.3.0`, with **Activate in admin** (`active_admin`) left on (the default)

GPM installs the dependencies automatically.

The button is added to the **default (CodeMirror) Markdown editor** only. It does not appear in Editor Pro, which has its own shortcode tools, or in the classic Grav admin.

## Installation

### GPM installation (recommended)

From the root directory of your Grav site:

```bash
bin/gpm install shortcode-picker
```

You can also install it from Admin2: **Plugins → Add**, then search for *Shortcode Picker*.

### Manual installation

Download the latest release, extract it into `user/plugins`, and make sure the folder is named `shortcode-picker`:

```text
user/plugins/shortcode-picker
```

Then install the dependencies if they are not present:

```bash
bin/gpm install shortcode-core
```

## Usage

1. Open a page in Admin2 and stay in the Markdown editor.
2. Click the **Insert shortcode** button (`</>` icon) in the editor toolbar.
3. Type part of a name to filter the list, then pick a shortcode. The arrow keys move through the list.
4. Choose whether the shortcode **wraps content**:
   - checked: `[notice]content[/notice]`, with a placeholder you then replace;
   - unchecked: a single tag such as `[lorem]`.
5. Optionally type attributes, for example `style="info"`. They are added to the opening tag as typed.
6. Check the code to insert, then click **Insert**, press <kbd>Enter</kbd> in the list, or double-click a shortcode.

The shortcode is inserted at the cursor. **Cancel** or <kbd>Esc</kbd> closes the window without changing the page.

When a shortcode has a preview, the window widens: the list stays on the left and the preview appears on the right. Shortcodes with a preview are marked with ◆ in the list. If the preview defines an example, that example is inserted as is and the attribute options are hidden.

Shortcode Core only exposes shortcode *names*: it does not say which attributes a shortcode accepts or whether it needs a closing tag. Previews with an example fill that gap for the shortcodes your authors use most.

## Permissions

The button is shown only to users who can edit pages (`api.pages.write`). With an API key, the key's own scopes are checked.

## Configuration

Use the plugin page in Admin2 (**Plugins → Shortcode Picker**). To edit the file instead, copy `user/plugins/shortcode-picker/shortcode-picker.yaml` to `user/config/plugins/shortcode-picker.yaml` before changing it.

```yaml
enabled: true
hidden:
  - '#'
  - anchor
previews:
  -
    shortcode: notice
    image: user/media/shortcode-picker/notice.gif
    description: 'Coloured box to draw attention. Styles: info, warning, note.'
    example: '[notice style="info"]Text[/notice]'
```

| Setting | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Shows the Insert shortcode button in the Markdown editor toolbar. |
| `hidden` | `[]` | Shortcode names left out of the picker list. They keep working in page content. |
| `previews` | `[]` | One entry per shortcode, with the keys below. |

Each `previews` entry accepts:

| Key | Description |
| --- | --- |
| `shortcode` | Name of the shortcode, without brackets. Entries for a shortcode that is not registered are ignored. |
| `image` | Screenshot or animated GIF (PNG, JPEG, GIF, WebP or AVIF). Uploaded from Admin2 into `user/media/shortcode-picker/`. In YAML, give a path relative to the site root, inside `user/`. |
| `description` | One or two sentences shown under the image. |
| `example` | Full shortcode inserted when the shortcode is picked, such as `[notice style="info"]Text[/notice]`. Leave it out to let authors build the shortcode with the attribute and *Wraps content* options. |

### Preparing preview images

- Capture the rendered shortcode on a page of your site, not the Markdown source.
- Around 800 pixels wide is enough; the window shows images up to 320 pixels high.
- Keep animated GIFs short and light, as they load each time the shortcode is selected. WebP or AVIF animations are smaller.
- Images are stored in `user/media/shortcode-picker/`, outside the plugin folder, so plugin updates keep them. They are public files, like any other file in `user/media/`.

## Translations

The interface follows each user's admin language and falls back to English. English and French are included. To add a language, copy the `en` block of `languages.yaml`, translate it, and send a pull request.

## How it works

The plugin uses the official Admin2 extension points; it does not inject code into the editor:

- `onApiMarkdownEditorButtons` adds the toolbar button, together with the sorted list of names returned by Shortcode Core, minus hidden shortcodes, and the configured previews.
- The settings form lists the registered shortcodes through a `data-options@` provider, which the plugin adds to Grav's allowlist of dynamic option providers.
- `admin-next/modals/shortcode-picker.js` is the modal window. It is served by the API as a same-origin module, so it works with Admin2's strict Content Security Policy. It uses no `eval` and no external resource.

The plugin adds nothing to the front end of the site.

## Troubleshooting

- **The button is missing.** Check that Shortcode Core is enabled and that its *Activate in admin* option is on. Check also that you use the default Markdown editor and that your account can edit pages. Reload the admin after installing the plugin.
- **A shortcode is missing from the list.** Check that it is not in *Hidden shortcodes*. Only shortcodes registered with Shortcode Core are listed. A shortcode registered by a plugin that is disabled in the admin context does not appear.
- **`[#]` appears in the list.** It is an alias of `[anchor]`, registered by the Page TOC plugin. Add it to *Hidden shortcodes* if your authors do not need it.
- **A preview image does not appear.** The file must still exist and be a PNG, JPEG, GIF, WebP or AVIF image inside `user/`. Otherwise the picker shows *No preview for this shortcode*.

## License

This plugin is released under the [MIT License](LICENSE).
