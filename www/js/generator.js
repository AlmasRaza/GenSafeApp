// generator.js - 3-Step Flawless Password Engine

// ========================================================
// فنکشن 1: ڈیٹا کی پہچان اور فیلڈز کی لمبائی طے کرنا
// ========================================================
function analyzeDataPools(rules) {
    let pools = {
        U: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        L: "abcdefghijklmnopqrstuvwxyz",
        N: "0123456789",
        S: (rules.symbols || ""),
        Sp: (rules.includeSpaces ? " " : "")
    };

    if (rules.onlyNumbers) {
        pools.U = pools.L = pools.S = pools.Sp = ""; 
    }

    let fullPool = pools.U + pools.L + pools.N + pools.S + pools.Sp;

    const identifyChar = (char) => {
        if (pools.U.includes(char)) return 'U';
        if (pools.L.includes(char)) return 'L';
        if (pools.N.includes(char)) return 'N';
        if (pools.S.includes(char)) return 'S';
        if (pools.Sp.includes(char)) return 'Sp';
        return '';
    };

    return { 
        pools, 
        fullPool, 
        lengths: { U: pools.U.length, L: pools.L.length, N: pools.N.length, S: pools.S.length, Total: fullPool.length }, 
        identifyChar 
    };
}

// ========================================================
// فنکشن 2: پہچان کیے گئے ڈیٹا کا جائزہ لے کر کنڈیشنز طے کرنا
// ========================================================
function defineConstraints(rules, poolInfo) {
    let reqCount = 0;
    if (rules.length >= 32) reqCount = 4;
    else if (rules.length >= 16) reqCount = 3;
    else if (rules.length >= 8) reqCount = 2;
    else if (rules.length > 0) reqCount = 1;

    return {
        forceStartUpper: (rules.startUpper && !rules.onlyNumbers && poolInfo.lengths.U > 0),
        reqU: (rules.mustInclude && !rules.onlyNumbers && poolInfo.lengths.U > 0) ? reqCount : 0,
        reqN: (rules.mustInclude && !rules.onlyNumbers && poolInfo.lengths.N > 0) ? reqCount : 0,
        reqS: (rules.mustInclude && !rules.onlyNumbers && poolInfo.lengths.S > 0) ? reqCount : 0
    };
}

// ========================================================
// فنکشن 3: شرائط کے عين مطابق پاسورڈ جنریٹ کرنا
// ========================================================
function generateAndValidatePassword(baseHash, rules, poolInfo, conditions) {
    if (poolInfo.lengths.Total === 0) return "";

    let hashIdx = 0;
    const getHex = (mod) => {
        if (mod <= 0) return 0;
        let hexStr = baseHash.substring(hashIdx, hashIdx + 2);
        hashIdx = (hashIdx + 2) % 128; 
        return parseInt(hexStr, 16) % mod;
    };

    let passArray = [];
    let used = [];
    let counts = { U: 0, N: 0, S: 0 };

    for (let i = 0; i < rules.length; i++) {
        let remainingSlots = rules.length - 1 - i;
        let missingU = Math.max(0, conditions.reqU - counts.U);
        let missingN = Math.max(0, conditions.reqN - counts.N);
        let missingS = Math.max(0, conditions.reqS - counts.S);
        
        let totalMissing = missingU + missingN + missingS;
        let activePool = poolInfo.fullPool;

        if (totalMissing >= remainingSlots + 1) {
            activePool = "";
            if (missingU > 0) activePool += poolInfo.pools.U;
            if (missingN > 0) activePool += poolInfo.pools.N;
            if (missingS > 0) activePool += poolInfo.pools.S;
        }

        let safePool = activePool.split('').filter(c => {
            let type = poolInfo.identifyChar(c);
            let isAlpha = (type === 'U' || type === 'L');

            if (i === 0 && conditions.forceStartUpper && type !== 'U') return false;
            if (rules.noDupChars && isAlpha && used.includes(c)) return false;
            if (rules.noDupNums && type === 'N' && used.includes(c)) return false;
            if (rules.noDupSyms && type === 'S' && used.includes(c)) return false;

            if (i > 0) {
                let prevType = poolInfo.identifyChar(passArray[i - 1]);
                if (rules.noConsecUpper && type === 'U' && prevType === 'U') return false;
                if (rules.noConsecNum && type === 'N' && prevType === 'N') return false;
                if (rules.noConsecSym && type === 'S' && prevType === 'S') return false;
            }
            return true;
        });

        if (safePool.length === 0) {
            safePool = activePool.split('').filter(c => {
                let type = poolInfo.identifyChar(c);
                if (i === 0 && conditions.forceStartUpper && type !== 'U') return false;
                if (i > 0) {
                    let prevType = poolInfo.identifyChar(passArray[i - 1]);
                    if (rules.noConsecUpper && type === 'U' && prevType === 'U') return false;
                    if (rules.noConsecNum && type === 'N' && prevType === 'N') return false;
                    if (rules.noConsecSym && type === 'S' && prevType === 'S') return false;
                }
                return true;
            });
        }
        
        if (safePool.length === 0) safePool = activePool.split('');

        let char = safePool[getHex(safePool.length)];
        passArray.push(char);
        used.push(char);

        let charType = poolInfo.identifyChar(char);
        if (charType === 'U') counts.U++;
        if (charType === 'N') counts.N++;
        if (charType === 'S') counts.S++;
    }

    return passArray.join('');
}

// ========================================================
// مین برج فنکشن
// ========================================================
function formatPassword(baseHash, savedRules) {
    let poolInfo = analyzeDataPools(savedRules);
    let conditions = defineConstraints(savedRules, poolInfo);
    return generateAndValidatePassword(baseHash, savedRules, poolInfo, conditions);
}
