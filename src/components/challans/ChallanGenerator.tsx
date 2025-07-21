import React, { useRef } from 'react';
import { usePDF } from 'react-to-pdf';
import { ChallanData } from './types';
import { IssueChallan } from './IssueChallan';
import { ReturnChallan } from './ReturnChallan';

interface ChallanGeneratorProps {
  data: ChallanData;
  onGenerated?: () => void;
}

export function ChallanGenerator({ data, onGenerated }: ChallanGeneratorProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const { toPDF } = usePDF({
    targetRef,
    filename: `${data.type}-challan-${data.challan_number}.pdf`,
    options: {
      format: 'a4'
    }
  });

  const handleGenerate = async () => {
    await toPDF();
    onGenerated?.();
  };

  return (
    <div>
      <div ref={targetRef}>
        {data.type === 'issue' ? (
          <IssueChallan data={data} />
        ) : (
          <ReturnChallan data={data} />
        )}
      </div>
      
      <div className="flex justify-center mt-4 no-print">
        <button
          onClick={handleGenerate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Generate PDF
        </button>
      </div>
    </div>
  );
}
