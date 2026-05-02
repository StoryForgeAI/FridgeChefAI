'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import BarcodeScanner from '@/components/ui/BarcodeScanner';
import type { PantryItem } from '@/lib/types';

export default function ScannerPage() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    loadPantry();
  }, []);

  const loadPantry = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('pantry_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPantry(data || []);
  };

  const handleAdd = (item: PantryItem) => {
    setPantry((prev) => [item, ...prev]);
  };

  const removeItem = async (id: string) => {
    await supabase.from('pantry_items').delete().eq('id', id);
    setPantry((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Scan Items</h1>
      <BarcodeScanner onAdd={handleAdd} />
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Pantry Items ({pantry.length})</h2>
        <div className="space-y-2">
          {pantry.map((item) => (
            <div key={item.id} className="bg-white rounded-lg p-3 shadow flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.barcode}</p>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-500 text-xs">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
