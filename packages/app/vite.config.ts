import viteReact from '@vitejs/plugin-react'

const plugins = [
    viteReact({ jsxRuntime: 'classic' }),
]

export default {
    base: '/',
    plugins,
    build: {
        target: 'esnext',
    },
}
