/**
 * Macro Calculator — Digital Heroes
 * ─────────────────────────────────────────────────────────────────────────
 * Two-view SPA:
 *   #view-calculator  – input view (always starts visible)
 *   #view-sheet       – results / Meal Prep Sheet (hidden until calculated)
 *
 * PDF export: window.print() — no third-party library required.
 * @media print in styles.css hides all nav/action elements automatically.
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── View elements ── */
const viewCalculator = document.getElementById('view-calculator');
const viewSheet      = document.getElementById('view-sheet');

/* ── Calculator inputs ── */
const calcWrapper    = document.getElementById('calculator-wrapper');
const calculateBtn   = document.getElementById('calculate-btn');
const formError      = document.getElementById('form-error');

/* ── Sheet output elements ── */
const sheetSubtitle     = document.getElementById('sheet-subtitle');
const sheetDate         = document.getElementById('sheet-date');
const sheetCalories     = document.getElementById('sheet-calories');
const sheetProtein      = document.getElementById('sheet-protein');
const sheetCarbs        = document.getElementById('sheet-carbs');
const sheetFats         = document.getElementById('sheet-fats');
const sheetPctProtein   = document.getElementById('sheet-pct-protein');
const sheetPctCarbs     = document.getElementById('sheet-pct-carbs');
const sheetPctFats      = document.getElementById('sheet-pct-fats');
const sheetFoodsProtein = document.getElementById('sheet-foods-protein');
const sheetFoodsCarbs   = document.getElementById('sheet-foods-carbs');
const sheetFoodsFats    = document.getElementById('sheet-foods-fats');
const sheetDietNote     = document.getElementById('sheet-diet-note');

/* ── Sheet action buttons ── */
const goBackBtn = document.getElementById('go-back-btn');
const printBtn  = document.getElementById('print-btn');

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

/** Show a validation error with shake animation */
function showError(msg) {
  formError.textContent     = msg;
  formError.hidden          = false;
  formError.style.animation = 'none';
  requestAnimationFrame(() => { formError.style.animation = ''; });
}

/** Clear the validation error */
function clearError() {
  formError.hidden      = true;
  formError.textContent = '';
}

/** Map activity multiplier → human-readable label */
function activityLabel(value) {
  return ({
    '1.2'  : 'Sedentary',
    '1.375': 'Lightly Active',
    '1.55' : 'Moderately Active',
    '1.725': 'Very Active',
    '1.9'  : 'Extra Active',
  })[value] ?? 'Active';
}

/* ═══════════════════════════════════════════════════
   CALCULATION — Mifflin–St Jeor
   ═══════════════════════════════════════════════════ */

/**
 * BMR formula:
 *   Male:   10w + 6.25h − 5a + 5
 *   Female: 10w + 6.25h − 5a − 161
 */
function calcBMR(weight, height, age, gender) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/* ═══════════════════════════════════════════════════
   FOOD RECOMMENDATIONS
   ═══════════════════════════════════════════════════ */

function buildFoodRecommendations(isVeg, isLactose) {
  const key = isVeg
    ? (isLactose ? 'vegLactose' : 'veg')
    : (isLactose ? 'standardLactose' : 'standard');

  const protein = {
    standard:        ['Chicken Breast', 'Eggs', 'Canned Tuna', 'Greek Yoghurt'],
    standardLactose: ['Chicken Breast', 'Eggs', 'Canned Tuna', 'Lean Ground Beef'],
    veg:             ['Tofu', 'Lentils', 'Chickpeas', 'Greek Yoghurt'],
    vegLactose:      ['Tofu', 'Lentils', 'Tempeh', 'Edamame'],
  }[key];

  const carbs = {
    standard:        ['Brown Rice', 'Sweet Potato', 'Oats', 'Whole-Wheat Pasta'],
    standardLactose: ['Brown Rice', 'Sweet Potato', 'Oats', 'Whole-Wheat Pasta'],
    veg:             ['Brown Rice', 'Sweet Potato', 'Oats', 'Quinoa'],
    vegLactose:      ['Brown Rice', 'Sweet Potato', 'Oats', 'Quinoa'],
  }[key];

  const fats = {
    standard:        ['Avocado', 'Olive Oil', 'Mixed Nuts', 'Cheddar Cheese'],
    standardLactose: ['Avocado', 'Olive Oil', 'Mixed Nuts', 'Pumpkin Seeds'],
    veg:             ['Avocado', 'Olive Oil', 'Mixed Nuts', 'Full-Fat Yoghurt'],
    vegLactose:      ['Avocado', 'Olive Oil', 'Mixed Nuts', 'Chia Seeds'],
  }[key];

  return { protein, carbs, fats };
}

/** Render a food list into a <ul> element */
function renderFoodList(ulEl, items) {
  ulEl.innerHTML = '';
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.textContent = `${emojis[i]}  ${item}`;
    ulEl.appendChild(li);
  });
}

/* ═══════════════════════════════════════════════════
   VIEW SWITCHING
   ═══════════════════════════════════════════════════ */

function showSheet() {
  viewCalculator.style.display = 'none';
  viewSheet.style.display      = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCalculator() {
  viewSheet.style.display      = 'none';
  viewCalculator.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════
   CALCULATE BUTTON
   ═══════════════════════════════════════════════════ */

calculateBtn.addEventListener('click', function (e) {
  e.preventDefault();
  e.stopPropagation();
  clearError();

  /* ── Read inputs ── */
  const age      = parseFloat(document.getElementById('age').value);
  const gender   = document.getElementById('gender').value;
  const weight   = parseFloat(document.getElementById('weight').value);
  const height   = parseFloat(document.getElementById('height').value);
  const activityEl = calcWrapper.querySelector('input[name="activity"]:checked');
  const activity   = activityEl?.value;
  const isVeg      = document.getElementById('vegetarian').checked;
  const isLactose  = document.getElementById('lactose').checked;

  /* ── Validate ── */
  if (!age    || age    < 10  || age    > 100) return showError('Please enter a valid age between 10 and 100.');
  if (!gender)                                  return showError('Please select your biological sex.');
  if (!weight || weight < 20  || weight > 300)  return showError('Please enter a valid weight between 20 and 300 kg.');
  if (!height || height < 100 || height > 250)  return showError('Please enter a valid height between 100 and 250 cm.');
  if (!activity)                                return showError('Please select your activity level.');

  /* ── Compute ── */
  const bmr  = calcBMR(weight, height, age, gender);
  const tdee = Math.round(bmr * parseFloat(activity));

  const proteinG = Math.round((tdee * 0.30) / 4);
  const carbsG   = Math.round((tdee * 0.40) / 4);
  const fatsG    = Math.round((tdee * 0.30) / 9);

  const totalCals  = proteinG * 4 + carbsG * 4 + fatsG * 9;
  const pctProtein = Math.round((proteinG * 4 / totalCals) * 100);
  const pctCarbs   = Math.round((carbsG   * 4 / totalCals) * 100);
  const pctFats    = 100 - pctProtein - pctCarbs;

  /* ── Build subtitle ── */
  const genderStr = gender === 'male' ? 'Male' : 'Female';
  const actLabel  = activityLabel(activity);
  const extras    = [isVeg && 'Vegetarian', isLactose && 'Lactose Intolerant'].filter(Boolean).join(' · ');
  const subtitle  = `${genderStr}, ${Math.round(age)} yrs · ${actLabel}${extras ? ' · ' + extras : ''}`;

  /* ── Food recommendations ── */
  const foods = buildFoodRecommendations(isVeg, isLactose);

  /* ── Populate sheet ── */
  sheetSubtitle.textContent   = subtitle;
  sheetDate.textContent       = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  sheetCalories.textContent   = tdee.toLocaleString();
  sheetProtein.textContent    = proteinG;
  sheetCarbs.textContent      = carbsG;
  sheetFats.textContent       = fatsG;
  sheetPctProtein.textContent = `${pctProtein}% of kcal`;
  sheetPctCarbs.textContent   = `${pctCarbs}% of kcal`;
  sheetPctFats.textContent    = `${pctFats}% of kcal`;

  renderFoodList(sheetFoodsProtein, foods.protein);
  renderFoodList(sheetFoodsCarbs,   foods.carbs);
  renderFoodList(sheetFoodsFats,    foods.fats);

  /* ── Diet note ── */
  const noteLines = [];
  if (isVeg)     noteLines.push('🌿 <strong>Vegetarian:</strong> Meet protein targets with lentils, chickpeas, tofu, tempeh & eggs.');
  if (isLactose) noteLines.push('🥛 <strong>Lactose Intolerant:</strong> Use oat milk, almond milk, soy yoghurt & lactose-free alternatives.');
  if (noteLines.length) {
    sheetDietNote.innerHTML = noteLines.join('<br>');
    sheetDietNote.hidden    = false;
  } else {
    sheetDietNote.hidden = true;
  }

  /* ── Switch view ── */
  showSheet();
});

/* ═══════════════════════════════════════════════════
   GO BACK
   ═══════════════════════════════════════════════════ */

goBackBtn.addEventListener('click', function (e) {
  e.preventDefault();
  e.stopPropagation();
  showCalculator();
});

/* ═══════════════════════════════════════════════════
   PRINT TO PDF
   window.print() opens the browser's native Save as PDF dialog.
   @media print in styles.css hides all navigation/action elements
   so the printed page is a clean Meal Prep Sheet.
   ═══════════════════════════════════════════════════ */

printBtn.addEventListener('click', function (e) {
  e.preventDefault();
  e.stopPropagation();
  window.print();
});
