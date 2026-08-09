import { icons as lucideIcons } from '@iconify-json/lucide'
import { defineConfig, presetIcons, presetWind4, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      collections: {
        lucide: () => lucideIcons
      },
      scale: 1.15,
      warn: true
    })
  ],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      ink: '#18231E',
      muted: '#5B6861',
      canvas: '#F3F0E7',
      surface: '#FFFEFA',
      brand: {
        50: '#EFF7F3',
        100: '#DCECE4',
        200: '#BAD8C9',
        300: '#8DBBA2',
        400: '#609A7E',
        500: '#3F7D65',
        600: '#306650',
        700: '#265240',
        800: '#204236',
        900: '#19362D'
      },
      amber: {
        DEFAULT: '#C98A24',
        50: '#FFF8E8',
        100: '#FCECC5',
        200: '#F6DA8E',
        300: '#EDC25D',
        400: '#DFA63B',
        500: '#C98A24',
        600: '#A96C19',
        700: '#855117',
        800: '#6C4119',
        900: '#593619'
      },
      danger: '#B8403C'
    },
    font: {
      sans: '"IRANYekan", Tahoma, Arial, sans-serif'
    }
  },
  shortcuts: {
    'card': 'rounded-[1.35rem] border border-black/7 bg-surface shadow-[0_1px_2px_rgba(24,35,30,.04),0_12px_32px_rgba(24,35,30,.06)]',
    'card-interactive': 'card transition duration-200 hover:-translate-y-0.5 hover:border-brand-300/70 hover:shadow-[0_2px_4px_rgba(24,35,30,.05),0_16px_36px_rgba(24,35,30,.09)] active:translate-y-0',
    'card-stack': 'grid gap-3 p-1 pb-4',
    'btn': 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-700 transition duration-180 disabled:cursor-not-allowed disabled:opacity-50',
    'btn-primary': 'btn bg-brand-700 text-white shadow-[0_8px_20px_rgba(38,82,64,.20)] hover:bg-brand-800 active:bg-brand-900',
    'btn-secondary': 'btn border border-black/10 bg-white text-ink hover:border-brand-600/30 hover:bg-brand-50',
    'btn-ghost': 'btn text-ink/65 hover:bg-black/5 hover:text-ink',
    'field': 'w-full rounded-xl border border-black/12 bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand-600 focus:ring-3 focus:ring-brand-600/12',
    'label': 'mb-1.5 block text-xs font-700 text-ink/65',
    'badge': 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-700'
  }
})
