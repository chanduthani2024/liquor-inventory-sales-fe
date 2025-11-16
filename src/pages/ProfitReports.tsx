// This file has been consolidated into:
// 1. Dashboard.tsx - Profit KPIs are now shown on the main dashboard
// 2. Reports.tsx - Profit report download functionality has been added to the Reports page
// 
// The standalone Profit Reports page has been removed to provide a better user experience
// with consolidated reporting features.

import React from 'react';

export default function ProfitReportsDeprecated() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>📊 Profit Reports have been moved!</h2>
      <p>Profit functionality is now available in:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ margin: '1rem 0' }}>
          <strong>📈 Dashboard</strong> - View profit KPIs and summaries
        </li>
        <li style={{ margin: '1rem 0' }}>
          <strong>📋 Reports</strong> - Download detailed profit reports
        </li>
      </ul>
    </div>
  );
}