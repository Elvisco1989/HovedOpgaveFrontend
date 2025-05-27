const { createApp, ref, reactive, onMounted, computed } = Vue;

createApp({
  setup() {
    const currentTab = ref('shop');
    const customerId = ref(null);
    const error = ref('');
    const orderError = ref('');
    const basket = ref([]);
    const order = ref(null);
    const products = ref([]);
    const customers = ref([]);
    const showBasket = ref(false);

    // Reactive form objects
    const newCustomer = reactive({
      name: '',
      address: '',
      segment: '',
      email: '',
      phoneNumber: ''
    });

    const registration = reactive({
      name: '',
      address: '',
      segment: '',
      email: '',
      phoneNumber: ''
    });

    const registrationError = ref('');
    const registrationSuccess = ref('');

    const newProduct = reactive({
      name: '',
      price: 0,
      stock: 0,
      description: '',
      imagePath: ''
    });
    const switchTab = (tab) => {
      currentTab.value = tab;
    };
    

    // Load products from API
    const loadProducts = async () => {
      error.value = ''; // Reset error on load
      try {
        const res = await fetch('https://localhost:7155/api/Products');
        if (!res.ok) throw new Error("Failed to load products");
        products.value = await res.json();
      } catch (err) {
        error.value = "Failed to load products.";
        console.error(err);
      }
    };

    // Load customers from API
    const loadCustomers = async () => {
      error.value = '';
      try {
        const res = await fetch('https://localhost:7155/api/Customers');
        if (!res.ok) throw new Error("Failed to load customers");
        customers.value = await res.json();
      } catch (err) {
        error.value = "Failed to load customers.";
        console.error(err);
      }
    };

    // On component mount, fetch initial data
    onMounted(() => {
      loadProducts();
      loadCustomers();
    });

    // Add product to basket, requires customerId
    const addToBasket = async (product) => {
      error.value = '';
      if (!customerId.value) {
        error.value = 'Please enter a customer ID before adding items.';
        return;
      }

      try {
        const response = await fetch(`https://localhost:7155/api/Basket/${customerId.value}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.productId, quantity: 1 }),
        });

        if (!response.ok) throw new Error('Failed to add product to basket');

        // Update local basket state
        const existingItem = basket.value.find(item => item.product.productId === product.productId);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          basket.value.push({ product, quantity: 1 });
        }

      } catch (err) {
        error.value = 'Error adding to basket: ' + err.message;
        console.error(err);
      }
    };

    // Remove or decrease quantity of product from basket
    const removeFromBasket = (product) => {
      const index = basket.value.findIndex(item => item.product.productId === product.productId);
      if (index !== -1) {
        const item = basket.value[index];
        if (item.quantity > 1) {
          item.quantity -= 1;
        } else {
          basket.value.splice(index, 1);
        }
      }
    };

    // Checkout order for the current customer
    const checkout = async () => {
      error.value = '';
      orderError.value = '';
      order.value = null;

      if (!customerId.value) {
        error.value = 'Customer ID is required.';
        return;
      }
      if (basket.value.length === 0) {
        error.value = 'Basket is empty. Please add items before checkout.';
        return;
      }

      try {
        const response = await fetch(`https://localhost:7155/api/Orders/${customerId.value}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        order.value = await response.json();
        basket.value = [];
        showBasket.value = false;
      } catch (err) {
        console.error('Checkout error:', err);
        orderError.value = 'Checkout failed: ' + err.message;
      }
    };

    // Register a new customer via the registration form
    const registerCustomer = async () => {
      registrationError.value = '';
      registrationSuccess.value = '';

      // Basic validation
      if (!registration.name || !registration.address || !registration.segment || !registration.email || !registration.phoneNumber) {
        registrationError.value = 'Please fill in all registration fields.';
        return;
      }

      try {
        const res = await fetch('https://localhost:7155/api/Customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registration)
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Registration failed.');
        }

        const data = await res.json();
        registrationSuccess.value = `Successfully registered! Customer ID: ${data.customerId}`;
        registrationError.value = '';

        // Reset registration form
        Object.assign(registration, { name: '', address: '', segment: '', email: '', phoneNumber: '' });
        await loadCustomers();
      } catch (e) {
        registrationError.value = e.message;
        registrationSuccess.value = '';
      }
    };

    // Add a new customer (admin functionality)
    const addCustomer = async () => {
      error.value = '';
      if (!newCustomer.name || !newCustomer.email) {
        error.value = 'Name and email are required to add a customer.';
        return;
      }
      try {
        const res = await fetch('https://localhost:7155/api/Customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer)
        });

        if (!res.ok) throw new Error('Failed to add customer');

        await loadCustomers();

        // Reset newCustomer form
        Object.assign(newCustomer, { name: '', address: '', segment: '', email: '', phoneNumber: '' });
      } catch (e) {
        error.value = e.message;
      }
    };

    // Delete customer by ID
    const deleteCustomer = async (id) => {
      error.value = '';
      try {
        const res = await fetch(`https://localhost:7155/api/Customers/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete customer');
        await loadCustomers();
      } catch (e) {
        error.value = e.message;
      }
    };

    // Add new product (admin)
    const addProduct = async () => {
      error.value = '';
      if (!newProduct.name || newProduct.price <= 0 || newProduct.stock < 0) {
        error.value = 'Please enter valid product details.';
        return;
      }
      try {
        const res = await fetch('https://localhost:7155/api/Products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        });

        if (!res.ok) throw new Error('Failed to add product');

        await loadProducts();

        // Reset newProduct form
        Object.assign(newProduct, { name: '', price: 0, stock: 0, description: '', imagePath: '' });
      } catch (e) {
        error.value = e.message;
      }
    };

    // Delete product by ID (admin)
    const deleteProduct = async (id) => {
      error.value = '';
      try {
        const res = await fetch(`https://localhost:7155/api/Products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete product');
        await loadProducts();
      } catch (e) {
        error.value = e.message;
      }
    };

    // Format date nicely
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString();
    };

    // Total items in basket
    const totalItems = computed(() => {
      return basket.value.reduce((sum, item) => sum + item.quantity, 0);
    });

    return {
      currentTab,
      customerId,
      error,
      orderError,
      basket,
      products,
      order,
      customers,
      showBasket,
      totalItems,

      newCustomer,
      registration,
      registrationError,
      registrationSuccess,
      newProduct,

      addToBasket,
      removeFromBasket,
      checkout,

      registerCustomer,
      addCustomer,
      deleteCustomer,
      addProduct,
      deleteProduct,
      switchTab,

      formatDate,
      encodeURIComponent,  // in case you use it in template
    };
  }
}).mount('#app');
