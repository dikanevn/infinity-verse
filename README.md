# How to Build a Mutable Blockchain Program with Infinite Memory — and Fit Multiverses Inside That Are Bigger on the Inside Than on the Outside

**PurplePaper**

This paper has two parts: the philosophical foundation and the technical details of how the smart contract is built.

---

## 1. Philosophical Foundation

I believe our universe is infinite in time. There are already theories explaining why we don't need to fear heat death from entropy. And I believe one of our true purposes is to create our own universes — infinite in both time and space.

Moreover, by some strange logic, nested universes can be bigger on the inside than they are on the outside.

Suppose we want to create a "smart-contract-universe" with the ability to infinitely nest other universes inside it.

The number of elementary particles in our observable Universe (10^80) is only about three times larger than the number of bits in the storage of a single EVM smart contract (3 × 10^79). In our strange logic, this means a single smart-contract-universe is only three times smaller than physical reality.

However, a single smart contract (let's call it **Level 0**) can hold links to nested addresses of **Level 1** smart-contract-universes. As a result, in our strange logic, the memory of our smart contract expands by a factor of 2^160 — meaning our blockchain universe becomes larger than physical reality by **4.38 × 10^47 times** (four hundred thirty-eight quattuordecillion).

And if Level 1 contracts begin spawning their own nested universes — Level 2, Level 3, and so on into infinity — we end up with nested multiverses of infinite size.

On top of that, we can deploy multiple Level 0 universes, giving us both infinite parallel expansion and infinite expansion into the depths.

Of course, skeptics and pessimists will say this is merely *potential* memory — that if you tried to fill it all up, there wouldn't be enough atoms in the real universe to store it.

To that, I would reply that our own universe is pretty weird, too. Because of the quantum nature of matter, the observer effect, and various other theories, we can just as easily say that not all atoms in our universe actually take up space on... let's call it the "external hard drive." Modern fundamental physics says the exact same thing: our reality operates strictly as **sparse storage** and **lazy evaluation**.

It's entirely possible that we don't have access to all the memory and compute of our universe either. Perhaps that is one of the explanations for the Fermi Paradox. Maybe we are inside an isolated flask, and everything our telescopes see is just a hologram projected onto an outer sphere.

There are games like *No Man's Sky* that feature a massive cosmos. But I have never seen a game where space isn't just vast, but truly *infinite*. And the blockchain gives this idea permanence and reliability — nobody wants to build something infinite on a centralized server.

This thought — that we can create internal universes that are bigger on the inside than on the outside — inspires me deeply!

We could also create a native token with **infinite mining**. Bitcoin is designed around the idea that once the last coin is mined, miners will survive purely on transaction fees. Personally, I don't believe people will still have to pay transfer fees in the distant future. What if we create a token with an **infinite halving** built right into it? That sounds pretty cool. How would it work? Simple: whenever we approach the supply cap, a new token is minted that exchanges at a 1 : 1,000,000,000 ratio to the current one. Once that one is fully mined out, a third token launches, and so on, forever. That way, the mining and halving everyone loves will never end!

I love programming. I have very, very little formal experience, but I am a programmer at heart. When I was 8 years old, I used to write BASIC code in a paper notebook at home and type it into the school computer after classes. I also beat that game on Steam (*Turing Complete*) where you build a working computer from scratch out of logic gates and transistors. I’ve already started vibe-coding the smart contract for this "infinite hard drive" and am testing it on the **Monad testnet**. If you're curious to see the code, check out the **MAIN** contract inside the **contracts** folder:

[GitHub Repository — Infinity Verse](https://github.com/dikanevn/infinity-verse)
```url
[https://github.com/dikanevn/infinity-verse](https://github.com/dikanevn/infinity-verse)
```
You can even play around in my Level 0 universe right now. In cells where no observer has been nearby, quantum chaos currently reigns. Soon, you'll be able to spawn your own universes where, starting from Level 1, you can build your own infinite nested worlds under your sole control. You can also play with the zoom slider — it has an outer boundary of 10^18, but no inner limit; the slider zooms in forever! It always used to bum me out when zooming in would eventually hit a wall. Try it here:
Infinity Verse — Live Demo
[https://dikanevn.github.io/infinity-verse/](https://dikanevn.github.io/infinity-verse/)

2. Technical Details
This is an infinite universe. Therefore, the eternal rule is that as we approach numerical limits (billions of years from now) or the limits of brute-force password cracking (as compute accelerates over time), the system must be upgraded for the new era — expanding key sizes and variable types, migrating to quantum-resistant algorithms, and so on.
 * Blockchain Archaeology (Dead Man's Switch for Eternity): The coolest mechanism I came up with is this: if a multiverse is abandoned and the contract admin remains inactive for a year, any "blockchain archaeologist" of the future can claim the contract, become the new admin, revive the world, and continue its history. This makes the multiverse truly eternal.
 * Decoupled Storage & Logic: What makes the EVM worse than newer blockchains? You can't change a contract's code after deployment. But that's solvable: we deploy a single storage contract — a "hard drive" — that holds all the state, while moving all the logic into separate, replaceable contracts. This lets us upgrade the logic contracts without ever losing data.
 * Dual Memory Management: Uses both standard Solidity mapping and direct low-level addressing of physical storage slots via Yul (inline assembly). The first 2^180 slots are protected from low-level writes — that space is reserved for core system state and other critical data.
 * Storage Contract Inheritance (Doubly Linked Upgrades): Even the storage contract itself can be upgraded through a contract inheritance chain — each generation knows its predecessor and successor, allowing external programs to traverse the chain and fetch the required state seamlessly.
 * Fractal Nested Worlds: The Level 0 universe holds pointers to Level 1 universes, which in turn hold pointers to Level 2 universes, creating an infinitely scalable fractal storage architecture.
 * Extreme Gas Optimization (Compiler): Deployed with the maximum possible optimizer setting (Runs = 4294967295) for theoretical gas savings across contract calls.
 * Admin Recovery & Timelock Security: Features a backup admin address that can replace the primary admin if they lose their keys and remain inactive for a week. It also prevents sudden hostile takeovers — any admin transfer requires a mandatory 48-hour timelock after signalling intent.
 * Zero-String Custom Errors: Complete elimination of require error strings in favor of 4-byte custom error selectors to save gas.
Later on, we can figure out who is going to pay for this infinite banquet and how to compress the data inside to make it cheaper — but that's a story for another day.
I would love to hear your comments, and especially your criticism!
Linktree — Nikolay Dikanev
[https://linktr.ee/dikanevn](https://linktr.ee/dikanevn)

Nikolai Dikanev

