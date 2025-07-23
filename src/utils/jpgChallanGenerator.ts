import udharTemplate from '../assets/UdharReceiptTemplate_11zon.jpg';
import jamaTemplate from '../assets/JamaReceiptTemplate_11zon.jpg';

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

interface TemplateCoordinates {
  challan_number: { x: number; y: number };
  date: { x: number; y: number };
  client_name: { x: number; y: number };
  client_id: { x: number; y: number };
  client_site: { x: number; y: number };
  client_mobile: { x: number; y: number };
  table_start: { x: number; y: number };
  row_height: number;
  plate_size_x: number;
  quantity_x: number;
  notes_x: number;
  total: { x: number; y: number };
  second_total: { x: number; y: number };
}

const TEMPLATES = {
  issue: udharTemplate,
  return: jamaTemplate
};

// Adjusted coordinates based on actual template analysis
const COORDINATES: Record<'issue' | 'return', TemplateCoordinates> = {
  issue: {
    challan_number: { x: 520, y: 800 },
    date: { x: 1800, y: 800 },
    client_name: { x: 450, y: 980 },
    client_id: { x: 1900, y: 980 },
    client_site: { x: 450, y: 1080 },
    client_mobile: { x: 450, y: 1270 },
    table_start: { x: 900, y: 1570 },
    row_height: 130,
    plate_size_x: 220,
    quantity_x: 740,    // Increased spacing for quantity column
    notes_x: 1190,      // Increased spacing for notes column
    total: { x: 700, y: 2750 },
    second_total: { x: 1420, y: 3180 } // Added second total 100px below
  },
  return: {
    challan_number: { x: 520, y: 800 },
    date: { x: 1800, y: 800 },
    client_name: { x: 450, y: 980 },
    client_id: { x: 1900, y: 980 },
    client_site: { x: 450, y: 1080 },
    client_mobile: { x: 450, y: 1270 },
    table_start: { x: 900, y: 1570 },
    row_height: 130,
    plate_size_x: 220,
    quantity_x: 740,    // Increased spacing for quantity column
    notes_x: 1190,      // Increased spacing for notes column
    total: { x: 700, y: 2750 },
    second_total: { x: 1420, y: 3180 } // Added second total 100px below
  }
};

const TEMPLATE_PLATE_SIZES = [
  '2 X 3', '21 X 3', '18 X 3', '15 X 3', '12 X 3', 
  '9 X 3', 'પતરા', '2 X 2', '2 ફુટ'
];

// Enhanced text rendering with better visibility
function renderHighContrastText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  x: number, 
  y: number,
  fontSize: number = 56, // Further increased default font size
  fontWeight: string = 'bold',
  color: string = '#000000'
) {
  if (!text || text.trim() === '') return;
  
  // Set font with proper fallbacks for Gujarati
  ctx.font = `${fontWeight} ${fontSize}px "Noto Sans Gujarati", "Noto Sans Devanagari", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Main text - always black
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x, y);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '/');
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function renderChallanHeader(
  ctx: CanvasRenderingContext2D, 
  data: ChallanData, 
  coords: TemplateCoordinates
) {
  // Challan Number
  renderHighContrastText(
    ctx, 
    data.challan_number.toString(), 
    coords.challan_number.x, 
    coords.challan_number.y,
    60,  // Further increased font size
    'bold'
  );
  
  // Date
  const formattedDate = formatDate(data.date);
  renderHighContrastText(
    ctx, 
    formattedDate, 
    coords.date.x, 
    coords.date.y,
    60,  // Further increased font size
    'bold'
  );
}

function renderClientDetails(
  ctx: CanvasRenderingContext2D, 
  data: ChallanData, 
  coords: TemplateCoordinates
) {
  // Client Name
  renderHighContrastText(
    ctx, 
    truncateText(data.client.name, 25), 
    coords.client_name.x, 
    coords.client_name.y,
    56,  // Further increased font size
    'bold'
  );
  
  // Client ID
  renderHighContrastText(
    ctx, 
    data.client.id.toString(), 
    coords.client_id.x, 
    coords.client_id.y,
    56,  // Further increased font size
    'bold'
  );
  
  // Site
  renderHighContrastText(
    ctx, 
    truncateText(data.client.site || '', 30), 
    coords.client_site.x, 
    coords.client_site.y,
    56,  // Further increased font size
    'normal'
  );
  
  // Mobile
  renderHighContrastText(
    ctx, 
    data.client.mobile || '', 
    coords.client_mobile.x, 
    coords.client_mobile.y,
    56,  // Further increased font size
    'normal'
  );
}

function renderPlatesTable(
  ctx: CanvasRenderingContext2D, 
  data: ChallanData, 
  coords: TemplateCoordinates
) {
  let currentY = coords.table_start.y;
  
  // Render all template plate sizes in order
  TEMPLATE_PLATE_SIZES.forEach((templateSize) => {
    const plateData = data.plates.find(p => p.size === templateSize);
    
    // Always render the row position for this plate size
    if (plateData && plateData.quantity > 0) {
      // Quantity - render in the quantity column
      renderHighContrastText(
        ctx,
        plateData.quantity.toString(),
        coords.quantity_x,
        currentY,
        56,  // Further increased font size
        'bold'
      );
      
      // Notes - render in notes column if present
      if (plateData.notes && plateData.notes.trim()) {
        renderHighContrastText(
          ctx,
          truncateText(plateData.notes, 20),
          coords.notes_x,
          currentY,
          56,  // Further increased font size
          'normal'
        );
      }
    }
    
    // Move to next row regardless of whether we had data
    currentY += coords.row_height;
  });
}

function renderTotal(
  ctx: CanvasRenderingContext2D, 
  data: ChallanData, 
  coords: TemplateCoordinates
) {
  // Render the main total
  renderHighContrastText(
    ctx,
    data.total_quantity.toString(),
    coords.total.x,
    coords.total.y,
    60,  // Further increased font size
    'bold'
  );

  // Render the second total (100 + current total)
  renderHighContrastText(
    ctx,
    (data.total_quantity).toString(),
    coords.second_total.x,
    coords.second_total.y,
    60,
    'bold'
  );
}

function preloadFont(): Promise<void> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '32px "Noto Sans Gujarati", Arial, sans-serif';
      ctx.fillText('પતરા', -1000, -1000); // Render off-screen to preload
    }
    setTimeout(resolve, 100); // Give font time to load
  });
}

export async function generateJPGChallan(data: ChallanData): Promise<string> {
  // Preload fonts first
  await preloadFont();
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Set canvas to A4 size at 300 DPI
    canvas.width = 2480;
    canvas.height = 3508;

    const backgroundImg = new Image();
    backgroundImg.crossOrigin = 'anonymous';
    
    backgroundImg.onload = () => {
      try {
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw background image to fill canvas
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        
        const coords = COORDINATES[data.type];
        
        // Render all elements
        renderChallanHeader(ctx, data, coords);
        renderClientDetails(ctx, data, coords);
        renderPlatesTable(ctx, data, coords);
        renderTotal(ctx, data, coords);
        
        // Convert to high-quality JPG
        const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(jpgDataUrl);
        
      } catch (error) {
        console.error('Error generating challan:', error);
        reject(error);
      }
    };

    backgroundImg.onerror = (error) => {
      console.error('Failed to load background template:', error);
      reject(new Error(`Failed to load background template: ${TEMPLATES[data.type]}`));
    };

    // Load the appropriate template
    backgroundImg.src = TEMPLATES[data.type];
  });
}

export const downloadJPGChallan = (dataUrl: string, filename: string) => {
  try {
    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = dataUrl;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the data URL to free memory
    URL.revokeObjectURL(dataUrl);
  } catch (error) {
    console.error('Error downloading JPG:', error);
    alert('Error downloading challan. Please try again.');
  }
};

// Helper function to test coordinates (for development)
export const testCoordinates = async (type: 'issue' | 'return') => {
  const testData: ChallanData = {
    type,
    challan_number: '12345',
    date: '2025-07-22',
    client: {
      id: 'TEST123',
      name: 'Test Client Name',
      site: 'Test Site Location',
      mobile: '9876543210'
    },
    plates: [
      { size: '2 X 3', quantity: 5, notes: 'Test note' },
      { size: 'પતરા', quantity: 3, notes: 'Gujarat test' }
    ],
    total_quantity: 8
  };
  
  return generateJPGChallan(testData);
};
