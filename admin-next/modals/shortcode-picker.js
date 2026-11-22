/*
 * Shortcode picker modal for the Admin Next Markdown editor.
 *
 * Receives `shortcodes` (array of tag names) and `labels` (translated strings)
 * as properties from the toolbar button. Resolves with `{ insertContent }`,
 * which the editor inserts at the cursor, or emits `cancel`.
 */

const TAG = window.__GRAV_MODAL_TAG || 'grav-shortcode-picker--modal-shortcode-picker';

// English fallbacks, used only if the server sends no translated labels.
const DEFAULT_LABELS = {
	search: 'Search a shortcode',
	list: 'Available shortcodes',
	empty: 'No shortcode matches.',
	paired: 'Wraps content ([name]…[/name])',
	params: 'Attributes (optional)',
	paramsHelp: 'Example: style="info" or class="my-style"',
	content: 'content',
	preview: 'Preview',
	insert: 'Insert',
	cancel: 'Cancel',
};

// Shared field styling; colors follow the Admin Next theme (light and dark).
const FIELD = 'width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--border, #d4d4d8);border-radius:8px;background:var(--background, transparent);color:inherit;font:inherit;font-size:14px;';
const LABEL = 'display:flex;flex-direction:column;gap:8px;font-size:14px;';
const BUTTON = 'padding:0 14px;height:36px;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;';

function el(tag, props = {}, children = []) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key === 'text') node.textContent = value;
		// Attributes such as aria-label have no matching DOM property.
		else if (key === 'style' || key.includes('-')) node.setAttribute(key, value);
		else node[key] = value;
	}
	for (const child of children) node.append(child);
	return node;
}

if (!customElements.get(TAG)) {
	customElements.define(TAG, class extends HTMLElement {
		connectedCallback() {
			if (this._rendered) return;
			this._rendered = true;
			this.render();
		}

		get labels() {
			return { ...DEFAULT_LABELS, ...(this._labels || {}) };
		}

		set labels(value) {
			this._labels = value;
		}

		get shortcodes() {
			return Array.isArray(this._shortcodes) ? this._shortcodes : [];
		}

		set shortcodes(value) {
			this._shortcodes = value;
		}

		render() {
			const labels = this.labels;
			const search = el('input', {
				type: 'search',
				placeholder: labels.search,
				'aria-label': labels.search,
				style: FIELD,
			});
			const list = el('select', {
				size: 10,
				'aria-label': labels.list,
				style: FIELD + 'padding:6px;font-family:ui-monospace,monospace;font-size:13px;line-height:1.6;',
			});
			const empty = el('p', { text: labels.empty, hidden: true, role: 'status', style: 'margin:0;font-size:13px;opacity:.7;' });
			const paired = el('input', { type: 'checkbox', checked: true });
			const pairedLabel = el('label', { style: 'display:flex;gap:10px;align-items:center;font-size:14px;cursor:pointer;' }, [
				paired,
				el('span', { text: labels.paired }),
			]);
			const params = el('input', {
				type: 'text',
				placeholder: labels.paramsHelp,
				style: FIELD + 'font-family:ui-monospace,monospace;font-size:13px;',
			});
			const preview = el('code', {
				'aria-live': 'polite',
				style: 'display:block;padding:10px 12px;border-radius:8px;background:var(--muted, #f4f4f5);font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;min-height:1.5em;',
			});
			const insert = el('button', {
				type: 'button',
				text: labels.insert,
				disabled: true,
				style: BUTTON + 'border:0;background:var(--primary, #2563eb);color:var(--primary-foreground, #fff);',
			});
			const cancel = el('button', {
				type: 'button',
				text: labels.cancel,
				style: BUTTON + 'border:1px solid var(--border, #d4d4d8);background:transparent;color:inherit;',
			});

			const all = this.shortcodes;
			const selected = () => list.value || '';

			const fill = (filter) => {
				const needle = filter.trim().toLowerCase();
				const matches = all.filter((name) => name.toLowerCase().includes(needle));
				list.replaceChildren(...matches.map((name) => el('option', { value: name, text: `[${name}]`, style: 'padding:2px 6px;border-radius:4px;' })));
				empty.hidden = matches.length > 0;
				list.hidden = matches.length === 0;
				if (matches.length > 0) list.value = matches[0];
				updatePreview();
			};

			const build = () => {
				const name = selected();
				if (!name) return '';
				const attrs = params.value.trim();
				const open = `[${name}${attrs ? ' ' + attrs : ''}]`;
				return paired.checked ? `${open}${labels.content}[/${name}]` : open;
			};

			const updatePreview = () => {
				const text = build();
				preview.textContent = text || '—';
				insert.disabled = !text;
			};

			const submit = () => {
				const insertContent = build();
				if (!insertContent) return;
				this.dispatchEvent(new CustomEvent('resolve', { detail: { insertContent } }));
			};

			search.addEventListener('input', () => fill(search.value));
			list.addEventListener('change', updatePreview);
			list.addEventListener('dblclick', submit);
			params.addEventListener('input', updatePreview);
			paired.addEventListener('change', updatePreview);
			insert.addEventListener('click', submit);
			cancel.addEventListener('click', () => this.dispatchEvent(new CustomEvent('cancel')));
			search.addEventListener('keydown', (event) => {
				// Arrow down moves from the search box into the list.
				if (event.key === 'ArrowDown' && !list.hidden) {
					event.preventDefault();
					list.focus();
				}
			});
			this.addEventListener('keydown', (event) => {
				// Enter in the list or on the checkbox inserts; buttons and text
				// inputs keep their native Enter behaviour.
				if (event.key === 'Enter' && (event.target === list || event.target === paired)) {
					event.preventDefault();
					submit();
				}
			});

			// Admin2 gives custom modal components no inner padding. Body and
			// footer reproduce the spacing of its built-in modals (24px sides,
			// footer separated by a border).
			const actions = el('div', { style: 'display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border, #e4e4e7);' }, [cancel, insert]);
			this.style.display = 'block';
			this.replaceChildren(
				el('div', { style: 'display:flex;flex-direction:column;gap:20px;padding:20px 24px 24px;min-width:320px;' }, [
					el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [search, list, empty]),
					pairedLabel,
					el('label', { style: LABEL }, [
						el('span', { text: labels.params, style: 'font-weight:500;' }),
						params,
					]),
					el('div', { style: LABEL }, [
						el('span', { text: labels.preview, style: 'font-weight:500;' }),
						preview,
					]),
				]),
				actions,
			);

			fill('');
			search.focus();
		}
	});
}
