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
      ink: '#171717',
      muted: '#686868',
      canvas: '#F4F4F2',
      surface: '#FFFFFF',
      brand: {
        50: '#FFF9EC',
        100: '#FEEDC1',
        200: '#FDE09A',
        300: '#FCCD68',
        400: '#FBC44B',
        500: '#FABD32',
        600: '#DF9E18',
        700: '#9A6811',
        800: '#4A3818',
        900: '#1C1B18'
      },
      amber: {
        DEFAULT: '#F28C18',
        50: '#FFF7ED',
        100: '#FFEDD5',
        200: '#FED7AA',
        300: '#FDBA74',
        400: '#FB923C',
        500: '#F28C18',
        600: '#D96C0B',
        700: '#B45309',
        800: '#8C3F0D',
        900: '#71350F'
      },
      danger: '#B8403C'
    },
    font: {
      sans: '"IRANYekan", Tahoma, Arial, sans-serif'
    }
  },
  shortcuts: {
    'card': 'rounded-[1.35rem] border border-black/7 bg-surface shadow-[0_1px_2px_rgba(0,0,0,.035),0_10px_28px_rgba(0,0,0,.05)]',
    'card-interactive': 'card transition duration-200 hover:-translate-y-0.5 hover:border-brand-500/70 hover:shadow-[0_2px_4px_rgba(0,0,0,.04),0_14px_32px_rgba(0,0,0,.08)] active:translate-y-0',
    'card-stack': 'grid gap-3 p-1 pb-4',
    'btn': 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-700 transition duration-180 disabled:cursor-not-allowed disabled:opacity-50',
    'btn-primary': 'btn bg-brand-500 text-ink shadow-[0_8px_20px_rgba(250,189,50,.24)] hover:bg-brand-400 active:bg-brand-600',
    'btn-secondary': 'btn border border-black/10 bg-white text-ink hover:border-brand-500/60 hover:bg-brand-50',
    'btn-ghost': 'btn text-ink/65 hover:bg-black/5 hover:text-ink',
    'field': 'w-full rounded-xl border border-black/12 bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-3 focus:ring-brand-500/18',
    'label': 'mb-1.5 block text-xs font-700 text-ink/65',
    'badge': 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-700'
  }
})
