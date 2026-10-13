#!/usr/bin/env bash
set -euo pipefail

# Setup descartavel de UMA contribuidora, apenas para desenvolvimento e testes.
# Produção exige cerimônia multiparte auditada para o circuito final.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD="$ROOT/blockchain/build/zk"
CIRCUIT="$ROOT/blockchain/circuits/agrochain-score-threshold.circom"
mkdir -p "$BUILD"
rm -f \
  "$BUILD"/powersOfTau*.ptau \
  "$BUILD"/agrochain-score-threshold*.zkey \
  "$BUILD"/verification_key.json \
  "$ROOT/blockchain/contracts/AgroChainGroth16Verifier.sol"

npx circom2 "$CIRCUIT" \
  --r1cs --wasm --sym \
  -l "$ROOT/node_modules" \
  -o "$BUILD"

npx snarkjs powersoftau new bn128 12 "$BUILD/powersOfTau_0000.ptau"
npx snarkjs powersoftau contribute \
  "$BUILD/powersOfTau_0000.ptau" "$BUILD/powersOfTau_0001.ptau" \
  --name="AgroChain local development contribution" \
  -e="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
npx snarkjs powersoftau prepare phase2 \
  "$BUILD/powersOfTau_0001.ptau" "$BUILD/powersOfTau_final.ptau"
npx snarkjs groth16 setup \
  "$BUILD/agrochain-score-threshold.r1cs" \
  "$BUILD/powersOfTau_final.ptau" \
  "$BUILD/agrochain-score-threshold_0000.zkey"
npx snarkjs zkey contribute \
  "$BUILD/agrochain-score-threshold_0000.zkey" \
  "$BUILD/agrochain-score-threshold_final.zkey" \
  --name="AgroChain local development contribution" \
  -e="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
npx snarkjs zkey verify \
  "$BUILD/agrochain-score-threshold.r1cs" \
  "$BUILD/powersOfTau_final.ptau" \
  "$BUILD/agrochain-score-threshold_final.zkey"
npx snarkjs zkey export verificationkey \
  "$BUILD/agrochain-score-threshold_final.zkey" \
  "$BUILD/verification_key.json"
npx snarkjs zkey export solidityverifier \
  "$BUILD/agrochain-score-threshold_final.zkey" \
  "$ROOT/blockchain/contracts/AgroChainGroth16Verifier.sol"

echo "Setup de desenvolvimento concluído. Nunca use essas chaves em produção."
