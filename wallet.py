from eth_account import Account
import secrets
from web3 import Web3
import json

def generate_polygon_wallet():
    # Activar el módulo de generación de cuentas
    Account.enable_unaudited_hdwallet_features()
    
    # Generar una semilla aleatoria segura
    priv = secrets.token_hex(32)
    private_key = "0x" + priv
    acct = Account.from_key(private_key)
    
    # Crear el objeto wallet con la información
    wallet = {
        "address": acct.address,
        "private_key": private_key,
        "public_key": acct._key_obj.public_key.to_hex(),
    }
    
    # Guardar la wallet en un archivo JSON
    with open('polygon_wallet.json', 'w') as f:
        json.dump(wallet, f, indent=4)
    
    # Imprimir la información de la wallet
    print("\n=== Nueva Polygon Wallet Generada ===")
    print(f"Dirección: {wallet['address']}")
    print(f"Llave Privada: {wallet['private_key']}")
    print(f"Llave Pública: {wallet['public_key']}")
    print("\nLa información ha sido guardada en 'polygon_wallet.json'")
    print("\n⚠️ IMPORTANTE: Guarda tu llave privada de manera segura y nunca la compartas")
    
    return wallet

def verify_wallet(address):
    # Verificar que la dirección es válida
    return Web3.is_address(address)

if __name__ == "__main__":
    # Generar una nueva wallet
    wallet = generate_polygon_wallet()
    
    # Verificar que la dirección es válida
    if verify_wallet(wallet['address']):
        print("\n✅ La dirección generada es válida")
    else:
        print("\n❌ Error: La dirección generada no es válida")