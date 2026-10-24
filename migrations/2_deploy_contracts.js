const DocumentMultiSign = artifacts.require("DocumentMultiSign");
const Store = artifacts.require("Store");
const ZeroCopySink = artifacts.require("ZeroCopySink");
const ZeroCopySource = artifacts.require("ZeroCopySource");
const NebuVC = artifacts.require('NebuVC');

module.exports = async function (deployer, network) {
  try {
    console.log('Iniciando despliegue de contratos...');


    // Desplegar Store
    console.log('\nDesplegando Store...');
    await deployer.deploy(Store);

    console.log('\nDesplegando NebuVC...');
    await deployer.deploy(NebuVC);
    
    // Desplegar librerías
    console.log('\nDesplegando ZeroCopySink...');
    await deployer.deploy(ZeroCopySink);
    
    console.log('\nDesplegando ZeroCopySource...');
    await deployer.deploy(ZeroCopySource);

    // Vincular librerías
    console.log('\nVinculando librerías...');
    await deployer.link(ZeroCopySource, [DocumentMultiSign, NebuVC]);
    await deployer.link(ZeroCopySink, [DocumentMultiSign, NebuVC]);

    // Parámetros para DocumentMultiSign
    const params = [
      "https://example.edu/issuers/565049",
      [
        "https://www.w3.org/2018/credentials/examples/v1",
        "https://www.w3.org/2018/credentials/examples/v2"
      ],
      "http://example.edu/credentials/1872",
      ["VerifiableCredential", "UniversityDegreeCredential"],
      "https://example.edu/issuers/14#key-1",
      {
        id: "https://example.org/examples/degree.json",
        typeSchema: "JsonSchemaValidator2018"
      }
    ];

    // Desplegar DocumentMultiSign con opciones específicas de gas
    console.log('\nDesplegando DocumentMultiSign...');
    await deployer.deploy(DocumentMultiSign, ...params);

    console.log('\nTodos los contratos desplegados exitosamente');

    // Verificación automática si no estamos en development
    if (network !== 'development') {
      console.log('\nIniciando verificación de contratos...');
      
      const run = require('@truffle/contract-sources');
      
      try {
        // Verificar Store
        await run('verify', Store.address, {
          contract: "Store",
          network: network
        });
        console.log('Store verificado ✓');

        // Verificar ZeroCopySink
        await run('verify', ZeroCopySink.address, {
          contract: "ZeroCopySink",
          network: network
        });
        console.log('ZeroCopySink verificado ✓');

        // Verificar ZeroCopySource
        await run('verify', ZeroCopySource.address, {
          contract: "ZeroCopySource",
          network: network
        });
        console.log('ZeroCopySource verificado ✓');

        // Verificar DocumentMultiSign
        await run('verify', DocumentMultiSign.address, {
          contract: "DocumentMultiSign",
          constructorArguments: params,
          network: network
        });
        console.log('DocumentMultiSign verificado ✓');

      } catch (error) {
        console.error('\nError en la verificación:', error);
        console.log('\nPuedes verificar manualmente usando estos comandos:');
        console.log(`truffle run verify Store@${Store.address} --network ${network}`);
        console.log(`truffle run verify ZeroCopySink@${ZeroCopySink.address} --network ${network}`);
        console.log(`truffle run verify ZeroCopySource@${ZeroCopySource.address} --network ${network}`);
        console.log(`truffle run verify DocumentMultiSign@${DocumentMultiSign.address} --network ${network}`);
      }
    }
    
    // Imprimir direcciones
    console.log('\n=== Direcciones de Contratos ===');
    console.log('Store:', Store.address);
    console.log('ZeroCopySink:', ZeroCopySink.address);
    console.log('ZeroCopySource:', ZeroCopySource.address);
    console.log('DocumentMultiSign:', DocumentMultiSign.address);
    console.log('=============================');

  } catch (error) {
    console.error('\nError durante el despliegue:', error);
    console.error('Detalles:', error.message);
    throw error;
  }
};