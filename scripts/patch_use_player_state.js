const fs = require('fs');
let s = fs.readFileSync('client/src/hooks/usePlayerState.ts', 'utf8');

const targetPoint = '  const handleWithdrawGoogleWallet = async (targetAddress: string) => {';
const portalMethods = `  // ============================================================================
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
    setActionPending(true);
    setStatusText("🌀 Открытие Врат на (" + portalX + ", " + portalY + ")...");
    try {
      const founderBytes = ("0x" + Buffer.from(founderName, "utf8").toString("hex")).padEnd(66, "0");
      const worldBytes = ("0x" + Buffer.from(worldName, "utf8").toString("hex")).padEnd(66, "0");

      if (authMode === "private_key" && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: "createPortalDirect",
            args: [targetContract, founderBytes, worldBytes, portalX, portalY]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || window.ethereum;
        if (!prov) throw new Error("Для открытия Врат подключите MetaMask или кошелек");
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: "createPortalDirect",
          args: [targetContract, founderBytes, worldBytes, portalX, portalY],
          account: connectedAddress
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
      if (authMode === "private_key" && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: "transferPortalDirect",
            args: [BigInt(portalId), newOwner]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || window.ethereum;
        if (!prov) throw new Error("Для передачи владения подключите MetaMask");
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: "transferPortalDirect",
          args: [BigInt(portalId), newOwner],
          account: connectedAddress
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
      if (authMode === "private_key" && EncryptedRamSigner.isLocked()) {
        await EncryptedRamSigner.executeWithSigner(async (walletClient) => {
          const hash = await walletClient.writeContract({
            address: AAA_CONTRACT_ADDRESS,
            abi: AAA_ABI,
            functionName: "destroyPortalDirect",
            args: [BigInt(portalId), portalX, portalY]
          });
          await publicClient.waitForTransactionReceipt({ hash });
        });
      } else {
        const prov = activeMetaMaskProvider || window.ethereum;
        if (!prov) throw new Error("Для сноса врат подключите MetaMask");
        const walletClient = createWalletClient({
          chain: monadTestnet,
          transport: custom(prov)
        });
        const hash = await walletClient.writeContract({
          address: AAA_CONTRACT_ADDRESS,
          abi: AAA_ABI,
          functionName: "destroyPortalDirect",
          args: [BigInt(portalId), portalX, portalY],
          account: connectedAddress
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setStatusText("✅ Врата #" + portalId + " успешно уничтожены и стерты с карты!");
      await onStateRefresh();
    } finally {
      setActionPending(false);
    }
  };

  const handleWithdrawGoogleWallet = async (targetAddress: string) => {`;

s = s.replace(targetPoint, portalMethods);

s = s.replace(/handleExitRam,\r?\n\s*fetchPlayer/, 'handleExitRam,\n    handleCreatePortal,\n    handleTransferPortal,\n    handleDestroyPortal,\n    fetchPlayer');

fs.writeFileSync('client/src/hooks/usePlayerState.ts', s, 'utf8');
console.log('usePlayerState updated.');
