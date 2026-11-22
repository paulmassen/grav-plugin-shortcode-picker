# Shortcode Picker Plugin

The **Shortcode Picker** plugin adds an **Insert shortcode** button to the toolbar of the default Markdown editor in Grav's new admin (Admin2). The button opens a searchable list of every shortcode registered on the site and inserts the chosen one at the cursor.

The list is built from the live [Shortcode Core](https://github.com/getgrav/grav-plugin-shortcode-core) registry, so it includes:

- the shortcodes shipped with Shortcode Core (`[notice]`, `[columns]`, `[details]`, …);
- shortcodes added by other plugins and by your theme;
- shortcodes created with Shortcode Builder or any other tool that registers them with Shortcode Core.

No list has to be maintained by hand: when a plugin adds or removes a shortcode, the picker follows.

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
6. Check the preview, then click **Insert**, press <kbd>Enter</kbd> in the list, or double-click a shortcode.

The shortcode is inserted at the cursor. **Cancel** or <kbd>Esc</kbd> closes the window without changing the page.

The picker only knows shortcode *names*: Shortcode Core does not expose which attributes a shortcode accepts or whether it needs a closing tag. Refer to the documentation of the plugin that provides each shortcode.

## Permissions

The button is shown only to users who can edit pages (`api.pages.write`). With an API key, the key's own scopes are checked.

## Configuration

The plugin has a single setting. Copy `user/plugins/shortcode-picker/shortcode-picker.yaml` to `user/config/plugins/shortcode-picker.yaml` before changing it, or use the plugin page in Admin2.

```yaml
enabled: true
```

| Setting | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Shows the Insert shortcode button in the Markdown editor toolbar. |

## Translations

The interface follows each user's admin language and falls back to English. English and French are included. To add a language, copy the `en` block of `languages.yaml`, translate it, and send a pull request.

## How it works

The plugin uses the official Admin2 extension points; it does not inject code into the editor:

- `onApiMarkdownEditorButtons` adds the toolbar button, together with the sorted list of names returned by Shortcode Core.
- `admin-next/modals/shortcode-picker.js` is the modal window. It is served by the API as a same-origin module, so it works with Admin2's strict Content Security Policy. It uses no `eval` and no external resource.

The plugin adds nothing to the front end of the site.

## Troubleshooting

- **The button is missing.** Check that Shortcode Core is enabled and that its *Activate in admin* option is on. Check also that you use the default Markdown editor and that your account can edit pages. Reload the admin after installing the plugin.
- **A shortcode is missing from the list.** Only shortcodes registered with Shortcode Core are listed. A shortcode registered by a plugin that is disabled in the admin context does not appear.

## License

This plugin is released under the [MIT License](LICENSE).
