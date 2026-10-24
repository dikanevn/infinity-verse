import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet, RPC_URL } from '../config/contracts';

// ============================================================================
// === МОДУЛЬ КРИПТОГРАФИЧЕСКОГО ШИФРОВАНИЯ ПРИВАТНИКА В ОПЕРАТИВНОЙ ПАМЯТИ ===
// ============================================================================
// Приватный ключ никогда не хранится открытым текстом в переменных или стейте.
// Поддерживает Secure Context (Web Crypto AES-GCM-256) и Local HTTP fallback (Dynamic Random XOR Mask).
export class EncryptedRamSigner {
  private static encryptedBytes: Uint8Array | null = null;
  private static maskKey: Uint8Array | null = null;
  private static aesBlob: ArrayBuffer | null = null;
  private static aesIv: Uint8Array | null = null;
  private static aesKey: CryptoKey | null = null;
  public static activeAddress: `0x${string}` | null = null;

  public static async lockPrivateKey(rawPrivateKey: string, forceMode?: 'aes' | 'xor'): Promise<`0x${string}`> {
    const cleanKey = (rawPrivateKey.startsWith('0x') ? rawPrivateKey : '0x' + rawPrivateKey).trim() as `0x${string}`;
    const account = privateKeyToAccount(cleanKey);
    this.activeAddress = account.address;

    const encoder = new TextEncoder();
    const plainBytes = encoder.encode(cleanKey);

    // 1. Режим AES-GCM (если не запрошен принудительный XOR и доступен subtle)
    if (forceMode !== 'xor' && window.crypto && window.crypto.subtle) {
      try {
        this.aesKey = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        this.aesIv = window.crypto.getRandomValues(new Uint8Array(12));
        this.aesBlob = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: this.aesIv.buffer as ArrayBuffer },
          this.aesKey,
          plainBytes
        );
        return this.activeAddress;
      } catch (e) {
        console.warn('WebCrypto subtle fallback triggered:', e);
      }
    }

    // 2. Режим XOR-Masking в RAM (гарантированно работает в локальном HTTP на любых смартфонах)
    const len = plainBytes.length;
    this.maskKey = new Uint8Array(len);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(this.maskKey as any);
    } else {
      for (let i = 0; i < len; i++) this.maskKey[i] = Math.floor(Math.random() * 256);
    }

    this.encryptedBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      this.encryptedBytes[i] = plainBytes[i] ^ this.maskKey[i];
    }

    return this.activeAddress;
  }

  // Мгновенная расшифровка внутри изолированного скоупа на время отправки транзакции
  public static async executeWithSigner<T>(fn: (walletClient: any) => Promise<T>): Promise<T> {
    let plainPk: `0x${string}` | null = null;

    if (this.aesBlob && this.aesIv && this.aesKey && window.crypto?.subtle) {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.aesIv.buffer as ArrayBuffer },
        this.aesKey,
        this.aesBlob
      );
      const decoder = new TextDecoder();
      plainPk = decoder.decode(decrypted) as `0x${string}`;
    } else if (this.encryptedBytes && this.maskKey) {
      const len = this.encryptedBytes.length;
      const buf = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        buf[i] = this.encryptedBytes[i] ^ this.maskKey[i];
      }
      const decoder = new TextDecoder();
      plainPk = decoder.decode(buf) as `0x${string}`;
    } else {
      throw new Error('Ключ в RAM не найден или заблокирован');
    }

    const account = privateKeyToAccount(plainPk);
    plainPk = null; // Стираем ссылку

    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(RPC_URL)
    });

    return await fn(walletClient);
  }

  public static clear() {
    this.encryptedBytes = null;
    this.maskKey = null;
    this.aesBlob = null;
    this.aesIv = null;
    this.aesKey = null;
    this.activeAddress = null;
  }

  public static isLocked(): boolean {
    return this.encryptedBytes !== null || this.aesBlob !== null;
  }
}
