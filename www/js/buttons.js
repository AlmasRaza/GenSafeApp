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
    if (currentDatabase.length === 0) {
        alert("⚠️ Vault is empty!");
        return;
    }

    let mPass = document.getElementById('masterPass').value;
    let mPin = document.getElementById('masterPin').value;
    if (!mPass || !mPin) {
        alert("⚠️ Please enter Master Password and PIN to lock the vault.");
        return;
    }

    try {
        // انکرپشن کا عمل (AES-256)
        let dataStr = JSON.stringify(currentDatabase);
        let key = await deriveAESKey(mPass, mPin);
        let encryptedStr = await encryptData(dataStr, key);
        
        let finalJson = JSON.stringify({ data: encryptedStr });
        let fileName = `GenSafe_Vault_${new Date().getTime()}.json`;

        // 🌟 نیا کیپیسیٹر (Native Android) طریقہ
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { Filesystem, Share } = Capacitor.Plugins;
            
            // 1. فائل کو ایپ کی محفوظ عارضی میموری (CACHE) میں بنائیں
            const result = await Filesystem.writeFile({
                path: fileName,
                data: finalJson,
                directory: 'CACHE', 
                encoding: 'utf8'
            });

            // 2. اینڈرائیڈ کی اصلی شیئر اسکرین کھولیں
            await Share.share({
                title: 'GenSafe Vault Backup',
                text: 'Here is your highly secure offline GenSafe vault backup file.',
                url: result.uri,
                dialogTitle: 'Save or Share Vault'
            });
            
            logToUI(`💾 Vault Shared securely using Native Android!`, 'log-info');

        } 
        // 🌐 پرانا براؤزر (Web) کا طریقہ (اگر کبھی کمپیوٹر کروم پر چلائیں)
        else {
            let blob = new Blob([finalJson], { type: 'application/json' });
            let url = URL.createObjectURL(blob);
            
            if (navigator.share) {
                let file = new File([blob], fileName, { type: 'application/json' });
                await navigator.share({ title: 'GenSafe Vault Backup', files: [file] });
                logToUI(`💾 Vault Shared!`, 'log-info');
            } else {
                let a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                logToUI(`💾 Vault Downloaded!`, 'log-info');
            }
        }
    } catch (err) {
        console.error("Export Error:", err);
        alert("❌ Error saving file: " + err.message);
    }
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
