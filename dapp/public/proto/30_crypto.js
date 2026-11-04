/* =========================================================================
 * AGROCHAIN · MÓDULO CRIPTOGRÁFICO
 * SHA-256 puro em JavaScript (sem dependências externas) + utilitários de
 * hash encadeado usados pelo ledger blockchain do protótipo.
 * ========================================================================= */
(function (global) {
  'use strict';

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function utf8Bytes(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) { out.push(c); }
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0xd800 || c >= 0xe000) { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else {
        i++;
        var cp = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      }
    }
    return out;
  }

  function sha256(message) {
    var bytes = (message instanceof Uint8Array) ? Array.prototype.slice.call(message) : utf8Bytes(String(message));
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    // Campo de comprimento: 64 bits big-endian (4 bytes altos + 4 bytes baixos)
    bytes.push(0, 0, 0, 0,
               (bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

    var w = new Array(64), i, j, a, b, c, d, e, f, g, h, t1, t2, s0, s1, ch, maj;
    for (i = 0; i < bytes.length; i += 64) {
      for (j = 0; j < 16; j++) {
        w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) | (bytes[i + j * 4 + 2] << 8) | bytes[i + j * 4 + 3];
      }
      for (j = 16; j < 64; j++) {
        s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; h = H[7];
      for (j = 0; j < 64; j++) {
        s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        ch = (e & f) ^ (~e & g);
        t1 = (h + s1 + ch + K[j] + w[j]) | 0;
        s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        maj = (a & b) ^ (a & c) ^ (b & c);
        t2 = (s0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var hex = '';
    for (i = 0; i < 8; i++) hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
    return hex;
  }

  /* Hash canônico de um registro: serializa o payload em JSON determinístico
     (chaves ordenadas) e aplica SHA-256. É esse valor que vai para o "bloco". */
  function canonical(obj) {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(canonical).join(',') + ']';
    var keys = Object.keys(obj).sort();
    return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + canonical(obj[k]); }).join(',') + '}';
  }

  function hashRecord(obj) { return sha256(canonical(obj)); }

  /* Hash do bloco: encadeia índice + timestamp + merkle + hash anterior */
  function hashBlock(index, timestamp, merkleRoot, previousHash, nonce) {
    return sha256(index + '|' + timestamp + '|' + merkleRoot + '|' + previousHash + '|' + nonce);
  }

  /* Merkle root de uma lista de hashes (árvore binária completa) */
  function merkleRoot(hashes) {
    if (!hashes.length) return sha256('');
    var level = hashes.slice();
    while (level.length > 1) {
      var next = [];
      for (var i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) next.push(sha256(level[i] + level[i + 1]));
        else next.push(sha256(level[i] + level[i]));
      }
      level = next;
    }
    return level[0];
  }

  /* Prova de trabalho didática: encontra nonce tal que o hash comece com
     `zeros` dígitos hexadecimais zero. Usada só para demonstrar o conceito. */
  function proofOfWork(index, timestamp, merkle, prevHash, zeros) {
    var prefix = new Array((zeros || 3) + 1).join('0');
    var nonce = 0, h = '';
    while (true) {
      h = hashBlock(index, timestamp, merkle, prevHash, nonce);
      if (h.indexOf(prefix) === 0) return { nonce: nonce, hash: h, tentativas: nonce + 1 };
      nonce++;
      if (nonce > 4000000) return { nonce: nonce, hash: h, tentativas: nonce };
    }
  }

  function shortHash(h, n) { n = n || 10; return h.slice(0, n) + '…' + h.slice(-6); }

  global.Cripto = {
    sha256: sha256,
    canonical: canonical,
    hashRecord: hashRecord,
    hashBlock: hashBlock,
    merkleRoot: merkleRoot,
    proofOfWork: proofOfWork,
    shortHash: shortHash
  };
})(typeof window !== 'undefined' ? window : globalThis);
