# Puerto Rico Grid Report Card

A plain-language public website that grades LUMA's transmission and distribution performance from A to F, using LUMA's own monthly reports to the Puerto Rico Energy Bureau (case NEPR-MI-2019-0007).

## Files
All files sit together in the main folder:
- `index.html` — the page
- `styles.css` — all styling (light and dark mode, mobile-friendly)
- `data.js` — the numbers, generated from LUMA's workbook
- `config.js` — grading rules and weights (edit here to change how the grade is calculated)
- `app.js` — calculates the grades and draws the charts (no libraries needed)
- `build_data.py` — rebuilds `data.js` from a new workbook

## Publish
Upload the whole folder to any static host (GitHub Pages, Netlify, your own server). Open `index.html` locally to preview.

## Update with a new monthly report
```
pip install pandas openpyxl
python build_data.py path/to/Resumen-Metricas-Master.xlsx
```
Then upload the new `data.js`. Grades, charts and text update automatically.

## About the grade
The grade is independent and unofficial. Weights in `config.js` are grouped by the performance areas of LUMA's operating contract, but they are not the Energy Bureau's official Annex IX incentive weights. If you obtain those, replace the weights in `config.js`.
