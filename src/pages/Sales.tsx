import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { salesApi, stockApi, brandApi } from '../services/api';
import { Brand, Stock, Sale } from '../types';
import { getSizeDisplayName } from '../utils/sizeMapping';
import Footer from '../components/Footer';
import './Sales.css';

interface CartItem {
  brand: Brand;
  size: string;
  price: number;
  quantity: number;
}

const Sales: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [brandsData, salesData, stockData] = await Promise.all([
        brandApi.getAll(),
        salesApi.getAll(),
        stockApi.getAll()
      ]);
      setBrands(brandsData);
      setSales(salesData);
      setStock(stockData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch data';
      toast.error(errorMessage);
      console.error('Sales data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get stock quantity for a specific brand and size
  const getStockQuantity = (brandId: number, size: string): number => {
    const stockItem = stock.find(item => item.brand_id === brandId && item.size === size);
    return stockItem ? stockItem.quantity : 0;
  };

  // Get available stock after considering cart items
  const getAvailableStock = (brandId: number, size: string): number => {
    const totalStock = getStockQuantity(brandId, size);
    const cartQuantity = cartItems
      .filter(item => item.brand.id === brandId && item.size === size)
      .reduce((sum, item) => sum + item.quantity, 0);
    return Math.max(0, totalStock - cartQuantity);
  };

  // Get available sizes for a brand (only show sizes with prices set)
  const getAvailableSizes = (brand: Brand): string[] => {
    const sizes = [];
    if (brand.price_90ml && brand.price_90ml > 0) sizes.push('90ml');
    if (brand.price_180ml && brand.price_180ml > 0) sizes.push('180ml');
    if (brand.price_330ml && brand.price_330ml > 0) sizes.push('330ml');
    if (brand.price_375ml && brand.price_375ml > 0) sizes.push('375ml');
    if (brand.price_500ml && brand.price_500ml > 0) sizes.push('500ml');
    if (brand.price_650ml && brand.price_650ml > 0) sizes.push('650ml');
    if (brand.price_750ml && brand.price_750ml > 0) sizes.push('750ml');
    if (brand.price_1l && brand.price_1l > 0) sizes.push('1L');
    if (brand.price_2l && brand.price_2l > 0) sizes.push('2L');
    return sizes;
  };

  // Get price for a specific size
  const getPrice = (brand: Brand, size: string): number => {
    switch (size) {
      case '90ml': return brand.price_90ml || 0;
      case '180ml': return brand.price_180ml || 0;
      case '330ml': return brand.price_330ml || 0;
      case '375ml': return brand.price_375ml || 0;
      case '500ml': return brand.price_500ml || 0;
      case '650ml': return brand.price_650ml || 0;
      case '750ml': return brand.price_750ml || 0;
      case '1L': return brand.price_1l || 0;
      case '2L': return brand.price_2l || 0;
      default: return 0;
    }
  };

  // Add item to cart (with quantity parameter for bulk adds)
  const addToCart = (brand: Brand, size: string, quantityToAdd: number = 1) => {
    const price = getPrice(brand, size);
    
    if (price <= 0) {
      toast.error(`Price not set for ${brand.name} - ${size}`);
      return;
    }

    const availableStock = getAvailableStock(brand.id, size);
    if (availableStock < quantityToAdd) {
      toast.error(`Only ${availableStock} items available for ${brand.name} - ${size}`);
      return;
    }
    
    const existingItemIndex = cartItems.findIndex(
      item => item.brand.id === brand.id && item.size === size
    );

    if (existingItemIndex >= 0) {
      // Item exists, increase quantity
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity += quantityToAdd;
      setCartItems(updatedItems);
    } else {
      // New item, add to cart
      const newItem: CartItem = {
        brand,
        size,
        price,
        quantity: quantityToAdd
      };
      setCartItems([...cartItems, newItem]);
    }

    toast.success(`Added ${quantityToAdd}x ${brand.name} ${size} to cart`);
  };

  // Update quantity of item in cart
  const updateQuantity = (brandId: number, size: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(brandId, size);
      return;
    }

    const totalStock = getStockQuantity(brandId, size);
    if (newQuantity > totalStock) {
      toast.error(`Only ${totalStock} items available in stock`);
      return;
    }

    const updatedItems = cartItems.map(item => {
      if (item.brand.id === brandId && item.size === size) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCartItems(updatedItems);
  };

  // Handle direct quantity input change
  const handleQuantityInputChange = (brandId: number, size: string, value: string) => {
    // Allow empty string for clearing the field temporarily
    if (value === '') {
      // Temporarily allow empty field for better UX while typing
      const updatedItems = cartItems.map(item => {
        if (item.brand.id === brandId && item.size === size) {
          return { ...item, quantity: 0 }; // Temporarily set to 0, will be corrected on blur
        }
        return item;
      });
      setCartItems(updatedItems);
      return;
    }

    const newQuantity = parseInt(value);
    
    // Validate input - must be a positive number
    if (isNaN(newQuantity) || newQuantity < 1) {
      toast.error('Quantity must be a positive number');
      return;
    }

    const totalStock = getStockQuantity(brandId, size);
    if (newQuantity > totalStock) {
      const brandName = brands.find(b => b.id === brandId)?.name || 'Selected item';
      toast.error(`Only ${totalStock} items available for ${brandName} - ${size}`);
      // Reset to maximum available stock
      updateQuantity(brandId, size, totalStock);
      return;
    }

    // Valid quantity, update cart
    updateQuantity(brandId, size, newQuantity);
  };

  // Handle when user finishes editing quantity input (onBlur)
  const handleQuantityInputBlur = (brandId: number, size: string, currentQuantity: number) => {
    // If field is empty or 0 after blur, set to 1 as minimum
    if (!currentQuantity || currentQuantity < 1) {
      updateQuantity(brandId, size, 1);
      toast.success('Quantity set to minimum value: 1');
    }
  };

  // Handle Enter key press in quantity input
  const handleQuantityKeyPress = (e: React.KeyboardEvent, brandId: number, size: string) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur(); // Trigger onBlur validation
    }
  };

  // Select all text when input gets focus for better UX
  const handleQuantityFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  // Remove item from cart
  const removeFromCart = (brandId: number, size: string) => {
    const updatedItems = cartItems.filter(
      item => !(item.brand.id === brandId && item.size === size)
    );
    setCartItems(updatedItems);
    toast.success('Item removed from cart');
  };

  // Clear all items from cart
  const clearCart = () => {
    setCartItems([]);
    toast.success('Cart cleared');
  };

  // Calculate cart total
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Handle checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const saleData = {
        items: cartItems.map(item => ({
          brand_id: item.brand.id,
          size: item.size,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod
      };

      await salesApi.create(saleData);
      
      toast.success(`Sale recorded successfully! Payment: ${paymentMethod.toUpperCase()}`);
      setCartItems([]);
      setSelectedBrand(null);
      setPaymentMethod('cash'); // Reset to default
      fetchData(); // Refresh data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to record sale';
      toast.error(errorMessage);
      console.error('Checkout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="sales-container">
        <div className="page-header">
          <h1 className="page-title">Quick Sales</h1>
        </div>
        <div className="loading">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="sales-container">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="page-header">
        <h1 className="page-title">Quick Sales</h1>
        <div className="sales-stats">
          <div className="stat-card">
            <div className="stat-value">₹{cartTotal.toFixed(2)}</div>
            <div className="stat-label">Cart Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{cartItems.length}</div>
            <div className="stat-label">Items in Cart</div>
          </div>
          <div className={`stat-card payment-indicator ${paymentMethod}`}>
            <div className="stat-value">{paymentMethod === 'cash' ? '💰' : '💳'}</div>
            <div className="stat-label">{paymentMethod.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="sales-content">
        {/* Brand Selection Grid */}
        <div className="brand-selection">
          <h2>Select Brands</h2>
          <div className="brand-grid">
            {brands.map((brand) => {
              const prices = [brand.price_90ml, brand.price_180ml, brand.price_330ml, brand.price_375ml, brand.price_500ml, brand.price_650ml, brand.price_750ml, brand.price_1l, brand.price_2l]
                .filter((price): price is number => price !== null && price > 0);
              
              if (prices.length === 0) return null; // Skip brands with no prices set
              
              return (
                <div 
                  key={brand.id} 
                  className={`brand-card ${selectedBrand?.id === brand.id ? 'selected' : ''}`}
                  onClick={() => setSelectedBrand(brand)}
                >
                  <div className="brand-name">{brand.name}</div>
                  <div className="brand-info">
                    <div className="price-range">
                      ₹{Math.min(...prices)} - ₹{Math.max(...prices)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Size Selection */}
        {selectedBrand && (
          <div className="size-selection">
            <h3>Select Size for {selectedBrand.name}</h3>
            <div className="size-grid">
              {getAvailableSizes(selectedBrand).map((size) => {
                const price = getPrice(selectedBrand, size);
                const availableStock = getAvailableStock(selectedBrand.id, size);
                const totalStock = getStockQuantity(selectedBrand.id, size);
                
                return (
                  <div key={size} className="size-item">
                    <div className="size-info">
                      <div className="size-label">{getSizeDisplayName(size)}</div>
                      <div className="size-price">₹{Number(price || 0).toFixed(2)}</div>
                      <div className="stock-info">
                        <span className={`stock-count ${availableStock === 0 ? 'out-of-stock' : availableStock <= 5 ? 'low-stock' : ''}`}>
                          {availableStock} / {totalStock} available
                        </span>
                      </div>
                    </div>
                    
                    {availableStock > 0 && (
                      <div className="quantity-buttons">
                        <button
                          className="qty-add-btn"
                          onClick={() => addToCart(selectedBrand, size, 1)}
                          disabled={availableStock < 1}
                        >
                          +1
                        </button>
                        {availableStock >= 2 && (
                          <button
                            className="qty-add-btn"
                            onClick={() => addToCart(selectedBrand, size, 2)}
                          >
                            +2
                          </button>
                        )}
                        {availableStock >= 5 && (
                          <button
                            className="qty-add-btn"
                            onClick={() => addToCart(selectedBrand, size, 5)}
                          >
                            +5
                          </button>
                        )}
                      </div>
                    )}
                    
                    {availableStock === 0 && (
                      <div className="out-of-stock-label">Out of Stock</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shopping Cart */}
        {cartItems.length > 0 && (
          <div className="cart-section">
            <h3>Cart ({cartItems.length} items)</h3>
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={`${item.brand.id}-${item.size}`} className="cart-item">
                  <div className="item-info">
                    <span className="item-brand">{item.brand.name}</span>
                    <span className="item-size">{getSizeDisplayName(item.size)}</span>
                    <span className="item-price">₹{Number(item.price || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="quantity-section">
                    <div className="quantity-controls">
                      <div>
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.brand.id, item.size, item.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="qty-input"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleQuantityInputChange(item.brand.id, item.size, e.target.value)}
                          onBlur={() => handleQuantityInputBlur(item.brand.id, item.size, item.quantity)}
                          onFocus={handleQuantityFocus}
                          onKeyPress={(e) => handleQuantityKeyPress(e, item.brand.id, item.size)}
                          min="1"
                          max={getStockQuantity(item.brand.id, item.size)}
                          title={`Max available: ${getStockQuantity(item.brand.id, item.size)}`}
                          placeholder="Qty"
                        />
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.brand.id, item.size, item.quantity + 1)}
                          disabled={item.quantity >= getStockQuantity(item.brand.id, item.size)}
                        >
                          +
                        </button>
                      </div>
                      
                      <div className="bulk-controls">
                        {item.quantity + 2 <= getStockQuantity(item.brand.id, item.size) && (
                          <button
                            className="bulk-btn"
                            onClick={() => updateQuantity(item.brand.id, item.size, item.quantity + 2)}
                          >
                            +2
                          </button>
                        )}
                        {item.quantity + 5 <= getStockQuantity(item.brand.id, item.size) && (
                          <button
                            className="bulk-btn"
                            onClick={() => updateQuantity(item.brand.id, item.size, item.quantity + 5)}
                          >
                            +5
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="stock-indicator">
                      <small>Stock: {getStockQuantity(item.brand.id, item.size)}</small>
                    </div>
                  </div>
                  
                  <div className="item-total">
                    ₹{(Number(item.price || 0) * item.quantity).toFixed(2)}
                  </div>
                  
                  <button 
                    className="remove-btn"
                    onClick={() => removeFromCart(item.brand.id, item.size)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <div className="cart-footer">
              <div className="cart-total">
                <strong>Total: ₹{cartTotal.toFixed(2)}</strong>
              </div>
              
              <div className="payment-method-section">
                <h4>Payment Method</h4>
                <div className="payment-options">
                  <button
                    className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    💰 Cash
                  </button>
                  <button
                    className={`payment-btn ${paymentMethod === 'online' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('online')}
                  >
                    💳 Online
                  </button>
                </div>
              </div>
              
              <div className="cart-actions">
                <button className="btn btn-secondary" onClick={clearCart}>
                  Clear Cart
                </button>
                <button className="btn btn-primary" onClick={handleCheckout}>
                  Complete Sale ({paymentMethod.toUpperCase()})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="recent-sales">
        <h3>Recent Sales</h3>
        {sales.length > 0 ? (
          <div className="sales-grid">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="sale-card">
                <div className="sale-header">
                  <span className="sale-id">#{sale.id}</span>
                  <span className="sale-date">{new Date(sale.created_at).toLocaleDateString()}</span>
                  <span className={`payment-badge ${sale.payment_method}`}>
                    {sale.payment_method === 'cash' ? '💰' : '💳'} {sale.payment_method.toUpperCase()}
                  </span>
                </div>
                <div className="sale-items">
                  {sale.items.map((item, index) => (
                    <div key={index} className="sale-item-summary">
                      {item.brand.name} {item.size} x{item.quantity}
                    </div>
                  ))}
                </div>
                <div className="sale-total">₹{Number(sale.total_amount || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>No sales recorded yet.</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Sales;