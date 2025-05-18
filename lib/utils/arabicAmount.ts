// دالة تحويل رقم إلى نص عربي مالي (حتى مئات الملايين)
export function numberToArabicWords(num: number): string {
  if (num === 0) return "صفر";

  const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
  const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

  function getArabicGroup(n: number): string {
    let str = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (h > 0) str += hundreds[h];
    if (n % 100 < 10) {
      if (o > 0) str += (str ? " و" : "") + ones[o];
    } else if (n % 100 < 20) {
      str += (str ? " و" : "") + teens[n % 10];
    } else {
      if (o > 0) str += (str ? " و" : "") + ones[o];
      if (t > 0) str += (str ? " و" : "") + tens[t];
    }
    return str;
  }

  let result = "";
  let n = Math.floor(num);
  let group = 0;
  let parts: string[] = [];
  while (n > 0 && group < 3) {
    const g = n % 1000;
    if (g !== 0) {
      let groupWord = getArabicGroup(g);
      let groupName = "";
      if (group === 1) {
        if (g === 1) groupName = "ألف";
        else if (g === 2) groupName = "ألفان";
        else if (g >= 3 && g <= 10) groupName = "آلاف";
        else groupName = "ألف";
      } else if (group === 2) {
        if (g === 1) groupName = "مليون";
        else if (g === 2) groupName = "مليونان";
        else if (g >= 3 && g <= 10) groupName = "ملايين";
        else groupName = "مليون";
      }
      let part = groupWord;
      if (groupName) part += (part ? " " : "") + groupName;
      parts.unshift(part);
    }
    n = Math.floor(n / 1000);
    group++;
  }
  result = parts.join(" و");
  return result.trim();
} 