import { ChallanData, COMPANY_INFO } from './types';
import ChallanStyles from './ChallanStyles';
import { format } from 'date-fns';

interface ReturnChallanProps {
  data: ChallanData;
}

export function ReturnChallan({ data }: ReturnChallanProps) {
  return (
    <div className="challan-container">
      <ChallanStyles />
      
      {/* Header */}
      <div className="challan-header">
        <h1 className="company-name">{COMPANY_INFO.name}</h1>
        <p className="company-subtitle">{COMPANY_INFO.subtitle}</p>
        <div className="challan-type">
          Return Challan (જમા ચલણ)
          <br />
          <small>Plates Returned</small>
        </div>
      </div>

      {/* Challan Info */}
      <div className="challan-info">
        <div>
          <strong>Challan No:</strong> {data.challan_number}
        </div>
        <div>
          <strong>Date:</strong> {format(new Date(data.date), 'dd/MM/yyyy')}
        </div>
      </div>

      {/* Client Details */}
      <div className="client-details">
        <h3>Client Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Client ID:</strong> {data.client.id}
            <br />
            <strong>Name:</strong> {data.client.name}
          </div>
          <div>
            <strong>Site:</strong> {data.client.site}
            <br />
            <strong>Mobile:</strong> {data.client.mobile}
          </div>
        </div>
      </div>

      {/* Plates Table */}
      <table className="plates-table">
        <thead>
          <tr>
            <th>Plate Size</th>
            <th>Returned Qty</th>
            <th>Damaged Qty</th>
            <th>Lost Qty</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.plates.map((plate, index) => (
            plate.quantity > 0 && (
              <tr key={index}>
                <td>{plate.size}</td>
                <td>{plate.quantity}</td>
                <td>{plate.damaged_quantity || 0}</td>
                <td>{plate.lost_quantity || 0}</td>
                <td>{plate.notes || '-'}</td>
              </tr>
            )
          ))}
          <tr className="total-row">
            <td>Total</td>
            <td>{data.total_quantity}</td>
            <td>
              {data.plates.reduce((sum, plate) => sum + (plate.damaged_quantity || 0), 0)}
            </td>
            <td>
              {data.plates.reduce((sum, plate) => sum + (plate.lost_quantity || 0), 0)}
            </td>
            <td>-</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="footer">
        <p><strong>Note:</strong> Thank you for using our service</p>
        
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-line">Client's Signature</div>
          </div>
          <div className="signature-box">
            <div className="signature-line">Authorized Signature</div>
          </div>
        </div>

        <div className="text-center mt-4 text-sm text-gray-600">
          {COMPANY_INFO.address} | Tel: {COMPANY_INFO.phone} | Email: {COMPANY_INFO.email}
        </div>
      </div>
    </div>
  );
}
