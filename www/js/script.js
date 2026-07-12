// script.js - مین اسٹیٹ، لاگنگ اور فائل ہینڈلنگ

// 1. گلوبل اسٹیٹ (پوری ایپ کا ڈیٹا یہاں محفوظ رہے گا)
let currentDatabase = [];
let isFileLoaded = false;

// 2. UI لاگنگ (میسجز دکھانے کے لیے)
// XSS سیکیورٹی رسک سے بچنے کے لیے innerHTML کی جگہ textContent کا استعمال کیا گیا ہے
function logToUI(text, className) {
    let box = document.getElementById('outputLog');
    let div = document.createElement('div');
    div.className = `log-entry ${className}`;
    div.textContent = text; 
    box.insertBefore(div, box.firstChild);
}

// 3. فائل لوڈر (انکرپٹڈ JSON فائل کو پڑھنے اور ایپ میں لانے کے لیے)
document.getElementById('dbFile').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (!file) return;
    
    let reader = new FileReader();
    reader.onload = async function(e) {
        let mPass = document.getElementById('masterPass').value;
        let mPin = document.getElementById('masterPin').value;
        
        if(!mPass || !mPin) { 
            alert("Please enter Master Password and PIN to decrypt the file."); 
            document.getElementById('dbFile').value = ""; 
            return; 
        }

        try {
            let parsed = JSON.parse(e.target.result);
            
            // crypto.js کے فنکشنز استعمال ہو رہے ہیں
            let key = await deriveAESKey(mPass, mPin);
            let decryptedStr = await decryptData(parsed.data, key);
            
            currentDatabase = JSON.parse(decryptedStr);
            isFileLoaded = true;
            
            // پچھلے لاگز صاف کریں
            document.getElementById('outputLog').innerHTML = '';
            logToUI(`✅ File loaded successfully. Total Accounts: ${currentDatabase.length}`, 'log-info');
            
            let allRecords = "--- Current Accounts in Vault ---\n\n";
            for (let rule of currentDatabase) {
                // crypto.js اور generator.js کے فنکشنز یہاں کام کر رہے ہیں
                let hash = await generateHash(rule.account, mPass, mPin);
                let finalPass = formatPassword(hash, rule); 
                allRecords += `🔹 ${rule.account}\n🔑 ${finalPass}\n\n`;
            }
            if(currentDatabase.length > 0) logToUI(allRecords, 'log-default');

        } catch (err) { 
            // اگر پاس ورڈ غلط ہو یا فائل خراب ہو تو یہاں ایرر پکڑا جائے گا
            alert("❌ File processing failed! Please ensure the file is valid and your Password/PIN is correct."); 
            console.log("Decryption/Parsing Error:", err); // ڈیبگنگ کے لیے
        }
        
        // ان پٹ کو ری سیٹ کریں تاکہ دوبارہ وہی فائل منتخب کی جا سکے
        document.getElementById('dbFile').value = ""; 
    };
    reader.readAsText(file);
});

// 4. پرانے سروس ورکر کا خاتمہ (آف لائن کیشے کو صاف کرنے کے لیے کلینر کوڈ)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('🗑️ پرانا سروس ورکر بالکلیہ ختم کر دیا گیا ہے۔');
        }
    });
}
