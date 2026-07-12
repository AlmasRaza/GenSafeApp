// ui.js - ان پٹس اور یوزر انٹرفیس (چیک باکسز) کو کنٹرول کرنے کی فائل

// 1. فیلڈز کے ڈیٹا کو یکجا کرنا
function getInputs() {
    return {
        account: document.getElementById('accountName').value.trim(),
        pass: document.getElementById('masterPass').value,
        pin: document.getElementById('masterPin').value,
        length: parseInt(document.getElementById('passLength').value),
        symbols: document.getElementById('allowedSymbols').value,
        onlyNumbers: document.getElementById('onlyNumbers').checked,
        includeSpaces: document.getElementById('includeSpaces').checked,
        startUpper: document.getElementById('startUpper').checked,
        mustInclude: document.getElementById('mustInclude').checked,
        noConsecUpper: document.getElementById('noConsecUpper').checked,
        noConsecNum: document.getElementById('noConsecNum').checked,
        noConsecSym: document.getElementById('noConsecSym').checked,
        noDupChars: document.getElementById('noDupChars').checked,
        noDupNums: document.getElementById('noDupNums').checked,
        noDupSyms: document.getElementById('noDupSyms').checked
    };
}

// 2. موقع کے مطابق چیک باکسز کو فعال/غیر فعال کرنا
function syncUIConstraints() {
    let isNumbers = document.getElementById('onlyNumbers').checked;
    let symField = document.getElementById('allowedSymbols');
    let hasSymbols = symField.value.trim().length > 0;

    // تمام چیک باکسز کو پکڑنا
    let startUpper = document.getElementById('startUpper');
    let mustInclude = document.getElementById('mustInclude'); // نیا اضافہ
    let noConsecUpper = document.getElementById('noConsecUpper');
    let noConsecNum = document.getElementById('noConsecNum'); // نیا اضافہ
    let noConsecSym = document.getElementById('noConsecSym');
    let noDupChars = document.getElementById('noDupChars');
    let noDupNums = document.getElementById('noDupNums');     // نیا اضافہ (احتیاط کے طور پر)
    let noDupSyms = document.getElementById('noDupSyms');
    let includeSpaces = document.getElementById('includeSpaces');

    if (isNumbers) {
        // شرط 1: اگر "صرف نمبرز" فعال ہے تو باقی سب کو سختی سے بند کر دیں
        symField.disabled = true;
        startUpper.disabled = true; startUpper.checked = false;
        mustInclude.disabled = true; mustInclude.checked = false;
        noConsecUpper.disabled = true; noConsecUpper.checked = false;
        noConsecNum.disabled = true; noConsecNum.checked = false;
        noConsecSym.disabled = true; noConsecSym.checked = false;
        noDupChars.disabled = true; noDupChars.checked = false;
        noDupNums.disabled = true; noDupNums.checked = false; 
        noDupSyms.disabled = true; noDupSyms.checked = false;
        includeSpaces.disabled = true; includeSpaces.checked = false;
    } else {
        // اگر "صرف نمبرز" بند ہے، تو نارمل فیلڈز واپس کھول دیں
        symField.disabled = false;
        startUpper.disabled = false;
        mustInclude.disabled = false;
        noConsecUpper.disabled = false;
        noConsecNum.disabled = false;
        noDupChars.disabled = false;
        noDupNums.disabled = false;
        includeSpaces.disabled = false;

        // شرط 2: اگر سمبل کی فیلڈ خالی ہو تو صرف سمبلز والے چیک باکس بند کر دیں
        if (!hasSymbols) {
            noConsecSym.disabled = true; noConsecSym.checked = false;
            noDupSyms.disabled = true; noDupSyms.checked = false;
        } else {
            noConsecSym.disabled = false;
            noDupSyms.disabled = false;
        }
    }
}

// 3. UI ایونٹ لسنرز (تاکہ یہ کلک اور ٹائپنگ پر خودکار کام کرے)
document.getElementById('onlyNumbers').addEventListener('change', syncUIConstraints);
document.getElementById('allowedSymbols').addEventListener('input', syncUIConstraints);
window.addEventListener('load', syncUIConstraints);
