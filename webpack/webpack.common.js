const webpack = require("webpack");
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const BuildManifest = require('./webpack.manifest');
const srcDir = '../src/';
const fs = require("fs");

const edgeLanguages = [
    "de",
    "en",
    "es",
    "fr",
    "pl",
    "pt_BR",
    "ro",
    "ru",
    "sk",
    "sv",
    "tr",
    "uk",
    "zh_CN"
]

module.exports = env => ({
    entry: {
        popup: path.join(__dirname, srcDir + 'popup.ts'),
        background: path.join(__dirname, srcDir + 'background.ts'),
        content: path.join(__dirname, srcDir + 'content.ts'),
        options:  path.join(__dirname, srcDir + 'options.ts'),
        help:  path.join(__dirname, srcDir + 'help.ts'),
        permissions:  path.join(__dirname, srcDir + 'permissions.ts')
    },
    output: {
        path: path.join(__dirname, '../dist/js'),
        filename: '[name].js'
    },
    optimization: {
        splitChunks: {
            name: 'vendor',
            chunks: "initial"
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        // exclude locale files in moment
        new CopyPlugin({
            patterns: [
                {
                    from: '.',
                    to: '../',
                    globOptions: {
                    ignore: ['manifest.json'],
                    },
                    context: './public',
                    filter: async (path) => {
                        if (path.match(/\/_locales\/.+/)) {
                            if (env.browser.toLowerCase() === "edge" 
                                    && !edgeLanguages.includes(path.match(/(?<=\/_locales\/)[^/]+(?=\/[^/]+$)/)[0])) {
                                return false;
                            }

                            const data = await fs.promises.readFile(path);
                            const parsed = JSON.parse(data.toString());

                            return parsed.fullName && parsed.Description;
                        } else {
                            return true;
                        }
                    },
                    transform(content, path) {
                        if (path.match(/\/_locales\/.+/)) {
                            const parsed = JSON.parse(content.toString());
                            if (env.browser.toLowerCase() === "safari") {
                                parsed.fullName.message = parsed.fullName.message.match(/^.+(?= -)/)?.[0] || parsed.fullName.message;
                                if (parsed.fullName.message.length > 50) {
                                    parsed.fullName.message = parsed.fullName.message.substr(0, 47) + "...";
                                }

                                parsed.Description.message = parsed.Description.message.match(/^.+(?=\. )/)?.[0] || parsed.Description.message;
                                if (parsed.Description.message.length > 80) {
                                    parsed.Description.message = parsed.Description.message.substr(0, 77) + "...";
                                }
                            }
            
                            return Buffer.from(JSON.stringify(parsed));
                        }

                        return content;
                    }
                }
            ]
        }),
        new BuildManifest({
            browser: env.browser,
            pretty: env.mode === "production",
            stream: env.stream
        })
    ]
});
