module.exports = function override(config, env) {
    config.output.globalObject = 'this';
    config.module.rules.push({
        test: /\.worker\.ts$/,
        use: [
            {loader: 'worker-loader'}
        ]
    });
    return config;
};
