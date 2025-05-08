(function () {
  function getCartData() {
    const params = new URLSearchParams(window.location.search);
    const cart = params.get("cart");
    if (!cart) return null;
    try {
      return JSON.parse(atob(cart));
    } catch (e) {
      return null;
    }
  }

  async function clearCart() {
    await fetch("/cart/clear.js", { method: "POST" });
  }

  async function addItems(items) {
    for (const item of items) {
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, quantity: item.quantity }),
      });
    }
  }

  async function applyDiscount(discount) {
    if (discount) {
      // Track that the discount was applied
      try {
        const params = new URLSearchParams(window.location.search);
        const domain = window.location.hostname;
        
        // Send analytics data to backend
        await fetch('https://share-cart.onrender.com/analytics/coupon-usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            couponCode: discount,
            userType: 'recipient', // This is a recipient using a shared cart
            shop: domain,
            // We can't know the order value yet as the purchase hasn't completed
            // The webhook will handle the full details
          })
        });
      } catch (err) {
        console.error('Error recording coupon usage:', err);
      }
      
      window.location.href = `/discount/${discount}?redirect=/cart`;
    } else {
      window.location.href = "/cart";
    }
  }

  async function restoreCart() {
    const cartData = getCartData();
    const params = new URLSearchParams(window.location.search);
    const discount = params.get("discount");
    const appDiv = document.getElementById("share-cart-app");
    if (!cartData || !cartData.items) {
      if (appDiv) appDiv.innerText = "Invalid or missing cart data.";
      return;
    }
    if (appDiv) appDiv.innerText = "Restoring your cart...";
    await clearCart();
    await addItems(cartData.items);
    await applyDiscount(discount || cartData.discount);
  }

  document.addEventListener("DOMContentLoaded", restoreCart);
})();