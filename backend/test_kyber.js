import kyber from "crystals-kyber";

try {
  console.log("Kyber imported successfully");
  // Check exports
  console.log(Object.keys(kyber));

  if (kyber.Kyber768) {
    console.log("Kyber768 found");
    const { pk, sk } = kyber.Kyber768.keyPair();
    console.log("Keypair generated");
    console.log("PK length:", pk.length);
  } else {
    console.log("Kyber768 NOT found in default export");
    // Try named imports?
  }
} catch (e) {
  console.error("Error:", e);
}
