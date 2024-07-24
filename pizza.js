document.addEventListener("alpine:init", () => {
  Alpine.data('pizzaCart', () => {
    return {
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
      cartData: {},

      login() {
        if (this.username.length > 2) {
          localStorage['username'] = this.username;
          this.createCart();
          this.isLoggedIn = true;
          this.showHistory = false;
          this.loadHistory();
        } else {
          alert('Username must be at least 3 characters long');
        }
      },
      
      
      orderAgain(order) {
      
        this.cartPizzas = [];
        this.cartTotal = 0.00;

       
        this.createCart().then(() => {
          this.cartId = localStorage['cartId'];

          
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
          this.saveHistory(); 
          this.username = '';
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

        const cartId = localStorage['cartId'];
        if (cartId) {
          this.cartId = cartId;
          return Promise.resolve();
        } else {
          const createCartURL = `https://pizza-api.projectcodex.net/api/pizza-cart/create?username=${this.username}`;
          return axios.get(createCartURL)
            .then(result => {
              this.cartId = result.data.cart_code;
              localStorage['cartId'] = this.cartId;
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

      init() {
        const storedUsername = localStorage['username'];
        if (storedUsername) {
          // this.username = storedUsername;
          this.isLoggedIn = true;
          this.loadHistory();
          this.cartId = localStorage['cartId'] || '';
          if (this.cartId) {
            this.showCartData();
          } else {
            this.createCart().then(() => {
              this.showCartData();
            });
          }
        }
        
        axios
          .get('https://pizza-api.projectcodex.net/api/pizzas')
          .then(result => {
            this.pizzas = result.data.pizzas;
          });
      },

      addPizzaToCart(pizzaId) {
        this.addPizza(pizzaId)
          .then(() => {
            this.showCartData();
          });
      },

      removePizzaFromCart(pizzaId) {
        this.removePizza(pizzaId)
          .then(() => {
            this.showCartData();
          });
      },

      payForCart() {
        this.pay(this.paymentAmount)
          .then(result => {
            if (result.data.status == 'failure') {
              this.message = result.data.message;
              setTimeout(() => (this.message = ''), 3000);
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
      }
    }
  });
});