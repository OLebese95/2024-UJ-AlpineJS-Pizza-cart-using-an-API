document.addEventListener("alpine:init", () => {
  Alpine.data('pizzaCart', () => ({
    title: 'Pizza Cart API',
    pizzas: [],
    username: '',
    cartPizzas: [],
    cartTotal: 0.00,
    paymentAmount: '',
    message: '',
    change: 0,
    isLoggedIn: false,
    showHistory: false,
    orderHistory: [],
    cartId: '',
    cartData: [],
    featuredPizzas: [],

    init() {
      this.username = localStorage.getItem('username') || '';
      this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

      if (this.isLoggedIn) {
        this.cartId = localStorage.getItem('cartId') || '';
        this.loadHistory();
        this.showCartData();
        this.loadCart();
        this.loadFeaturedPizzas(); 
      }

      axios.get('https://pizza-api.projectcodex.net/api/pizzas')
        .then(result => {
          this.pizzas = result.data.pizzas;
        });
    },

    addToCart(pizza) {
      this.cartPizzas.push(pizza);
      this.saveCart();
    },

    featurePizza(pizza) {
      if (!this.isFeatured(pizza)) {
        this.featuredPizzas.push(pizza);
        if (this.featuredPizzas.length > 3) {
          this.featuredPizzas.shift();
        }
        this.saveFeaturedPizzas();
      }
    },

    isFeatured(pizza) {
      return this.featuredPizzas.some(p => p.id === pizza.id);
    },

    saveFeaturedPizzas() {
      if (this.username) {
        localStorage.setItem(`featuredPizzas_${this.username}`, JSON.stringify(this.featuredPizzas));
      }
    },

    loadFeaturedPizzas() {
      if (this.username) {
        this.featuredPizzas = JSON.parse(localStorage.getItem(`featuredPizzas_${this.username}`) || '[]');
      }
    },

    toggleHistory() {
      this.showHistory = !this.showHistory;
    },

    login() {
      if (this.username.length > 2) {
        localStorage.setItem('username', this.username);
        localStorage.setItem('isLoggedIn', true);
        this.createCart().then(() => {
          this.loadCart();
        });
        this.isLoggedIn = true;
        this.showHistory = false;
        this.loadHistory();
        this.loadFeaturedPizzas(); 
      } else {
        alert('Username must be at least 3 characters long');
      }
    },

    orderAgain(order) {
      this.cartPizzas = [];
      this.cartTotal = 0.00;

      this.createCart().then(() => {
        this.cartId = localStorage.getItem('cartId');

        order.pizzas.forEach(pizza => {
          this.addPizzaToCart(pizza.id).then(() => {
            this.showCartData();
          });
        });

        this.cartTotal = order.total;
        this.paymentAmount = order.paymentAmount;
        this.change = order.change;
      });
    },

    logout() {
      if (confirm('Are you sure you want to logout?')) {
        this.saveCart();
        localStorage.setItem('isLoggedIn', false);
        this.saveHistory();
        this.username = '';
        localStorage.removeItem('username');
        this.cartId = '';
        this.isLoggedIn = false;
        this.cartPizzas = [];
        this.cartTotal = 0.00;
        localStorage.removeItem('cartId');
        this.showHistory = false;
      }
    },

    createCart() {
      if (!this.username) {
        return Promise.resolve();
      }

      const cartId = localStorage.getItem('cartId');
      if (cartId) {
        this.cartId = cartId;
        return Promise.resolve();
      } else {
        const createCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/create?username=${this.username}`;
        return axios.get(createCartURL)
          .then(result => {
            this.cartId = result.data.cart_code;
            localStorage.setItem('cartId', this.cartId);
          });
      }
    },

    getCart() {
      const getCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/${this.cartId}/get`;
      return axios.get(getCartURL);
    },

    addPizza(pizzaId) {
      return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/add', {
        "cart_code": this.cartId,
        "pizza_id": pizzaId
      });
    },

    removePizza(pizzaId) {
      return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/remove', {
        "cart_code": this.cartId,
        "pizza_id": pizzaId
      });
    },

    pay(amount) {
      return axios.post('https://pizza-api.projectcodex.net/api/pizza-cart/pay', {
        "cart_code": this.cartId,
        amount
      });
    },

    showCartData() {
      this.getCart().then(result => {
        const cartData = result.data;
        this.cartPizzas = cartData.pizzas;
        this.cartTotal = cartData.total.toFixed(2);
      });
    },

    saveHistory() {
      if (this.username) {
        localStorage.setItem(this.username + '_orderHistory', JSON.stringify(this.orderHistory));
      }
    },

    loadHistory() {
      if (this.username) {
        this.orderHistory = JSON.parse(localStorage.getItem(this.username + '_orderHistory') || '[]');
      }
    },

    addPizzaToCart(pizzaId) {
      this.addPizza(pizzaId)
        .then(() => {
          this.showCartData();
          this.saveCart();
        });
    },

    removePizzaFromCart(pizzaId) {
      this.removePizza(pizzaId)
        .then(() => {
          this.showCartData();
          this.saveCart();
        });
    },

    payForCart() {
      this.pay(this.paymentAmount)
        .then(result => {
          if (result.data.status == 'failure') {
            this.message = result.data.message;
            setTimeout(() => {
              this.message = '';
            }, 3000);
          } else {
            this.message = 'Payment Successful!';

            if (Number(this.paymentAmount) >= Number(this.cartTotal)) {
              this.change = this.paymentAmount - this.cartTotal;
            } else {
              this.change = 0;
            }

            const orderData = {
              cartId: this.cartId,
              pizzas: this.cartPizzas.map(pizza => ({
                id: pizza.id,
                flavour: pizza.flavour,
                size: pizza.size,
                quantity: pizza.qty,
                price: pizza.total,
                total: pizza.total * pizza.qty
              })),
              total: Number(this.cartTotal),
              paymentAmount: Number(this.paymentAmount),
              change: this.change
            };

            this.orderHistory.push(orderData);
            this.saveHistory();

            setTimeout(() => {
              this.message = '';
              this.change = 0;
              this.cartPizzas = [];
              this.cartTotal = 0.00;
              this.cartId = '';
              this.paymentAmount = 0;
              localStorage.removeItem('cartId');
              this.createCart();
            }, 6000);
          }
        });
    },

    saveCart() {
      if (this.username) {
        localStorage.setItem(`cart-${this.username}`, JSON.stringify(this.cartPizzas));
      }
    },

    loadCart() {
      if (this.username) {
        const savedCart = localStorage.getItem(`cart-${this.username}`);
        if (savedCart) {
          this.cartPizzas = JSON.parse(savedCart);
          this.showCartData();
        }
      }
    },

    clearCart() {
      if (this.username) {
        localStorage.removeItem(`cart-${this.username}`);
        this.cartPizzas = [];
        this.cartTotal = 0.00;
      }
    }
  }));
});
