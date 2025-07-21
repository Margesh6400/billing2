import React from 'react';

// CSS for both challans
export const ChallanStyles = () => (
  <style>
    {`
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap');

      .challan-container {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        margin: 10mm auto;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        font-family: 'Noto Sans Gujarati', sans-serif;
      }

      @media print {
        .challan-container {
          box-shadow: none;
          margin: 0;
          padding: 10mm;
        }
      }

      .challan-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .company-name {
        font-size: 32px;
        font-weight: bold;
        color: #1a237e;
        margin: 0;
      }

      .company-subtitle {
        font-size: 16px;
        color: #455a64;
        margin: 5px 0;
      }

      .challan-type {
        font-size: 24px;
        font-weight: bold;
        color: #1976d2;
        margin: 15px 0;
        padding: 5px;
        border-bottom: 2px solid #1976d2;
      }

      .challan-info {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
        padding: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }

      .client-details {
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: #f5f5f5;
        margin: 20px 0;
      }

      .plates-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }

      .plates-table th,
      .plates-table td {
        border: 1px solid #e0e0e0;
        padding: 8px;
        text-align: left;
      }

      .plates-table th {
        background: #1976d2;
        color: white;
      }

      .plates-table tr:nth-child(even) {
        background: #f5f5f5;
      }

      .total-row {
        font-weight: bold;
        background: #e3f2fd !important;
      }

      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }

      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 60px;
      }

      .signature-box {
        width: 200px;
        text-align: center;
      }

      .signature-line {
        border-top: 1px solid #000;
        margin-top: 40px;
        padding-top: 5px;
      }

      @media print {
        .no-print {
          display: none;
        }
      }
    `}
  </style>
);

export default ChallanStyles;
