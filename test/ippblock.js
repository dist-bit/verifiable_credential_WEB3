const IPPBlockVC = artifacts.require("IPPBlockVC");
const NebuVC = artifacts.require('NebuVC');
const { ethers, utils } = require("ethers");

//truffle test --show-events
const IPType = {
  Patent: 0,
  Trademark: 1,
  Copyright: 2,
  TradeSecret: 3,
  IndustrialDesign: 4
};

const IPStatus = {
  Active: 0,
  Expired: 1,
  Transferred: 2,
  Revoked: 3,
  Pending: 4
};

contract('IPPBlockVC', (accounts) => {
  const domain = {
    name: 'IPPBlock Intellectual Property',
    version: '1',
    chainId: 1, // Update based on your network
    verifyingContract: '0x0000000000000000000000000000000000000000' // Will be updated with actual address
  };

  const types = {
    TransferRequest: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'requestDate', type: 'uint256' },
      { name: 'approved', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    IntellectualProperty: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'ipType', type: 'uint8' },
      { name: 'owner', type: 'address' },
      { name: 'previousOwners', type: 'address[]' },
      { name: 'country', type: 'string' },
      { name: 'registrationDate', type: 'uint256' },
      { name: 'expirationDate', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'registrationNumber', type: 'string' },
      { name: 'categories', type: 'string[]' },
      { name: 'certifyingEntity', type: 'string' },
      { name: 'transferRequest', type: 'TransferRequest' },
      { name: 'documentHash', type: 'string' },
    ]
  };

  it('Test IntellectualProperty signature and credential creation', async () => {
    const _credential = await IPPBlockVC.deployed();
    const _vc = await NebuVC.deployed();
    
    // Update domain with actual contract address
    domain.verifyingContract = _credential.address;
    
    const signer = new ethers.Wallet('0xe27f7317faf6dd425ca5fe16e150bbcb39bde022445758a004f13e28a29e1012'); // deployer
    console.log('IPPBlockVC Address:', _credential.address);
    console.log('NebuVC Address:', _vc.address);

    const now = Math.floor(Date.now() / 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60);

    const value = {
      id: 'IP-2024-001',
      title: 'Innovative Blockchain Authentication System',
      description: 'A novel method for decentralized identity verification using blockchain technology and zero-knowledge proofs',
      ipType: IPType.Patent,
      owner: signer.address,
      previousOwners: [],
      country: 'Mexico',
      registrationDate: now,
      expirationDate: oneYearFromNow,
      status: IPStatus.Active,
      registrationNumber: 'MX-PAT-2024-001234',
      categories: ['Blockchain', 'Security', 'Authentication'],
      certifyingEntity: 'IPPBlock',
      transferRequest: {
        from: '0x0000000000000000000000000000000000000000',
        to: '0x0000000000000000000000000000000000000000',
        requestDate: 0,
        approved: false,
        reason: ''
      },
      documentHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    };

    console.log('Version:', await _credential.viewVersion());

    const signature = await signer._signTypedData(domain, types, value);
    const encode = await _credential.serializeIP(value);
    
    // Test deserialization
    const decoded = await _credential.deserializeIP(encode);
    console.log('Decoded IP:', decoded);

    // Test signature recovery
    let owner = await _credential.recoverSigner(value, signature);
    assert.equal(owner, signer.address, "invalid signature");

    // Create verifiable credential
    const tx = await _vc.createVC(
      _credential.address,
      signer.address,
      encode,
      signature,
      oneYearFromNow, // expiration
    );

    console.log('Gas create VC: ', tx.receipt.gasUsed);

    // Get credentials from user
    const credentials = await _vc.getVCFromUser({ from: signer.address });
    assert.equal(credentials.length, 1, "credential not saved");

    // Verify credential by owner
    let valid = await _vc.verifyByOwner(0, { from: signer.address });
    assert.equal(valid, true, "invalid credential validation by user");

    // Test IP expiration check
    const isExpired = await _credential.isExpired(value);
    assert.equal(isExpired, false, "IP should not be expired");

    // Test remaining validity
    const remainingTime = await _credential.getRemainingValidity(value);
    console.log('Remaining validity (seconds):', remainingTime.toString());
    assert(remainingTime > 0, "Should have remaining validity time");
  });

  it('Test IntellectualProperty transfer request', async () => {
    const _credential = await IPPBlockVC.deployed();
    const _vc = await NebuVC.deployed();
    
    const owner = new ethers.Wallet('0xe27f7317faf6dd425ca5fe16e150bbcb39bde022445758a004f13e28a29e1012');
    const newOwner = new ethers.Wallet('0x7bc2ec8c8b65b15ad8ece66548e5aa63fce23fbe54219ca9ee4e96c039ce4edb');
    
    const now = Math.floor(Date.now() / 1000);
    const twoYearsFromNow = now + (2 * 365 * 24 * 60 * 60);

    const valueWithTransfer = {
      id: 'IP-2024-002',
      title: 'Smart Contract for Supply Chain Management',
      description: 'An innovative smart contract system for tracking and verifying products in supply chains',
      ipType: IPType.Copyright,
      owner: owner.address,
      previousOwners: [],
      country: 'United States',
      registrationDate: now,
      expirationDate: twoYearsFromNow,
      status: IPStatus.Active,
      registrationNumber: 'US-CR-2024-005678',
      categories: ['Smart Contracts', 'Supply Chain', 'Blockchain'],
      certifyingEntity: 'IPPBlock',
      transferRequest: {
        from: owner.address,
        to: newOwner.address,
        requestDate: now,
        approved: false,
        reason: 'Sale of intellectual property rights'
      },
      documentHash: 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB'
    };

    // Update domain with contract address
    domain.verifyingContract = _credential.address;

    const signature = await owner._signTypedData(domain, types, valueWithTransfer);
    const encode = await _credential.serializeIP(valueWithTransfer);

    // Create credential with transfer request
    const tx = await _vc.createVC(
      _credential.address,
      owner.address,
      encode,
      signature,
      twoYearsFromNow,
    );

    console.log('Gas create VC with transfer: ', tx.receipt.gasUsed);

    // Request transfer
    const transferTx = await _credential.requestTransfer(
      'IP-2024-002',
      owner.address,
      newOwner.address,
      'Sale of intellectual property rights',
      { from: accounts[0] } // Using accounts[0] as owner would need to be a real account
    );

    console.log('Transfer requested');

    // Check pending transfer
    const isPending = await _credential.pendingTransfers('IP-2024-002');
    assert.equal(isPending, true, "Transfer should be pending");
  });

  it('Test multiple IP types', async () => {
    const _credential = await IPPBlockVC.deployed();
    const signer = new ethers.Wallet('0xe27f7317faf6dd425ca5fe16e150bbcb39bde022445758a004f13e28a29e1012');
    
    const now = Math.floor(Date.now() / 1000);
    const fiveYearsFromNow = now + (5 * 365 * 24 * 60 * 60);

    // Test Trademark
    const trademark = {
      id: 'IP-2024-003',
      title: 'IPPBlock Logo and Brand',
      description: 'Official trademark for IPPBlock intellectual property management system',
      ipType: IPType.Trademark,
      owner: signer.address,
      previousOwners: [],
      country: 'European Union',
      registrationDate: now,
      expirationDate: fiveYearsFromNow,
      status: IPStatus.Active,
      registrationNumber: 'EU-TM-2024-009012',
      categories: ['Technology', 'Blockchain Services', 'IP Management'],
      certifyingEntity: 'IPPBlock',
      transferRequest: {
        from: '0x0000000000000000000000000000000000000000',
        to: '0x0000000000000000000000000000000000000000',
        requestDate: 0,
        approved: false,
        reason: ''
      },
      documentHash: 'QmTrademark123456789'
    };

    const encode = await _credential.serializeIP(trademark);
    const decoded = await _credential.deserializeIP(encode);
    
    assert.equal(decoded.ipType, IPType.Trademark, "Should be trademark type");
    assert.equal(decoded.title, trademark.title, "Title should match");
    assert.equal(decoded.country, trademark.country, "Country should match");
  });
});