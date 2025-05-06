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