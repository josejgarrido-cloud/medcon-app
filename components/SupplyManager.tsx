import React, { useState } from 'react';
import { Doctor, Product, Sale, Supplier, User } from '../types';
import { Button } from './ui/Button';
import { Package, ShoppingCart, Truck, History, Plus, Search, Trash2, FileText, X, Lock, DollarSign } from 'lucide-react';
import { generateSaleReceipt } from '../services/pdfGenerator';

interface SupplyManagerProps {
  doctors: Doctor[];
  products: Product[];
  suppliers: Supplier[];
  sales: Sale[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddSupplier: (s: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onRegisterSale: (sale: Sale) => void;
  currentUser?: User | null;
}

export const SupplyManager: React.FC<SupplyManagerProps> = ({
  doctors, products, suppliers, sales,
  onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddSupplier, onDeleteSupplier, onRegisterSale,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'sell' | 'inventory' | 'history' | 'suppliers'>('sell');
  const isAssistant = currentUser?.role === 'assistant';
  
  // -- Venta State --
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [searchProduct, setSearchProduct] = useState('');

  // -- Inventario State --
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [formProduct, setFormProduct] = useState<Partial<Product>>({ name: '', costPrice: 0, sellPrice: 0, stock: 0, minStock: 5 });

  // -- Proveedor State --
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [formSupplier, setFormSupplier] = useState<Partial<Supplier>>({ name: '', contact: '', phone: '' });

  // Total Inventory Value
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);

  // --- Funciones de Venta ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckout = () => {
    if (!selectedDoctorId || cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.quantity), 0);
    const sale: Sale = {
      id: crypto.randomUUID(),
      doctorId: selectedDoctorId,
      date: new Date().toISOString(),
      items: cart.map(i => ({ productId: i.product.id, productName: i.product.name, quantity: i.quantity, priceAtSale: i.product.sellPrice })),
      total
    };

    onRegisterSale(sale);
    
    cart.forEach(item => {
      const updatedProduct = { ...item.product, stock: item.product.stock - item.quantity };
      onUpdateProduct(updatedProduct);
    });

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (doctor) generateSaleReceipt(sale, doctor);

    setCart([]);
    setSelectedDoctorId('');
    alert("Venta registrada exitosamente.");
  };

  // --- Funciones de Inventario ---
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.name) return;
    
    const productData: Product = {
      id: editingProduct || crypto.randomUUID(),
      name: formProduct.name!,
      costPrice: Number(formProduct.costPrice),
      sellPrice: Number(formProduct.sellPrice),
      stock: Number(formProduct.stock),
      minStock: Number(formProduct.minStock),
      supplierId: formProduct.supplierId
    };

    if (editingProduct) {
        onUpdateProduct(productData);
    } else {
        onAddProduct(productData);
    }
    
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setFormProduct({ name: '', costPrice: 0, sellPrice: 0, stock: 0, minStock: 5 });
  };

  const handleEditProduct = (p: Product) => {
      setEditingProduct(p.id);
      setFormProduct(p);
      setIsProductModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.name) return;
    onAddSupplier({ id: crypto.randomUUID(), ...formSupplier } as Supplier);
    setIsSupplierModalOpen(false);
    setFormSupplier({ name: '', contact: '', phone: '' });
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('sell')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'sell' ? 'bg-medical-50 text-medical-600' : 'text-slate-600 hover:bg-slate-50'}`}><ShoppingCart size={16}/> Vender</button>
        <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'inventory' ? 'bg-medical-50 text-medical-600' : 'text-slate-600 hover:bg-slate-50'}`}><Package size={16}/> Inventario</button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'bg-medical-50 text-medical-600' : 'text-slate-600 hover:bg-slate-50'}`}><History size={16}/> Historial</button>
        <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-medical-50 text-medical-600' : 'text-slate-600 hover:bg-slate-50'}`}><Truck size={16}/> Proveedores</button>
      </div>

      {/* --- VENDER (Accessible for Assistant) --- */}
      {activeTab === 'sell' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                 <input type="text" placeholder="Buscar insumo..." value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="w-full pl-10 px-4 py-2 border rounded-lg outline-none focus:border-medical-500 bg-white text-slate-900"/>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase())).map(product => (
                 <div key={product.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md cursor-pointer transition-all relative" onClick={() => addToCart(product)}>
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-slate-800">{product.name}</h3>
                       <span className={`text-xs px-2 py-0.5 rounded ${product.stock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{product.stock} un.</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">${product.sellPrice.toFixed(2)}</p>
                    {!isAssistant && <p className="text-xs text-slate-400">Costo: ${product.costPrice}</p>}
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 h-fit sticky top-4 shadow-sm">
             <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart className="text-medical-600"/> Carrito de Venta</h2>
             <select className="w-full mb-4 p-2 border rounded-lg bg-slate-50 text-slate-900 focus:ring-2 focus:ring-medical-500 outline-none" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
               <option value="">Seleccionar Médico...</option>
               {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
             </select>
             
             <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar bg-slate-50 p-2 rounded-lg">
               {cart.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-slate-700">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} x ${item.product.sellPrice}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-slate-800">${(item.quantity * item.product.sellPrice).toFixed(2)}</span>
                       <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                    </div>
                 </div>
               ))}
               {cart.length === 0 && <p className="text-center text-slate-400 text-sm py-4 italic">Carrito vacío</p>}
             </div>

             <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold mb-4">
                   <span className="text-slate-700">Total a Cobrar</span>
                   <span className="text-emerald-600">${cart.reduce((sum, i) => sum + (i.product.sellPrice * i.quantity), 0).toFixed(2)}</span>
                </div>
                <Button onClick={handleCheckout} disabled={!selectedDoctorId || cart.length === 0} className="w-full shadow-md" size="lg">Confirmar Venta</Button>
             </div>
          </div>
        </div>
      )}

      {/* --- INVENTARIO (Read-Only for Assistant, No Edit) --- */}
      {activeTab === 'inventory' && (
        <div>
           <div className="flex justify-between items-center mb-6">
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Inventario</h2>
                  {!isAssistant && <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><DollarSign size={14}/> Valor Total en Almacén: <span className="font-bold text-slate-700">${totalInventoryValue.toFixed(2)}</span></p>}
              </div>
              {!isAssistant && <Button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}><Plus size={18} className="mr-2"/> Nuevo Producto</Button>}
           </div>
           
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                 <tr>
                   <th className="px-6 py-3">Producto</th>
                   <th className="px-6 py-3">Proveedor</th>
                   <th className="px-6 py-3 text-right">Stock</th>
                   {!isAssistant && <th className="px-6 py-3 text-right">Costo</th>}
                   <th className="px-6 py-3 text-right">Venta</th>
                   {!isAssistant && <th className="px-6 py-3 text-center">Acciones</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {products.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50">
                     <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                     <td className="px-6 py-4 text-slate-500">{suppliers.find(s => s.id === p.supplierId)?.name || '-'}</td>
                     <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock <= p.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                         {p.stock}
                       </span>
                     </td>
                     {!isAssistant && <td className="px-6 py-4 text-right text-slate-600">${p.costPrice}</td>}
                     <td className="px-6 py-4 text-right font-bold text-emerald-600">${p.sellPrice}</td>
                     {!isAssistant && (
                       <td className="px-6 py-4 text-center">
                         <button onClick={() => handleEditProduct(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors mr-1"><FileText size={16}/></button>
                         <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                       </td>
                     )}
                   </tr>
                 ))}
                 {products.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Inventario vacío</td></tr>
                 )}
               </tbody>
             </table>
           </div>

           {isProductModalOpen && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800">{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</h3>
                    <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                 </div>
                 <form onSubmit={handleSaveProduct} className="space-y-3">
                   <input required placeholder="Nombre del insumo" value={formProduct.name} onChange={e => setFormProduct({...formProduct, name: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   <div className="grid grid-cols-2 gap-3">
                     <input type="number" required placeholder="Costo $" value={formProduct.costPrice || ''} onChange={e => setFormProduct({...formProduct, costPrice: parseFloat(e.target.value)})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                     <input type="number" required placeholder="Venta $" value={formProduct.sellPrice || ''} onChange={e => setFormProduct({...formProduct, sellPrice: parseFloat(e.target.value)})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <input type="number" required placeholder="Stock Inicial" value={formProduct.stock || ''} onChange={e => setFormProduct({...formProduct, stock: parseFloat(e.target.value)})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                     <input type="number" required placeholder="Stock Mínimo" value={formProduct.minStock || ''} onChange={e => setFormProduct({...formProduct, minStock: parseFloat(e.target.value)})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   </div>
                   <select className="w-full border p-2 rounded bg-white text-slate-900" value={formProduct.supplierId || ''} onChange={e => setFormProduct({...formProduct, supplierId: e.target.value})}>
                     <option value="">Proveedor (Opcional)</option>
                     {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                   <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} className="flex-1">Cancelar</Button>
                      <Button type="submit" className="flex-1">Guardar</Button>
                   </div>
                 </form>
               </div>
             </div>
           )}
        </div>
      )}

      {/* --- HISTORIAL --- */}
      {activeTab === 'history' && (
        <div>
          <h2 className="text-xl font-bold mb-6 text-slate-800">Historial de Ventas</h2>
          <div className="space-y-4">
            {sales.map(sale => {
              const doc = doctors.find(d => d.id === sale.doctorId);
              return (
                <div key={sale.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                   <div>
                     <p className="font-bold text-slate-800">Médico: {doc?.name || 'Desconocido'}</p>
                     <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleString()}</p>
                     <p className="text-sm text-slate-600 mt-1">{sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</p>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-lg text-emerald-600">${sale.total.toFixed(2)}</p>
                      <button onClick={() => doc && generateSaleReceipt(sale, doc)} className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 justify-end mt-1 font-medium">
                        <FileText size={14}/> Re-imprimir PDF
                      </button>
                   </div>
                </div>
              );
            })}
            {sales.length === 0 && <p className="text-center text-slate-400">No hay ventas registradas.</p>}
          </div>
        </div>
      )}

      {/* --- PROVEEDORES (ReadOnly Assistant) --- */}
      {activeTab === 'suppliers' && (
        <div>
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Proveedores</h2>
              {!isAssistant && <Button onClick={() => setIsSupplierModalOpen(true)}><Plus size={18} className="mr-2"/> Nuevo Proveedor</Button>}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {suppliers.map(s => (
               <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 relative group shadow-sm hover:shadow-md transition-shadow">
                  {!isAssistant && <button onClick={() => onDeleteSupplier(s.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>}
                  <h3 className="font-bold text-slate-800">{s.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2"><User size={12}/> {s.contact}</p>
                  <p className="text-sm text-slate-400 flex items-center gap-2"><Truck size={12}/> {s.phone}</p>
               </div>
             ))}
             {suppliers.length === 0 && <p className="text-slate-400 col-span-3 text-center">No hay proveedores registrados.</p>}
           </div>

           {isSupplierModalOpen && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                 <h3 className="font-bold text-lg mb-4 text-slate-800">Registrar Proveedor</h3>
                 <form onSubmit={handleSaveSupplier} className="space-y-3">
                   <input required placeholder="Empresa / Nombre" value={formSupplier.name} onChange={e => setFormSupplier({...formSupplier, name: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   <input required placeholder="Persona de Contacto" value={formSupplier.contact} onChange={e => setFormSupplier({...formSupplier, contact: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   <input required placeholder="Teléfono / Email" value={formSupplier.phone} onChange={e => setFormSupplier({...formSupplier, phone: e.target.value})} className="w-full border p-2 rounded outline-none focus:border-medical-500 bg-white text-slate-900"/>
                   <div className="flex gap-2 mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsSupplierModalOpen(false)} className="flex-1">Cancelar</Button>
                      <Button type="submit" className="flex-1">Guardar</Button>
                   </div>
                 </form>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};
