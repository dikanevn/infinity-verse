import { useState, useEffect } from 'react';
import { createWalletClient, custom, keccak256, encodePacked } from 'viem';
import type { PlayerData, EIP6963ProviderDetail } from '../types';
import { CONTRACT_ADDRESS, VERSE_ABI, RELAYER_URL, monadTestnet, publicClient } from '../config/contracts';
import { EncryptedRamSigner } from '../crypto/encryptedSigner';
import { getOrCreateSessionAccount, resetSessionAccount } from '../crypto/sessionAccount';

export function usePlayerState(
  connectedAddress: string,
  setConnectedAddress: (addr: string) => void,
  setStatusText: (txt: string) => void,
  onStateRefresh: () => Promise<void>
) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState<boolean>(false);
  const [actionPending, setActionPending] = useState<boolean>(false);
  const [isDirectSignerMode, setIsDirectSignerMode] = useState<boolean>(false);

  const fetchPlayer = async () => {
    if (!connectedAddress) return;
    try {
      const pData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'getPlayer',
        args: [connectedAddress as `0x${string}`]
      });
      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2])
      });
    } catch (e) {
      console.error('Fetch player error:', e);
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);

  // Вход через кошелек браузера (MetaMask / Rabby / Phantom)
  const connectProvider = async (
    providerDetail?: EIP6963ProviderDetail,
    onSuccess?: () => void
  ) => {
    try {
      let prov = providerDetail?.provider || (window as any).ethereum;
      if (!prov) {
        alert('Кошелёк не найден! Установите расширение MetaMask, Rabby или Phantom.');
        return;
      }
      const accounts = await prov.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) return;

      const userAddress = accounts[0];
      setConnectedAddress(userAddress);
      setIsDirectSignerMode(false);
      setIsPlayerLoading(true);

      const pData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'getPlayer',
        args: [userAddress as `0x${string}`]
      });

      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2])
      });
      setIsPlayerLoading(false);

      const sessionAccount = getOrCreateSessionAccount();
      const nowSec = Math.floor(Date.now() / 1000);
      const isSessionActive = pData[3] && pData[3].toLowerCase() === sessionAccount.address.toLowerCase() && Number(pData[4]) > nowSec;

      if (!isSessionActive) {
        setStatusText('✍️ Подпишите сессию в кошельке (1 раз на 24 часа)...');
        const expiry = nowSec + 86400;
        const nonce = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'nonces',
          args: [userAddress as `0x${string}`]
        });

        const innerHash = keccak256(
          encodePacked(
            ['string', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            ['AuthorizeSession', userAddress as `0x${string}`, sessionAccount.address, BigInt(expiry), nonce, BigInt(10143)]
          )
        );

        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });

        const sig = await walletClient.signMessage({
          account: userAddress as `0x${string}`,
          message: { raw: innerHash }
        });

        setStatusText('⏳ Регистрация криптографической сессии через релеер...');
        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'authorize_session',
            player: userAddress,
            sessionKey: sessionAccount.address,
            expiry,
            sig
          })
        });
        const resData = await res.json();
        if (!res.ok || resData.error) throw new Error(resData.error || 'Session auth failed');
        setStatusText('✅ Сессия подтверждена! Играйте без всплывающих окон.');
      }

      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при авторизации сессии: ' + (err.shortMessage || err.message));
      setIsPlayerLoading(false);
    }
  };

  // Вход по приватному ключу с шифрованием в RAM
  const connectWithPrivateKey = async (
    rawKey: string,
    forceMode?: 'aes' | 'xor',
    onSuccess?: () => void
  ) => {
    try {
      setIsPlayerLoading(true);
      setStatusText(
        forceMode === 'xor'
          ? '🔐 [DEV XOR] Маскирование ключа в RAM случайной маской (для локального HTTP)...'
          : '🔐 [AES-GCM] Шифрование ключа в RAM (Web Crypto)...'
      );

      const userAddress = await EncryptedRamSigner.lockPrivateKey(rawKey, forceMode);
      setConnectedAddress(userAddress);
      setIsDirectSignerMode(true);

      const pData: any = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'getPlayer',
        args: [userAddress]
      });

      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2])
      });
      setIsPlayerLoading(false);
      setStatusText('⚡ Автономный режим активен: прямые клики в Monad RPC');
      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при импорте ключа: ' + (err.message || err));
      setIsPlayerLoading(false);
    }
  };

  // Рождение игрока в мире
  const handleSpawn = async () => {
    if (!connectedAddress) return;
    setActionPending(true);

    try {
      if (isDirectSignerMode && EncryptedRamSigner.isLocked()) {
        setStatusText('⏳ Прямой ончейн-спавн в Monad RPC...');
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'spawn',
            args: [connectedAddress as `0x${string}`]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        setStatusText('⏳ Рождение игрока через релеер (Gasless)...');
        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'spawn', player: connectedAddress })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Relayer error');
      }

      await onStateRefresh();
      await fetchPlayer();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при спавне: ' + (err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  // Перемещение
  const handleMove = async (targetX: number, targetY: number) => {
    if (!connectedAddress || !player?.exists) return;
    setActionPending(true);
    setStatusText(`⏳ Ход на (${targetX}, ${targetY})...`);

    try {
      if (isDirectSignerMode && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: VERSE_ABI,
            functionName: 'moveDirect',
            args: [targetX, targetY]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const sessionAccount = getOrCreateSessionAccount();
        const nonce = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: VERSE_ABI,
          functionName: 'nonces',
          args: [connectedAddress as `0x${string}`]
        });

        const moveInnerHash = keccak256(
          encodePacked(
            ['string', 'address', 'int32', 'int32', 'uint256', 'uint256'],
            ['Move', connectedAddress as `0x${string}`, targetX, targetY, nonce, BigInt(10143)]
          )
        );

        const moveSig = await sessionAccount.signMessage({
          message: { raw: moveInnerHash }
        });

        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            player: connectedAddress,
            targetX,
            targetY,
            moveSig
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Move error');
      }

      await onStateRefresh();
      await fetchPlayer();
    } catch (err: any) {
      console.error(err);
      alert('Недопустимый ход или ошибка: ' + (err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  // Ончейн-отзыв сессии
  const handleRevokeSession = async (walletProviders: EIP6963ProviderDetail[]) => {
    if (!connectedAddress) return;
    if (!confirm('Вы уверены, что хотите аннулировать сессию? Текущий временный ключ будет заблокирован в блокчейне.')) return;

    setActionPending(true);
    setStatusText('⏳ Аннулирование сессии ончейн...');

    try {
      const nonce = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: VERSE_ABI,
        functionName: 'nonces',
        args: [connectedAddress as `0x${string}`]
      });

      const revokeInnerHash = keccak256(
        encodePacked(
          ['string', 'address', 'uint256', 'uint256'],
          ['RevokeSession', connectedAddress as `0x${string}`, nonce, BigInt(10143)]
        )
      );

      let prov = (window as any).ethereum;
      if (!prov && walletProviders.length > 0) {
        prov = walletProviders[0].provider;
      }

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(prov)
      });

      const sig = await walletClient.signMessage({
        account: connectedAddress as `0x${string}`,
        message: { raw: revokeInnerHash }
      });

      const res = await fetch(RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_session',
          player: connectedAddress,
          sig
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || 'Revoke failed');

      resetSessionAccount();
      setStatusText('🔒 Сессия успешно отозвана в блокчейне!');
      await onStateRefresh();
      await fetchPlayer();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при отзыве сессии: ' + (err.shortMessage || err.message));
    } finally {
      setActionPending(false);
    }
  };

  const handleExitRam = () => {
    EncryptedRamSigner.clear();
    setIsDirectSignerMode(false);
    setConnectedAddress('');
    setPlayer(null);
  };

  return {
    player,
    isPlayerLoading,
    actionPending,
    isDirectSignerMode,
    connectProvider,
    connectWithPrivateKey,
    handleSpawn,
    handleMove,
    handleRevokeSession,
    handleExitRam,
    fetchPlayer
  };
}
