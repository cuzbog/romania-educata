# România Educată

An interactive data visualization platform for analyzing Romania’s secondary education system. This project combines exam results, school infrastructure data, and demographic indicators to expose disparities and guide evidence-based education reform.

## 🌍 Overview

**România Educată** visualizes:

- 📊 Baccalaureate (BAC) results
- 🧮 National Evaluation (EN) results
- 🏫 School-level demographics
- 🏙️ Urban vs. rural achievement gaps
- 📌 Geographic and ethnic disparities

Built to support policy evaluation under Romania’s *România Educată* initiative.

## 📁 Data Sources

- `bac.json`: BAC results by school, gender, and language
- `en_2024.parquet`: EN results (2024)
- `retea-scolara-2024-2025.csv`: Full school network
- `backup.sql`: PostgreSQL dump of the integrated database

## 🧰 Tech Stack

- **Frontend**: React 19 + Vite
- **UI**: Ant Design
- **Mapping**: MapLibre GL, Turf.js
- **Colors**: Chroma.js
- **Client-side SQL**: DuckDB (WASM) with Parquet
- **i18n**: i18next (RO + EN)
- **Backend (optional)**: PostgreSQL

## 🚀 Getting Started

```bash
git clone https://github.com/cuzbog/romania-educata.git
cd romania-educata
npm install
npm run dev
