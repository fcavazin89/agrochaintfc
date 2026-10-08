/* =========================================================================
 * AGROCHAIN · GERADOR DE QR CODE (implementação própria, sem dependências)
 * Modo byte · versões 1-10 · correção de erro nível M · máscara por penalidade
 * Usado para gerar o "selo de rastreio" de cada lote registrado na blockchain.
 * ========================================================================= */
(function (global) {
  'use strict';

  /* Total de codewords (dados + correção) por versão */
  var TOTAL_CW = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
  /* Estrutura nível M: [ecPorBloco, [[qtdBlocos, dadosPorBloco], ...]] */
  var ECC_M = {
    1: [10, [[1, 16]]],
    2: [16, [[1, 28]]],
    3: [26, [[1, 44]]],
    4: [18, [[2, 32]]],
    5: [24, [[2, 43]]],
    6: [16, [[4, 27]]],
    7: [18, [[4, 31]]],
    8: [22, [[2, 38], [2, 39]]],
    9: [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]]
  };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

  /* --- Aritmética de Galois GF(256), polinômio primitivo 0x11D --- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function generatorPoly(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gmul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    var gen = generatorPoly(ecLen);
    var res = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (factor !== 0) for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
    return res;
  }

  function utf8(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {
        i++; var cp = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return out;
  }

  function dataCapacityBytes(version) {
    var g = ECC_M[version][1], n = 0;
    for (var i = 0; i < g.length; i++) n += g[i][0] * g[i][1];
    return n;
  }

  function pickVersion(len) {
    for (var v = 1; v <= 10; v++) {
      var header = 4 + (v <= 9 ? 8 : 16);
      if (dataCapacityBytes(v) * 8 >= header + len * 8) return v;
    }
    throw new Error('Conteúdo excede a capacidade máxima suportada (191 caracteres na versão 10, nível M). Recebido: ' + len + ' caracteres.');
  }

  /* Capacidade máxima de caracteres para a maior versão suportada */
  function maxLength() { return dataCapacityBytes(10) - 3; }

  function toCodewords(text, version) {
    var bytes = utf8(text);
    var bits = [];
    function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    push(4, 4);                                   // modo byte
    push(bytes.length, version <= 9 ? 8 : 16);    // contador de caracteres
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var capBits = dataCapacityBytes(version) * 8;
    for (var t = 0; t < 4 && bits.length < capBits; t++) bits.push(0);   // terminador
    while (bits.length % 8 !== 0) bits.push(0);                          // alinhamento
    for (var p = 0; bits.length < capBits; p++) push(p % 2 ? 0x11 : 0xec, 8); // preenchimento
    var cw = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k];
      cw.push(v);
    }
    return cw;
  }

  function interleave(dataCw, version) {
    var ecLen = ECC_M[version][0], groups = ECC_M[version][1];
    var blocks = [], idx = 0;
    for (var g = 0; g < groups.length; g++) {
      for (var b = 0; b < groups[g][0]; b++) {
        var d = dataCw.slice(idx, idx + groups[g][1]); idx += groups[g][1];
        blocks.push({ data: d, ec: rsEncode(d, ecLen) });
      }
    }
    var maxD = 0;
    blocks.forEach(function (bl) { maxD = Math.max(maxD, bl.data.length); });
    var out = [];
    for (var i = 0; i < maxD; i++) blocks.forEach(function (bl) { if (i < bl.data.length) out.push(bl.data[i]); });
    for (var e = 0; e < ecLen; e++) blocks.forEach(function (bl) { out.push(bl.ec[e]); });
    return out;
  }

  /* --- BCH usado nos campos de formato (15,5) e versão (18,6) --- */
  function formatBits(eccFormat, mask) {
    var data = (eccFormat << 3) | mask, rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }
  function versionBits(version) {
    var rem = version;
    for (var i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    return (version << 12) | rem;
  }

  function maskCondition(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      case 7: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
    return false;
  }

  function buildMatrix(version, codewords, mask) {
    var size = version * 4 + 17, x, y, i, j;
    var m = [], fn = [];
    for (i = 0; i < size; i++) { m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, v) { if (x >= 0 && x < size && y >= 0 && y < size) { m[y][x] = v; fn[y][x] = true; } }

    /* Padrões localizadores (finder) + separadores */
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (p) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        setF(p[0] + dx, p[1] + dy, d === 0 || d === 1 || d === 3);
      }
    });

    /* Padrões de sincronismo */
    for (i = 8; i < size - 8; i++) { setF(i, 6, i % 2 === 0); setF(6, i, i % 2 === 0); }

    /* Padrões de alinhamento */
    var al = ALIGN[version];
    for (var ay = 0; ay < al.length; ay++) for (var ax = 0; ax < al.length; ax++) {
      var cx = al[ax], cy = al[ay];
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        setF(cx + dx2, cy + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
    }

    /* Campo de formato (reservado) — cópia 1 */
    var fmt = formatBits(0, mask); // nível M => 00
    for (i = 0; i <= 5; i++) setF(8, i, ((fmt >>> i) & 1) !== 0);
    setF(8, 7, ((fmt >>> 6) & 1) !== 0);
    setF(8, 8, ((fmt >>> 7) & 1) !== 0);
    setF(7, 8, ((fmt >>> 8) & 1) !== 0);
    for (i = 9; i < 15; i++) setF(14 - i, 8, ((fmt >>> i) & 1) !== 0);
    /* Cópia 2 + módulo escuro */
    for (i = 0; i < 8; i++) setF(size - 1 - i, 8, ((fmt >>> i) & 1) !== 0);
    for (i = 8; i < 15; i++) setF(8, size - 15 + i, ((fmt >>> i) & 1) !== 0);
    setF(8, size - 8, true);

    /* Informação de versão (v >= 7) */
    if (version >= 7) {
      var vb = versionBits(version);
      for (i = 0; i < 18; i++) {
        var bit = ((vb >>> i) & 1) !== 0;
        var a = size - 11 + (i % 3), b = Math.floor(i / 3);
        setF(a, b, bit); setF(b, a, bit);
      }
    }

    /* Posicionamento dos dados em ziguezague (direita -> esquerda) */
    var bitIdx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          x = right - j;
          var upward = ((right + 1) & 2) === 0;
          y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && bitIdx < codewords.length * 8) {
            m[y][x] = ((codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
        }
      }
    }

    /* Aplicação da máscara */
    var out = [];
    for (y = 0; y < size; y++) {
      out.push(new Array(size));
      for (x = 0; x < size; x++) {
        out[y][x] = fn[y][x] ? m[y][x] : (m[y][x] !== maskCondition(mask, x, y));
      }
    }
    return { modules: out, isFunction: fn, size: size };
  }

  /* Penalidade simplificada (regras 1-4 do padrão) para escolha da máscara */
  function penalty(mod, size) {
    var score = 0, x, y, i;
    function runs(line) {
      var s = 0, run = 1;
      for (var k = 1; k < line.length; k++) {
        if (line[k] === line[k - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s += 1; }
        else run = 1;
      }
      return s;
    }
    for (y = 0; y < size; y++) score += runs(mod[y]);
    for (x = 0; x < size; x++) { var col = []; for (y = 0; y < size; y++) col.push(mod[y][x]); score += runs(col); }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var v = mod[y][x];
      if (v === mod[y][x + 1] && v === mod[y + 1][x] && v === mod[y + 1][x + 1]) score += 3;
    }
    var pat = [true, false, true, true, true, false, true, false, false, false, false];
    var patInv = [false, false, false, false, true, false, true, true, true, false, true];
    function matches(get, len) {
      var s = 0;
      for (var st = 0; st + 11 <= len; st++) {
        var ok1 = true, ok2 = true;
        for (i = 0; i < 11; i++) { if (get(st + i) !== pat[i]) ok1 = false; if (get(st + i) !== patInv[i]) ok2 = false; }
        if (ok1) s += 40; if (ok2) s += 40;
      }
      return s;
    }
    for (y = 0; y < size; y++) score += matches((function (yy) { return function (k) { return mod[yy][k]; }; })(y), size);
    for (x = 0; x < size; x++) score += matches((function (xx) { return function (k) { return mod[k][xx]; }; })(x), size);
    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mod[y][x]) dark++;
    var pct = dark * 100 / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /* API principal: retorna matriz booleana do QR para um texto */
  function generate(text) {
    var version = pickVersion(utf8(text).length);
    var cw = interleave(toCodewords(text, version), version);
    var best = null;
    for (var mask = 0; mask < 8; mask++) {
      var built = buildMatrix(version, cw, mask);
      var p = penalty(built.modules, built.size);
      if (!best || p < best.penalty) best = { penalty: p, mask: mask, data: built };
    }
    return { version: version, mask: best.mask, size: best.data.size, modules: best.data.modules, penalty: best.penalty };
  }

  /* Renderiza como string SVG (usada no selo de rastreio) */
  function toSVG(text, opts) {
    opts = opts || {};
    var border = opts.border === undefined ? 3 : opts.border;
    var qr = generate(text);
    var dim = qr.size + border * 2;
    var path = '';
    for (var y = 0; y < qr.size; y++) {
      for (var x = 0; x < qr.size; x++) {
        if (qr.modules[y][x]) path += 'M' + (x + border) + ',' + (y + border) + 'h1v1h-1z';
      }
    }
    var dark = opts.dark || '#0f2417', light = opts.light || '#ffffff';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges" role="img" aria-label="QR Code de rastreio">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="' + light + '"/><path d="' + path + '" fill="' + dark + '"/></svg>';
  }

  global.QRCode = { generate: generate, toSVG: toSVG, pickVersion: pickVersion, maxLength: maxLength, _capacity: dataCapacityBytes };
})(typeof window !== 'undefined' ? window : globalThis);
