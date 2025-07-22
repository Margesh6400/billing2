export interface ChallanData {
  type: 'issue' | 'return';
  challan_number: string;
  date: string;
  client: {
    id: string;
    name: string;
    site: string;
    mobile: string;
  };
  plates: Array<{
    size: string;
    quantity: number;
    notes?: string;
  }>;
  total_quantity: number;
}

export const generateJPGChallan = async (data: ChallanData): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    // Background image URLs
    const backgroundUrls = {
      issue: 'https://i.ibb.co/yBqbMV7M/udhar-bg.jpg', // Udhar Challan
      return: 'https://i.ibb.co/3ymhR5qp/jama-bg.jpg'  // Jama Challan
    };

    const backgroundUrl = backgroundUrls[data.type];
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Set canvas size to match background image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw background image
        ctx.drawImage(img, 0, 0);

        // Set text properties
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Helper function to draw text with word wrapping
        const drawText = (text: string, x: number, y: number, fontSize: number, maxWidth?: number) => {
          ctx.font = `${fontSize}px Arial, sans-serif`;
          if (maxWidth) {
            const words = text.split(' ');
            let line = '';
            let lineY = y;
            
            for (let i = 0; i < words.length; i++) {
              const testLine = line + words[i] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              
              if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, x, lineY);
                line = words[i] + ' ';
                lineY += fontSize + 4;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, x, lineY);
          } else {
            ctx.fillText(text, x, y);
          }
        };

        // Position calculations (approximate positions for typical challan layouts)
        const positions = {
          challan_number: { x: canvas.width * 0.7, y: canvas.height * 0.15 },
          date: { x: canvas.width * 0.7, y: canvas.height * 0.2 },
          client_name: { x: canvas.width * 0.15, y: canvas.height * 0.3 },
          client_id: { x: canvas.width * 0.15, y: canvas.height * 0.35 },
          client_site: { x: canvas.width * 0.15, y: canvas.height * 0.4 },
          client_mobile: { x: canvas.width * 0.15, y: canvas.height * 0.45 },
          items_start: { x: canvas.width * 0.1, y: canvas.height * 0.55 },
          total: { x: canvas.width * 0.7, y: canvas.height * 0.85 }
        };

        // Draw challan number
        drawText(`${data.challan_number}`, positions.challan_number.x, positions.challan_number.y, 16);

        // Draw date
        const formattedDate = new Date(data.date).toLocaleDateString('en-GB');
        drawText(formattedDate, positions.date.x, positions.date.y, 14);

        // Draw client information
        drawText(`${data.client.name}`, positions.client_name.x, positions.client_name.y, 14, canvas.width * 0.4);
        drawText(`ID: ${data.client.id}`, positions.client_id.x, positions.client_id.y, 12);
        drawText(`Site: ${data.client.site}`, positions.client_site.x, positions.client_site.y, 12, canvas.width * 0.4);
        drawText(`Mobile: ${data.client.mobile}`, positions.client_mobile.x, positions.client_mobile.y, 12);

        // Draw plate items
        let itemY = positions.items_start.y;
        const itemSpacing = 25;
        
        data.plates.forEach((plate, index) => {
          if (plate.quantity > 0) {
            const itemText = `${plate.size}: ${plate.quantity}`;
            drawText(itemText, positions.items_start.x, itemY, 12);
            
            // Add notes if available
            if (plate.notes && plate.notes.trim()) {
              drawText(`  Note: ${plate.notes}`, positions.items_start.x + 20, itemY + 15, 10, canvas.width * 0.6);
              itemY += itemSpacing + 15;
            } else {
              itemY += itemSpacing;
            }
          }
        });

        // Draw total
        drawText(`Total: ${data.total_quantity}`, positions.total.x, positions.total.y, 16);

        // Convert canvas to JPG data URL
        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(jpgDataUrl);
        
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load background image'));
    };

    img.src = backgroundUrl;
  });
};

export const downloadJPGChallan = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};