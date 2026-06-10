// 旗標標記 SVG 形狀系統（W52 / ICU / ER 共用，與 html_demo 同一套）
// 10 形狀 × 實心/空心 = 20，依固定順序循環指派，不對應註記語意
export const STYLE_CYCLE = [
  'circle', 'tri-up', 'square', 'pentagon', 'cross', 'heart', 'teardrop', 'sun', 'star', 'tri-rt',
  'circle-o', 'tri-up-o', 'square-o', 'pentagon-o', 'cross-o', 'heart-o', 'teardrop-o', 'sun-o', 'star-o', 'tri-rt-o',
]

// SVG 形狀庫（viewBox 0 0 24 24，%P% = 上色屬性；實心 fill、空心 stroke）
const SHAPE_SVG = {
  circle:   '<circle cx="12" cy="12" r="8" %P%/>',
  'tri-up': '<path d="M12 3.5 20.6 19 3.4 19Z" %P%/>',
  square:   '<rect x="4.5" y="4.5" width="15" height="15" rx="1.5" %P%/>',
  pentagon: '<path d="M12 3 20.6 9.2 17.3 19.3 6.7 19.3 3.4 9.2Z" %P%/>',
  cross:    '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" %P%/>',
  heart:    '<path d="M12 20.5C12 20.5 3.5 14.3 3.5 8.6 3.5 5.8 5.6 3.8 8.1 3.8 9.8 3.8 11.3 4.8 12 6.2 12.7 4.8 14.2 3.8 15.9 3.8 18.4 3.8 20.5 5.8 20.5 8.6 20.5 14.3 12 20.5 12 20.5Z" %P%/>',
  teardrop: '<path d="M12 2.5C12 2.5 18.5 10.5 18.5 15.5A6.5 6.5 0 1 1 5.5 15.5C5.5 10.5 12 2.5 12 2.5Z" %P%/>',
  sun:      '<circle cx="12" cy="12" r="5" %P%/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5.4" x2="12" y2="2.5"/><line x1="12" y1="18.6" x2="12" y2="21.5"/><line x1="18.6" y1="12" x2="21.5" y2="12"/><line x1="5.4" y1="12" x2="2.5" y2="12"/><line x1="16.7" y1="7.3" x2="18.7" y2="5.3"/><line x1="7.3" y1="7.3" x2="5.3" y2="5.3"/><line x1="16.7" y1="16.7" x2="18.7" y2="18.7"/><line x1="7.3" y1="16.7" x2="5.3" y2="18.7"/></g>',
  star:     '<path d="M12 2.2 14.7 9.2 22 9.5 16.3 14.1 18.2 21.2 12 17.1 5.8 21.2 7.7 14.1 2 9.5 9.3 9.2Z" %P%/>',
  'tri-rt': '<path d="M20.5 12 3.5 3.5 3.5 20.5Z" %P%/>',
}

export function shapeSVG(name) {
  const outline = name.endsWith('-o')
  const base = outline ? name.slice(0, -2) : name
  const paint = outline
    ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"'
    : 'fill="currentColor"'
  const inner = (SHAPE_SVG[base] || SHAPE_SVG.circle).replace('%P%', paint)
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`
}

// 依固定順序循環指派形狀（key → 形狀名）
export function makeFlagStyle(order) {
  return Object.fromEntries(order.map((k, i) => [k, STYLE_CYCLE[i % STYLE_CYCLE.length]]))
}

// 旗標標記元件：<span class="flag-dot flag-dot-KEY"><svg/></span>
export function FlagDot({ k, flagStyle, title = true }) {
  return (
    <span
      className={`flag-dot flag-dot-${k}`}
      {...(title ? { title: k } : {})}
      dangerouslySetInnerHTML={{ __html: shapeSVG(flagStyle[k] || 'circle') }}
    />
  )
}
