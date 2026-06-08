
function toggleCardNumber(id, fullNumber) {
    const el = document.getElementById(`cardNumber-${id}`);
    const currentText = el.innerText;

    if (currentText.includes("••••")) {
      el.innerText = String(fullNumber).replace(/(.{4})/g, '$1 ').trim();
    } else {
      el.innerText = `•••• •••• •••• ${String(fullNumber).slice(-4)}`;
    }
  }

  function flipCard(id) {
    const card = document.getElementById(`card-${id}`);
    card.classList.toggle("flipped");
  }

  function toggleCardNumber(id, fullNumber) {
      const el = document.getElementById(`cardNumber-${id}`);
      const icon = document.getElementById(`icon-eye-${id}`);
      const currentText = el.innerText;

      if (currentText.includes("••••")) {
          el.innerText = String(fullNumber).replace(/(.{4})/g, '$1 ').trim();
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
      } else {
          el.innerText = `•••• •••• •••• ${String(fullNumber).slice(-4)}`;
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
      }
  }



  function validateCardForm() {
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const cvv = document.getElementById('cvv').value.trim();
    const pin = document.getElementById('cardPin').value.trim();

    if (!/^\d{16}$/.test(cardNumber)) {
      alert("Card number must be exactly 16 digits.");
      return false;
    }

    if (!/^\d{3}$/.test(cvv)) {
      alert("CVV must be exactly 3 digits.");
      return false;
    }

    if (!/^\d{4}$/.test(pin)) {
      alert("PIN must be exactly 4 digits.");
      return false;
    }

    return true;
  }



