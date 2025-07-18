/**
 * Redis服务统一导出模块
 */

const connection = require('./connection');
const cache = require('./cache');
const keys = require('./keys');
const monitoring = require('./monitoring');

module.exports = {
  connection,
  cache,
  keys,
  monitoring
};
