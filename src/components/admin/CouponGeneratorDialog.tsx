'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Dictionary } from '@/lib/dictionaries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronsUpDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  type: 'soin' | 'formation';
}

interface CouponGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (discount: number, product: Product) => Promise<void>;
  dictionary: Dictionary;
}

export default function CouponGeneratorDialog({ open, onOpenChange, onGenerate, dictionary }: CouponGeneratorDialogProps) {
  const firestore = useFirestore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListOpen, setListOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!firestore) return;
      setLoading(true);
      const fetchedProducts: Product[] = [];
      try {
        const formationsSnap = await getDocs(collection(firestore, 'formations'));
        formationsSnap.forEach(doc => {
            const data = doc.data();
            if (data.name && data.name.fr) {
                fetchedProducts.push({ id: doc.id, name: data.name.fr, type: 'formation' });
            }
        });
        const sessionsSnap = await getDocs(collection(firestore, 'sessionTypes'));
        sessionsSnap.forEach(doc => {
            const data = doc.data();
            if (data.name && data.name.fr) {
                fetchedProducts.push({ id: doc.id, name: data.name.fr, type: 'soin' });
            }
        });
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (error) {
          console.error("Erreur lors de la récupération des produits:", error);
      } finally {
          setLoading(false);
      }
    };

    if(open) {
        fetchProducts();
        setSelectedProduct(null);
        setListOpen(false);
        setSearchTerm('');
    }
  }, [firestore, open]);

  useEffect(() => {
    const results = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(results);
  }, [searchTerm, products]);

  const handleGenerateClick = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    await onGenerate(discount, selectedProduct);
    setIsGenerating(false);
    onOpenChange(false);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setListOpen(false);
  };

  const messagesDict = (dictionary as any).messages.coupons;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{messagesDict.dialog_title}</DialogTitle>
          <DialogDescription>{messagesDict.dialog_description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="discount" className="text-right">
              {messagesDict.discount_label}
            </Label>
            <Input
              id="discount"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value, 10))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="product-selector" className="text-right">
              {messagesDict.product_label}
            </Label>
            <Collapsible open={isListOpen} onOpenChange={setListOpen} className="col-span-3">
              <CollapsibleTrigger asChild>
                <Button id="product-selector" variant="outline" className="w-full justify-between" disabled={loading}>
                  {loading ? messagesDict.loading_products : (selectedProduct ? selectedProduct.name : messagesDict.product_placeholder)}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-md border bg-popover text-popover-foreground shadow-lg">
                  <Input 
                    placeholder={messagesDict.product_placeholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="m-1 w-[calc(100%-0.5rem)]"
                  />
                  <ScrollArea className="h-48">
                    <div className="p-1">
                      {filteredProducts.length === 0 && <p className='p-2 text-center text-sm text-muted-foreground'>{messagesDict.no_product_found}</p>}
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleProductSelect(p)}
                          className="cursor-pointer rounded-sm p-2 text-sm hover:bg-accent"
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerateClick} disabled={!selectedProduct || isGenerating || loading}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? messagesDict.generating_button : messagesDict.generate_button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
