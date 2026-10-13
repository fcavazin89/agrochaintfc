const circomlib = require("circomlib");
const poseidon = circomlib.poseidon;

// Calculate commitment: Poseidon(qualityScore, salt, lotContext, standardContext, reportContext) 
const qualityScore = 85;
const salt = 12345;
const lotContext = 1;
const standardContext = 2;
const reportContext = 3;

const commitment = poseidon([qualityScore, salt, lotContext, standardContext, reportContext]);
console.log("Calculated commitment:", commitment.toString());