const memoryCache = require('memory-cache');

function Cache() {
  async function getOrAdd(key, handler) {
    let value = memoryCache.get(key);
    if (!value && handler) {
      value = await handler();
      memoryCache.put(key, value);
    }
    return value;
  }
  function clear() {
    memoryCache.clear();
  }

  function get(key) {
    return memoryCache.get(key);
  }

  function put(key, value) {
    return memoryCache.put(key, value);
  }

  this.getOrAdd = getOrAdd;
  this.get = get;
  this.put = put;
  this.clear = clear;
}

module.exports = Cache;
