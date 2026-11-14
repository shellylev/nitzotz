// הגדרות התוכן של האפליקציה – כאן משנים רשימות ויעדים.

export const APP_NAME = 'ניצוץ';

export const SADHANA = [
  { id: 'om', name: 'אום' },
  { id: 'nabhi', name: 'נאבי דיהן' },
  { id: 'shakti', name: "שאקטי שאנצ'ר" },
  { id: 'ambuj', name: "אמבוג' מודרה" },
  { id: 'surya', name: 'ברכת השמש' },
  { id: 'shivaya', name: 'מנטרת אום נמהה שיווהיי' },
  { id: 'ganapati', name: 'מנטרת אום גם גנפטיי נמהה' },
];

// יעד שבועי: בכמה ימים בשבוע עושים לפחות תרגול אחד (יעד שבועי במקום רצף שנשבר)
export const SADHANA_WEEKLY_GOAL = 5;

export const VITAMIN_SLOTS = [
  { id: 'morning', name: 'בוקר', icon: '🌅', fromHour: 0, items: [
    { id: 'iron', name: 'קומפלקס ברזל' },
  ]},
  { id: 'noon', name: 'צהריים', icon: '☀️', fromHour: 11, items: [
    { id: 'vitD', name: 'ויטמין D' },
    { id: 'omega3', name: 'אומגה 3' },
    { id: 'magMalate', name: 'מגנזיום מאלאט' },
  ]},
  { id: 'night', name: 'לילה', icon: '🌙', fromHour: 18, items: [
    { id: 'magGly', name: 'מגנזיום גליצינאט' },
  ]},
];

export const WATER = {
  goalMl: 1500,
  cupMl: 330,
  // שעות היום הפעילות – לחישוב "איפה אני אמורה להיות עכשיו"
  dayStartHour: 8,
  dayEndHour: 21,
};
