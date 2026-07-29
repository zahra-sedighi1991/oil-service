import { defineConfig, presetIcons, presetWind4, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      scale: 1.15,
      warn: true
    })
  ],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      ink: '#102019',
      canvas: '#f4f1e9',
      surface: '#fffdf8',
      brand: {
        50: '#edf8f1',
        100: '#d6efe0',
        200: '#aedfc2',
        300: '#7bc89e',
        400: '#49aa78',
        500: '#2a8d5d',
        600: '#1e714a',
        700: '#195a3e',
        800: '#174833',
        900: '#133b2b'
      },
      amber: '#e9a93d',
      danger: '#c54b45'
    },
    font: {
      sans: '"IRANYekan", Tahoma, Arial, sans-serif'
    }
  },
  shortcuts: {
    'card': 'rounded-2xl border border-black/6 bg-surface shadow-[0_1px_2px_rgba(16,32,25,.03),0_10px_30px_rgba(16,32,25,.04)]',
    'btn': 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-700 transition duration-180 disabled:cursor-not-allowed disabled:opacity-50',
    'btn-primary': 'btn bg-brand-700 text-white shadow-[0_8px_20px_rgba(25,90,62,.18)] hover:bg-brand-800',
    'btn-secondary': 'btn border border-black/10 bg-white text-ink hover:border-brand-600/30 hover:bg-brand-50',
    'btn-ghost': 'btn text-ink/65 hover:bg-black/5 hover:text-ink',
    'field': 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/10',
    'label': 'mb-1.5 block text-xs font-700 text-ink/65',
    'badge': 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-700'
  }
})
