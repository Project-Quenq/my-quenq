(function() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const gate = document.getElementById('registration-gate');
    const tzInput = document.getElementById('user-timezone');
    
    if (tz && tzInput) {
      tzInput.value = tz;
    }

    if (gate && tz) {
      const blockedTimezones = JSON.parse(gate.getAttribute('data-blocked') || "[]");
      
      if (blockedTimezones.includes(tz)) {
        const formContainer = document.getElementById('signup-form-container');
        const messageBox = document.getElementById('blocked-message');
        
        if (formContainer) formContainer.style.display = 'none';
        if (messageBox) messageBox.style.display = 'flex';
      }
    }
  } catch (e) {
    console.error("Registration gate error:", e);
  }
})();