// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3T149047eNkEN7L9WAdclSkA4owR93h4",
  authDomain: "freeorcle.firebaseapp.com",
  projectId: "freeorcle",
  storageBucket: "freeorcle.appspot.com",
  messagingSenderId: "13265591895",
  appId: "1:13265591895:web:76f24a19f458f6ef198d12",
  measurementId: "G-YNWD1GR7SV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM elements
const loginForm = document.getElementById('login-form');
const generateForm = document.getElementById('generate-form');
const getResultButton = document.getElementById('getResultButton');
const creditsDisplay = document.getElementById('credits');
const planDetailsDisplay = document.getElementById('plan-details');

// Variables to track user and device
let currentKeyDoc = null;
let currentUserEmailOrMobile = localStorage.getItem('currentUser') || null;
let currentDeviceUUID = localStorage.getItem('deviceUUID') || null;

// Constants for initial credits and expiry days
const initialCredits = 20;
const initialExpiryDays = 5;

// Function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to show success notification
function showSuccessNotification(message) {
  Swal.fire({
    icon: 'success',
    title: 'Success',
    text: message,
    showConfirmButton: false,
    timer: 2000
  });
}

// Function to show error notification
function showErrorNotification(message) {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    showConfirmButton: false,
    timer: 2000
  });
}

// Function to validate email
function isValidEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;
  return re.test(email.toLowerCase());
}

// Function to validate mobile number
function isValidMobile(mobile) {
  const re = /^\d{10}$/;
  return re.test(mobile);
}

// Function to validate username
function isValidUsername(username) {
  const re = /^[a-zA-Z0-9]{1,20}$/;
  return re.test(username);
}

// Function to handle user login
function login() {
  const emailOrMobileOrUsername = document.getElementById('email-or-mobile').value.trim();

  if (!isValidEmail(emailOrMobileOrUsername) && !isValidMobile(emailOrMobileOrUsername) && !isValidUsername(emailOrMobileOrUsername)) {
    showErrorNotification('Enter a valid email ID, mobile number, or username to proceed.');
    return;
  }

  currentDeviceUUID = localStorage.getItem('deviceUUID') || generateUUID();

  db.collection('users').where('emailOrMobile', '==', emailOrMobileOrUsername).get().then(querySnapshot => {
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.approval === "approved") {
        if (userData.deviceUUID && userData.deviceUUID !== currentDeviceUUID) {
          showErrorNotification('This account is already in use on another device.');
          return;
        }

        currentKeyDoc = userDoc;
        currentUserEmailOrMobile = userData.emailOrMobile;
        creditsDisplay.innerText = `Credits: ${userData.credits}`;
        planDetailsDisplay.innerText = `Exp on ${new Date(userData.expiryDate.toDate()).toLocaleDateString()}`;
        loginForm.style.display = 'none';
        generateForm.style.display = 'block';
        showSuccessNotification('Logged in successfully.');
        document.getElementById('resultContainer').style.display = 'block';

        db.collection('users').doc(userDoc.id).update({
          deviceUUID: currentDeviceUUID
        }).then(() => {
          localStorage.setItem('deviceUUID', currentDeviceUUID);
          localStorage.setItem('currentUser', currentUserEmailOrMobile);
        }).catch(error => {
          console.error('Error updating deviceUUID:', error);
        });
      } else {
        showErrorNotification('Your account is not approved yet.');
      }
    } else {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + initialExpiryDays);

      db.collection('users').add({
        emailOrMobile: emailOrMobileOrUsername,
        approval: "pending",
        credits: initialCredits,
        expiryDate: firebase.firestore.Timestamp.fromDate(expiryDate),
        deviceUUID: currentDeviceUUID
      }).then((docRef) => {
        console.log('User registered:', emailOrMobileOrUsername);
        showSuccessNotification('Account created. Wait for approval.');
        localStorage.setItem('deviceUUID', currentDeviceUUID);
      }).catch(error => {
        console.error('Error registering user:', error);
        showErrorNotification('Error creating account.');
      });
    }
  }).catch(error => {
    console.error("Error logging in:", error);
    showErrorNotification('Error logging in.');
  });
}

// Function to handle user logout
function logout() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('deviceUUID');
  loginForm.style.display = 'block';
  generateForm.style.display = 'none';
  currentUserEmailOrMobile = null;
  currentKeyDoc = null;
  currentDeviceUUID = null;
}

// Function to check login status on page load
function checkLoginStatus() {
  if (currentUserEmailOrMobile) {
    db.collection('users').where('emailOrMobile', '==', currentUserEmailOrMobile).get().then(querySnapshot => {
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        if (userData.approval === "approved") {
          if (userData.deviceUUID && userData.deviceUUID !== currentDeviceUUID) {
            showErrorNotification('This account is already in use on another device.');
            logout();
            return;
          }

          currentKeyDoc = userDoc;
          creditsDisplay.innerText = `Credits: ${userData.credits}`;
          planDetailsDisplay.innerText = `Exp on ${new Date(userData.expiryDate.toDate()).toLocaleDateString()}`;
          loginForm.style.display = 'none';
          generateForm.style.display = 'block';
          document.getElementById('resultContainer').style.display = 'block';

          db.collection('users').doc(userDoc.id).update({
            deviceUUID: currentDeviceUUID
          }).then(() => {
            localStorage.setItem('deviceUUID', currentDeviceUUID);
          }).catch(error => {
            console.error('Error updating deviceUUID:', error);
          });
        } else {
          showErrorNotification('Your account is not approved yet.');
          logout();
        }
      } else {
        showErrorNotification('User not found.');
        logout();
      }
    }).catch(error => {
      console.error("Error checking login status:", error);
      logout();
    });
  }
}


// Event listener for Get Result button
getResultButton.addEventListener('click', () => {
  const currentKeyData = currentKeyDoc.data();

  if (currentKeyData.credits <= 0) {
    showCreditsEndedPopup();
    localStorage.setItem('creditsEndedPopupShown', 'true');
    return;
  }

  // Disable the button and show countdown text
  getResultButton.style.display = 'none';
  const countdownDisplay = document.getElementById('countdown-text');

  setTimeout(() => {
    const result = generateMineResult();
    const mineGameContainer = document.getElementById("mineGameContainer");
    mineGameContainer.innerHTML = "";

    // Create 25 boxes for the minefield
    for (let i = 1; i <= 25; i++) {
      const box = document.createElement('div');
      box.className = 'box';
      if (result.diamonds.includes(i)) {
        box.classList.add('diamond');
      }
      mineGameContainer.appendChild(box);
    }

    // Update credits and Firebase
    const newCredits = currentKeyData.credits - 1;

    if (newCredits >= 0) {
      db.collection('users').doc(currentKeyDoc.id).update({
        credits: newCredits
      }).then(() => {
        // Fetch the updated document to reflect the new state
        db.collection('users').doc(currentKeyDoc.id).get().then(doc => {
          currentKeyDoc = doc;
          creditsDisplay.innerText = `Credits: ${newCredits}`;
        });
      }).catch(error => {
        console.error("Error updating credits:", error);
      });
    } else {
      showCreditsEndedPopup();
      localStorage.setItem('creditsEndedPopupShown', 'true');
    }

    // Start the countdown after result is generated
    let countdown = 20;
    countdownDisplay.innerText = `Please wait ${countdown} seconds for the next result...`;
    const countdownInterval = setInterval(() => {
      countdown--;
      countdownDisplay.innerText = `Please wait ${countdown} seconds for the next result...`;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.innerText = ''; // Clear countdown text
        getResultButton.style.display = 'block'; // Show the button again
      }
    }, 1000); // Update countdown every second

  }, 731); // Adjust this delay if necessary
});

// Function to generate mine result
function generateMineResult() {
  const mineCount = 3;
  const totalBoxes = 25;
  const diamondsNeeded = 5;
  const boxes = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  for (let i = boxes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
  }

  const mines = boxes.slice(0, mineCount);
  const diamonds = boxes.slice(mineCount, mineCount + diamondsNeeded);

  return { mines, diamonds };
}

// Check login status on page load
window.onload = function() {
  checkLoginStatus();
};
