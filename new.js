// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCetxYahB16d2ik5JTrVZpFZYBsrd48YLU",
  authDomain: "orcaleprm.firebaseapp.com",
  projectId: "orcaleprm",
  storageBucket: "orcaleprm.appspot.com",
  messagingSenderId: "97028714002",
  appId: "1:97028714002:web:943624b95a6ece1f6f72cb",
  measurementId: "G-ZYD8H0TYFJ"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const loginForm = document.getElementById('login-form');
const generateForm = document.getElementById('generate-form');
const getResultButton = document.getElementById('getResultButton');
const creditsDisplay = document.getElementById('credits');
const planDetailsDisplay = document.getElementById('plan-details');

let currentKeyDoc = null;
let currentDeviceUUID = localStorage.getItem('deviceUUID') || uuid.v4(); // Retrieve or generate device UUID

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

function login() {
  const accessKey = document.getElementById('access-key').value.trim();

  db.collection('access_keys').doc(accessKey).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const currentTime = new Date();
      const expiryDate = new Date(data.expiry);

      if (currentTime > expiryDate) {
        showErrorNotification('Access key has expired.');
        return;
      }

      if (data.approved === false) {
        showErrorNotification('Access key is not approved for use.');
        return;
      }

      if (data.deviceUUID && data.deviceUUID !== currentDeviceUUID) {
        showErrorNotification('This access key is already in use on another device.');
        return;
      }

      // Update device UUID if not already set
      if (!data.deviceUUID) {
        db.collection('access_keys').doc(accessKey).update({
          deviceUUID: currentDeviceUUID
        }).then(() => {
          console.log('Device UUID updated for access key:', accessKey);
          localStorage.setItem('deviceUUID', currentDeviceUUID); // Store device UUID in localStorage
        }).catch(error => {
          console.error('Error updating device UUID:', error);
        });
      }

      currentKeyDoc = doc;
      creditsDisplay.innerText = `Credits: ${data.credits}`;
      planDetailsDisplay.innerText = `Exp on ${new Date(data.expiry).toLocaleDateString()}`;
      localStorage.setItem('accessKey', accessKey);
      loginForm.style.display = 'none';
      generateForm.style.display = 'block';

      // Ensure result container is shown after login
      document.getElementById('resultContainer').style.display = 'block'; // Show result container
    } else {
      showErrorNotification('Invalid access key.');
    }
  }).catch(error => {
    console.error("Error logging in:", error);
  });
}

function logout() {
  loginForm.style.display = 'block';
  generateForm.style.display = 'none';
  localStorage.removeItem('accessKey');
  currentKeyDoc = null;
}

function checkLoginStatus() {
  const savedKey = localStorage.getItem('accessKey');

  if (savedKey) {
    db.collection('access_keys').doc(savedKey).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const currentTime = new Date();
        const expiryDate = new Date(data.expiry);

        if (currentTime > expiryDate) {
          showErrorNotification('Access key has expired.');
          logout();
          return;
        }

        if (data.approved === false) {
          showErrorNotification('Access key is not approved for use.');
          logout();
          return;
        }

        if (data.deviceUUID && data.deviceUUID !== currentDeviceUUID) {
          showErrorNotification('This access key is already in use on another device.');
          logout();
          return;
        }

        // Update device UUID if not already set
        if (!data.deviceUUID) {
          db.collection('access_keys').doc(savedKey).update({
            deviceUUID: currentDeviceUUID
          }).then(() => {
            console.log('Device UUID updated for access key:', savedKey);
            localStorage.setItem('deviceUUID', currentDeviceUUID); // Store device UUID in localStorage
          }).catch(error => {
            console.error('Error updating device UUID:', error);
          });
        }

        currentKeyDoc = doc;
        creditsDisplay.innerText = `Credits: ${data.credits}`;
        planDetailsDisplay.innerText = `Exp ${new Date(data.expiry).toLocaleDateString()}`;
        loginForm.style.display = 'none';
        generateForm.style.display = 'block';
      } else {
        showErrorNotification('Invalid access key.');
        logout();
      }
    }).catch(error => {
      console.error("Error checking login status:", error);
      logout();
    });
  }
}

window.onload = checkLoginStatus;

// Define a state variable to track if generating result is allowed
let canGenerateResult = true;

// Check if credits ended and popup was shown previously
document.addEventListener('DOMContentLoaded', () => {
  const creditsEndedPopupShown = localStorage.getItem('creditsEndedPopupShown') === 'true';

  if (creditsEndedPopupShown) {
    showCreditsEndedPopup();
  }
});

getResultButton.addEventListener('click', () => {
  if (!canGenerateResult) {
    // Instead of showing an error, hide the button and show countdown text
    getResultButton.style.display = 'none';
    const countdownDisplay = document.getElementById('countdown-text');
    countdownDisplay.innerText = 'Please wait 10 seconds for the next result...';

    let countdown = 10;
    const countdownInterval = setInterval(() => {
      countdown--;
      countdownDisplay.innerText = `Please wait ${countdown} seconds for the next result...`;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.innerText = ''; // Clear countdown text
        getResultButton.style.display = 'block'; // Show the button again
        canGenerateResult = true; // Enable result generation
      }
    }, 1000); // Update countdown every second

    return;
  }

  const currentTime = new Date();
  const currentKeyData = currentKeyDoc.data();

  // Check if there are enough credits
  if (currentKeyData.credits <= 0) {
    showCreditsEndedNotification();
    localStorage.setItem('creditsEndedPopupShown', 'true'); // Store in localStorage
    return;
  }

  // Normal result generation flow
  document.getElementById("resultContainer").style.display = "block";

  setTimeout(function() {
    const result = generateMineResult();
    const mineGameContainer = document.getElementById("mineGameContainer");
    mineGameContainer.innerHTML = ""; // Clear previous results

    // Create 25 boxes
    for (let i = 1; i <= 25; i++) {
      const box = document.createElement('div');
      box.className = 'box';
      if (result.diamonds.includes(i)) {
        box.classList.add('diamond');
      }
      mineGameContainer.appendChild(box);
    }

    document.getElementById("resultContainer").style.display = "block";

    // Decrement credits and update Firebase
    const newCredits = currentKeyData.credits - 1;

    if (newCredits >= 0) {
      db.collection('access_keys').doc(currentKeyDoc.id).update({
        credits: newCredits
      }).then(() => {
        // Fetch the updated document to reflect the new state
        db.collection('access_keys').doc(currentKeyDoc.id).get().then(doc => {
          currentKeyDoc = doc;
          creditsDisplay.innerText = `Credits: ${newCredits}`;
          if (newCredits === 0) {
            showCreditsEndedNotification();
            localStorage.setItem('creditsEndedPopupShown', 'true'); // Store in localStorage
          }
        });
      }).catch(error => {
        console.error("Error updating credits:", error);
      });
    } else {
      showCreditsEndedNotification();
      localStorage.setItem('creditsEndedPopupShown', 'true'); // Store in localStorage
    }

    // Set canGenerateResult to false and start a 20-second timer
    canGenerateResult = false;
    setTimeout(() => {
      canGenerateResult = true;
    }, 10000); // 10 seconds

    // Hide the Get Result button and show countdown text
    getResultButton.style.display = 'none';
    const countdownDisplay = document.getElementById('countdown-text');
    countdownDisplay.innerText = 'Please wait 10 seconds for the next result...';

    let countdown = 10;
    const countdownInterval = setInterval(() => {
      countdown--;
      countdownDisplay.innerText = `Please wait ${countdown} seconds for the next result...`;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.innerText = ''; // Clear countdown text
        getResultButton.style.display = 'block'; // Show the button again
        canGenerateResult = true; // Enable result generation
      }
    }, 1000); // Update countdown every second

  }, 731); // Adjust this delay if necessary
});

function showCreditsEndedNotification() {
    Swal.fire({
        icon: 'info',
        title: 'Credits Ended',
        text: 'Your credits for today have ended. You will get new credits tomorrow.',
        showConfirmButton: false,
        timer: 3000
    });
}


function generateMineResult() {
  const mineCount = 3;
  const totalBoxes = 25;
  const diamondsNeeded = 5;
  const boxes = Array.from({ length: totalBoxes }, (_, i) => i + 1);

  // Shuffle the boxes array
  for (let i = boxes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
  }

  // Select the positions for the mines
  const mines = boxes.slice(0, mineCount);

  // Select the positions for the diamonds
  const diamonds = boxes.slice(mineCount, mineCount + diamondsNeeded);

  return { mines, diamonds };
}
