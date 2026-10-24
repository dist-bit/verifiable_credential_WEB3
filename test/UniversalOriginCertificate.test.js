const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * TEST SUITE: UniversalOriginCertificate
 *
 * PROPÓSITO:
 * Verificar el funcionamiento completo del sistema de certificación de origen universal
 * que soporta múltiples países, acuerdos comerciales y estándares de firma digital.
 *
 * COBERTURA:
 * - Creación de certificados de origen
 * - Integración con TradeAgreementRegistry
 * - Integración con SupplyChainTracker
 * - Emisión y validación de certificados
 * - Control de acceso y roles
 * - Revocación y modificación de certificados
 * - Criterios de origen y reglas de valor
 *
 * ESCENARIOS:
 * - USMCA/T-MEC (México, USA, Canadá)
 * - CAFTA-DR (Centroamérica)
 * - Flujos completos de exportación
 */

describe("UniversalOriginCertificate - Sistema Completo de Certificación", function () {
  // Contratos
  let UniversalOriginCertificate;
  let universalOriginCertificate;
  let TradeAgreementRegistry;
  let tradeAgreementRegistry;
  let SupplyChainTracker;
  let supplyChainTracker;

  // Cuentas
  let owner;
  let issuer;
  let exporter;
  let importer;
  let verifier;
  let unauthorizedUser;

  // Datos de prueba
  let certificateId;
  const products = [
    {
      hsCode: "854140", // LED chips
      description: "Photosensitive semiconductor devices",
      quantity: 1000,
      unitOfMeasure: "UNIT",
      countryOfOrigin: "MX",
      value: 75000,
      currency: "USD",
      manufacturer: "Semiconductores Avanzados SA de CV",
      manufacturerCountry: "MX",
      additionalData: "0x00"
    }
  ];

  /**
   * SETUP: Configuración inicial antes de cada test
   * Despliega todos los contratos necesarios y configura el ambiente
   */
  beforeEach(async function () {
    console.log("\n    🔧 Configurando ambiente de pruebas...");

    // Obtener cuentas de prueba
    [owner, issuer, exporter, importer, verifier, unauthorizedUser] = await ethers.getSigners();

    // 1. Deploy TradeAgreementRegistry
    console.log("    📜 Desplegando TradeAgreementRegistry...");
    TradeAgreementRegistry = await ethers.getContractFactory("TradeAgreementRegistry");
    tradeAgreementRegistry = await TradeAgreementRegistry.deploy();
    await tradeAgreementRegistry.waitForDeployment();

    // USMCA ya está configurado en el constructor del contrato

    // 2. Deploy SupplyChainTracker
    console.log("    🚚 Desplegando SupplyChainTracker...");
    SupplyChainTracker = await ethers.getContractFactory("SupplyChainTracker");
    supplyChainTracker = await SupplyChainTracker.deploy(ethers.ZeroAddress);
    await supplyChainTracker.waitForDeployment();

    // 3. Deploy UniversalOriginCertificate
    console.log("    🌍 Desplegando UniversalOriginCertificate...");
    UniversalOriginCertificate = await ethers.getContractFactory("UniversalOriginCertificate");
    universalOriginCertificate = await UniversalOriginCertificate.deploy(
      await tradeAgreementRegistry.getAddress(),
      await supplyChainTracker.getAddress()
    );
    await universalOriginCertificate.waitForDeployment();

    // 4. Configurar permisos
    console.log("    👥 Configurando roles y permisos...");
    await supplyChainTracker.authorizeActor(await universalOriginCertificate.getAddress(), true);
    await supplyChainTracker.authorizeActor(issuer.address, true);

    // Generar ID de certificado único para cada test
    certificateId = ethers.keccak256(
      ethers.toUtf8Bytes(`CERT-${Date.now()}-${Math.random()}`)
    );

    console.log("    ✅ Ambiente listo para pruebas\n");
  });

  /**
   * SUITE 1: Despliegue y Configuración Inicial
   * Verifica que los contratos se desplieguen correctamente
   */
  describe("📦 1. Despliegue y Configuración", function () {

    it("Debe configurar el owner correctamente", async function () {
      console.log("      Verificando owner del contrato...");
      expect(await universalOriginCertificate.owner()).to.equal(owner.address);
      console.log("      ✓ Owner configurado: ", owner.address);
    });

    it("Debe tener TradeAgreementRegistry configurado", async function () {
      console.log("      Verificando integración con TradeAgreementRegistry...");
      expect(await universalOriginCertificate.tradeAgreementRegistry())
        .to.equal(await tradeAgreementRegistry.getAddress());
      console.log("      ✓ TradeAgreementRegistry conectado");
    });

    it("Debe tener SupplyChainTracker configurado", async function () {
      console.log("      Verificando integración con SupplyChainTracker...");
      expect(await universalOriginCertificate.supplyChainTracker())
        .to.equal(await supplyChainTracker.getAddress());
      console.log("      ✓ SupplyChainTracker conectado");
    });
  });

  /**
   * SUITE 2: Creación de Certificados
   * Prueba la creación de certificados de origen con diferentes configuraciones
   */
  describe("📝 2. Creación de Certificados de Origen", function () {

    it("Debe crear un certificado USMCA exitosamente", async function () {
      console.log("      Creando certificado USMCA para exportación MX->US...");

      // Crear criterios de origen
      const originCriteria = {
        agreementCode: "USMCA",
        criteriaType: "RVC",
        rvcPercentage: 60,
        rvcMethod: "Transaction",
        cumulationApplied: true,
        deminimisApplied: true,
        specificRule: "HS 854140 requires 60% RVC",
        proofDocuments: ethers.toUtf8Bytes("")
      };

      // Llamar createCertificate y capturar el ID retornado
      const tx = await universalOriginCertificate.connect(exporter).createCertificate(
        JSON.stringify({ name: "Exporter Co", taxId: "EXP123456789" }), // exporterDetails
        JSON.stringify({ name: "Importer Inc", taxId: "IMP987654321" }), // importerDetails
        JSON.stringify({ name: "Producer SA", taxId: "PRD555666777" }), // producerDetails
        "MX", // exportCountry
        "US", // importCountry
        "USMCA", // tradeAgreement
        products, // products array
        originCriteria, // criteria struct
        ethers.keccak256(ethers.toUtf8Bytes("INVOICE-2025-001")), // invoiceHash
        "CERT-2025-USMCA-001" // referenceNumber
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = universalOriginCertificate.interface.parseLog(log);
          return parsed && parsed.name === "CertificateCreated";
        } catch (e) {
          return false;
        }
      });

      const parsedEvent = universalOriginCertificate.interface.parseLog(event);
      const generatedCertificateId = parsedEvent.args.certificateId;

      const cert = await universalOriginCertificate.getCertificate(generatedCertificateId);

      expect(cert.exportCountry).to.equal("MX");
      expect(cert.importCountry).to.equal("US");
      expect(cert.tradeAgreement).to.equal("USMCA");
      expect(cert.status).to.equal(0); // Draft status
      expect(cert.products.length).to.equal(1);
      expect(cert.products[0].hsCode).to.equal("854140");

      console.log("      ✓ Certificado USMCA creado");
      console.log("      ✓ Productos registrados: ", cert.products.length);
      console.log("      ✓ Valor total: $", products[0].value, "USD");
    });

    it("No debe permitir crear certificado con ID duplicado", async function () {
      console.log("      Intentando crear certificado duplicado...");

      // Crear primer certificado
      await universalOriginCertificate.connect(exporter).createCertificate(
        certificateId,
        exporter.address,
        importer.address,
        "MX",
        "US",
        "USMCA",
        products,
        60,
        "RVC",
        "ipfs://QmDoc1"
      );

      // Intentar crear duplicado
      await expect(
        universalOriginCertificate.connect(exporter).createCertificate(
          certificateId, // Mismo ID
          exporter.address,
          importer.address,
          "MX",
          "US",
          "USMCA",
          products,
          60,
          "RVC",
          "ipfs://QmDoc2"
        )
      ).to.be.revertedWith("Certificate already exists");

      console.log("      ✓ Duplicados correctamente prevenidos");
    });

    it("Debe validar el acuerdo comercial existe", async function () {
      console.log("      Intentando crear certificado con acuerdo inválido...");

      const invalidAgreementId = ethers.keccak256(
        ethers.toUtf8Bytes(`CERT-INVALID-${Date.now()}`)
      );

      await expect(
        universalOriginCertificate.connect(exporter).createCertificate(
          invalidAgreementId,
          exporter.address,
          importer.address,
          "MX",
          "JP", // Japón no está en USMCA
          "INVALID_AGREEMENT",
          products,
          60,
          "RVC",
          "ipfs://QmDoc"
        )
      ).to.be.reverted;

      console.log("      ✓ Acuerdos comerciales validados correctamente");
    });
  });

  /**
   * SUITE 3: Emisión y Firma de Certificados
   * Prueba el proceso de emisión por autoridades certificadoras
   */
  describe("🖊️ 3. Emisión y Firma de Certificados", function () {

    beforeEach(async function () {
      // Crear certificado base para las pruebas
      await universalOriginCertificate.connect(exporter).createCertificate(
        certificateId,
        exporter.address,
        importer.address,
        "MX",
        "US",
        "USMCA",
        products,
        60,
        "RVC",
        "ipfs://QmExportDoc"
      );
    });

    it("Debe permitir a issuer autorizado emitir certificado", async function () {
      console.log("      Emisor autorizado firmando certificado...");

      const validityPeriod = 4 * 365 * 24 * 60 * 60; // 4 años
      const signature = "0x1234567890abcdef"; // Firma simulada

      await universalOriginCertificate.connect(issuer).issueCertificate(
        certificateId,
        validityPeriod,
        "ipfs://QmSignedDoc",
        signature
      );

      const cert = await universalOriginCertificate.getCertificate(certificateId);
      expect(cert.status).to.equal(2); // Issued status
      expect(cert.issuer).to.equal(issuer.address);

      console.log("      ✓ Certificado emitido exitosamente");
      console.log("      ✓ Emisor registrado: ", issuer.address);
      console.log("      ✓ Válido por: 4 años");
    });

    it("No debe permitir emisión por usuario no autorizado", async function () {
      console.log("      Usuario no autorizado intentando emitir...");

      await expect(
        universalOriginCertificate.connect(unauthorizedUser).issueCertificate(
          certificateId,
          365 * 24 * 60 * 60,
          "ipfs://QmFake",
          "0xfake"
        )
      ).to.be.reverted;

      console.log("      ✓ Emisión no autorizada bloqueada");
    });

    it("Debe registrar evento en supply chain al emitir", async function () {
      console.log("      Verificando integración con supply chain...");

      await universalOriginCertificate.connect(issuer).issueCertificate(
        certificateId,
        365 * 24 * 60 * 60,
        "ipfs://QmSigned",
        "0xsignature"
      );

      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      const certEvent = events.find(e => e.eventType === 3); // CERTIFICATION_ISSUED

      expect(certEvent).to.not.be.undefined;
      console.log("      ✓ Evento CERTIFICATION_ISSUED registrado en blockchain");
    });
  });

  /**
   * SUITE 4: Validación y Verificación
   * Prueba el proceso de validación en aduanas y por importadores
   */
  describe("✅ 4. Validación y Verificación", function () {

    beforeEach(async function () {
      // Crear y emitir certificado
      await universalOriginCertificate.connect(exporter).createCertificate(
        certificateId,
        exporter.address,
        importer.address,
        "MX",
        "US",
        "USMCA",
        products,
        60,
        "RVC",
        "ipfs://QmDoc"
      );

      await universalOriginCertificate.connect(issuer).issueCertificate(
        certificateId,
        365 * 24 * 60 * 60,
        "ipfs://QmSigned",
        "0xsignature"
      );
    });

    it("Debe permitir validación por verificador autorizado", async function () {
      console.log("      Aduana US validando certificado mexicano...");

      await universalOriginCertificate.connect(verifier).validateCertificate(
        certificateId,
        "US_CUSTOMS",
        "ipfs://QmValidation"
      );

      const cert = await universalOriginCertificate.getCertificate(certificateId);
      expect(cert.status).to.equal(3); // Validated status

      console.log("      ✓ Certificado validado por aduana US");
      console.log("      ✓ Estado actualizado a VALIDATED");
    });

    it("Debe verificar criterios de origen correctamente", async function () {
      console.log("      Verificando cumplimiento de reglas de origen...");

      const meetsRequirements = await universalOriginCertificate.verifyCriteriaCompliance(
        certificateId
      );

      expect(meetsRequirements).to.be.true;
      console.log("      ✓ RVC 60% cumple con requisitos USMCA");
    });
  });

  /**
   * SUITE 5: Revocación y Modificación
   * Prueba los mecanismos de control post-emisión
   */
  describe("🚫 5. Revocación y Control", function () {

    beforeEach(async function () {
      await universalOriginCertificate.connect(exporter).createCertificate(
        certificateId,
        exporter.address,
        importer.address,
        "MX",
        "US",
        "USMCA",
        products,
        60,
        "RVC",
        "ipfs://QmDoc"
      );

      await universalOriginCertificate.connect(issuer).issueCertificate(
        certificateId,
        365 * 24 * 60 * 60,
        "ipfs://QmSigned",
        "0xsignature"
      );
    });

    it("Debe permitir revocación por issuer", async function () {
      console.log("      Revocando certificado por irregularidades...");

      await universalOriginCertificate.connect(issuer).revokeCertificate(
        certificateId,
        "Información incorrecta detectada"
      );

      const cert = await universalOriginCertificate.getCertificate(certificateId);
      expect(cert.status).to.equal(6); // Revoked status

      console.log("      ✓ Certificado revocado exitosamente");
      console.log("      ✓ Razón registrada en blockchain");
    });

    it("No debe permitir usar certificado revocado", async function () {
      console.log("      Intentando validar certificado revocado...");

      await universalOriginCertificate.connect(issuer).revokeCertificate(
        certificateId,
        "Fraude detectado"
      );

      await expect(
        universalOriginCertificate.connect(verifier).validateCertificate(
          certificateId,
          "US_CUSTOMS",
          "ipfs://QmAttempt"
        )
      ).to.be.revertedWith("Invalid certificate status");

      console.log("      ✓ Certificado revocado no puede ser validado");
    });
  });

  /**
   * SUITE 6: Integración Completa Supply Chain
   * Prueba el flujo completo con todos los sistemas integrados
   */
  describe("🔄 6. Flujo Completo de Certificación con Supply Chain", function () {

    it("Debe manejar flujo completo desde producción hasta entrega", async function () {
      console.log("\n      📋 INICIANDO FLUJO COMPLETO DE CERTIFICACIÓN\n");

      // 1. PRODUCCIÓN
      console.log("      1️⃣ Iniciando producción en Guadalajara...");
      const mexLocation = {
        latitude: 20659700,
        longitude: -103349600,
        locationName: "Guadalajara",
        country: "MX"
      };

      await supplyChainTracker.connect(issuer).addSupplyChainEvent(
        certificateId,
        0, // PRODUCTION_STARTED
        mexLocation,
        "Semiconductores MX",
        "Producción de LED chips iniciada",
        "ipfs://QmProduction",
        "0x00",
        '{"batch": "BATCH-2025-001"}'
      );
      console.log("      ✓ Producción registrada en blockchain");

      // 2. CREAR CERTIFICADO
      console.log("\n      2️⃣ Creando certificado de origen...");
      await universalOriginCertificate.connect(exporter).createCertificate(
        certificateId,
        exporter.address,
        importer.address,
        "MX",
        "US",
        "USMCA",
        products,
        65, // 65% contenido regional
        "RVC",
        "ipfs://QmCertificate"
      );
      console.log("      ✓ Certificado creado con RVC 65%");

      // 3. CONTROL DE CALIDAD
      console.log("\n      3️⃣ Realizando control de calidad...");
      await supplyChainTracker.connect(issuer).recordQualityControl(
        certificateId,
        "Laboratorio Certificado MX",
        "ISO-9001",
        true,
        "ipfs://QmQCResults",
        "QC-2025-001"
      );
      console.log("      ✓ QC aprobado - ISO-9001");

      // 4. EMITIR CERTIFICADO
      console.log("\n      4️⃣ Cámara de Comercio emitiendo certificado...");
      await universalOriginCertificate.connect(issuer).issueCertificate(
        certificateId,
        4 * 365 * 24 * 60 * 60,
        "ipfs://QmIssuedCert",
        "0xdigitalSignature"
      );
      console.log("      ✓ Certificado emitido y firmado digitalmente");

      // 5. ADUANA EXPORTACIÓN
      console.log("\n      5️⃣ Procesando en aduana mexicana...");
      await supplyChainTracker.connect(issuer).recordCustomsClearance(
        certificateId,
        "MX",
        "Aduana Manzanillo",
        "EXP-2025-MX-001",
        true, // isExport
        "854140",
        0,
        "USD"
      );
      console.log("      ✓ Despacho aduanal exportación completado");

      // 6. CREAR EMBARQUE
      console.log("\n      6️⃣ Creando embarque internacional...");
      const usLocation = {
        latitude: 34052200,
        longitude: -118243700,
        locationName: "Los Angeles",
        country: "US"
      };

      await supplyChainTracker.connect(issuer).createShipment(
        certificateId,
        "Maersk Line",
        "MAEU-123456789",
        mexLocation,
        usLocation,
        Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      );
      console.log("      ✓ Embarque creado - Maersk Line");
      console.log("      ✓ Tracking: MAEU-123456789");

      // 7. ADUANA IMPORTACIÓN
      console.log("\n      7️⃣ Procesando en aduana estadounidense...");
      await supplyChainTracker.connect(issuer).recordCustomsClearance(
        certificateId,
        "US",
        "US Customs LA",
        "IMP-2025-US-001",
        false, // isImport
        "854140",
        2500, // $2,500 duty
        "USD"
      );
      console.log("      ✓ Despacho aduanal importación completado");
      console.log("      ✓ Arancel pagado: $2,500 USD");

      // 8. VALIDAR CERTIFICADO
      console.log("\n      8️⃣ Validando certificado en destino...");
      await universalOriginCertificate.connect(verifier).validateCertificate(
        certificateId,
        "US_CUSTOMS",
        "ipfs://QmValidation"
      );
      console.log("      ✓ Certificado validado por US Customs");

      // 9. ENTREGA FINAL
      console.log("\n      9️⃣ Completando entrega al importador...");
      await supplyChainTracker.connect(issuer).completeDelivery(
        certificateId,
        importer.address,
        usLocation,
        "POD-2025-FINAL"
      );
      console.log("      ✓ Entrega completada en Los Angeles");

      // VERIFICACIÓN FINAL
      console.log("\n      📊 VERIFICANDO ESTADO FINAL:\n");

      const cert = await universalOriginCertificate.getCertificate(certificateId);
      const events = await supplyChainTracker.getSupplyChainHistory(certificateId);
      const shipment = await supplyChainTracker.getShipmentDetails(certificateId);

      expect(cert.status).to.equal(3); // Validated
      expect(events.length).to.be.gte(7);
      expect(shipment.isActive).to.be.false;

      console.log("      ✅ Estado del certificado: VALIDATED");
      console.log("      ✅ Eventos en supply chain: ", events.length);
      console.log("      ✅ Embarque: ENTREGADO");
      console.log("      ✅ Valor total comercializado: $75,000 USD");
      console.log("\n      🎉 FLUJO COMPLETO EXITOSO - Sistema 100% funcional\n");
    });
  });

  /**
   * SUITE 7: Casos de Uso Específicos por País
   * Prueba escenarios reales de diferentes países
   */
  describe("🌎 7. Casos de Uso Multi-País", function () {

    it("Debe manejar exportación El Salvador -> USA (CAFTA-DR)", async function () {
      console.log("      Configurando exportación CAFTA-DR...");

      // Agregar acuerdo CAFTA-DR
      await tradeAgreementRegistry.addAgreement(
        "CAFTA-DR",
        ["US", "SV", "GT", "HN", "NI", "CR", "DO"],
        35, // 35% RVC
        10,
        true,
        365 * 24 * 60 * 60
      );

      const svCertId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("SV-CERT-001")
      );

      const svProducts = [{
        hsCode: "610910", // T-shirts de algodón
        description: "Cotton T-shirts",
        quantity: 10000,
        unitOfMeasure: "UNIT",
        countryOfOrigin: "SV",
        value: 50000,
        currency: "USD",
        manufacturer: "Textiles El Salvador SA",
        manufacturerCountry: "SV",
        additionalData: "0x00"
      }];

      await universalOriginCertificate.connect(exporter).createCertificate(
        svCertId,
        exporter.address,
        importer.address,
        "SV",
        "US",
        "CAFTA-DR",
        svProducts,
        40, // 40% RVC
        "RVC",
        "ipfs://QmSVCert"
      );

      const cert = await universalOriginCertificate.getCertificate(svCertId);
      expect(cert.exportCountry).to.equal("SV");
      expect(cert.tradeAgreement).to.equal("CAFTA-DR");

      console.log("      ✓ Certificado CAFTA-DR creado");
      console.log("      ✓ Exportación: El Salvador -> USA");
      console.log("      ✓ Producto: 10,000 camisetas de algodón");
    });

    it("Debe manejar exportación Canadá -> México (USMCA)", async function () {
      console.log("      Configurando exportación inversa USMCA...");

      const caCertId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("CA-CERT-001")
      );

      const caProducts = [{
        hsCode: "870323", // Vehículos
        description: "Motor vehicles",
        quantity: 100,
        unitOfMeasure: "UNIT",
        countryOfOrigin: "CA",
        value: 2500000,
        currency: "USD",
        manufacturer: "Canadian Motors Inc",
        manufacturerCountry: "CA",
        additionalData: "0x00"
      }];

      await universalOriginCertificate.connect(exporter).createCertificate(
        caCertId,
        exporter.address,
        importer.address,
        "CA",
        "MX",
        "USMCA",
        caProducts,
        75, // 75% RVC para vehículos
        "RVC",
        "ipfs://QmCACert"
      );

      const cert = await universalOriginCertificate.getCertificate(caCertId);
      expect(cert.exportCountry).to.equal("CA");
      expect(cert.importCountry).to.equal("MX");

      console.log("      ✓ Certificado USMCA creado");
      console.log("      ✓ Exportación: Canadá -> México");
      console.log("      ✓ Producto: 100 vehículos");
      console.log("      ✓ Valor: $2.5M USD");
    });
  });
});