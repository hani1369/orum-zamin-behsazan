// Shared helpers used by all /functions/api/*.js files.

export const DEFAULT_CONTENT = {
  hero: {
    title: "عمق زمین را می‌خوانیم،<br><em>آب را برایتان می‌یابیم</em>",
    subtitle: "با بهره‌گیری از دستگاه‌های پیشرفته ژئوالکتریک و تیمی متخصص در زمین‌شناسی، دقیق‌ترین نقطه و عمق حفر چاه آب را برای زمین شما تعیین می‌کنیم؛ پیش از حفاری، با اطمینان تصمیم بگیرید.",
    cta1: "درخواست مشاوره رایگان",
    cta2: "مشاهده فعالیت‌ها"
  },
  stats: [
    { number: "15+", label: "سال تجربه اجرایی" },
    { number: "800+", label: "پروژه موفق" },
    { number: "20+", label: "استان تحت پوشش" },
    { number: "95%", label: "دقت در تعیین نقطه آب" }
  ],
  services: [
    { icon: "wave", title: "ژئوفیزیک و مقاومت‌سنجی", desc: "برداشت داده‌های مقاومت ویژه زمین برای شناسایی دقیق لایه‌های زیرسطحی و ساختار زمین‌شناسی." },
    { icon: "drop", title: "آب‌یابی و تعیین نقطه حفاری", desc: "تعیین دقیق موقعیت، عمق و دبی احتمالی آب زیرزمینی پیش از هرگونه حفاری چاه." },
    { icon: "layers", title: "مطالعات ژئوتکنیک", desc: "بررسی مقاومت و لایه‌بندی خاک برای طراحی پی سازه‌ها و پروژه‌های عمرانی." },
    { icon: "mountain", title: "اکتشاف معدن", desc: "شناسایی ذخایر و کانسارهای معدنی با روش‌های نوین ژئوفیزیکی." },
    { icon: "chart", title: "تفسیر داده و گزارش فنی", desc: "پردازش داده‌های میدانی و ارائه گزارش فنی قابل استناد برای تصمیم‌گیری شما." },
    { icon: "drill", title: "نظارت بر حفاری", desc: "مشاوره و نظارت فنی بر عملیات حفاری تا اطمینان از اجرای درست پروژه." }
  ],
  process: [
    { n: "01", title: "بازدید و بررسی اولیه زمین", desc: "کارشناسان ما با حضور در محل، وضعیت زمین و هدف پروژه شما را بررسی می‌کنند." },
    { n: "02", title: "برداشت داده با دستگاه ژئوفیزیک", desc: "با استفاده از دستگاه‌های ژئوالکتریک، داده‌های مقاومت زمین در نقاط مختلف ثبت می‌شود." },
    { n: "03", title: "پردازش و تحلیل داده‌ها", desc: "داده‌های خام با نرم‌افزارهای تخصصی پردازش و مدل زیرسطحی زمین ترسیم می‌شود." },
    { n: "04", title: "تعیین دقیق نقطه و عمق آب", desc: "بر اساس تحلیل انجام‌شده، بهترین نقطه و عمق تقریبی حفاری مشخص می‌شود." },
    { n: "05", title: "ارائه گزارش فنی و مشاوره", desc: "گزارش کامل به همراه مشاوره تخصصی برای مراحل حفاری در اختیار شما قرار می‌گیرد." }
  ],
  training: [
    { title: "دوره آموزش ژئوفیزیک کاربردی", desc: "مبانی و کاربرد روش‌های ژئوفیزیکی در پروژه‌های واقعی — ویژه مهندسین و دانشجویان." },
    { title: "کارگاه آب‌یابی با دستگاه‌های ژئوالکتریک", desc: "آموزش عملی کار با دستگاه در سایت‌های میدانی واقعی." },
    { title: "دوره تفسیر داده‌های مقاومت‌سنجی", desc: "یادگیری تحلیل و تفسیر داده‌های برداشت‌شده و تهیه گزارش فنی." },
    { title: "دوره حضوری و آنلاین", desc: "برگزاری منظم دوره‌ها برای علاقه‌مندان در سراسر کشور، به دو صورت حضوری و مجازی." }
  ],
  contact: {
    phone: "021-22345678",
    mobile: "0912-1234567",
    email: "info@orumzaminbehsazan.ir",
    address: "ایران، تهران"
  }
};

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function getToken(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function requireSession(request, env) {
  const token = getToken(request);
  if (!token) return false;
  const val = await env.OZ_KV.get("session:" + token);
  return !!val;
}

export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
