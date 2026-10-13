# Testing /certificacao MetaMask Integration

## Quick Start

### Step 1: Deploy Test Contract (Already Done ✅)

The test contract is deployed to local Hardhat:
```
Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Network: Hardhat (local)
```

### Step 2: Configure MetaMask for Local Network

1. Open MetaMask
2. Click **Settings** → **Networks** → **Add network**
3. Fill in:
   - Network name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
4. Click **Save**

### Step 3: Get Test ETH

The Hardhat network has pre-funded accounts. MetaMask by default uses:
```
Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Balance: 10,000 ETH (auto-funded by Hardhat)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6f58f1e62b12abeab0d
```

**To import account into MetaMask:**
1. Open MetaMask → **My Accounts** → **Import Account**
2. Choose **Private Key**
3. Paste: `ac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6f58f1e62b12abeab0d`
4. Click **Import**

### Step 4: Test the Flow

1. **Start DApp**: `npm run dev` (in `/dapp`)
   - Opens http://localhost:3000

2. **Navigate to Certificação Page**: http://localhost:3000/certificacao

3. **Connect MetaMask**:
   - Click MetaMask icon in top-right
   - Ensure you're on **Hardhat Local** network
   - Connect account with ETH

4. **Configure Contract Address**:
   - Click button: **⚠️ Configurar Endereço do Contrato**
   - Paste: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
   - Click OK

5. **Fill Certificate Form**:
   - Batch ID: `BATCH-001`
   - Type: `Coffee`
   - Variety: `Arabica`
   - Weight (kg): `100`
   - Origin: `Colombia`

6. **Submit Certificate**:
   - Click **🎯 Emitir Certificado**
   - MetaMask dialog should appear **immediately** (Step 3: Active)
   - Click **Confirm** in MetaMask
   - Transaction should execute
   - Step 4 should complete with ✅

## What to Verify

### Success Indicators ✅
- [ ] MetaMask **Connect** dialog appears when clicking contract address
- [ ] MetaMask **Confirmation** dialog appears when submitting form
- [ ] Transaction hash appears in Step 3 (starts with `0x`)
- [ ] All 4 steps complete with ✅ status
- [ ] "Certificado emitido com sucesso!" message appears

### If MetaMask Dialog Doesn't Appear ❌
1. Check browser console (F12 → Console tab):
   - Look for error messages
   - Check if `window.ethereum` is available
   
2. Verify MetaMask is:
   - Installed and enabled
   - Connected to **Hardhat Local** network
   - Has the test account unlocked

3. Verify contract address:
   - Starts with `0x`
   - Is exactly 42 characters
   - Matches: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Contract Interface

The test contract supports:

```solidity
function emitirCertificado(
  bytes32 batchId,
  uint256 weight,
  string memory tipoProto
) external returns (bool)

event CertificadoEmitido(
  bytes32 indexed batchId,
  address indexed farmer,
  uint256 weight,
  string tipoProto
)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Configure valid contract address" | Paste full address with `0x` prefix, ensure 42 chars |
| MetaMask not showing | Check console for errors, refresh page, reconnect wallet |
| "Connect to Sepolia" warning | Change MetaMask to **Hardhat Local** network |
| Transaction "stuck" | Check MetaMask for pending TX, click Cancel and retry |
| Gas estimation failed | Ensure MetaMask is on **Hardhat Local** chain |

## Next Steps After Testing

1. ✅ Verify MetaMask integration works end-to-end
2. Deploy test contract to **Sepolia testnet** (requires Sepolia ETH)
3. Update contract address in DApp localStorage
4. Test on real testnet
5. Deploy CoffeeCacaoTraceability contract to production

## Files Modified

- `blockchain/contracts/CertificacaoTest.sol` — Test contract
- `blockchain/tests/deploy-and-print.test.js` — Deployment test
- `blockchain/deployment-local.json` — Deployment info (auto-generated)
- `dapp/src/app/certificacao/page.tsx` — Already fixed with validation ✅
