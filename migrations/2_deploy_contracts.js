const AlumniOfVC = artifacts.require("AlumniOfVC");
const DocumentMultiSign = artifacts.require("DocumentMultiSign");
const NebuIA = artifacts.require("NebuIAVC");
const Store = artifacts.require("Store");
const ZeroCopySink = artifacts.require("ZeroCopySink");
const ZeroCopySource = artifacts.require("ZeroCopySource");
const IPPBlockVC = artifacts.require("IPPBlockVC");

const NebuVC = artifacts.require('NebuVC');

module.exports = async function (deployer, network, accounts) {
  //deployer.deploy(ConvertLib);
  //deployer.link(ConvertLib, MetaCoin);

  await deployer.deploy(ZeroCopySink);
  await deployer.deploy(Store);
  await deployer.deploy(ZeroCopySource);

  await deployer.link(ZeroCopySource, AlumniOfVC);
  await deployer.link(ZeroCopySink, AlumniOfVC);

  await deployer.link(ZeroCopySource, DocumentMultiSign);
  await deployer.link(ZeroCopySink, DocumentMultiSign);

  await deployer.link(ZeroCopySource, NebuIA);
  await deployer.link(ZeroCopySink, NebuIA);

  await deployer.link(ZeroCopySource, NebuVC);
  await deployer.link(ZeroCopySink, NebuVC);

  await deployer.link(ZeroCopySource, IPPBlockVC);
  await deployer.link(ZeroCopySink, IPPBlockVC);

  /*
  await deployer.deploy(DocumentMultiSign,
    "https://example.edu/issuers/565049", // issuer
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"], // context
    "http://example.edu/credentials/1872", // id
    ["VerifiableCredential", "UniversityDegreeCredential"], // type
    "https://example.edu/issuers/14#key-1", // verificationMethod
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
  );

  await deployer.deploy(AlumniOfVC,
    "https://example.edu/issuers/565049", // issuer
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"], // context
    "http://example.edu/credentials/1872", // id
    ["VerifiableCredential", "UniversityDegreeCredential"], // type
    "https://example.edu/issuers/14#key-1", // verificationMethod
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
  );

  

  await deployer.deploy(NebuIA,
    "https://example.edu/issuers/565049", // issuer
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"], // context
    "http://example.edu/credentials/1872", // id
    ["VerifiableCredential", "UniversityDegreeCredential"], // type
    "https://example.edu/issuers/14#key-1", // verificationMethod
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
  );

  await deployer.deploy(DocumentMultiSign,
    "https://example.edu/issuers/565049", // issuer
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"], // context
    "http://example.edu/credentials/1872", // id
    ["VerifiableCredential", "UniversityDegreeCredential"], // type
    "https://example.edu/issuers/14#key-1", // verificationMethod
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
  ); */

  /*await deployer.deploy(NebuIA,
    "https://example.edu/issuers/565049", // issuer
    ["https://www.w3.org/2018/credentials/examples/v1", "https://www.w3.org/2018/credentials/examples/v2"], // context
    "http://example.edu/credentials/1872", // id
    ["VerifiableCredential", "UniversityDegreeCredential"], // type
    "https://example.edu/issuers/14#key-1", // verificationMethod
    {
      id: "https://example.org/examples/degree.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
    "QmW6gFG2DPEBzG66yAunLGJRVWBj1d6MWsrjvhJWUfRu1H"
  ); */

  await deployer.deploy(IPPBlockVC,
    "https://ippblock.io/issuers/001", // issuer
    ["https://www.w3.org/2018/credentials/v1", "https://ippblock.io/credentials/v1"], // context
    "https://ippblock.io/credentials/ip/1", // id
    ["VerifiableCredential", "IntellectualPropertyCredential"], // type
    "https://ippblock.io/issuers/001#key-1", // verificationMethod
    {
      id: "https://ippblock.io/schemas/intellectual-property.json",
      typeSchema: "JsonSchemaValidator2018"
    }, // schema
    "QmIPPBlockLogoHash123456789" // logo hash
  );

  await deployer.deploy(NebuVC);
  await deployer.deploy(Store);
};
