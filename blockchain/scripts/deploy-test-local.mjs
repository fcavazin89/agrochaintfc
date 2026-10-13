import hardhat from 'hardhat';
import fs from 'fs';
import path from 'path';

const { ethers } = hardhat;

async function main() {
  console.log('🚀 Deploying CertificacaoTest to local Hardhat network...\n');

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying from: ${deployer.address}\n`);

  // Deploy CertificacaoTest
  const CertificacaoTest = await ethers.getContractFactory('CertificacaoTest');
  const contract = await CertificacaoTest.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ CertificacaoTest deployed to: ${contractAddress}\n`);

  // Save deployment info
  const deploymentInfo = {
    network: 'hardhat',
    chainId: (await ethers.provider.getNetwork()).chainId,
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    abi: [
      {
        name: 'emitirCertificado',
        type: 'function',
        inputs: [
          { name: 'batchId', type: 'bytes32' },
          { name: 'weight', type: 'uint256' },
          { name: 'tipoProto', type: 'string' }
        ],
        outputs: [{ name: '', type: 'bool' }]
      }
    ]
  };

  const deploymentPath = path.join(process.cwd(), 'blockchain', 'deployment-local.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);

  // Output for copy-paste to DApp
  console.log('📋 Copy this address to /certificacao page:');
  console.log(`   ${contractAddress}\n`);

  console.log('🔧 Instructions for testing:');
  console.log('   1. Start DApp: npm run dev (in dapp/)');
  console.log('   2. Open http://localhost:3000/certificacao');
  console.log('   3. Click "Configurar Endereço do Contrato"');
  console.log(`   4. Paste: ${contractAddress}`);
  console.log('   5. Fill form and submit → MetaMask dialog should appear\n');
}

main().catch(error => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});
