import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Deposit } from "../target/types/deposit";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddressSync, getMint, getOrCreateAssociatedTokenAccount, mintToChecked, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";
import { execSync } from "child_process";

const sleep = require('util').promisify(setTimeout);

describe("deposit", () => {

  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.local("http://127.0.0.1:8899")
  const metaplex = Metaplex.make(provider.connection);
  const program = anchor.workspace.Deposit as Program<Deposit>;
  const deposit_account = anchor.web3.Keypair.generate();
  const deposit_auth = anchor.web3.Keypair.generate();
  let mint = anchor.web3.Keypair.generate();
  let usdc_auth = anchor.web3.Keypair.generate();

  let [pda_auth, pda_bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("auth"),
    deposit_account.publicKey.toBuffer()
    ],
    program.programId);

  let [sol_vault, sol_bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("sol_vault"),
    pda_auth.toBuffer()
    ],
    program.programId);

  execSync(
    `anchor idl init --filepath target/idl/deposit.json ${program.programId}`,
    { stdio: "inherit" }
  );

  before(async () => {

    let res = await provider.connection.requestAirdrop(deposit_auth.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);

    let latestBlockHash = await provider.connection.getLatestBlockhash()

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: res,
    });

  });

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize()
      .accounts({
        depositAccount: deposit_account.publicKey,
        pdaAuth: pda_auth,
        depositAuth: deposit_auth.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([deposit_account, deposit_auth]).rpc();

    console.log("Your transaction signature", tx);

    let result = await program.account.depositBase.fetch(deposit_account.publicKey);
    console.log(result);
  });

  it("Deposits native SOL", async () => {
    const deposit_amount = new anchor.BN(25 * anchor.web3.LAMPORTS_PER_SOL);
    const deposit_native_tx = await program.methods.depositNative(deposit_amount)
      .accounts({
        depositAccount: deposit_account.publicKey,
        pdaAuth: pda_auth,
        solVault: sol_vault,
        depositAuth: deposit_auth.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([deposit_auth]).rpc();

    let sol_vault_lamps = await provider.connection.getBalance(sol_vault);
    console.log(sol_vault_lamps);

    let result = await program.account.depositBase.fetch(deposit_account.publicKey);
    console.log(result);

  });

  it("Withdraws native SOL", async () => {
    let withdraw_amount = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

    const withdraw_native_tx = await program.methods.withdrawNative(withdraw_amount)
      .accounts({
        depositAccount: deposit_account.publicKey,
        pdaAuth: pda_auth,
        solVault: sol_vault,
        depositAuth: deposit_auth.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([deposit_auth]).rpc();

    let sol_vault_lamps = await provider.connection.getBalance(sol_vault);
    console.log(sol_vault_lamps);

  });

  xit("Create mock SPL Token", async () => {

    let token_mint = await createMint(
      provider.connection,
      deposit_auth,
      usdc_auth.publicKey,
      usdc_auth.publicKey,
      6,
      mint,
      null,
      TOKEN_PROGRAM_ID
    );

    let test = await getMint(provider.connection, mint.publicKey, null, TOKEN_PROGRAM_ID);
    console.log(test);

    let deposit_auth_usdc_acct = await getOrCreateAssociatedTokenAccount(provider.connection, deposit_auth, mint.publicKey, deposit_auth.publicKey, false, undefined, undefined, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)

    let mint_to_sig = await mintToChecked(provider.connection, deposit_auth, mint.publicKey, deposit_auth_usdc_acct.address, usdc_auth, 200e6, 6, [], undefined, TOKEN_PROGRAM_ID);

    console.log(mint_to_sig);

  });

  xit("Deposits SPL Token", async () => {
    let to_token_acct = getAssociatedTokenAddressSync(mint.publicKey, pda_auth, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    let from_token_acct = getAssociatedTokenAddressSync(mint.publicKey, deposit_auth.publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    let deposit_spl_tx = await program.methods.depositSpl(new anchor.BN(25e6)).accounts({
     
    }).signers([deposit_auth]).rpc();

    console.log(deposit_spl_tx);

  });

  xit("Withdraws SPL Token", async () => {

  });

});;