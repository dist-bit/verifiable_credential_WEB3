# IPPBlock Verifiable Credentials - Hardhat Setup

## 📋 Descripción
Sistema de credenciales verificables para propiedad intelectual usando Hardhat y smart contracts en Ethereum.

## 🚀 Instalación

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus claves privadas y RPC URLs
```

## 📁 Estructura del Proyecto

```
verifiable_credential_WEB3/
├── contracts/              # Smart contracts
│   ├── sample/            # Contratos de ejemplo
│   │   ├── IntellectualProperty.sol  # Contrato principal de IP
│   │   ├── AlumniOf.sol
│   │   ├── DocumentMultiSign.sol
│   │   └── NebuIA.sol
│   ├── libs/              # Librerías
│   ├── utils/             # Utilidades
│   └── VC.sol             # Contrato principal de VC
├── scripts/               # Scripts de Hardhat
│   ├── compile.js         # Script de compilación
│   └── deploy.js          # Script de despliegue
├── test/                  # Pruebas
│   └── IPPBlock.test.js   # Pruebas de IPPBlock
├── hardhat.config.js      # Configuración de Hardhat
└── package.json           # Dependencias y scripts
```

## 🛠️ Scripts Disponibles

### Compilación
```bash
# Compilar contratos
npm run compile

# Forzar recompilación
npm run compile:force

# Limpiar artifacts
npm run clean
```

### Pruebas
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas de IPPBlock
npm run test:ippblock

# Ejecutar pruebas con reporte de gas
npm run gas-report

# Coverage de pruebas
npm run coverage
```

### Despliegue
```bash
# Iniciar nodo local
npm run node

# Desplegar en red local
npm run deploy:localhost

# Desplegar en Sepolia
npm run deploy:sepolia

# Desplegar en Mumbai
npm run deploy:mumbai

# Desplegar en Polygon mainnet
npm run deploy:polygon
```

### Utilidades
```bash
# Ver tamaño de contratos
npm run size

# Verificar contratos en Etherscan
npm run verify

# Consola interactiva
npm run console

# Ver cuentas disponibles
npm run accounts
```

## 🔧 Configuración de Redes

El archivo `hardhat.config.js` incluye configuraciones para:
- **Hardhat Network** (local)
- **Ganache** (local)
- **Sepolia** (testnet)
- **Mumbai** (Polygon testnet)
- **Polygon** (mainnet)
- **Ethereum** (mainnet)

## 📝 Ejemplo de Uso

### 1. Compilar y probar
```bash
npm run compile
npm test
```

### 2. Desplegar en red local
```bash
# Opción 1: Usar nodo interno de Hardhat (recomendado)
npm run deploy:localhost

# Opción 2: Usar nodo persistente
# Terminal 1: Iniciar nodo
npm run node

# Terminal 2: Desplegar
npm run deploy:localhost
```

### 3. Interactuar con contratos
```bash
npm run console -- --network localhost
```

```javascript
// En la consola de Hardhat
const IPPBlockVC = await ethers.getContractFactory("IPPBlockVC");
const contract = await IPPBlockVC.attach("DIRECCION_DEL_CONTRATO");
const version = await contract.viewVersion();
console.log(version); // "IPPBlock-IP-v1"
```

## 🔐 Seguridad

- **NUNCA** commits tu archivo `.env` con claves privadas
- Usa diferentes claves para testnet y mainnet
- Verifica siempre los contratos antes de interactuar en mainnet

## 📊 Gas Optimization

Los contratos están optimizados con:
- Optimizer habilitado (200 runs)
- Librerías ZeroCopy para serialización eficiente
- Estructuras de datos optimizadas

## 🧪 Testing

Las pruebas incluyen:
- Creación de credenciales de IP
- Serialización/deserialización
- Transferencias de propiedad
- Verificación de caducidad
- Firma EIP-712

## 📚 Contratos Principales

### IPPBlockVC
- Gestión de propiedad intelectual
- Tipos: Patente, Marca, Copyright, etc.
- Transferencias con aprobación
- Verificación de caducidad

### NebuVC
- Registro central de credenciales
- Verificación de firmas
- Revocación de credenciales

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.