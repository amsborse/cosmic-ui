import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Script lives in /scripts; project root is one level up.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function write(name, content) {
  const p = join(root, name);
  fs.mkdirSync(dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

const tsconfigApp = {
  compilerOptions: {
    tsBuildInfoFile: './node_modules/.tmp/tsconfig.app.tsbuildinfo',
    target: 'ES2022',
    useDefineForClassFields: true,
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    isolatedModules: true,
    moduleDetection: 'force',
    noEmit: true,
    jsx: 'react-jsx',
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedSideEffectImports: true,
    resolveJsonModule: true,
    baseUrl: '.',
    paths: { '@amsborse/cosmic-ui': ['./src/index.ts'] },
  },
  include: ['src', '.storybook'],
};

const tsconfigBuild = {
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'bundler',
    jsx: 'react-jsx',
    strict: true,
    skipLibCheck: true,
    declaration: true,
    isolatedModules: true,
    noEmit: true,
    baseUrl: '.',
    paths: { '@amsborse/cosmic-ui': ['./src/index.ts'] },
  },
  include: ['src/**/*.ts', 'src/**/*.tsx', 'src/vite-env.d.ts'],
  exclude: ['**/*.stories.*', '**/*.test.*', '**/*.spec.*'],
};

const tsconfigNode = {
  compilerOptions: {
    tsBuildInfoFile: './node_modules/.tmp/tsconfig.node.tsbuildinfo',
    target: 'ES2022',
    lib: ['ES2022'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    allowImportingTsExtensions: true,
    isolatedModules: true,
    moduleDetection: 'force',
    noEmit: true,
    strict: true,
  },
  include: ['vite.config.ts', 'vite.storybook.config.ts'],
};

const tsconfigRoot = {
  files: [],
  references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }],
};

write('tsconfig.json', JSON.stringify(tsconfigRoot, null, 2) + '\n');
write('tsconfig.app.json', JSON.stringify(tsconfigApp, null, 2) + '\n');
write('tsconfig.build.json', JSON.stringify(tsconfigBuild, null, 2) + '\n');
write('tsconfig.node.json', JSON.stringify(tsconfigNode, null, 2) + '\n');

const viteConfig = `import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [
    react(),
    dts({
      tsconfigPath: fileURLToPath(new URL('tsconfig.build.json', import.meta.url)),
      exclude: ['**/*.stories.*', '**/*.test.*', '**/*.spec.*'],
    }),
  ],
  build: {
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('src/index.ts', import.meta.url)),
      name: 'CosmicUI',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        assetFileNames: 'style.css',
      },
    },
  },
});
`;
write('vite.config.ts', viteConfig);

const viteStorybook = `import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config used only by Storybook. Keep this separate from \`vite.config.ts\` so
 * the library build (dts + lib mode) does not run in the docs environment.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@amsborse/cosmic-ui': fileURLToPath(new URL('src/index.ts', import.meta.url)),
    },
  },
});
`;
write('vite.storybook.config.ts', viteStorybook);

const storybookMain = `import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: { viteConfigPath: 'vite.storybook.config.ts' },
    },
  },
  core: { disableTelemetry: true },
};

export default config;
`;
write('.storybook/main.ts', storybookMain);

const storybookPreview = `import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
`;
write('.storybook/preview.ts', storybookPreview);

const pkg = {
  name: '@amsborse/cosmic-ui',
  version: '0.0.1',
  private: false,
  type: 'module',
  description: 'Premium interactive UI components with fluid motion and cosmic design.',
  license: 'MIT',
  publishConfig: { access: 'public' },
  keywords: [
    'react',
    'react-component-library',
    'ui',
    'component-library',
    'animation',
    'motion',
    'interactive',
    'storybook',
    'svg',
    'typescript',
    'cosmic-ui',
  ],
  engines: { node: '>=18' },
  main: 'dist/index.cjs',
  module: 'dist/index.js',
  types: 'dist/index.d.ts',
  exports: {
    '.': {
      import: { types: './dist/index.d.ts', default: './dist/index.js' },
      require: { types: './dist/index.d.ts', default: './dist/index.cjs' },
    },
    './style.css': './dist/style.css',
  },
  sideEffects: ['./dist/**/*.css'],
  files: ['dist', 'README.md', 'LICENSE'],
  peerDependencies: {
    react: '^18.0.0 || ^19.0.0',
    'react-dom': '^18.0.0 || ^19.0.0',
  },
  scripts: {
    dev: 'npm run storybook',
    storybook: 'storybook dev -p 6006',
    build: 'vite build',
    'build-storybook': 'storybook build',
    'pack:check': 'npm pack',
    typecheck: 'tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit',
    prepublishOnly: 'npm run typecheck && npm run build',
    'config:write': 'node scripts/write-utf8-configs.mjs',
  },
  devDependencies: {
    '@storybook/addon-essentials': '^8.6.14',
    '@storybook/addon-interactions': '^8.6.14',
    '@storybook/blocks': '^8.6.14',
    '@storybook/react': '^8.6.14',
    '@storybook/react-vite': '^8.6.14',
    '@storybook/test': '^8.6.14',
    '@types/node': '^22.16.0',
    '@types/react': '^19.1.0',
    '@types/react-dom': '^19.1.0',
    '@vitejs/plugin-react': '^4.4.0',
    react: '^19.1.0',
    'react-dom': '^19.1.0',
    storybook: '^8.6.14',
    typescript: '^5.8.0',
    vite: '^6.2.0',
    'vite-plugin-dts': '^4.5.0',
  },
};
write('package.json', JSON.stringify(pkg, null, 2) + '\n');
write(
  'src/index.ts',
  `export { InfinityGraphic } from './components/InfinityGraphic/InfinityGraphic';\nexport type {\n  InfinityColorScheme,\n  InfinityGraphicMode,\n  InfinityGraphicProps,\n  InfinityGraphicState,\n} from './components/InfinityGraphic/InfinityGraphic.types';\n`,
);

const readme = `# Cosmic UI

Premium interactive UI components designed to feel alive — fluid, responsive, and elegant.

## Features
- Interactive motion-driven components
- Cursor-aware animations
- Smooth glow and particle systems
- Built with React + TypeScript
- Documented with Storybook

## Install

npm install @amsborse/cosmic-ui

## Usage

\`\`\`tsx
import { InfinityGraphic } from "@amsborse/cosmic-ui";

export default function App() {
  return <InfinityGraphic mode="dark" />;
}
\`\`\`
`;
write('README.md', readme);
write(
  'LICENSE',
  `MIT License

Copyright (c) 2026 amsborse

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
);

console.log('Wrote UTF-8: tsconfigs, Vite, Storybook, package.json, src/index.ts, README.md, LICENSE');

