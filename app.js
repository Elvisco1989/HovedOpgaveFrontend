const { createApp } = Vue;

createApp({
  data() {
    return {
      customer: { name: '', email: '', address: '', phoneNumber: '', segment: '' },
      product: { name: '', description: '', price: 0, stock: 0 },
      products: [],
      customers: [],
      basket: [],
      order: null,
      customerId: '',
      error: ''
    };
  },
  computed: {
    basketTotal() {
      return this.basket.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    }
  },
  mounted() {
    this.loadProducts();
    this.loadCustomers();
  },
  methods: {
    async loadProducts() {
      try {
        const res = await fetch('https://localhost:7155/api/products');
        if (!res.ok) throw new Error('Failed to load products.');
        const data = await res.json();
        this.products = data.map(p => ({ ...p, id: p.id || p.ProductId }));
      } catch (err) {
        this.error = err.message;
      }
    },
    async loadCustomers() {
      try {
        const res = await fetch('https://localhost:7155/api/customers');
        if (!res.ok) throw new Error('Failed to load customers.');
        this.customers = await res.json();
      } catch (err) {
        this.error = err.message;
      }
    },
    async createCustomer() {
      try {
        const res = await fetch('https://localhost:7155/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.customer)
        });
        if (!res.ok) throw new Error('Failed to create customer.');
        this.customer = { name: '', email: '', address: '', phoneNumber: '', segment: '' };
        await this.loadCustomers();
        this.error = '';
      } catch (err) {
        this.error = err.message;
      }
    },
    async addProduct() {
      try {
        const res = await fetch('https://localhost:7155/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.product)
        });
        if (!res.ok) throw new Error('Failed to add product.');
        const newProduct = await res.json();
        newProduct.id = newProduct.id || newProduct.ProductId;
        this.products.push(newProduct);
        this.product = { name: '', description: '', price: 0, stock: 0 };
        this.error = '';
      } catch (err) {
        this.error = err.message;
      }
    },
    addToBasket(product) {
      const existing = this.basket.find(item => item.product.id === product.id);
      if (existing) {
        existing.quantity++;
      } else {
        this.basket.push({ product, quantity: 1 });
      }
    },
    increaseQuantity(item) {
      item.quantity++;
    },
    decreaseQuantity(item) {
      if (item.quantity > 1) item.quantity--;
    },
    removeFromBasket(item) {
      this.basket = this.basket.filter(i => i !== item);
    },
    async checkout() {
        if (!this.customerId) {
          this.error = "Please select a customer before checking out.";
          return;
        }
      
        try {
          // Clear previous errors
          this.error = '';
      
          // Add basket items to backend one by one
          for (const item of this.basket) {
            const addRes = await fetch(`https://localhost:7155/api/basket/${this.customerId}/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.product.productId, // Ensure this matches your product ID field
                quantity: item.quantity
              })
            });
            if (!addRes.ok) {
              const errData = await addRes.json().catch(() => ({}));
              throw new Error(errData.message || 'Failed to add item to basket');
            }
          }
      
          // Then call checkout endpoint
          const res = await fetch(`https://localhost:7155/api/Orders/${this.customerId}/checkout`, {
            method: 'POST'
          });
      
          const result = await res.json();
      
          if (res.ok) {
            this.order = result;
            this.basket = [];
            this.error = '';
            await this.loadProducts(); // refresh stock etc
          } else {
            this.error = result.message || "Checkout failed.";
          }
        } catch (err) {
          this.error = err.message || "An error occurred during checkout.";
          console.error(err);
        }
      },
      
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString();
    }
  }
}).mount('#app');
