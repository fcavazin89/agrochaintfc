const snarkjs = require('./snarkjs_pkg/main.js');
const { getCurveFromName } = require('./snarkjs_pkg/node_modules/ffjavascript');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'blockchain', 'circuits');
const R1CS       = path.join(DIR, 'agrochain-score-threshold.r1cs');
const PTAU_NEW   = path.join(DIR, 'pot12_new.ptau');
const PTAU_CON   = path.join(DIR, 'pot12_contrib.ptau');
const PTAU_FINAL = path.join(DIR, 'pot12_final.ptau');
const ZKEY_0     = path.join(DIR, 'agrochain-score-threshold_0.zkey');
const ZKEY_FINAL = path.join(DIR, 'agrochain-score-threshold_final.zkey');
const VK_PATH    = path.join(DIR, 'verification_key.json');

async function run() {
  const logger = { debug: ()=>{}, info: m => process.stdout.write(m+'\n'), warn: m => process.stdout.write('WARN: '+m+'\n'), error: m => process.stdout.write('ERR: '+m+'\n') };

  console.log('[1/5] Obtendo curva BN128...');
  const curve = await getCurveFromName('bn128');

  console.log('[2/5] Gerando Powers of Tau (pot12)...');
  await snarkjs.powersOfTau.newAccumulator(curve, 12, PTAU_NEW, logger);
  console.log('      pot12_new.ptau: ' + (fs.statSync(PTAU_NEW).size/1024).toFixed(1) + ' KB');

  console.log('[3/5] Contribuindo à cerimônia ptau...');
  await snarkjs.powersOfTau.contribute(PTAU_NEW, PTAU_CON, 'AgroChain', '0xAgroChainRandom1234567890abcdef', logger);

  console.log('[4/5] Preparando fase 2...');
  await snarkjs.powersOfTau.preparePhase2(PTAU_CON, PTAU_FINAL, logger);
  console.log('      pot12_final.ptau: ' + (fs.statSync(PTAU_FINAL).size/1024).toFixed(1) + ' KB');

  console.log('[5a/5] Gerando zkey inicial...');
  await snarkjs.zKey.newZKey(R1CS, PTAU_FINAL, ZKEY_0, logger);
  console.log('      zkey_0: ' + (fs.statSync(ZKEY_0).size/1024).toFixed(1) + ' KB');

  console.log('[5b/5] Contribuindo ao zkey...');
  await snarkjs.zKey.contribute(ZKEY_0, ZKEY_FINAL, 'AgroChain ZKey', '0xAgroChainZK9876543210abcdef1234', logger);
  console.log('      zkey_final: ' + (fs.statSync(ZKEY_FINAL).size/1024).toFixed(1) + ' KB');

  console.log('[5c/5] Exportando verification key...');
  const vk = await snarkjs.zKey.exportVerificationKey(ZKEY_FINAL, logger);
  fs.writeFileSync(VK_PATH, JSON.stringify(vk, null, 2));

  curve.terminate();

  console.log('');
  console.log('=== ✅ Setup ZK Completo! ===');
  console.log('📁 ' + ZKEY_FINAL);
  console.log('🔑 ' + VK_PATH);
}

run().catch(e => { console.error('❌ ERRO:', e); process.exit(1); });
