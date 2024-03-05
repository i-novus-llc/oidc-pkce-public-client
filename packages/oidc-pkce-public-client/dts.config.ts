const packageJson = require('./package.json')

// Config for dts-bundle-generator

const config = {
    entries: [
        {
            filePath: './src/index.ts',
            outFile: packageJson.types,
            noCheck: false,
        },
    ],
}

module.exports = config
