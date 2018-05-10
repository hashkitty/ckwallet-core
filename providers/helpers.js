function equalBuffer(buf1, buf2) {
  let res = false;
  if (buf1 && buf2 && buf1.length === buf2.length) {
    res = true;
    for (let i = 0; i < buf1.length; i += 1) {
      if (buf1[i] !== buf2[i]) {
        res = false;
        break;
      }
    }
  }
  return res;
}

function getUniqueBuffers(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i += 1) {
    if (!res.find(o => equalBuffer(o, arr[i]))) {
      res.push(arr[i]);
    }
  }
  return res;
}

function getCooldownIndex(kitty) {
  let res = kitty.Generation + kitty.ChildrenCount;
  if (res > 13) {
    res = 13;
  }
  return res;
}

function getCooldownBlocks(kitty) {
  const cooldowns = {
    1: 8,
    2: 20,
    3: 40,
    4: 120,
    5: 240,
    6: 480,
    7: 960,
    8: 1920,
    9: 3840,
    10: 5760,
    11: 11520,
    12: 23040,
    13: 40320,
  };
  const index = getCooldownIndex(kitty);
  return cooldowns[index];
}

exports.equalBuffer = equalBuffer;
exports.getUniqueBuffers = getUniqueBuffers;
exports.getCooldownIndex = getCooldownIndex;
exports.getCooldownBlocks = getCooldownBlocks;
