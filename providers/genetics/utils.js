function kaiToInt(kai) {
  const alphabet = {
    1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, a: 9, b: 10, c: 11, d: 12,// eslint-disable-line
    e: 13, f: 14, g: 15, h: 16, i: 17, j: 18, k: 19, m: 20, n: 21, o: 22, p: 23, q: 24, // eslint-disable-line
    r: 25, s: 26, t: 27, u: 28, v: 29, w: 30, x: 31 // eslint-disable-line
  };
  if (typeof alphabet[kai] === 'undefined') {
    throw new Error(`kaiToInt: unknown symbol ${kai}`);
  }
  return alphabet[kai];
}

exports.kaiToInt = kaiToInt;
