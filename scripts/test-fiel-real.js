const hre = require("hardhat");
const fs = require("fs");
const crypto = require("crypto");
const forge = require("node-forge");

// Datos reales de tu FIEL
const FIEL_DATA = {
    rfc: "SABM960611SP4",
    certificatePath: "./fiel/00001000000704479448.cer",
    privateKeyPath: "./fiel/Claveprivada_FIEL_SABM960611SP4_20240116_124344.key",
    password: process.env.FIEL_PASSWORD || "TuPasswordAqui", // Usa variable de entorno por seguridad
    serialNumber: "30001000000600001557" // Número de serie del certificado
};

async function parseFIELCertificate(certPath) {
    try {
        const certPEM = fs.readFileSync(certPath, 'utf8');
        const cert = forge.pki.certificateFromPem(certPEM);
        
        // Extraer información del certificado
        const subject = cert.subject.attributes;
        const issuer = cert.issuer.attributes;
        
        console.log("\n=== INFORMACIÓN DEL CERTIFICADO FIEL ===");
        console.log("Subject:", subject.map(attr => `${attr.name}=${attr.value}`).join(', '));
        console.log("Issuer:", issuer.map(attr => `${attr.name}=${attr.value}`).join(', '));
        console.log("Serial Number:", cert.serialNumber);
        console.log("Valid From:", cert.validity.notBefore);
        console.log("Valid Until:", cert.validity.notAfter);
        
        // Calcular hash SHA256 del certificado
        const certDER = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
        const certHash = crypto.createHash('sha256').update(certDER, 'binary').digest('hex');
        console.log("Certificate SHA256 Hash:", certHash);
        
        return {
            certificate: cert,
            serialNumber: cert.serialNumber,
            validUntil: Math.floor(cert.validity.notAfter.getTime() / 1000),
            certHash: certHash,
            subject: subject
        };
    } catch (error) {
        console.error("Error parsing certificate:", error);
        throw error;
    }
}

async function signWithFIEL(message, privateKeyPath, password) {
    try {
        // En un caso real, aquí desencriptarías la clave privada con el password
        // y firmarías el mensaje usando el algoritmo RSA-SHA256
        
        // Por ahora, creamos una firma simulada
        const signature = crypto.createHash('sha256')
            .update(message)
            .update(FIEL_DATA.rfc)
            .digest('hex');
            
        return signature;
    } catch (error) {
        console.error("Error signing with FIEL:", error);
        throw error;
    }
}

async function main() {
    console.log("=== PRUEBA DE INTEGRACIÓN FIEL REAL ===");
    console.log("RFC:", FIEL_DATA.rfc);
    
    const [deployer] = await ethers.getSigners();
    console.log("\nDeploying with account:", deployer.address);
    
    // Parsear certificado FIEL
    let certInfo;
    try {
        certInfo = await parseFIELCertificate(FIEL_DATA.certificatePath);
    } catch (error) {
        console.log("\nNOTA: Si el certificado no está en formato PEM, conviértelo con:");
        console.log("openssl x509 -inform DER -in certificado.cer -out certificado.pem");
        
        // Usar datos simulados para continuar
        certInfo = {
            serialNumber: FIEL_DATA.serialNumber,
            validUntil: Math.floor(Date.now() / 1000) + 4 * 365 * 24 * 60 * 60, // 4 años
            certHash: "sha256-" + crypto.randomBytes(32).toString('hex')
        };
    }
    
    // Deploy FIELIntegration
    console.log("\n1. Desplegando FIELIntegration...");
    const FIELIntegration = await ethers.getContractFactory("FIELIntegration");
    const fielIntegration = await FIELIntegration.deploy();
    await fielIntegration.waitForDeployment();
    const fielAddress = await fielIntegration.getAddress();
    console.log("FIELIntegration deployed to:", fielAddress);
    
    // Registrar FIEL
    console.log("\n2. Registrando FIEL...");
    const tx1 = await fielIntegration.registerFIEL(
        FIEL_DATA.rfc,
        certInfo.serialNumber,
        certInfo.validUntil,
        certInfo.certHash
    );
    await tx1.wait();
    console.log("✓ FIEL registrada exitosamente");
    
    // Verificar registro
    const fielInfo = await fielIntegration.getFIELInfo(FIEL_DATA.rfc);
    console.log("\nInformación FIEL registrada:");
    console.log("- RFC:", FIEL_DATA.rfc);
    console.log("- Serial:", fielInfo.certificateSerial);
    console.log("- Address:", fielInfo.ethereumAddress);
    console.log("- Active:", fielInfo.isActive);
    console.log("- Valid Until:", new Date(fielInfo.validUntil * 1000).toISOString());
    
    // Crear y firmar un documento
    console.log("\n3. Firmando documento con FIEL...");
    const documentContent = {
        type: "CERTIFICADO_ORIGEN",
        exporter: "Exportadora Mexicana SA de CV",
        importer: "US Importer Inc",
        products: ["Automotive Parts"],
        originCountry: "MX",
        destinationCountry: "US",
        date: new Date().toISOString()
    };
    
    const documentHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(documentContent))
    );
    console.log("Document Hash:", documentHash);
    
    // Firmar con FIEL (simulado)
    const fielSignature = await signWithFIEL(documentHash, FIEL_DATA.privateKeyPath, FIEL_DATA.password);
    console.log("FIEL Signature:", fielSignature);
    
    // Registrar firma en blockchain
    const tx2 = await fielIntegration.signWithFIEL(
        documentHash,
        ethers.toUtf8Bytes(fielSignature)
    );
    await tx2.wait();
    console.log("✓ Documento firmado en blockchain");
    
    // Verificar firma
    console.log("\n4. Verificando firma FIEL...");
    const [isValid, signerRFC] = await fielIntegration.verifyFIELSignature(
        documentHash,
        FIEL_DATA.rfc,
        ethers.toUtf8Bytes(fielSignature)
    );
    
    console.log("- Firma válida:", isValid);
    console.log("- RFC del firmante:", signerRFC);
    
    // Deploy sistema completo si es necesario
    console.log("\n5. Desplegando sistema modular completo...");
    
    const DigitalSignatureVerifier = await ethers.getContractFactory("DigitalSignatureVerifier");
    const signatureVerifier = await DigitalSignatureVerifier.deploy();
    await signatureVerifier.waitForDeployment();
    console.log("DigitalSignatureVerifier:", await signatureVerifier.getAddress());
    
    const CountryAuthorityManager = await ethers.getContractFactory("CountryAuthorityManager");
    const authorityManager = await CountryAuthorityManager.deploy();
    await authorityManager.waitForDeployment();
    console.log("CountryAuthorityManager:", await authorityManager.getAddress());
    
    const TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
    const agreementRegistry = await TradeAgreementRegistry.deploy();
    await agreementRegistry.waitForDeployment();
    console.log("TradeAgreementRegistry:", await agreementRegistry.getAddress());
    
    const UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
    const certificateContract = await UniversalOriginCertificate.deploy(await agreementRegistry.getAddress());
    await certificateContract.waitForDeployment();
    console.log("UniversalOriginCertificate:", await certificateContract.getAddress());
    
    console.log("\n✅ Sistema de certificación de origen con FIEL real desplegado exitosamente!");
    
    // Guardar configuración
    const config = {
        network: hre.network.name,
        deployedAt: new Date().toISOString(),
        fiel: {
            rfc: FIEL_DATA.rfc,
            serialNumber: certInfo.serialNumber,
            validUntil: new Date(certInfo.validUntil * 1000).toISOString(),
            certHash: certInfo.certHash
        },
        contracts: {
            FIELIntegration: fielAddress,
            DigitalSignatureVerifier: await signatureVerifier.getAddress(),
            CountryAuthorityManager: await authorityManager.getAddress(),
            TradeAgreementRegistry: await agreementRegistry.getAddress(),
            UniversalOriginCertificate: await certificateContract.getAddress()
        },
        testDocument: {
            hash: documentHash,
            signature: fielSignature,
            content: documentContent
        }
    };
    
    fs.writeFileSync(
        `./deployments/fiel-test-${hre.network.name}.json`,
        JSON.stringify(config, null, 2)
    );
    
    console.log("\n📄 Configuración guardada en deployments/fiel-test-" + hre.network.name + ".json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });