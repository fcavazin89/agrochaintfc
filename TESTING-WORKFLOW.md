# AgroChain Testing Workflow

## Current Status

✅ **Complete:**
- All 6 CafeSwap DEX contracts (144 passing tests)
- DApp running on localhost:3000 with 22 routes
- MetaMask integration setup in `/certificacao` page
- Test contract deployed locally: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract address validation and localStorage persistence

❌ **Blocked Until Tested:**
- MetaMask transaction flow end-to-end
- DEX API endpoints (need contract ABIs)
- ZK proof generation (currently mock Poseidon)
- ERP module data (currently stubs)

---

## Testing Phase 1: MetaMask Integration (LOCAL)

### Prerequisites

1. **MetaMask Browser Extension** installed and enabled
2. **Hardhat local network** configured in MetaMask:
   - Name: `Hardhat Local`
   - RPC: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`

3. **Test account imported** (optional but recommended):
   - Private Key: `ac0974bec39a17e36ba4a6b4d238ff944bacb476c6b8d6f58f1e62b12abeab0d`
   - Pre-funded with 10,000 ETH

### Test Script: Verify MetaMask Connection

```bash
# Terminal 1: Start DApp
cd dapp
npm run dev
# Wait for "Ready in X.Xs"
```

Then open browser to: **http://localhost:3000/certificacao**

### Test Case 1: Contract Address Configuration

**Steps:**
1. Click button: **"⚠️ Configurar Endereço do Contrato"**
2. Paste: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
3. Confirm with OK

**Expected Result:**
- Green banner appears: "✅ Contrato: 0x5FbDB..."
- Button changes to "Mudar"
- No error message

**If Failed:**
- Check browser console (F12 → Console)
- Verify address starts with `0x` and is 42 characters

---

### Test Case 2: MetaMask Wallet Connection

**Steps:**
1. Click **MetaMask icon** in top-right of page
2. Select account
3. Click **Connect**

**Expected Result:**
- MetaMask popup appears
- User selects account
- Returns to page with account address displayed
- Network warning changes to green checkmark (if on Hardhat Local)

**If Failed:**
- Verify MetaMask is unlocked
- Verify browser has MetaMask extension enabled
- Check if `window.ethereum` exists (console: `window.ethereum`)

---

### Test Case 3: Certificate Submission Form

**Steps:**
1. Fill form:
   - Batch ID: `BATCH-TEST-001`
   - Type: `Coffee` (or `Cacao`)
   - Variety: `Arabica`
   - Weight (kg): `50`
   - Origin: `Brazil`

2. Click button: **"🎯 Emitir Certificado"**

**Expected Result:**
- Step indicators update:
  - ✅ 1. Validar carteira (DONE)
  - ⚙️ 2. Gerar ZK proof (ACTIVE) → (DONE)
  - ⚙️ 3. Submeter on-chain (ACTIVE)
  - **MetaMask dialog appears here** ← Key moment!
  - ⚙️ 4. Confirmação

- Click **Confirm** in MetaMask dialog
- TX hash appears in page (starts with `0x`)
- Step 3 marks DONE
- Step 4 marks DONE
- Green success message: "✅ Certificado emitido com sucesso!"

**If MetaMask Dialog Doesn't Appear:**

Check console for error. Look for:
- `TypeError: window.ethereum is undefined` → MetaMask not detected
- `Transação cancelada no MetaMask` → User clicked Cancel
- `Cannot read properties of undefined` → Contract address not set properly

Common fixes:
1. Refresh page
2. Verify contract address is set
3. Verify MetaMask is on Hardhat Local network
4. Verify MetaMask account is connected
5. Close and reopen MetaMask
6. Restart browser

---

### Test Case 4: Error Handling

**Scenario A: Missing Contract Address**
1. Don't configure contract address
2. Try to submit form
3. **Expected:** Red error "Configure um endereço de contrato válido"

**Scenario B: No MetaMask**
1. Close MetaMask extension
2. Try to submit form
3. **Expected:** Red error "MetaMask não encontrado"

**Scenario C: Wrong Network**
1. Change MetaMask to Ethereum Mainnet
2. Try to submit form
3. **Expected:** Yellow warning "Por favor, mude para a rede Sepolia no MetaMask"
   - (Note: For local testing, should say "Hardhat Local")

**Scenario D: Missing Fields**
1. Leave Weight or Origin empty
2. Click submit
3. **Expected:** Red error "Preencha todos os campos"

---

## Testing Phase 2: Verify Transaction on Blockchain

### After successful MetaMask submission:

**Get TX Hash from page**, e.g.: `0xabc123...`

**Check transaction status:**

```bash
# In browser console:
await window.ethereum.request({
  method: 'eth_getTransactionReceipt',
  params: ['0xabc123...']
})
```

**Expected:** Transaction receipt with:
- `status: 1` (success)
- `blockNumber: <number>`
- `from: <your-address>`
- `to: 0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `gasUsed: <amount>`

---

## Testing Phase 3: Contract Event Verification

**Verify that event was emitted:**

```bash
# In Node.js or hardhat console
const CertificacaoTest = await ethers.getContractFactory('CertificacaoTest');
const contract = CertificacaoTest.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3');

// Get events
const events = await contract.queryFilter('CertificadoEmitido');
console.log(events); // Should show your submitted certificate
```

---

## Test Results Template

```markdown
# Test Run: [DATE]

## MetaMask Connection
- [ ] Wallet connects
- [ ] Account displays
- [ ] Network shows correctly

## Certificate Submission
- [ ] Form validates all fields
- [ ] MetaMask dialog appears on submit
- [ ] TX hash generated
- [ ] All steps complete (1-4)

## Transaction Verification
- [ ] TX receipt status = 1 (success)
- [ ] Event emitted on contract
- [ ] Data matches form input

## Error Handling
- [ ] Missing contract address blocked
- [ ] Missing fields blocked
- [ ] Wrong network detected
- [ ] MetaMask not found handled

## Notes
- [Any issues, observations]
- [Time taken]
- [Browser version]
```

---

## Next Steps After Testing

### If Successful ✅
1. Document test results
2. Move to Sepolia testnet deployment
3. Integrate real CoffeeCacaoTraceability contract
4. Test with farmer data

### If Failed ❌
1. Check console errors (F12 → Console tab)
2. Verify all prerequisites installed
3. Run `git status` to check file changes
4. Check `.agents/tasks/platform-unification/` for review findings
5. Contact support with:
   - Browser console errors
   - MetaMask version
   - Network configuration
   - Steps to reproduce

---

## File Locations

- **Test Contract:** `blockchain/contracts/CertificacaoTest.sol`
- **Deployment Info:** `blockchain/deployment-local.json`
- **DApp Page:** `dapp/src/app/certificacao/page.tsx`
- **Test Guide:** `TEST-CERTIFICACAO.md`
- **Workflow Info:** `.agents/tasks/platform-unification/`

---

## Commands Reference

```bash
# Start DApp (Terminal 1)
cd dapp && npm run dev

# Compile contracts (if modified)
npm run blockchain:compile

# Deploy test contract (regenerate address if needed)
npx hardhat test blockchain/tests/deploy-and-print.test.js --network hardhatMainnet

# Run all DEX tests
npm run test:cafeswap

# Check running processes
Get-Process node
```

---

## Support

For detailed Hardhat network issues, see Hardhat docs:
https://hardhat.org/hardhat-network/docs/overview

For MetaMask integration issues, see:
https://docs.metamask.io/guide/getting-started.html
