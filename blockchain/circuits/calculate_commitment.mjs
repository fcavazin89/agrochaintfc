import { poseidon5 } from "poseidon-lite";

// Calculate commitment: Poseidon(qualityScore, salt, lotContext, standardContext, reportContext)
const qualityScore = 85n;
const salt = 12345n;
const lotContext = 1n;
const standardContext = 2n;
const reportContext = 3n;

const commitment = poseidon5([qualityScore, salt, lotContext, standardContext, reportContext]);
console.log("Calculated commitment:", commitment.toString());