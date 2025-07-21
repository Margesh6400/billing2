import { forwardRef, useImperativeHandle } from 'react';
import { ChallanData } from './types';
import { IssueChallan } from './IssueChallan';
import { ReturnChallan } from './ReturnChallan';
import { useAutoPDF } from './useAutoPDF';

export interface AutoChallanGeneratorRef {
  generatePDF: (data: ChallanData) => Promise<void>;
}

export const AutoChallanGenerator = forwardRef<AutoChallanGeneratorRef, { data?: ChallanData }>(
  ({ data }, ref) => {
    const { targetRef, generatePDF } = useAutoPDF();

    useImperativeHandle(ref, () => ({
      generatePDF: async (challanData: ChallanData) => {
        await generatePDF(challanData);
      }
    }));

    if (!data) return null;

    return (
      <div ref={targetRef} style={{ position: 'fixed', left: '-9999px' }}>
        {data.type === 'issue' ? (
          <IssueChallan data={data} />
        ) : (
          <ReturnChallan data={data} />
        )}
      </div>
    );
  }
);
