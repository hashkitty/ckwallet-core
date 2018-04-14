const memoryCache = require('memory-cache');

function Cache() {
  async function getOrAdd(key, handler) {
    let value = memoryCache.get(key);
    if (!value) {
      value = await handler();
      memoryCache.put(key, value);
    }
    return value;
  }
  function clear() {
    memoryCache.clear();
  }

  this.getOrAdd = getOrAdd;
  this.clear = clear;
}

module.exports = Cache;
