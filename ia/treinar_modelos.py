#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
AGROCHAIN · PIPELINE DE APRENDIZADO DE MÁQUINA
Previsão de safra e de preço para café (conilon/arábica) e cacau em Rondônia
=============================================================================

O QUE ESTE SCRIPT FAZ
---------------------
Treina e valida quatro modelos de aprendizado de máquina de verdade, mede o
desempenho com validação cruzada e grava os resultados em JSON para serem
citados no documento técnico do projeto:

  1. Produtividade de café conilon  (sacas/ha)  — Gradient Boosting
  2. Produtividade de cacaueiro     (kg/ha)     — Gradient Boosting
  3. Preço de café conilon em 30 d  (R$/saca)   — Random Forest
  4. Direção do preço do cacau      (alta/baixa) — Random Forest + classificação

HONESTIDADE METODOLÓGICA — LEIA ANTES DE USAR OS NÚMEROS
--------------------------------------------------------
Os dados de treino são SINTÉTICOS, gerados por um simulador agronômico
construído com parâmetros da literatura (produtividade média de conilon e
cacau em Rondônia, resposta à chuva, ao NDVI e à idade da lavoura; séries de
preço com tendência, sazonalidade e volatilidade compatíveis com o mercado de
2026, ancoradas nas cotações reais de 06/10/2026).

Isso significa: as MÉTRICAS medem a capacidade do modelo de aprender a
estrutura do simulador — não substituem uma validação em campo. O que este
script entrega é o encanamento completo e testado (geração de atributos,
treino, validação cruzada, métricas, importância de variáveis, exportação do
modelo). Ao chegar dado real de cooperativa (histórico de balança, laudo,
NDVI de satélite, estação meteorológica), basta trocar a fonte em
`gerar_base_*` e rodar de novo — o resto do pipeline não muda.

Uso:  python3 treinar_modelos.py
Saída: modelos.json (métricas + importâncias), relatorio_ml.txt
=============================================================================
"""

import json
import os
from datetime import datetime

import numpy as np

try:
    from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, RandomForestClassifier
    from sklearn.model_selection import cross_val_score, KFold, train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score, mean_absolute_percentage_error, accuracy_score, roc_auc_score
except ImportError:  # pragma: no cover
    raise SystemExit("Instale o scikit-learn: pip install scikit-learn")

SEMENTE = 20261006
np.random.seed(SEMENTE)
AQUI = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# ÂNCORAS REAIS DE MERCADO (06/10/2026) — usadas para calibrar o simulador
# ---------------------------------------------------------------------------
ANCORAS = {
    "cafe_arabica": 1568.95,   # R$/saca 60 kg (Cepea/Esalq)
    "cafe_conilon": 976.94,    # R$/saca 60 kg (Cepea/Esalq)
    "cacau": 25.80,            # R$/kg   (referência regional, pós-correção 2026)
}


# ===========================================================================
# 1. SIMULADOR DE BASE AGRONÔMICA
# ===========================================================================
def gerar_base_cafe(n=1200, semente=SEMENTE):
    """
    Gera histórico sintético de talhões de café conilon em Rondônia.

    Cada linha é um "talhão-ano" com atributos que o produtor ou a cooperativa
    realmente tem em mãos: idade da lavoura, NDVI, chuva acumulada do trimestre,
    irrigação, temperatura média, horas de frio (irrelevante aqui, mas mantido
    porque arábica precisa), pressão de ferrugem e histórico da safra anterior.
    """
    rnd = np.random.RandomState(semente)

    idade = rnd.randint(2, 20, n)
    ndvi = np.clip(rnd.normal(0.68, 0.07, n), 0.40, 0.88)
    chuva = np.clip(rnd.normal(430, 130, n), 80, 900)         # mm no trimestre
    irrigado = rnd.binomial(1, 0.35, n)
    temp = rnd.normal(26.5, 1.8, n)
    ferrugem = np.clip(rnd.normal(42, 18, n) + (chuva - 430) * 0.04, 5, 95)
    historico = np.clip(rnd.normal(52, 12, n), 15, 95)        # safra anterior

    # Curva de maturação do conilon: produção plena entre 7 e 14 anos
    f_idade = np.select(
        [idade < 2, idade < 4, idade <= 6, idade <= 14, idade <= 18],
        [0.35, 0.72, 0.95, 1.00, 0.92], default=0.85)
    f_ndvi = np.clip(1 + (ndvi - 0.68) * 1.5, 0.90, 1.10)
    f_chuva = np.select(
        [chuva < 0.62 * 460, chuva < 0.82 * 460, chuva <= 1.35 * 460],
        [0.88, 0.94, 1.00], default=0.97)
    f_chuva = np.clip(f_chuva + irrigado * 0.06, 0.90, 1.05)
    f_sanidade = np.clip(1 - ferrugem / 700, 0.90, 1.00)
    f_manejo = np.clip(1 + (historico / 52 - 1) * 0.25, 0.88, 1.12)

    # Combinação amortecida em espaço logarítmico (mesma regra do motor JS)
    log_soma = np.log(f_idade) + np.log(f_ndvi) + np.log(f_chuva) + np.log(f_sanidade) + np.log(f_manejo)
    produtividade = historico * np.exp(log_soma * 0.65) + rnd.normal(0, 2.2, n)
    produtividade = np.clip(produtividade, 8, 95)

    X = np.column_stack([idade, ndvi, chuva, irrigado, temp, ferrugem, historico])
    return X, produtividade


def gerar_base_cacau(n=1000, semente=SEMENTE + 7):
    """Histórico sintético de cacaueiros (kg de amêndoa seca por hectare)."""
    rnd = np.random.RandomState(semente)

    idade = rnd.randint(3, 26, n)
    ndvi = np.clip(rnd.normal(0.66, 0.07, n), 0.40, 0.88)
    chuva = np.clip(rnd.normal(530, 150, n), 120, 1000)       # mm no trimestre
    sombra = rnd.binomial(1, 0.6, n)                          # consórcio/sombreamento
    temp = rnd.normal(26.0, 1.6, n)
    umid_rel = np.clip(rnd.normal(78, 9, n), 50, 98)
    vassoura = np.clip(rnd.normal(40, 18, n) + (umid_rel - 78) * 1.2, 5, 95)
    historico = np.clip(rnd.normal(870, 180, n), 300, 1500)

    f_idade = np.select(
        [idade < 3, idade < 6, idade < 9, idade <= 20],
        [0.30, 0.60, 0.85, 1.00], default=0.90)
    f_ndvi = np.clip(1 + (ndvi - 0.66) * 1.5, 0.90, 1.10)
    f_chuva = np.clip(1 + (chuva - 530) / 530 * 0.35, 0.86, 1.08)
    f_sombra = np.where(sombra == 1, 1.05, 0.94)
    f_sanidade = np.clip(1 - vassoura / 700, 0.90, 1.00)
    f_manejo = np.clip(1 + (historico / 870 - 1) * 0.25, 0.88, 1.12)

    log_soma = np.log(f_idade) + np.log(f_ndvi) + np.log(f_chuva) + np.log(f_sombra) + np.log(f_sanidade) + np.log(f_manejo)
    produtividade = historico * np.exp(log_soma * 0.65) + rnd.normal(0, 38, n)
    produtividade = np.clip(produtividade, 150, 1800)

    X = np.column_stack([idade, ndvi, chuva, sombra, temp, umid_rel, vassoura, historico])
    return X, produtividade


def gerar_base_preco(n=3000, produto="cafe_conilon", semente=SEMENTE + 13):
    """
    Gera janelas de mercado de 30 dias para previsão de preço.

    Para cada janela, cria atributos que um analista usaria: preço atual,
    média móvel de 30 e 60 dias, volatilidade realizada, tendência recente,
    mês do ano e aperto de oferta mundial (proxy de estoques).
    O alvo é o preço 30 dias à frente.
    """
    rnd = np.random.RandomState(semente)
    ancora = ANCORAS[produto]
    vol_diaria_base = 0.010 if produto == "cafe_conilon" else (0.008 if produto == "cafe_arabica" else 0.014)

    linhas, alvos = [], []
    for _ in range(n):
        # tendência da janela: o cacau em 2026 tem viés negativo, o café positivo
        if produto == "cacau":
            drift = rnd.normal(-0.0009, 0.0022)
        elif produto == "cafe_conilon":
            drift = rnd.normal(0.0006, 0.0018)
        else:
            drift = rnd.normal(0.0004, 0.0020)

        vol = max(0.004, rnd.normal(vol_diaria_base, 0.003))
        nivel = ancora * rnd.uniform(0.75, 1.30)             # nível de preço da janela
        ruido = rnd.normal(0, vol, 90).cumsum()
        serie = nivel * np.exp(ruido + drift * np.arange(90))

        preco_atual = serie[-1]
        mm30 = serie[-30:].mean()
        mm60 = serie[-60:].mean()
        ret30 = preco_atual / serie[-31] - 1
        ret7 = preco_atual / serie[-8] - 1
        vol_real = np.std(np.diff(np.log(serie[-30:]))) * np.sqrt(252)
        mes = rnd.randint(1, 13)
        estoque = np.clip(rnd.normal(1.0, 0.18), 0.6, 1.5)   # 1.0 = normal; <1 = aperto
        usd = np.clip(rnd.normal(5.30, 0.25), 4.7, 6.1)

        preco_futuro = serie[-1] * np.exp(drift * 30 + rnd.normal(0, vol * np.sqrt(30)))
        if produto == "cacau":
            preco_futuro *= np.exp(-0.012)                   # prêmio de baixa estrutural 2026
        else:
            preco_futuro *= np.exp(0.004)
        preco_futuro = float(np.clip(preco_futuro, ainda_min(produto) * 0.6, ancora * 1.9))

        linhas.append([preco_atual, mm30, mm60, ret30, ret7, vol_real, mes, estoque, usd])
        alvos.append(preco_futuro)

    return np.array(linhas), np.array(alvos)


def ainda_min(produto):
    return {"cafe_arabica": 1000.0, "cafe_conilon": 600.0, "cacau": 12.0}[produto]


# ===========================================================================
# 2. TREINO E AVALIAÇÃO
# ===========================================================================
def avaliar_regressao(nome, X, y, modelo, atributos):
    kf = KFold(n_splits=5, shuffle=True, random_state=SEMENTE)
    r2 = cross_val_score(modelo, X, y, cv=kf, scoring="r2")
    mae = -cross_val_score(modelo, X, y, cv=kf, scoring="neg_mean_absolute_error")
    mape = -cross_val_score(modelo, X, y, cv=kf, scoring="neg_mean_absolute_percentage_error")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=SEMENTE)
    modelo.fit(X_tr, y_tr)
    prev = modelo.predict(X_te)

    importancias = sorted(
        [{"variavel": a, "importancia": round(float(v), 4)} for a, v in zip(atributos, modelo.feature_importances_)],
        key=lambda d: -d["importancia"])

    return {
        "modelo": nome,
        "algoritmo": type(modelo).__name__,
        "registros": int(len(y)),
        "atributos": atributos,
        "validacao_cruzada_5x": {
            "r2_medio": round(float(r2.mean()), 4),
            "r2_desvio": round(float(r2.std()), 4),
            "mae_medio": round(float(mae.mean()), 2),
            "mape_medio_pct": round(float(mape.mean()) * 100, 2),
        },
        "conjunto_teste": {
            "r2": round(float(r2_score(y_te, prev)), 4),
            "mae": round(float(mean_absolute_error(y_te, prev)), 2),
            "mape_pct": round(float(mean_absolute_percentage_error(y_te, prev)) * 100, 2),
        },
        "importancia_variaveis": importancias,
    }


def avaliar_classificacao(nome, X, y, modelo, atributos):
    kf = KFold(n_splits=5, shuffle=True, random_state=SEMENTE)
    acc = cross_val_score(modelo, X, y, cv=kf, scoring="accuracy")
    auc = cross_val_score(modelo, X, y, cv=kf, scoring="roc_auc")

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=SEMENTE, stratify=y)
    modelo.fit(X_tr, y_tr)
    prev = modelo.predict(X_te)
    prob = modelo.predict_proba(X_te)[:, 1]

    importancias = sorted(
        [{"variavel": a, "importancia": round(float(v), 4)} for a, v in zip(atributos, modelo.feature_importances_)],
        key=lambda d: -d["importancia"])

    return {
        "modelo": nome,
        "algoritmo": type(modelo).__name__,
        "registros": int(len(y)),
        "atributos": atributos,
        "validacao_cruzada_5x": {
            "acuracia_media": round(float(acc.mean()), 4),
            "auc_medio": round(float(auc.mean()), 4),
            "acuracia_desvio": round(float(acc.std()), 4),
        },
        "conjunto_teste": {
            "acuracia": round(float(accuracy_score(y_te, prev)), 4),
            "auc": round(float(roc_auc_score(y_te, prob)), 4),
        },
        "importancia_variaveis": importancias,
    }


def main():
    resultado = {
        "gerado_em": datetime.now().isoformat(timespec="seconds"),
        "semente_aleatoria": SEMENTE,
        "ancoras_de_mercado": ANCORAS,
        "aviso": ("Dados de treino sintéticos calibrados com parâmetros agronômicos e de mercado reais. "
                  "As métricas medem o aprendizado sobre o simulador e demonstram o pipeline completo; "
                  "a validação em campo exige dados históricos da cooperativa."),
        "modelos": {},
    }
    linhas_relatorio = []

    def p(txt=""):
        print(txt)
        linhas_relatorio.append(txt)

    p("=" * 78)
    p("AGROCHAIN · TREINAMENTO E VALIDAÇÃO DOS MODELOS DE IA")
    p("=" * 78)

    # ---- 1. produtividade do café ----
    atr_cafe = ["idade_lavoura", "ndvi", "chuva_trimestre_mm", "irrigado",
                "temperatura_media", "pressao_ferrugem", "safra_anterior"]
    X, y = gerar_base_cafe()
    m1 = avaliar_regressao(
        "Produtividade de café conilon (sacas 60 kg/ha)", X, y,
        GradientBoostingRegressor(n_estimators=300, learning_rate=0.06, max_depth=4,
                                  subsample=0.85, random_state=SEMENTE), atr_cafe)
    resultado["modelos"]["produtividade_cafe_conilon"] = m1
    p("\n[1] %s" % m1["modelo"])
    p("    algoritmo: %s · registros: %d" % (m1["algoritmo"], m1["registros"]))
    p("    R² (validação cruzada 5x): %.4f (± %.4f) · MAE: %.2f sacas/ha · MAPE: %.2f%%" % (
        m1["validacao_cruzada_5x"]["r2_medio"], m1["validacao_cruzada_5x"]["r2_desvio"],
        m1["validacao_cruzada_5x"]["mae_medio"], m1["validacao_cruzada_5x"]["mape_medio_pct"]))
    p("    variáveis mais importantes: " + ", ".join(
        "%s (%.0f%%)" % (v["variavel"], v["importancia"] * 100) for v in m1["importancia_variaveis"][:4]))

    # ---- 2. produtividade do cacau ----
    atr_cacau = ["idade_lavoura", "ndvi", "chuva_trimestre_mm", "sombreamento",
                 "temperatura_media", "umidade_relativa", "pressao_vassoura", "safra_anterior"]
    Xc, yc = gerar_base_cacau()
    m2 = avaliar_regressao(
        "Produtividade de cacaueiro (kg de amêndoa seca/ha)", Xc, yc,
        GradientBoostingRegressor(n_estimators=300, learning_rate=0.06, max_depth=4,
                                  subsample=0.85, random_state=SEMENTE), atr_cacau)
    resultado["modelos"]["produtividade_cacau"] = m2
    p("\n[2] %s" % m2["modelo"])
    p("    algoritmo: %s · registros: %d" % (m2["algoritmo"], m2["registros"]))
    p("    R² (validação cruzada 5x): %.4f (± %.4f) · MAE: %.2f kg/ha · MAPE: %.2f%%" % (
        m2["validacao_cruzada_5x"]["r2_medio"], m2["validacao_cruzada_5x"]["r2_desvio"],
        m2["validacao_cruzada_5x"]["mae_medio"], m2["validacao_cruzada_5x"]["mape_medio_pct"]))
    p("    variáveis mais importantes: " + ", ".join(
        "%s (%.0f%%)" % (v["variavel"], v["importancia"] * 100) for v in m2["importancia_variaveis"][:4]))

    # ---- 3. preço do café conilon em 30 dias ----
    atr_preco = ["preco_atual", "media_movel_30d", "media_movel_60d", "retorno_30d",
                 "retorno_7d", "volatilidade_anualizada", "mes", "aperto_de_oferta", "cambio_usd"]
    Xp, yp = gerar_base_preco(produto="cafe_conilon")
    m3 = avaliar_regressao(
        "Preço do café conilon em 30 dias (R$/saca 60 kg)", Xp, yp,
        RandomForestRegressor(n_estimators=400, max_depth=14, min_samples_leaf=3,
                              random_state=SEMENTE, n_jobs=-1), atr_preco)
    resultado["modelos"]["preco_cafe_conilon_30d"] = m3
    p("\n[3] %s" % m3["modelo"])
    p("    algoritmo: %s · registros: %d" % (m3["algoritmo"], m3["registros"]))
    p("    R² (validação cruzada 5x): %.4f (± %.4f) · MAPE: %.2f%% (≈ R$ %.0f/saca de erro médio)" % (
        m3["validacao_cruzada_5x"]["r2_medio"], m3["validacao_cruzada_5x"]["r2_desvio"],
        m3["validacao_cruzada_5x"]["mape_medio_pct"],
        m3["validacao_cruzada_5x"]["mape_medio_pct"] / 100 * ANCORAS["cafe_conilon"]))
    p("    variáveis mais importantes: " + ", ".join(
        "%s (%.0f%%)" % (v["variavel"], v["importancia"] * 100) for v in m3["importancia_variaveis"][:4]))

    # ---- 4. direção do preço do cacau (alta/baixa em 30 dias) ----
    Xq, yq = gerar_base_preco(produto="cacau")
    Xq2, yq2 = gerar_base_preco(produto="cacau", semente=SEMENTE + 29)
    Xcacau = np.vstack([Xq, Xq2])
    preco_atual = Xcacau[:, 0]
    y_direcao = (yq2.tolist() + yq.tolist())
    rotulos = (np.array(y_direcao) > preco_atual).astype(int)
    atr_dir = atr_preco
    m4 = avaliar_classificacao(
        "Direção do preço do cacau em 30 dias (alta/baixa)", Xcacau, rotulos,
        RandomForestClassifier(n_estimators=400, max_depth=12, min_samples_leaf=4,
                               random_state=SEMENTE, n_jobs=-1), atr_dir)
    resultado["modelos"]["direcao_preco_cacau_30d"] = m4
    p("\n[4] %s" % m4["modelo"])
    p("    algoritmo: %s · registros: %d" % (m4["algoritmo"], m4["registros"]))
    p("    acurácia (validação cruzada 5x): %.4f · AUC: %.4f" % (
        m4["validacao_cruzada_5x"]["acuracia_media"], m4["validacao_cruzada_5x"]["auc_medio"]))
    p("    variáveis mais importantes: " + ", ".join(
        "%s (%.0f%%)" % (v["variavel"], v["importancia"] * 100) for v in m4["importancia_variaveis"][:4]))

    # ---- 5. aplicação ao cenário real da demonstração ----
    p("\n" + "=" * 78)
    p("APLICAÇÃO DO MODELO AO CENÁRIO DA DEMONSTRAÇÃO (dados do protótipo)")
    p("=" * 78)
    cenario = np.array([[7, 0.71, 154.5, 1, 26.8, 35.5, 54.89]])   # Talhão T-01 (Cacoal, irrigado)
    modelo = GradientBoostingRegressor(n_estimators=300, learning_rate=0.06, max_depth=4,
                                       subsample=0.85, random_state=SEMENTE)
    modelo.fit(X, y)
    previsao = float(modelo.predict(cenario)[0])
    p("\n  Talhão T-01 (conilon irrigado, 7 anos, NDVI 0,71, 154,5 mm no trimestre)")
    p("    previsão do modelo Python (dados sintéticos): %.1f sacas 60 kg/ha" % previsao)
    p("    previsão do motor explicável embutido no app: 52,9 sacas 60 kg/ha")
    resultado["aplicacao_cenario_real"] = {
        "talhao": "T-01", "previsao_python": round(previsao, 1), "previsao_app": 52.9,
        "observacao": "Divergência esperada: o app usa regras agronômicas explicáveis sobre a base "
                      "histórica real de 4 safras; o modelo Python aprende a estrutura do simulador sintético."
    }

    p("\n" + "-" * 78)
    p("PRÓXIMO PASSO PARA VIRAR PRODUÇÃO")
    p("-" * 78)
    p("  1. Trocar gerar_base_* pelo histórico real: balança + laudo de classificação")
    p("     da cooperativa, NDVI/NDWI de satélite (Sentinel-2), estação meteorológica")
    p("     e série de cotações via API (Cepea/B3/NYBOT).")
    p("  2. Separar treino por município e cultivar — o modelo global esconde viés local.")
    p("  3. Validar em talhões que ficaram fora do treino, com ao menos duas safras.")
    p("  4. Publicar o hash do modelo no consórcio: qualquer participante audita qual")
    p("     versão gerou qual recomendação — rastreabilidade também para a IA.")

    # ---- gravação ----
    with open(os.path.join(AQUI, "modelos.json"), "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    with open(os.path.join(AQUI, "relatorio_ml.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(linhas_relatorio) + "\n")

    p("\nArtefatos gravados: modelos.json · relatorio_ml.txt")
    return resultado


if __name__ == "__main__":
    main()
