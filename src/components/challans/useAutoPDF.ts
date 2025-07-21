import { usePDF } from 'react-to-pdf';
import { useRef } from 'react';
import { ChallanData } from './types';

export function useAutoPDF() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { toPDF } = usePDF({
    targetRef,
    filename: 'challan.pdf',
    options: {
      format: 'a4'
    }
  });

  const generatePDF = async (data: ChallanData) => {
    await toPDF();
  };

  return {
    targetRef,
    generatePDF
  };
}
