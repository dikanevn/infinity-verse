import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Локальный аккаунт сессии строго в оперативной памяти (RAM)
let inMemorySessionAccount: ReturnType<typeof privateKeyToAccount> | null = null;

// Очистка устаревших ключей из localStorage
try {
  localStorage.removeItem('iv_session_key');
} catch {}

export const getOrCreateSessionAccount = () => {
  if (!inMemorySessionAccount) {
    const sk = generatePrivateKey();
    inMemorySessionAccount = privateKeyToAccount(sk);
  }
  return inMemorySessionAccount;
};

export const resetSessionAccount = () => {
  inMemorySessionAccount = null;
};
