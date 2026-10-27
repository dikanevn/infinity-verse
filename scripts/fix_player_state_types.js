const fs = require('fs');
let s = fs.readFileSync('client/src/hooks/usePlayerState.ts', 'utf8');

// Заменяем блок управления порталами на строго типизированный с viem stringToHex
const oldPortalBlockStart = '  // ============================================================================';
const portalIndex = s.indexOf('// 10. УПРАВЛЕНИЕ ПОРТАЛАМИ МУЛЬТИВСЕЛЕННОЙ');

if (portalIndex !== -1) {
  const endIndex = s.indexOf('const handleWithdrawGoogleWallet = async');
  const cleanPortalBlock = `// 10. УПРАВЛЕНИЕ ПОРТАЛАМИ МУЛЬТИВСЕЛЕННОЙ (DIRECT: PRIVATE KEY ИЛИ METAMASK)
  // ============================================================================
  const handleCreatePortal = async (
    targetContract: string,
    founderName: string,
    worldName: string,
    portalX: number,
    portalY: number
  ) => {
    if (!connectedAddress) return;
    setActionPending(true);
    setStatusText("🌀 Открытие Врат на (" + portalX + ", " + portalY + ")...");
    try {
      const padBytes32 = (str: string): \`0x\${string}\` => {
        let hex = '';
        for (let i = 0; i < str.length && i < 32; i++) {
          hex += str.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return ('0x' + hex.padEnd(64, '0')) as \`0x\${string}\`;
      };

      const founderBytes = padBytes32(founderName);
      const worldBytes = padBytes32(worldName);
      const targetAddr = targetContract as \`0x\${string}\`;

      if (authMode === 'private_key' && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: 'createPortalDirect',
            args: [targetAddr, founderBytes, worldBytes, portalX, portalY]
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
          account: connectedAddress as \`0x\${string}\`
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
      const ownerAddr = newOwner as \`0x\${string}\`;
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
          account: connectedAddress as \`0x\${string}\`
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
          account: connectedAddress as \`0x\${string}\`
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatusText("✅ Врата #" + portalId + " успешно уничтожены и стерты с карты!");
      await onStateRefresh();
    } finally {
      setActionPending(false);
    }
  };

  `;

  s = s.slice(0, portalIndex) + cleanPortalBlock + s.slice(endIndex);
  fs.writeFileSync('client/src/hooks/usePlayerState.ts', s, 'utf8');
  console.log('usePlayerState.ts cleaned and typed correctly');
}
