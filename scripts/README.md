# Scripts de Despliegue y Pruebas

Este directorio contiene los scripts esenciales para desplegar y probar los contratos inteligentes.

## Scripts de Despliegue por Sistema

### 1. `deploy-blockvault.js` - Sistema BlockVault
Despliega solo el sistema BlockVault para almacenamiento descentralizado:
- **BlockVault**: Almacenamiento seguro con monetización
- Configura tarifas de plataforma y precios de almacenamiento

```bash
npx hardhat run scripts/deploy-blockvault.js --network <network-name>
```

### 2. `deploy-ippblock.js` - Sistema de Propiedad Intelectual
Despliega el sistema IPPBlock para gestión de propiedad intelectual:
- **IntellectualProperty**: Contratos con EIP-712 y verificación
- **VC Verifier**: Verificador de credenciales

```bash
npx hardhat run scripts/deploy-ippblock.js --network <network-name>
```

### 3. `deploy-vc-system.js` - Sistema de Credenciales Verificables
Despliega el sistema base de credenciales verificables:
- **VC Verifier (NebuVC)**: Verificador principal
- **Store**: Almacenamiento de datos de credenciales

```bash
npx hardhat run scripts/deploy-vc-system.js --network <network-name>
```

### 4. `deploy-origin-system.js` - Sistema de Certificación de Origen
Despliega el sistema completo de certificación de origen universal:
- **TradeAgreementRegistry**: Registro de acuerdos comerciales
- **UniversalOriginCertificate**: Sistema completo
- **OriginCertificateFinal**: Versión optimizada
- **MinimalOriginCertificate**: Versión mínima

```bash
npx hardhat run scripts/deploy-origin-system.js --network <network-name>
```

### 5. `deploy-all.js` - Despliegue Completo
Despliega TODOS los sistemas en una sola transacción:
- Sistema VC completo
- BlockVault con configuración
- Sistema de certificación de origen
- Todos los contratos auxiliares

```bash
npx hardhat run scripts/deploy-all.js --network <network-name>
```

### 6. `deploy-main.js` - Despliegue Principal (Legacy)
Script original que despliega una selección de contratos principales.

```bash
npx hardhat run scripts/deploy-main.js --network <network-name>
```

### 7. `test-contracts.js` - Pruebas de Funcionalidad
Prueba la compilación y funcionalidad básica de todos los contratos.

```bash
npx hardhat run scripts/test-contracts.js
```

## Redes Configuradas

Las redes están configuradas en `hardhat.config.js`:

### Redes de Desarrollo
- **hardhat**: Red local de desarrollo (por defecto)
- **localhost**: Red local persistente

### Redes de Producción
- **ethereum**: Ethereum Mainnet
- **ethereumClassic**: Ethereum Classic (ETC)
- **bnb**: BNB Smart Chain (BSC)
- **polygon**: Polygon (MATIC)
- **avalanche**: Avalanche C-Chain
- **fantom**: Fantom Opera
- **arbitrum**: Arbitrum One
- **optimism**: Optimism

### Redes de Prueba
- **sepolia**: Ethereum Sepolia Testnet
- **goerli**: Ethereum Goerli Testnet
- **mumbai**: Polygon Mumbai Testnet
- **fuji**: Avalanche Fuji Testnet

## Archivos de Despliegue

Los resultados de los despliegues se guardan en `/deployments/`:
- `deployment-<network>.json`: Direcciones de contratos principales
- `origin-system-<network>.json`: Direcciones del sistema de certificación de origen

## Datos FIEL Integrados

El sistema ya incluye la integración con tus datos FIEL:
- RFC: SABM960611SP4
- No. Serie: 00001000000704479448
- Nombre: MIGUEL ANGEL SANCHEZ BRAVO
- Email: mundorap2010@gmail.com

## Ejemplos de Uso

### Despliegue por Sistema y Red

```bash
# Compilar contratos
npx hardhat compile

# Ejecutar todas las pruebas
npm test

# === DESPLIEGUES LOCALES ===
# BlockVault en red local
npx hardhat run scripts/deploy-blockvault.js --network localhost

# Sistema VC en red local
npx hardhat run scripts/deploy-vc-system.js --network localhost

# === DESPLIEGUES EN TESTNET ===
# Sistema de origen en Sepolia
npx hardhat run scripts/deploy-origin-system.js --network sepolia

# IPPBlock en Mumbai (Polygon testnet)
npx hardhat run scripts/deploy-ippblock.js --network mumbai

# === DESPLIEGUES EN MAINNET ===
# BlockVault en Ethereum Classic
npx hardhat run scripts/deploy-blockvault.js --network ethereumClassic

# Sistema completo en BNB Chain
npx hardhat run scripts/deploy-all.js --network bnb

# Sistema de origen en Polygon
npx hardhat run scripts/deploy-origin-system.js --network polygon

# === VERIFICAR DESPLIEGUE ===
# Probar funcionalidad básica
npx hardhat run scripts/test-contracts.js
```

### Configuración de Variables de Entorno

Crea un archivo `.env` con tus claves privadas y URLs RPC:

```env
# Clave privada del deployer (SIN el prefijo 0x)
PRIVATE_KEY=tu_clave_privada_aqui

# URLs RPC para cada red
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/TU-API-KEY
ETC_RPC_URL=https://etc.rivet.link
BNB_RPC_URL=https://bsc-dataseed.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# API Keys para verificación (opcional)
ETHERSCAN_API_KEY=tu_etherscan_api_key
BSCSCAN_API_KEY=tu_bscscan_api_key
POLYGONSCAN_API_KEY=tu_polygonscan_api_key
```