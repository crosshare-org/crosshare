const SentryWebpackPlugin = require('@sentry/webpack-plugin');

module.exports = function override(config, env) {
    config.output.globalObject = 'this';
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(new SentryWebpackPlugin({
      include: '.',
      ignoreFile: '.sentrycliignore',
      ignore: ['node_modules', 'webpack.config.js'],
      configFile: 'sentry.properties'
    }));
    return config;
};
