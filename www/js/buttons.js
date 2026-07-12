// buttons.js - ایڈ، سرچ، اپڈیٹ، ڈیلیٹ، ایکسپورٹ، اور فلش فنکشنز

async function addAccount() {
    let inputs = getInputs();
    
    // 1. بنیادی جانچ (Validation)
    if (!inputs.account || !inputs.pass || !inputs.pin) return alert("Please fill in Account Name, Master Password, and PIN.");
    if (isNaN(inputs.length) || inputs.length < 1 || inputs.length > 128) return alert("Please enter a valid password length.");
    if (currentDatabase.find(i => i.account.toLowerCase() === inputs.account.toLowerCase())) return alert("Account already exists! Use update button.");
    
    // 2. سیکیورٹی فلٹر: ماسٹر پاسورڈ اور پن کو ڈیٹا بیس میں جانے سے روکنا
    let ruleToSave = { ...inputs };
    delete ruleToSave.pass;
    delete ruleToSave.pin;
    
    // 3. محفوظ کرنا اور پاسورڈ دکھانا
    currentDatabase.push(ruleToSave);
    let hash = await generateHash(inputs.account, inputs.pass, inputs.pin);
    logToUI(`➕ Added: ${inputs.account}\n🔑 ${formatPassword(hash, ruleToSave)}`, 'log-added');
}

async function searchAccount() {
    let {account, pass, pin} = getInputs();
    if (!account || !pass || !pin) return alert("Please fill in Account Name, Master Password, and PIN.");
    
    let rule = currentDatabase.find(i => i.account.toLowerCase() === account.toLowerCase());
    if (!rule) return alert("❌ Account not found in your vault.");
    
    // تمام ان پٹس کو UI پر اپ ڈیٹ کریں
    document.getElementById('passLength').value = rule.length;
    document.getElementById('allowedSymbols').value = rule.symbols || "";
    document.getElementById('onlyNumbers').checked = rule.onlyNumbers || false;
    document.getElementById('includeSpaces').checked = rule.includeSpaces || false;
    document.getElementById('startUpper').checked = rule.startUpper || false;
    document.getElementById('mustInclude').checked = rule.mustInclude || false;
    document.getElementById('noConsecUpper').checked = rule.noConsecUpper || false;
    document.getElementById('noConsecNum').checked = rule.noConsecNum || false;
    document.getElementById('noConsecSym').checked = rule.noConsecSym || false;
    document.getElementById('noDupChars').checked = rule.noDupChars || false;
    document.getElementById('noDupNums').checked = rule.noDupNums || false;
    document.getElementById('noDupSyms').checked = rule.noDupSyms || false;
    
    // UI کی شرائط کو ہم آہنگ کریں
    syncUIConstraints();
    
    // پاسورڈ جنریٹ کر کے دکھائیں
    let hash = await generateHash(rule.account, pass, pin);
    logToUI(`🔍 Found: ${rule.account}\n🔑 Password: ${formatPassword(hash, rule)}`, 'log-info');
}

async function updateAccount() {
    let inputs = getInputs();
    
    if (!inputs.account || !inputs.pass || !inputs.pin) return alert("Please fill in Account Name, Master Password, and PIN.");
    if (isNaN(inputs.length) || inputs.length < 1) return alert("Please enter a valid password length.");

    let index = currentDatabase.findIndex(i => i.account.toLowerCase() === inputs.account.toLowerCase());
    
    if (index === -1) return alert("❌ Account not found.");
    if (!confirm("Are you sure you want to update the rules for this account? This will change the generated password.")) return;
    
    // سیکیورٹی فلٹر
    let ruleToSave = { ...inputs };
    delete ruleToSave.pass;
    delete ruleToSave.pin;

    currentDatabase[index] = ruleToSave;
    let hash = await generateHash(inputs.account, inputs.pass, inputs.pin);
    logToUI(`🔄 Updated: ${inputs.account}\n🔑 New: ${formatPassword(hash, ruleToSave)}`, 'log-updated');
}

function deleteAccount() {
    let {account} = getInputs();
    let index = currentDatabase.findIndex(i => i.account.toLowerCase() === account.toLowerCase());
    
    if (index === -1) return alert("❌ Account not found.");
    if (!confirm(`Are you sure you want to delete '${account}'?`)) return;
    
    currentDatabase.splice(index, 1);
    logToUI(`🗑️ Deleted: ${account}`, 'log-deleted');
    
    // ڈیلیٹ کرنے کے بعد اکاؤنٹ کا نام اسکرین سے ہٹا دیں تاکہ کنفیوژن نہ ہو
    document.getElementById('accountName').value = '';
}

// ---------------------------------------------------------
// ایکسپورٹ اور فلش فنکشنز
// ---------------------------------------------------------

async function exportDatabase() {
    let {pass, pin} = getInputs();
    if(!pass || !pin) return alert("Master Password and PIN are required for securely encrypting your vault.");
    if (currentDatabase.length === 0) return alert("Database is empty. Nothing to export.");

    // ڈیٹا کو انکرپٹ کریں
    let key = await deriveAESKey(pass, pin);
    let encStr = await encryptData(JSON.stringify(currentDatabase), key);
    let jsonString = JSON.stringify({data: encStr}, null, 2);

    // فائل آبجیکٹ شیئرنگ کے لیے
    let file = new File([jsonString], "my_gensafe_vault.json", { type: "application/json" });

    // 1. نیا طریقہ: Web Share API (اگر براؤزر/ایپ سپورٹ کرے)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: 'GenSafe Vault',
                text: 'Here is my securely encrypted GenSafe vault.',
                files: [file]
            });
            logToUI(`💾 Vault Shared! Secured ${currentDatabase.length} account(s).`, 'log-info');
            return; // اگر شیئر ہو گیا تو فنکشن یہیں رک جائے گا
        } catch (err) {
            console.log("Share failed or cancelled:", err);
        }
    }

    // 2. پرانا اور مضبوط طریقہ: Fallback (اگر شیئر مینو فیل ہو جائے)
    let a = document.createElement('a');
    a.href = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
    a.download = "my_gensafe_vault.json";
    document.body.appendChild(a); 
    a.click(); 
    a.remove();
    
    logToUI(`💾 Vault Downloaded! Secured ${currentDatabase.length} account(s) using AES-256.`, 'log-info');
    
    // ایک الرٹ تاکہ اگر ویب ویو فائل بلاک کرے تو یوزر کو پتہ چل جائے
    setTimeout(() => {
        alert("اگر فائل ڈاؤنلوڈ یا شیئر نہیں ہوئی، تو آپ کی ایپ کا براؤزر ڈاؤنلوڈنگ کو روک رہا ہے۔ براہ کرم اس (GenSafe) کو نارمل گوگل کروم میں کھولیں۔");
    }, 500);
}


function flushMemory() {
    currentDatabase = []; 
    isFileLoaded = false;
    
    document.getElementById('accountName').value = '';
    document.getElementById('masterPass').value = '';
    document.getElementById('masterPin').value = '';
    document.getElementById('dbFile').value = '';
    document.getElementById('outputLog').innerHTML = '';
    
    alert("Memory has been completely flushed. Vault is locked.");
}
