'use client';

import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { exportHtmlElement } from '@/lib/exports/htmlExport';
import { useRef, useState } from 'react';

type ExportFormat = 'pdf' | 'image';

interface ExportButtonProps {
  tableRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({ tableRef, fileName, disabled = false, className = '' }: ExportButtonProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!tableRef.current) return;
    
    try {
      setIsExporting(true);
      await exportHtmlElement(tableRef.current, {
        format: exportFormat,
        fileName,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
        className="border border-border bg-background text-foreground text-xs sm:text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
      >
        <option value="pdf">PDF</option>
        <option value="image">Image (PNG)</option>
      </select>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="whitespace-nowrap"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
    </div>
  );
}
