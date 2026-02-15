module.exports = function stripExtensions(source) {
  return source.replaceAll(/(from\s+["'].*?)(\.js)(['"];?)$/gm, '$1$3');
};
