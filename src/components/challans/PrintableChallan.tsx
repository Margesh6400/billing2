import { ChallanData, COMPANY_INFO } from './types';
import { format } from 'date-fns';

interface PrintableChallanProps {
  data: ChallanData;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export function PrintableChallan({ data, containerRef }: PrintableChallanProps) {
  const isReturn = data.type === 'return';
  
  return (
    <div 
      ref={containerRef}
      id={`challan-${data.challan_number}`}
      className="bg-white p-8 max-w-[210mm] mx-auto"
      style={{
        fontFamily: "'Noto Sans Gujarati', sans-serif",
        fontSize: '14px'
      }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">{COMPANY_INFO.name}</h1>
        <p className="text-gray-600 mb-4">{COMPANY_INFO.subtitle}</p>
        <div className="text-xl font-bold text-blue-700 border-b-2 border-blue-700 pb-2">
          {isReturn ? 'Return Challan (જમા ચલણ)' : 'Issue Challan (ઉધાર ચલણ)'}
          <br />
          <span className="text-sm font-normal">
            {isReturn ? 'Plates Returned' : 'Plates Issued for Rent'}
          </span>
        </div>
      </div>

      {/* Challan Info */}
      <div className="flex justify-between mb-6 border p-3 bg-gray-50 rounded">
        <div><strong>Challan No:</strong> {data.challan_number}</div>
        <div><strong>Date:</strong> {format(new Date(data.date), 'dd/MM/yyyy')}</div>
      </div>

      {/* Client Details */}
      <div className="mb-6 border p-3 bg-gray-50 rounded">
        <h3 className="font-bold mb-2">Client Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div><strong>Client ID:</strong> {data.client.id}</div>
            <div><strong>Name:</strong> {data.client.name}</div>
          </div>
          <div>
            <div><strong>Site:</strong> {data.client.site}</div>
            <div><strong>Mobile:</strong> {data.client.mobile}</div>
          </div>
        </div>
      </div>

      {/* Plates Table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-blue-700 text-white text-left">Plate Size</th>
            <th className="border p-2 bg-blue-700 text-white text-left">Quantity</th>
            {isReturn && (
              <>
                <th className="border p-2 bg-blue-700 text-white text-left">Damaged</th>
                <th className="border p-2 bg-blue-700 text-white text-left">Lost</th>
              </>
            )}
            <th className="border p-2 bg-blue-700 text-white text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.plates
            .filter(plate => plate.quantity > 0)
            .map((plate, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border p-2">{plate.size}</td>
                <td className="border p-2">{plate.quantity}</td>
                {isReturn && (
                  <>
                    <td className="border p-2">{plate.damaged_quantity || 0}</td>
                    <td className="border p-2">{plate.lost_quantity || 0}</td>
                  </>
                )}
                <td className="border p-2">{plate.notes || '-'}</td>
              </tr>
          ))}
          <tr className="bg-blue-50 font-bold">
            <td className="border p-2">Total</td>
            <td className="border p-2">{data.total_quantity}</td>
            {isReturn && (
              <>
                <td className="border p-2">
                  {data.plates.reduce((sum, p) => sum + (p.damaged_quantity || 0), 0)}
                </td>
                <td className="border p-2">
                  {data.plates.reduce((sum, p) => sum + (p.lost_quantity || 0), 0)}
                </td>
              </>
            )}
            <td className="border p-2">-</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8">
        <p className="mb-8 text-sm text-gray-600">
          <strong>Note:</strong> {
            isReturn 
              ? 'Thank you for using our service' 
              : 'Please return plates in good condition'
          }
        </p>
        
        <div className="flex justify-between mt-16">
          <div className="text-center w-48">
            <div className="border-t border-black pt-1">Client's Signature</div>
          </div>
          <div className="text-center w-48">
            <div className="border-t border-black pt-1">Authorized Signature</div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          {COMPANY_INFO.address} | Tel: {COMPANY_INFO.phone} | Email: {COMPANY_INFO.email}
        </div>
      </div>
    </div>
  );
}
