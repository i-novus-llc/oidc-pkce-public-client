import { nodeResolve } from '@rollup/plugin-node-resolve'
import { nodeExternals } from 'rollup-plugin-node-externals'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import pkg from './package.json' assert { type: 'json' }

export default {
    input: 'src/index.ts',
    output: [
        {
            file: pkg.main,
            format: 'umd',
            sourcemap: true,
            exports: 'named',
            name: pkg.name,
        },
        {
            file: pkg.module,
            format: 'es',
            sourcemap: true,
        },
    ],
    plugins: [nodeExternals(), nodeResolve(), commonjs(), typescript()],
}
