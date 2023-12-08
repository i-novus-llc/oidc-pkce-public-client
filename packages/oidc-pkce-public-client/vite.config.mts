import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

import packageJson from './package.json'

function isModuleExternal(id: string) {
    if (id.includes('/node_modules/') || id.includes('\\node_modules\\')) {
        return true
    }
    if (id.startsWith('.')) {
        return false
    }
    if (id.includes('/src/') || id.includes('\\src\\')) {
        return false
    }
    if (id.match(/^[_@a-z\d]/i)) {
        return true
    }

    return false
}

export default defineConfig({
    base: './',
    build: {
        emptyOutDir: false,
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            formats: ['es', 'cjs'],
            fileName: (format) => {
                switch (format) {
                    case 'es':
                        return path.basename(packageJson.module)
                    case 'cjs':
                        return path.basename(packageJson.main)
                    default:
                        throw new Error(`"${format}" module is not allowed`)
                }
            },
        },
        rollupOptions: {
            external: isModuleExternal,
        },
    },
    plugins: [
        react(),
        visualizer({ template: 'list' }),
    ],
})
