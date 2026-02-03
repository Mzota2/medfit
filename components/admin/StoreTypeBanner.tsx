/**
 * Store Type Banner Component
 * Shows store type prominently at top of admin dashboard
 */

'use client';

import React from 'react';
import { useStoreType } from '@/hooks/useStoreType';
import { getStoreTypeLabel, getStoreTypeBadgeColor } from '@/lib/store-type/utils';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export const StoreTypeBanner: React.FC = () => {
  const { storeType, isLoading } = useStoreType();

  if (isLoading || !storeType) {
    return null;
  }

  return (
    <div className={cn(
      'mb-6 p-4 rounded-lg border',
      getStoreTypeBadgeColor(storeType)
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">
            Store Type: {getStoreTypeLabel(storeType)}
          </div>
        </div>
        <Link
          href="/admin/settings"
          className="text-sm underline hover:no-underline flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Change in Settings
        </Link>
      </div>
    </div>
  );
};

