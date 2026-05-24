// Engine pura de calendário (frontend).
// IMPORTANTE: este arquivo é espelhado em [backend/src/calendario/engine.js].
// Se mudar a API/lógica aqui, atualize o espelho — eles precisam ficar sincronizados.

export function diasNoAno(config) {
    return config.meses.reduce((soma, m) => soma + m.dias, 0);
}

export function diasParaData({ ano, mes, dia }, config) {
    const anoEpoch = config.anoEpoch ?? 1;
    const anosDecorridos = ano - anoEpoch;
    let dias = anosDecorridos * diasNoAno(config);
    for (let i = 0; i < mes - 1; i++) {
        dias += config.meses[i].dias;
    }
    dias += dia - 1;
    return dias;
}

export function dataParaDias(dataDias, config) {
    const anoEpoch = config.anoEpoch ?? 1;
    const tamanhoAno = diasNoAno(config);

    let restante = dataDias;
    let ano = anoEpoch;
    if (restante >= 0) {
        ano += Math.floor(restante / tamanhoAno);
        restante = restante % tamanhoAno;
    } else {
        const anosNegativos = Math.ceil(-restante / tamanhoAno);
        ano -= anosNegativos;
        restante += anosNegativos * tamanhoAno;
    }

    let mes = 1;
    for (let i = 0; i < config.meses.length; i++) {
        if (restante < config.meses[i].dias) {
            mes = i + 1;
            break;
        }
        restante -= config.meses[i].dias;
    }
    const dia = restante + 1;
    const nomeMes = config.meses[mes - 1].nome;

    return {
        ano, mes, dia, nomeMes,
        diaSemana: diaSemana(dataDias, config),
        estacao:   estacaoDoMes(mes, config)
    };
}

export function diaSemana(dataDias, config) {
    const lista = config.diasSemana;
    const epoch = config.diaSemanaEpoch ?? 0;
    const len = lista.length;
    const idx = (((epoch + dataDias) % len) + len) % len;
    return lista[idx];
}

export function estacaoDoMes(mes, config) {
    for (const e of config.estacoes) {
        if (e.mesInicio <= e.mesFim) {
            if (mes >= e.mesInicio && mes <= e.mesFim) return e.nome;
        } else {
            if (mes >= e.mesInicio || mes <= e.mesFim) return e.nome;
        }
    }
    return config.estacoes[0]?.nome ?? 'Indefinida';
}

const FASES_LUA = [
    { limite: 0.03, nome: 'Lua Nova',          emoji: '🌑' },
    { limite: 0.22, nome: 'Crescente',         emoji: '🌒' },
    { limite: 0.28, nome: 'Quarto Crescente',  emoji: '🌓' },
    { limite: 0.47, nome: 'Crescente Gibosa',  emoji: '🌔' },
    { limite: 0.53, nome: 'Lua Cheia',         emoji: '🌕' },
    { limite: 0.72, nome: 'Minguante Gibosa',  emoji: '🌖' },
    { limite: 0.78, nome: 'Quarto Minguante',  emoji: '🌗' },
    { limite: 0.97, nome: 'Minguante',         emoji: '🌘' }
];

export function fasesLua(dataDias, cicloLuaDias) {
    const ciclo = cicloLuaDias || 29.5;
    let f = (dataDias % ciclo) / ciclo;
    if (f < 0) f += 1;
    for (const fase of FASES_LUA) {
        if (f < fase.limite) return { fracao: f, nome: fase.nome, emoji: fase.emoji };
    }
    return { fracao: f, nome: 'Lua Nova', emoji: '🌑' };
}

// Formata data relativa em relação a uma referência.
// Útil pra "hoje", "ontem", "há N dias".
export function dataRelativa(dataDias, refDias) {
    const delta = refDias - dataDias;
    if (delta === 0) return 'hoje';
    if (delta === 1) return 'ontem';
    if (delta === -1) return 'amanhã';
    if (delta > 1) return `há ${delta} dias`;
    return `em ${-delta} dias`;
}
