module.exports = function override(config, env) {
    config.output.globalObject = 'this';
    return config;
};
