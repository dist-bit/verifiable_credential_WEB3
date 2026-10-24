const fs = require('fs');
const forge = require('node-forge');
const crypto = require('crypto');

// Función para convertir certificado DER a PEM si es necesario
function convertDERtoPEM(derBuffer) {
    const b64 = derBuffer.toString('base64');
    const pem = '-----BEGIN CERTIFICATE-----\n' + 
                b64.match(/.{1,64}/g).join('\n') + 
                '\n-----END CERTIFICATE-----';
    return pem;
}

// Función para extraer RFC del Subject del certificado
function extractRFCFromSubject(subject) {
    // En certificados FIEL, el RFC suele estar en:
    // - serialNumber (OID 2.5.4.5)
    // - UniqueIdentifier 
    // - O parte del CN
    
    for (let attr of subject) {
        // Buscar en serialNumber
        if (attr.type === '2.5.4.5' || attr.name === 'serialNumber') {
            const value = attr.value;
            // El RFC tiene formato XXXX######XXX (13 caracteres)
            const rfcMatch = value.match(/[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}/);
            if (rfcMatch) {
                return rfcMatch[0];
            }
        }
        
        // Buscar en CN
        if (attr.shortName === 'CN' || attr.name === 'commonName') {
            const rfcMatch = attr.value.match(/[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}/);
            if (rfcMatch) {
                return rfcMatch[0];
            }
        }
        
        // Buscar en uniqueIdentifier (OID 2.5.4.45)
        if (attr.type === '2.5.4.45') {
            const rfcMatch = attr.value.match(/[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}/);
            if (rfcMatch) {
                return rfcMatch[0];
            }
        }
    }
    
    return null;
}

// Función principal para parsear certificado FIEL
async function parseFIELCertificate(certPath) {
    console.log("=== PARSEANDO CERTIFICADO FIEL ===");
    console.log("Archivo:", certPath);
    
    try {
        // Leer el archivo del certificado
        const certBuffer = fs.readFileSync(certPath);
        
        let cert;
        let certPEM;
        
        // Intentar parsear como PEM primero
        try {
            certPEM = certBuffer.toString('utf8');
            cert = forge.pki.certificateFromPem(certPEM);
            console.log("✓ Certificado en formato PEM");
        } catch (e) {
            // Si falla, probablemente es DER
            console.log("✓ Certificado en formato DER, convirtiendo a PEM...");
            certPEM = convertDERtoPEM(certBuffer);
            cert = forge.pki.certificateFromPem(certPEM);
        }
        
        // Extraer información del certificado
        const subject = cert.subject.attributes;
        const issuer = cert.issuer.attributes;
        
        console.log("\n📋 INFORMACIÓN DEL CERTIFICADO:");
        console.log("================================");
        
        // Subject
        console.log("\n👤 TITULAR (Subject):");
        subject.forEach(attr => {
            console.log(`  ${attr.name || attr.type}: ${attr.value}`);
        });
        
        // Extraer RFC
        const rfc = extractRFCFromSubject(subject);
        if (rfc) {
            console.log(`\n🆔 RFC DETECTADO: ${rfc}`);
        }
        
        // Issuer
        console.log("\n🏛️  EMISOR (Issuer):");
        issuer.forEach(attr => {
            console.log(`  ${attr.name || attr.type}: ${attr.value}`);
        });
        
        // Número de serie
        console.log("\n🔢 NÚMERO DE SERIE:");
        console.log(`  Hex: ${cert.serialNumber}`);
        console.log(`  Decimal: ${parseInt(cert.serialNumber, 16)}`);
        
        // Validez
        console.log("\n📅 VALIDEZ:");
        console.log(`  Válido desde: ${cert.validity.notBefore.toISOString()}`);
        console.log(`  Válido hasta: ${cert.validity.notAfter.toISOString()}`);
        console.log(`  Timestamp Unix: ${Math.floor(cert.validity.notAfter.getTime() / 1000)}`);
        
        const now = new Date();
        const daysRemaining = Math.floor((cert.validity.notAfter - now) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0) {
            console.log(`  ✅ Certificado válido (quedan ${daysRemaining} días)`);
        } else {
            console.log(`  ❌ Certificado expirado hace ${Math.abs(daysRemaining)} días`);
        }
        
        // Algoritmo de firma
        console.log("\n🔐 ALGORITMO:");
        console.log(`  Firma: ${cert.signatureOid} (${forge.pki.oids[cert.signatureOid] || 'Unknown'})`);
        console.log(`  Clave pública: ${cert.publicKey.n.bitLength()} bits`);
        
        // Extensiones
        console.log("\n🔧 EXTENSIONES:");
        if (cert.extensions && cert.extensions.length > 0) {
            cert.extensions.forEach(ext => {
                console.log(`  ${ext.name || ext.oid}: ${ext.critical ? '[CRÍTICA]' : ''}`);
                if (ext.name === 'keyUsage') {
                    console.log(`    Usos: ${Object.keys(ext).filter(k => ext[k] === true).join(', ')}`);
                }
            });
        }
        
        // Calcular hashes
        const certDER = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
        const sha256Hash = crypto.createHash('sha256').update(Buffer.from(certDER, 'binary')).digest('hex');
        const sha1Hash = crypto.createHash('sha1').update(Buffer.from(certDER, 'binary')).digest('hex');
        
        console.log("\n#️⃣  HASHES:");
        console.log(`  SHA-256: ${sha256Hash}`);
        console.log(`  SHA-1: ${sha1Hash}`);
        
        // Guardar información procesada
        const certInfo = {
            rfc: rfc || "No detectado",
            serialNumber: cert.serialNumber,
            subject: subject.map(attr => ({
                type: attr.type,
                name: attr.name || attr.type,
                value: attr.value
            })),
            issuer: issuer.map(attr => ({
                type: attr.type,
                name: attr.name || attr.type,
                value: attr.value
            })),
            validity: {
                notBefore: cert.validity.notBefore.toISOString(),
                notAfter: cert.validity.notAfter.toISOString(),
                notAfterUnix: Math.floor(cert.validity.notAfter.getTime() / 1000)
            },
            publicKey: {
                algorithm: 'RSA',
                bitLength: cert.publicKey.n.bitLength(),
                modulus: cert.publicKey.n.toString(16),
                exponent: cert.publicKey.e.toString()
            },
            signature: {
                algorithm: cert.signatureOid,
                algorithmName: forge.pki.oids[cert.signatureOid] || 'Unknown'
            },
            hashes: {
                sha256: sha256Hash,
                sha1: sha1Hash
            },
            extensions: cert.extensions ? cert.extensions.map(ext => ({
                id: ext.id,
                name: ext.name || ext.oid,
                critical: ext.critical || false
            })) : [],
            pem: certPEM
        };
        
        // Guardar en archivo JSON
        const outputPath = certPath.replace(/\.(cer|crt|pem)$/i, '-info.json');
        fs.writeFileSync(outputPath, JSON.stringify(certInfo, null, 2));
        console.log(`\n💾 Información guardada en: ${outputPath}`);
        
        return certInfo;
        
    } catch (error) {
        console.error("\n❌ Error al parsear certificado:", error.message);
        throw error;
    }
}

// Función para verificar firma FIEL
function verifyFIELSignature(documentHash, signature, publicKey) {
    try {
        // En producción, aquí verificarías la firma usando la clave pública del certificado
        // Ejemplo con forge:
        const md = forge.md.sha256.create();
        md.update(documentHash, 'utf8');
        
        // Esta es una verificación simulada
        // En producción usarías: publicKey.verify(md.digest().bytes(), signature)
        
        return true;
    } catch (error) {
        console.error("Error verificando firma:", error);
        return false;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const certPath = process.argv[2] || './fiel/00001000000704479448.cer';
    
    parseFIELCertificate(certPath)
        .then(info => {
            console.log("\n✅ Procesamiento completado exitosamente");
            console.log("\n📊 RESUMEN:");
            console.log(`  RFC: ${info.rfc}`);
            console.log(`  Serial: ${info.serialNumber}`);
            console.log(`  Válido hasta: ${info.validity.notAfter}`);
            console.log(`  Hash SHA-256: ${info.hashes.sha256}`);
        })
        .catch(error => {
            console.error("\n❌ Error:", error);
            process.exit(1);
        });
}

module.exports = {
    parseFIELCertificate,
    convertDERtoPEM,
    extractRFCFromSubject,
    verifyFIELSignature
};