import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAByLllRDkcpyQ3DU1XR3hNkjFdRnfaPMM",
  authDomain: "gograb-8ca80.firebaseapp.com",
  projectId: "gograb-8ca80",
  storageBucket: "gograb-8ca80.firebasestorage.app",
  messagingSenderId: "643740396432",
  appId: "1:643740396432:web:352f183c5577fe48552115",
  measurementId: "G-4CMVTPX705"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const bookingsContainer = document.getElementById('my-bookings-container');
const bikesContainer = document.getElementById('my-bikes-container');
const userInfoDisplay = document.getElementById('user-info');

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    });
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userInfoDisplay.textContent = `Logged in as: ${user.email}`;
        fetchMyBookings(user.uid);
        const ownerName = user.displayName ? user.displayName.split(' ')[0] : 'Unknown';
        fetchMyListedBikes(ownerName);
    } else {
        window.location.href = 'index.html'; 
    }
});

async function fetchMyBookings(uid) {
    try {
        const q = query(collection(db, "bookings"), where("renterId", "==", uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            bookingsContainer.innerHTML = '<p style="color: #94a3b8;">You have no bookings yet. Go rent a bike!</p>';
            return;
        }

        bookingsContainer.innerHTML = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const endDate = new Date(data.endDate);
            const startDate = new Date(data.startDate);
            endDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);

            const tripOver = today > endDate;
            const tripActive = today >= startDate && today <= endDate;

            let statusHTML = '';
            if (tripOver) {
                statusHTML = `<span style="background: rgba(100,116,139,0.1); color: #94a3b8; border: 1px solid rgba(100,116,139,0.2); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;"><i class="fa-solid fa-flag-checkered" style="margin-right: 4px;"></i>COMPLETED</span>`;
            } else if (tripActive) {
                statusHTML = `<span style="background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;"><i class="fa-solid fa-motorcycle" style="margin-right: 4px;"></i>ACTIVE TRIP</span>`;
            } else {
                statusHTML = `<span style="background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700;"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>UPCOMING</span>`;
            }

            const card = document.createElement('div');
            card.style.cssText = "background: rgba(255,255,255,0.02); border-radius: 16px; margin-bottom: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.06);";
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <strong style="color: white; font-size: 1.2rem; display: block; margin-bottom: 4px;">${data.bikeTitle || 'Booked Bike'}</strong>
                        <span style="color: #64748b; font-size: 0.85rem;">Ref: ${docSnap.id.substring(0,8)}</span>
                    </div>
                    ${statusHTML}
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="color: #cbd5e1; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <i class="fa-regular fa-calendar" style="color: #3b82f6;"></i>
                        <span><strong>${data.startDate}</strong> <span style="color: #64748b; margin: 0 8px;">→</span> <strong>${data.endDate}</strong></span>
                    </div>
                    <div style="color: #94a3b8; font-size: 0.9rem; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-regular fa-clock" style="color: #10b981;"></i>
                        <span>${data.days || '?'} Day(s)</span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #94a3b8; font-size: 0.9rem; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-envelope" style="color:#3b82f6;"></i> Owner notified by email</span>
                    <span style="color: white; font-size: 1.5rem; font-weight: 800;">₹${data.totalPrice}</span>
                </div>
            `;
            bookingsContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        bookingsContainer.innerHTML = '<p style="color: #ef4444;">Failed to load bookings.</p>';
    }
}


// Called from the dashboard card's Pay Now button after trip ends
window.payNow = function(bookingId, amount, bikeTitle) {
    const options = {
        "key": "YOUR_RAZORPAY_LIVE_KEY_HERE",
        "amount": amount * 100,
        "currency": "INR",
        "name": "GoGrab Rentals",
        "description": `Payment for: ${bikeTitle}`,
        "handler": async function(response) {
            try {
                const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                const bookingRef = doc(db, 'bookings', bookingId);
                await updateDoc(bookingRef, {
                    status: 'confirmed',
                    paymentId: response.razorpay_payment_id,
                    paidAt: new Date().toISOString()
                });
                alert("✅ Payment Successful!\nPayment ID: " + response.razorpay_payment_id);
                location.reload();
            } catch(err) {
                console.error("Failed to update booking", err);
            }
        },
        "theme": { "color": "#3b82f6" }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
};


async function fetchMyListedBikes(ownerName) {
    try {
        const q = query(collection(db, "bikes"), where("owner", "==", ownerName));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            bikesContainer.innerHTML = '<p style="color: #94a3b8;">You have not listed any bikes yet.</p>';
            return;
        }

        bikesContainer.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.style.cssText = "background: rgba(255,255,255,0.02); border-radius: 16px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.06); overflow: hidden; transition: all 0.3s ease;";
            card.onmouseover = () => card.style.transform = 'translateY(-5px)';
            card.onmouseout = () => card.style.transform = 'translateY(0)';
            
            card.innerHTML = `
                <div style="height: 120px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                    <div style="position: absolute; top: 12px; right: 12px; background: rgba(11,15,25,0.8); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; color: white; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 5px;">
                         <div style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></div> Active Listing
                    </div>
                    <i class="fa-solid fa-motorcycle" style="font-size: 4rem; color: rgba(255,255,255,0.2);"></i>
                </div>
                <div style="padding: 20px;">
                    <h3 style="color: white; font-size: 1.3rem; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                        ${data.title}
                        <span style="font-size: 1.5rem; color: #3b82f6;">₹${data.price}<span style="font-size: 0.9rem; color: #94a3b8; font-weight: normal;">/day</span></span>
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 10px; color: #cbd5e1; font-size: 0.95rem;">
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <i class="fa-solid fa-location-dot" style="color: #ef4444; width: 16px;"></i> ${data.location}
                        </span>
                        <span style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.06); margin-top: 5px;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${data.rating || '5.0'} (${data.trips || 0} trips)
                            </span>
                            <span style="color: #3b82f6; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Edit Listing <i class="fa-solid fa-pen" style="margin-left: 4px;"></i></span>
                        </span>
                    </div>
                </div>
            `;
            bikesContainer.appendChild(card);
        });
    } catch(err) {
        console.error("Error fetching listed bikes:", err);
        bikesContainer.innerHTML = '<p style="color: #ef4444;">Failed to load listed bikes.</p>';
    }
}
