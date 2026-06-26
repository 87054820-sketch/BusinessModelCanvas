/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  // Adds proper paragraph / heading / list spacing for markdown
  // bodies rendered with `<div class="prose">` (e.g. pattern
  // description.{en,zh}.md inside PatternDetailModal). Without this
  // plugin, `prose` classes are no-ops and react-markdown output
  // collapses into one undifferentiated wall of text.
  plugins: [typography],
};
