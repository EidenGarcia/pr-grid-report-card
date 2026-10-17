# Puerto Rico Grid Report Card

A plain-language public website that grades LUMA's transmission and distribution performance from A to F, using LUMA's own monthly reports to the Puerto Rico Energy Bureau (case NEPR-MI-2019-0007).

## Files
- `index.html` — the page
- `css/styles.css` — all styling (light and dark mode, mobile-friendly)
- `js/data.js` — the numbers, generated from LUMA's workbook
- `js/config.js` — grading rules and weights (edit here to change how the grade is calculated)
- `js/app.js` — calculates the grades and draws the charts (no libraries needed)
- `tools/build_data.py` — rebuilds `js/data.js` from a new workbook

## Publish
Upload the whole folder to any static host (GitHub Pages, Netlify, your own server). Open `index.html` locally to preview.

## Update with a new monthly report
```
pip install pandas openpyxl
python tools/build_data.py path/to/Resumen-Metricas-Master.xlsx
```
Then upload the new `js/data.js`. Grades, charts and text update automatically.

## About the grade
The grade is independent and unofficial. Weights in `js/config.js` are grouped by the performance areas of LUMA's operating contract, but they are not the Energy Bureau's official Annex IX incentive weights. If you obtain those, replace the weights in `config.js`.
