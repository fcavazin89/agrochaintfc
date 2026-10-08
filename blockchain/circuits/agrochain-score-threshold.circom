pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Prova que:
 *   1. a nota privada é <= 100;
 *   2. ela é maior ou igual à nota mínima pública;
 *   3. o compromisso público foi criado para essa nota e um sal privado.
 *
 * A nota e o sal são inputs do circuito, mas NÃO são inputs públicos.
 * Dados públicos: compromisso e nota mínima, mais os hashes de lote,
 * padrão e laudo aos quais essa prova está vinculada.
 */
template AgroChainScoreThreshold() {
    signal input commitment;
    signal input minimumScore;
    signal input lotContext;
    signal input standardContext;
    signal input reportContext;
    signal input qualityScore;
    signal input salt;

    component scoreCommitment = Poseidon(5);
    scoreCommitment.inputs[0] <== qualityScore;
    scoreCommitment.inputs[1] <== salt;
    scoreCommitment.inputs[2] <== lotContext;
    scoreCommitment.inputs[3] <== standardContext;
    scoreCommitment.inputs[4] <== reportContext;
    commitment === scoreCommitment.out;

    component scoreIsValid = LessThan(8);
    scoreIsValid.in[0] <== qualityScore;
    scoreIsValid.in[1] <== 101;
    scoreIsValid.out === 1;

    component minimumIsValid = LessThan(8);
    minimumIsValid.in[0] <== minimumScore;
    minimumIsValid.in[1] <== 101;
    minimumIsValid.out === 1;

    component scoreMeetsMinimum = LessThan(8);
    scoreMeetsMinimum.in[0] <== qualityScore;
    scoreMeetsMinimum.in[1] <== minimumScore;
    scoreMeetsMinimum.out === 0;
}

component main {public [commitment, minimumScore, lotContext, standardContext, reportContext]} = AgroChainScoreThreshold();
