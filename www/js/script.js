// script.js - مین اسٹیٹ، لاگنگ اور فائل ہینڈلنگ

// 1. گلوبل اسٹیٹ (پوری ایپ کا ڈیٹا یہاں محفوظ رہے گا)
let currentDatabase = [];
let isFileLoaded = false;

// 2. UI لاگنگ (میسجز دکھانے کے لیے)
function logToUI(text, className) {
    let box = document.getElementById('outputLog');
    let div = document.createElement('div');
    div.className = `log-entry ${className}`;
    div.innerHTML = text.replace(/\n/g, "<br>");
    box.insertBefore(div, box.firstChild);
}

// 3. فائل لوڈر (انکرپٹڈ JSON فائل کو پڑھنے اور ایپ میں لانے کے لیے)
document.getElementById('dbFile').addEventListener('change', async function(e) {
    let file = e.target.files[0];
    if (!file) return;
    
    let reader = new FileReader();
    reader.onload = async function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            let mPass = document.getElementById('masterPass').value;
            let mPin = document.getElementById('masterPin').value;
            
            if(!mPass || !mPin) { 
                alert("Please enter Master Password and PIN to decrypt the file."); 
                document.getElementById('dbFile').value = ""; 
                return; 
            }

            // crypto.js کے فنکشنز استعمال ہو رہے ہیں
            let key = await deriveAESKey(mPass, mPin);
            let decryptedStr = await decryptData(parsed.data, key);
            
            if (decryptedStr) {
                currentDatabase = JSON.parse(decryptedStr);
                isFileLoaded = true;
                document.getElementById('outputLog').innerHTML = '';
                logToUI(`✅ File loaded successfully. Total Accounts: ${currentDatabase.length}`, 'log-info');
                
                let allRecords = "<div class='log-header'>--- Current Accounts in Vault ---</div>";
                for (let rule of currentDatabase) {
                    // crypto.js اور generator.js کے فنکشنز یہاں کام کر رہے ہیں
                    let hash = await generateHash(rule.account, mPass, mPin);
                    let finalPass = formatPassword(hash, rule); 
                    allRecords += `🔹 ${rule.account}\n🔑 ${finalPass}\n\n`;
                }
                if(currentDatabase.length > 0) logToUI(allRecords, 'log-default');
            } else { 
                alert("❌ Decryption failed! Incorrect Password/PIN."); 
            }
        } catch (err) { 
            alert("❌ Invalid or corrupted file."); 
        }
        
        // ان پٹ کو ری سیٹ کریں تاکہ دوبارہ وہی فائل منتخب کی جا سکے
        document.getElementById('dbFile').value = ""; 
    };
    reader.readAsText(file);
});

// 4. سروس ورکر (آف لائن ایپ کے لیے)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker Registered!'))
            .catch(err => console.log('❌ Service Worker Failed!', err));
    });
}
