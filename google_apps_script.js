/**
 * =========================================================================
 * ICT Grade 4 Quiz - Google Apps Script (Webhook)
 * كود جوجل شيت لاستقبال درجات الطلاب وحفظها تلقائياً في الإكسل
 * =========================================================================
 * 
 * طريقة التركيب في 3 خطوات بسيطة:
 * 1. افتح شيت إكسل جديد على Google Sheets (https://sheets.new)
 * 2. من القائمة العلوية اضغط: Extensions (الإضافات) -> Apps Script
 * 3. امسح أي كود موجود والصق هذا الكود بالكامل، ثم اضغط حفظ (Save 💾).
 * 4. اضغط زر Deploy (نشر) -> New deployment (نشر جديد)
 *    - اضغط على الترس ⚙️ واختر Web App
 *    - Execute as: "Me" (حسابك)
 *    - Who has access: "Anyone" (أي شخص)  <-- مهمة جداً لكي يسجل الطلبة دون تسجيل دخول
 *    - اضغط Deploy وانسخ رابط الـ Web app URL وضعه في إعدادات الامتحان!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // إذا كان الشيت فارغاً، نقوم بإنشاء العناوين الرئيسية تلقائياً
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "تاريخ ووقت التسليم",
        "اسم الطالب",
        "الدرجة",
        "المجموع",
        "النسبة المئوية",
        "الوقت المستغرق",
        "تفاصيل الإجابات"
      ]);
      
      // تنسيق شريط العناوين
      var headerRange = sheet.getRange(1, 1, 1, 7);
      headerRange.setBackground("#000000");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    // قراءة البيانات المرسلة من صفحة الامتحان
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    // إضافة سطر جديد بالبيانات
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("ar-EG"),
      data.name || data.studentName || "غير محدد",
      data.score !== undefined ? data.score : (data.studentScore !== undefined ? data.studentScore : 0),
      data.total !== undefined ? data.total : 20,
      data.percentage || "0%",
      data.duration || "---",
      data.answersSummary || ""
    ]);
    
    // محاذاة البيانات في المنتصف
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 6).setHorizontalAlignment("center");
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Score recorded successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// اختبار عمل السكربت عند فتحه في المتصفح
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "active",
    message: "Google Apps Script is running and ready to receive ICT Quiz submissions."
  })).setMimeType(ContentService.MimeType.JSON);
}
