import { useState, useEffect } from 'react';
import { createWalletClient, custom, keccak256, encodePacked, encodeFunctionData } from 'viem';
import type { PlayerData, EIP6963ProviderDetail, AuthMode } from '../types';
import {
  AAA_CONTRACT_ADDRESS,
  AAA_ABI,
  RELAYER_URL,
  monadTestnet,
  publicClient
} from '../config/contracts';
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

  // Режим авторизации:
  // 'none' | 'google' | 'metamask_session' | 'private_key' | 'metamask_direct'
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [googleIdToken, setGoogleIdToken] = useState<string>('');
  const [googleEmail, setGoogleEmail] = useState<string>(() => localStorage.getItem('infinity_google_email') || '');
  const [activeMetaMaskProvider, setActiveMetaMaskProvider] = useState<any>(null);

  // Производные флаги для UI
  const isDirectSignerMode = authMode === 'private_key';
  const isGoogleMode = authMode === 'google';
  const isMetaMaskSessionMode = authMode === 'metamask_session';
  const isMetaMaskDirectMode = authMode === 'metamask_direct';
  const isMetaMaskMode = isMetaMaskSessionMode || isMetaMaskDirectMode;

  // ============================================================================
  // 1. ЧТЕНИЕ СОСТОЯНИЯ ИГРОКА ИЗ MAIN_G_2
  // ============================================================================
  const fetchPlayer = async () => {
    if (!connectedAddress) return;
    try {
      const pData: any = await publicClient.readContract({
        address: AAA_CONTRACT_ADDRESS,
        abi: AAA_ABI,
        functionName: 'getPlayer',
        args: [connectedAddress as `0x${string}`]
      });

      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2]),
        sessionKey: pData[3],
        sessionExpiry: Number(pData[4]),
        registeredAtBlock: Number(pData[5]),
        registeredAtTimestamp: Number(pData[6])
      });
    } catch (e) {
      console.error('Fetch player error:', e);
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      fetchPlayer();
      const interval = setInterval(fetchPlayer, 5000);
      return () => clearInterval(interval);
    } else {
      setPlayer(null);
    }
  }, [connectedAddress]);

  // ============================================================================
  // 2. ВХОД METAMASK С СЕССИЕЙ НА 20 ЧАСОВ (GASLESS: 1 ПОДПИСЬ БЕЗ КОМИССИИ, ДАЛЬШЕ БЕЗ ОКОН)
  // ============================================================================
  const connectMetaMaskWithSession = async (
    providerDetail?: EIP6963ProviderDetail,
    onSuccess?: () => void
  ) => {
    try {
      const prov = providerDetail?.provider || (window as any).ethereum;
      if (!prov) {
        alert('Кошелёк не найден! Установите расширение MetaMask, Rabby или Phantom.');
        return;
      }
      setIsPlayerLoading(true);
      setStatusText('🦊 Запрос подключения кошелька...');

      const accounts = await prov.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) {
        setIsPlayerLoading(false);
        return;
      }

      const userAddress = accounts[0];
      setConnectedAddress(userAddress);
      setActiveMetaMaskProvider(prov);

      const sessionAccount = getOrCreateSessionAccount();
      const nowSec = Math.floor(Date.now() / 1000);

      // Проверяем статус в контракте
      const pData: any = await publicClient.readContract({
        address: AAA_CONTRACT_ADDRESS,
        abi: AAA_ABI,
        functionName: 'getPlayer',
        args: [userAddress as `0x${string}`]
      });

      const isSessionActive =
        pData[3] &&
        pData[3].toLowerCase() === sessionAccount.address.toLowerCase() &&
        Number(pData[4]) > nowSec;

      if (!isSessionActive) {
        setStatusText('✍️ Подпишите сессию в MetaMask (1 раз на 20 часов, без комиссии)...');
        const expiry = nowSec + 72000;
        const nonce = await publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
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

        setStatusText('⏳ Регистрация сессии через спонсора...');
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
      }

      setAuthMode('metamask_session');
      setStatusText('✅ MetaMask подключен: сессия активна на 20 часов! Играйте без окон и без газа.');
      await fetchPlayer();
      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при авторизации MetaMask: ' + (err.shortMessage || err.message));
    } finally {
      setIsPlayerLoading(false);
    }
  };

  // ============================================================================
  // 3. ВХОД METAMASK DIRECT (РУЧНОЙ РЕЖИМ С ПОДТВЕРЖДЕНИЕМ КАЖДОГО ДЕЙСТВИЯ ЗА СВОЙ ГАЗ)
  // ============================================================================
  const connectProvider = async (
    providerDetail?: EIP6963ProviderDetail,
    onSuccess?: () => void
  ) => {
    try {
      const prov = providerDetail?.provider || (window as any).ethereum;
      if (!prov) {
        alert('Кошелёк не найден! Установите расширение MetaMask, Rabby или Phantom.');
        return;
      }
      setIsPlayerLoading(true);
      setStatusText('🦊 Подключение внешнего кошелька (MetaMask Direct)...');

      const accounts = await prov.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts[0]) {
        setIsPlayerLoading(false);
        return;
      }

      // Проверяем и при необходимости переключаем сеть в MetaMask на Monad Testnet (10143 = 0x279f)
      try {
        await prov.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x279f' }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await prov.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x279f',
              chainName: 'Monad Testnet',
              nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              blockExplorerUrls: ['https://testnet.monadvision.com']
            }]
          });
        }
      }

      const userAddress = accounts[0];
      setConnectedAddress(userAddress);
      setAuthMode('metamask_direct');
      setActiveMetaMaskProvider(prov);

      await fetchPlayer();
      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка подключения кошелька: ' + (err.shortMessage || err.message));
    } finally {
      setIsPlayerLoading(false);
    }
  };

  // ============================================================================
  // 4. ВХОД: ПРИВАТНЫЙ КЛЮЧ (DIRECT БЕЗ ОКОН С ШИФРОВАНИЕМ В RAM)
  // ============================================================================
  const connectWithPrivateKey = async (
    rawKey: string,
    forceMode?: 'aes' | 'xor',
    onSuccess?: () => void
  ) => {
    try {
      setIsPlayerLoading(true);
      setStatusText(
        forceMode === 'xor'
          ? '🔐 [DEV XOR] Маскирование ключа в RAM случайной маской...'
          : '🔐 [AES-GCM] Шифрование ключа в RAM (Web Crypto)...'
      );

      const userAddress = await EncryptedRamSigner.lockPrivateKey(rawKey, forceMode);
      setConnectedAddress(userAddress);
      setAuthMode('private_key');

      await fetchPlayer();
      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при импорте ключа: ' + (err.message || err));
    } finally {
      setIsPlayerLoading(false);
    }
  };

  // ============================================================================
  // 5. ВХОД: GOOGLE OAUTH (GASLESS ЧЕРЕЗ СПОНСОРА)
  // ============================================================================
  const connectWithGoogle = async (
    idToken: string,
    onSuccess?: () => void
  ) => {
    try {
      setIsPlayerLoading(true);
      setStatusText('🔑 Авторизация в Cloudflare через Google ID Token...');

      const authRes = await fetch(`${RELAYER_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const authData = await authRes.json();
      if (!authRes.ok || authData.error) {
        throw new Error(authData.error || 'Google auth failed');
      }

      const playerAddr = authData.address;
      const playerEmail = authData.email || '';
      setConnectedAddress(playerAddr);
      setGoogleIdToken(idToken);
      setGoogleEmail(playerEmail);
      if (playerEmail) {
        localStorage.setItem('infinity_google_email', playerEmail);
      }
      setAuthMode('google');

      const sessionAccount = getOrCreateSessionAccount();
      const nowSec = Math.floor(Date.now() / 1000);

      const pData: any = await publicClient.readContract({
        address: AAA_CONTRACT_ADDRESS,
        abi: AAA_ABI,
        functionName: 'getPlayer',
        args: [playerAddr as `0x${string}`]
      });

      setPlayer({
        x: Number(pData[0]),
        y: Number(pData[1]),
        exists: Boolean(pData[2]),
        sessionKey: pData[3],
        sessionExpiry: Number(pData[4])
      });

      const isSessionActive =
        pData[3] &&
        pData[3].toLowerCase() === sessionAccount.address.toLowerCase() &&
        Number(pData[4]) > nowSec;

      if (!isSessionActive) {
        setStatusText('✍️ Подпись ончейн-сессии в защищенном анклаве Cloudflare (на 20 часов)...');
        const expiry = nowSec + 72000;

        const sessionRes = await fetch(`${RELAYER_URL}/auth/google/authorize-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            sessionKey: sessionAccount.address,
            expiry
          })
        });

        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || sessionData.error) {
          throw new Error(sessionData.error || 'Cloudflare session sign failed');
        }
      }

      setStatusText(`✅ Вход через Google! Адрес: ${playerAddr.slice(0, 6)}...${playerAddr.slice(-4)}`);
      if (onSuccess) onSuccess();
      await onStateRefresh();
    } catch (err: any) {
      console.error('Google connect error:', err);
      alert('Ошибка при входе через Google: ' + (err.message || err));
    } finally {
      setIsPlayerLoading(false);
    }
  };

  // ============================================================================
  // 6. УНИВЕРСАЛЬНЫЙ СПАВН (DIRECT vs GASLESS)
  // ============================================================================
  const handleSpawn = async () => {
    if (!connectedAddress) return;
    setActionPending(true);

    try {
      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct через RAM Signer)
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        setStatusText('⏳ Прямой ончейн-спавн в Monad RPC (spawnDirect)...');
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'spawnDirect',
            account: walletClient.account
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      }
      // РЕЖИМ 2: METAMASK DIRECT (Direct через всплывающее окно)
      else if (authMode === 'metamask_direct') {
        setStatusText('🦊 Подтвердите транзакцию спавна в MetaMask...');
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'spawnDirect',
          account: connectedAddress as `0x${string}`
        });
        setStatusText('⏳ Ожидание подтверждения спавна в Monad...');
        await publicClient.waitForTransactionReceipt({ hash });
      }
      // РЕЖИМ 3 & 4: GOOGLE или METAMASK СЕССИЯ (Gasless через спонсора с подписью сессии)
      else {
        setStatusText('⏳ Рождение игрока через спонсора (spawnGasless)...');
        const sessionAccount = getOrCreateSessionAccount();
        const nonce = await publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'nonces',
          args: [connectedAddress as `0x${string}`]
        });

        const spawnInnerHash = keccak256(
          encodePacked(
            ['string', 'address', 'uint256', 'uint256'],
            ['Spawn', connectedAddress as `0x${string}`, nonce, BigInt(10143)]
          )
        );

        const sig = await sessionAccount.signMessage({
          message: { raw: spawnInnerHash }
        });

        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'spawn',
            player: connectedAddress,
            sig
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Relayer error');
      }

      setStatusText('🎉 Персонаж успешно родился в мире!');
      await onStateRefresh();
      await fetchPlayer();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при спавне: ' + (err.shortMessage || err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  // ============================================================================
  // 7. УНИВЕРСАЛЬНЫЙ ХОД (DIRECT vs GASLESS)
  // ============================================================================
  const handleMove = async (targetX: number, targetY: number) => {
    if (!connectedAddress || !player?.exists) return;
    setActionPending(true);
    setStatusText(`⏳ Ход на (${targetX}, ${targetY})...`);

    try {
      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct за собственный газ)
      if (authMode === 'private_key') {
        if (!EncryptedRamSigner.isLocked()) {
          const devKey = (window as any).__DEV_LOCAL_PK__ || (typeof __DEV_LOCAL_PK__ !== 'undefined' ? __DEV_LOCAL_PK__ : '');
          if (devKey) {
            await EncryptedRamSigner.lockPrivateKey(devKey, 'xor');
          } else {
            throw new Error('Приватный ключ в оперативной памяти сброшен. Введите ключ заново.');
          }
        }
        const intX = Math.trunc(targetX);
        const intY = Math.trunc(targetY);
        
        // Проверяем баланс игрока на газ перед вызовом RPC
        const bal = await publicClient.getBalance({ address: connectedAddress as `0x${string}` });
        if (bal < 15000000000000000n) { // меньше 0.015 MON
          throw new Error('Недостаточно MON на балансе для оплаты газа в Monad Testnet. Пополните кошелек.');
        }

        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          // Задаем явный щедрый лимит газа 250,000, чтобы не падать по Out-Of-Gas при ончейн-майнинге звезды
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'moveDirect',
            args: [intX, intY],
            account: walletClient.account,
            gas: 250000n
          });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          if (receipt.status === 'reverted') {
            throw new Error(`Транзакция отменена контрактом (reverted). Проверьте препятствия на клетке (${intX}, ${intY}).`);
          }
        });
      }
      // РЕЖИМ 2: METAMASK DIRECT (Direct с подтверждением окна)
      else if (authMode === 'metamask_direct') {
        setStatusText(`🦊 Подтвердите шаг на (${targetX}, ${targetY}) в MetaMask...`);
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const data = encodeFunctionData({
          abi: AAA_ABI,
          functionName: 'moveDirect',
          args: [targetX, targetY]
        });
        const hash = await walletClient.sendTransaction({
          account: connectedAddress as `0x${string}`,
          to: AAA_CONTRACT_ADDRESS,
          data
        });
        setStatusText('⏳ Фиксация шага в Monad...');
        await publicClient.waitForTransactionReceipt({ hash });
      }
      // РЕЖИМ 3 & 4: GOOGLE или METAMASK СЕССИЯ (Gasless по EIP-191 подписи сессии)
      else {
        const sessionAccount = getOrCreateSessionAccount();
        const nonce = await publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
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

      setStatusText(`✅ Успешный шаг на (${targetX}, ${targetY})`);
      await fetchPlayer();
      await onStateRefresh();
    } catch (err: any) {
      console.error('MOVE ERROR:', err);
      const detailedMsg = err.shortMessage || err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      alert(`[Режим: ${authMode}] Ошибка хода: ${detailedMsg}`);
      await fetchPlayer();
    } finally {
      setActionPending(false);
    }
  };

  // ============================================================================
  // 7.1 АВТО-РАЗВЕДКА ТЕРРИТОРИИ ПАЧКОЙ (DIRECT vs GASLESS)
  // ============================================================================
  const handleDiscoverBatch = async (xs: number[], ys: number[]) => {
    if (!connectedAddress || !player?.exists || xs.length === 0 || xs.length !== ys.length) return;
    setActionPending(true);
    setStatusText(`✨ Разведка космоса (${xs.length} клеток)...`);

    try {
      // РЕЖИМ 1: ПРИВАТНЫЙ КЛЮЧ (Direct)
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        const intXs = xs.map(x => Math.trunc(x));
        const intYs = ys.map(y => Math.trunc(y));
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'discoverCellsBatchDirect',
            args: [intXs, intYs],
            account: walletClient.account
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      }
      // РЕЖИМ 2: METAMASK DIRECT
      else if (authMode === 'metamask_direct') {
        setStatusText(`🦊 Подтвердите разведку ${xs.length} клеток в MetaMask...`);
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'discoverCellsBatchDirect',
          args: [xs, ys],
          account: connectedAddress as `0x${string}`
        });
        setStatusText('⏳ Материализация клеток в Monad...');
        await publicClient.waitForTransactionReceipt({ hash });
      }
      // РЕЖИМ 3 & 4: GOOGLE или METAMASK СЕССИЯ (Gasless через релеер)
      else {
        const sessionAccount = getOrCreateSessionAccount();
        const nonce = await publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'nonces',
          args: [connectedAddress as `0x${string}`]
        });

        const batchInnerHash = keccak256(
          encodePacked(
            ['string', 'address', 'int32[]', 'int32[]', 'uint256', 'uint256'],
            ['DiscoverBatch', connectedAddress as `0x${string}`, xs, ys, nonce, BigInt(10143)]
          )
        );

        const sig = await sessionAccount.signMessage({
          message: { raw: batchInnerHash }
        });

        const res = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'discover_batch',
            player: connectedAddress,
            xs,
            ys,
            sig
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Discover batch error');
      }

      setStatusText(`✨ Разведано клеток: ${xs.length}!`);
      await onStateRefresh();
      await fetchPlayer();
    } catch (err: any) {
      console.error('Discover batch error:', err);
      // Не прерываем игру алертами если что-то пошло не так при фоновой разведке
      setStatusText('⚠️ Ошибка авто-разведки: ' + (err.shortMessage || err.message || err));
    } finally {
      setActionPending(false);
    }
  };

  // ============================================================================
  // 8. АННУЛИРОВАНИЕ СЕССИИ (DIRECT vs GASLESS)
  // ============================================================================
  const handleRevokeSession = async () => {
    if (!connectedAddress) return;
    if (!confirm('Вы уверены, что хотите аннулировать сессию? Текущий временный ключ будет заблокирован в блокчейне.')) return;

    setActionPending(true);
    setStatusText('⏳ Аннулирование сессии ончейн...');

    try {
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'revokeSessionDirect',
            account: walletClient.account
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else if (authMode === 'metamask_direct') {
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'revokeSessionDirect',
          account: connectedAddress as `0x${string}`
        });
        await publicClient.waitForTransactionReceipt({ hash });
      } else {
        const nonce = await publicClient.readContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'nonces',
          args: [connectedAddress as `0x${string}`]
        });

        const revokeInnerHash = keccak256(
          encodePacked(
            ['string', 'address', 'uint256', 'uint256'],
            ['RevokeSession', connectedAddress as `0x${string}`, nonce, BigInt(10143)]
          )
        );

        const sessionAccount = getOrCreateSessionAccount();
        const sig = await sessionAccount.signMessage({
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
      }

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

  // ============================================================================
  // 9. ВЫВОД МОНЕТ С GOOGLE-КОШЕЛЬКА
  // ============================================================================
  // ============================================================================
  // 10. УПРАВЛЕНИЕ ПОРТАЛАМИ МУЛЬТИВСЕЛЕННОЙ (DIRECT: PRIVATE KEY ИЛИ METAMASK)
  // ============================================================================
  const handleCreatePortal = async (
    targetContract: string,
    founderName: string,
    worldName: string,
    portalX: number,
    portalY: number
  ) => {
    if (!connectedAddress) return;
    if (player?.exists && (portalX !== player.x + 1 || portalY !== player.y)) {
      alert(`Портал можно поставить ТОЛЬКО строго справа от себя на (${player.x + 1}, ${player.y})!`);
      return;
    }
    setActionPending(true);
    setStatusText("🌀 Открытие Врат справа от себя на (" + portalX + ", " + portalY + ")...");
    try {
      const padBytes32 = (str: string): `0x${string}` => {
        let hex = '';
        for (let i = 0; i < str.length && i < 32; i++) {
          hex += str.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return ('0x' + hex.padEnd(64, '0')) as `0x${string}`;
      };

      const founderBytes = padBytes32(founderName);
      const worldBytes = padBytes32(worldName);
      const targetAddr = targetContract as `0x${string}`;

      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'createPortalDirect',
            args: [targetAddr, founderBytes, worldBytes, Math.trunc(portalX), Math.trunc(portalY)],
            account: walletClient.account
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        if (!prov) throw new Error('Для открытия Врат подключите MetaMask или кошелек');
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'createPortalDirect',
          args: [targetAddr, founderBytes, worldBytes, portalX, portalY],
          account: connectedAddress as `0x${string}`
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatusText("✅ Врата Мультивселенной успешно материализованы на (" + portalX + ", " + portalY + ")!");
      await onStateRefresh();
      await fetchPlayer();
    } finally {
      setActionPending(false);
    }
  };

  const handleTransferPortal = async (portalId: number, newOwner: string) => {
    if (!connectedAddress) return;
    setActionPending(true);
    setStatusText("👑 Передача владения порталом #" + portalId + "...");
    try {
      const ownerAddr = newOwner as `0x${string}`;
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'transferPortalDirect',
            args: [BigInt(portalId), ownerAddr]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        if (!prov) throw new Error('Для передачи владения подключите MetaMask');
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'transferPortalDirect',
          args: [BigInt(portalId), ownerAddr],
          account: connectedAddress as `0x${string}`
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatusText("✅ Владение порталом #" + portalId + " успешно передано!");
      await onStateRefresh();
    } finally {
      setActionPending(false);
    }
  };

  const handleDestroyPortal = async (portalId: number, portalX: number, portalY: number) => {
    if (!connectedAddress) return;
    setActionPending(true);
    setStatusText("💥 Снос Врат #" + portalId + " на (" + portalX + ", " + portalY + ")...");
    try {
      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'destroyPortalDirect',
            args: [BigInt(portalId), portalX, portalY]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || (window as any).ethereum;
        if (!prov) throw new Error('Для сноса врат подключите MetaMask');
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: 'destroyPortalDirect',
          args: [BigInt(portalId), portalX, portalY],
          account: connectedAddress as `0x${string}`
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatusText("✅ Врата #" + portalId + " успешно уничтожены и стерты с карты!");
      await onStateRefresh();
    } finally {
      setActionPending(false);
    }
  };

  const handleWithdrawGoogleWallet = async (targetAddress: string) => {
    if (!googleIdToken) {
      alert('Вывод доступен только для сессии Google Login');
      return;
    }
    if (!targetAddress || !targetAddress.startsWith('0x') || targetAddress.length !== 42) {
      alert('Укажите корректный EVM адрес (0x...)');
      return;
    }

    try {
      setActionPending(true);
      setStatusText('💸 Отправка транзакции вывода монет с Cloudflare кошелька...');
      const res = await fetch(`${RELAYER_URL}/auth/google/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleIdToken,
          targetAddress
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Withdraw failed');
      }

      setStatusText(`✅ Монеты успешно выведены! Tx: ${data.txHash.slice(0, 10)}...`);
      alert(`Успешно отправлено! Хэш транзакции: ${data.txHash}`);
      await fetchPlayer();
    } catch (err: any) {
      console.error(err);
      alert('Ошибка вывода: ' + (err.shortMessage || err.message));
    } finally {
      setActionPending(false);
    }
  };

  const handleExitRam = () => {
    EncryptedRamSigner.clear();
    setAuthMode('none');
    setGoogleIdToken('');
    setGoogleEmail('');
    localStorage.removeItem('infinity_google_email');
    setActiveMetaMaskProvider(null);
    setConnectedAddress('');
    setPlayer(null);
  };

  return {
    player,
    isPlayerLoading,
    actionPending,
    authMode,
    isDirectSignerMode,
    isGoogleMode,
    isMetaMaskSessionMode,
    isMetaMaskDirectMode,
    isMetaMaskMode,
    googleIdToken,
    googleEmail,
    connectProvider,
    connectMetaMaskWithSession,
    connectWithPrivateKey,
    connectWithGoogle,
    handleWithdrawGoogleWallet,
    handleSpawn,
    handleMove,
    handleDiscoverBatch,
    handleRevokeSession,
    handleExitRam,
    handleCreatePortal,
    handleTransferPortal,
    handleDestroyPortal,
    fetchPlayer
  };
}
