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
const FIELD = 'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border, #d4d4d8);border-radius:8px;background:var(--background, transparent);color:inherit;font:inherit;';

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
				style: FIELD + 'padding:4px;font-family:ui-monospace,monospace;',
			});
			const empty = el('p', { text: labels.empty, hidden: true, role: 'status', style: 'margin:0;font-size:13px;opacity:.7;' });
			const paired = el('input', { type: 'checkbox', checked: true });
			const pairedLabel = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:14px;' }, [
				paired,
				el('span', { text: labels.paired }),
			]);
			const params = el('input', {
				type: 'text',
				placeholder: labels.paramsHelp,
				style: FIELD + 'font-family:ui-monospace,monospace;',
			});
			const preview = el('code', {
				'aria-live': 'polite',
				style: 'display:block;padding:8px 10px;border-radius:8px;background:var(--muted, #f4f4f5);white-space:pre-wrap;word-break:break-word;min-height:1.5em;',
			});
			const insert = el('button', {
				type: 'button',
				text: labels.insert,
				disabled: true,
				style: 'padding:8px 14px;border-radius:8px;border:0;background:var(--primary, #2563eb);color:var(--primary-foreground, #fff);font:inherit;cursor:pointer;',
			});
			const cancel = el('button', {
				type: 'button',
				text: labels.cancel,
				style: 'padding:8px 14px;border-radius:8px;border:1px solid var(--border, #d4d4d8);background:transparent;color:inherit;font:inherit;cursor:pointer;',
			});

			const all = this.shortcodes;
			const selected = () => list.value || '';

			const fill = (filter) => {
				const needle = filter.trim().toLowerCase();
				const matches = all.filter((name) => name.toLowerCase().includes(needle));
				list.replaceChildren(...matches.map((name) => el('option', { value: name, text: `[${name}]` })));
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

			const actions = el('div', { style: 'display:flex;justify-content:flex-end;gap:8px;' }, [cancel, insert]);
			this.style.display = 'block';
			this.replaceChildren(
				el('div', { style: 'display:flex;flex-direction:column;gap:12px;min-width:320px;' }, [
					search,
					list,
					empty,
					pairedLabel,
					el('label', { style: 'display:flex;flex-direction:column;gap:6px;font-size:14px;' }, [
						el('span', { text: labels.params }),
						params,
					]),
					el('div', { style: 'display:flex;flex-direction:column;gap:6px;font-size:14px;' }, [
						el('span', { text: labels.preview }),
						preview,
					]),
					actions,
				]),
			);

			fill('');
			search.focus();
		}
	});
}
