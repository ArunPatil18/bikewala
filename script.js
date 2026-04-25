// web/script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Replace with your actual Firebase config from the Firebase Console
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
const provider = new GoogleAuthProvider();

// Dummy fallback data in case Firebase isn't set up yet
const dummyBikes = [
    { id: 1, title: "Honda Activa 6G", owner: "Rahul S.", type: "scooter", price: 250, rating: 4.8, trips: 42, location: "Koramangala", avatar: "https://i.pravatar.cc/150?img=11" },
    { id: 2, title: "Royal Enfield Classic", owner: "Priya M.", type: "sports", price: 650, rating: 4.9, trips: 18, location: "Indiranagar", avatar: "https://i.pravatar.cc/150?img=5" },
    { id: 3, title: "TVS Jupiter", owner: "Arun K.", type: "scooter", price: 280, rating: 4.5, trips: 56, location: "HSR Layout", avatar: "https://i.pravatar.cc/150?img=12" },
    { id: 4, title: "Bajaj Pulsar NS200", owner: "Vikas T.", type: "sports", price: 450, rating: 4.7, trips: 31, location: "BTM Layout", avatar: "https://i.pravatar.cc/150?img=15" },
    { id: 5, title: "Hero Splendor Plus", owner: "Deepak R.", type: "commuter", price: 200, rating: 4.6, trips: 112, location: "Whitefield", avatar: "https://i.pravatar.cc/150?img=33" }
];

let allBikes = [];

const bikesGrid = document.getElementById('bikes-grid');
const filterBtns = document.querySelectorAll('.filter-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const loginBtn = document.getElementById('login-btn');

document.addEventListener('DOMContentLoaded', async () => {
    // ---- AUTHENTICATION LOGIC ----
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in
            loginBtn.innerHTML = `Dashboard <i class="fa-solid fa-user"></i>`;
            loginBtn.onclick = (e) => {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            };
        } else {
            // User is logged out
            loginBtn.textContent = "Login";
            loginBtn.onclick = (e) => {
                e.preventDefault();
                signInWithPopup(auth, provider).catch(error => {
                    console.error("Login Error. Ensure Firebase Config & Google Auth are enabled.", error);
                    alert("⚠️ Firebase Auth Error: Please ensure you pasted your API keys and enabled Google Sign-In in the Firebase Console.");
                });
            };
        }
    });

    // Attempt to load from real Firebase Database
    try {
        const bikesCol = collection(db, 'bikes');
        const bikeSnapshot = await getDocs(bikesCol);
        
        if (bikeSnapshot.empty) {
            console.log("No bikes found in Firebase. Showing dummy preview data.");
            allBikes = dummyBikes;
        } else {
            console.log("Successfully fetched live bikes from Firebase!");
            allBikes = bikeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    } catch (error) {
        console.warn("Firebase not correctly configured yet. Showing dummy preview data.", error);
        allBikes = dummyBikes;
    }

    renderBikes(allBikes);

    // Setup Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(f => f.classList.remove('active'));
            e.target.classList.add('active');
            
            const filterType = e.target.getAttribute('data-filter');
            if (filterType === 'all') {
                renderBikes(allBikes);
            } else {
                const filteredBikes = allBikes.filter(bike => bike.type === filterType);
                renderBikes(filteredBikes);
            }
        });
    });

    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '70px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'rgba(11, 15, 25, 0.95)';
        navLinks.style.padding = '2rem';
        navLinks.style.backdropFilter = 'blur(10px)';
        navLinks.style.borderBottom = '1px solid var(--glass-border)';
    });

    // ---- LIST BIKE LOGIC ----
    const ctaBtn = document.querySelector('.cta-btn');
    const formContainer = document.getElementById('list-bike-form-container');
    const listForm = document.getElementById('list-bike-form');

    ctaBtn.addEventListener('click', () => {
        if (!auth.currentUser) {
            alert("You must click the 'Login' button at the top first before you can list a bike!");
            return;
        }
        formContainer.style.display = 'block';
    });

    listForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        const bikeType = document.getElementById('lb-type').value;
        let basePrice = 250;
        if (bikeType === 'scooter') basePrice = 300;
        else if (bikeType === 'commuter') basePrice = 250;
        else if (bikeType === 'sports') basePrice = 600;

        const newBike = {
            title: document.getElementById('lb-title').value,
            type: bikeType,
            price: basePrice,
            location: document.getElementById('lb-location').value,
            ownerEmail: document.getElementById('lb-owner-email').value,
            owner: auth.currentUser.displayName.split(' ')[0],
            avatar: auth.currentUser.photoURL || "https://i.pravatar.cc/150",
            rating: "5.0",
            trips: 0
        };

        try {
            const submitBtn = listForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Saving...";
            submitBtn.disabled = true;

            // 1. Assign a temporary local ID so we can update the UI instantly
            newBike.id = "temp_" + Date.now();
            
            // 2. Instantly update the User Interface without waiting for the internet!
            allBikes.unshift(newBike); 
            
            // Re-run the active filter so the new bike shows up right now
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const filterType = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';
            if (filterType === 'all' || filterType === newBike.type) {
                renderBikes(allBikes.filter(b => filterType === 'all' || b.type === filterType));
            }

            // 3. Hide the form smoothly right away
            listForm.reset();
            formContainer.style.display = 'none';
            submitBtn.textContent = "Submit Listing";
            submitBtn.disabled = false;

            // 4. Send to Firebase Database quietly in the background (no 'await'!)
            addDoc(collection(db, 'bikes'), newBike).then((docRef) => {
                // Update the temporary ID with the real database ID behind the scenes
                const localBike = allBikes.find(b => b.id === newBike.id);
                if (localBike) localBike.id = docRef.id;
            }).catch((err) => {
                console.error("Background sync failed", err);
            });

        } catch(err) {
            console.error(err);
            alert("Failed to list bike due to database error.");
            submitBtn.textContent = "Submit Listing";
            submitBtn.disabled = false;
        }
    });
    
    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(11, 15, 25, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'rgba(11, 15, 25, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });
});

function renderBikes(bikes) {
    bikesGrid.innerHTML = '';
    
    if (bikes.length === 0) {
        bikesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">No bikes found for this category.</p>';
        return;
    }

    bikes.forEach(bike => {
        const card = document.createElement('div');
        card.className = 'bike-card glass-panel';
        
        card.innerHTML = `
            <div class="bike-image">
                <div class="bike-type-tag">${bike.type}</div>
                <i class="fa-solid fa-motorcycle"></i>
            </div>
            <div class="bike-info">
                <h3 class="bike-title">${bike.title}</h3>
                <div class="bike-owner">
                    <img src="${bike.avatar}" alt="${bike.owner}">
                    <span>Listed by ${bike.owner}</span>
                </div>
                <div class="bike-features">
                    <span><i class="fa-solid fa-location-dot"></i> ${bike.location}</span>
                    <span><i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${bike.rating} (${bike.trips} trips)</span>
                </div>
                <div class="bike-footer">
                    <div class="price">
                        <span class="amount">₹${bike.price}</span>/day
                    </div>
                    <button class="btn btn-sm btn-primary book-now-btn" data-id="${bike.id}">Book Now</button>
                </div>
            </div>
        `;
        
        bikesGrid.appendChild(card);
    });
}

// ---- BOOKING & RAZORPAY LOGIC ----
let currentBookingBike = null;
const bookingModal = document.getElementById('booking-modal');
const bookingOverlay = document.getElementById('booking-overlay');
const bookingStartDate = document.getElementById('booking-start-date');
const bookingEndDate = document.getElementById('booking-end-date');
const bookingTotalPrice = document.getElementById('booking-total-price');

bikesGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('book-now-btn')) {
        if (!auth.currentUser) {
            alert("Please login first to book a bike.");
            return;
        }
        const bikeId = e.target.getAttribute('data-id');
        currentBookingBike = allBikes.find(b => b.id === bikeId || b.id == bikeId);
        
        if (currentBookingBike) {
            document.getElementById('booking-bike-title').textContent = `Booking: ${currentBookingBike.title}`;
            document.getElementById('booking-bike-price').textContent = `₹${currentBookingBike.price}/day`;
            bookingStartDate.value = '';
            bookingEndDate.value = '';
            bookingTotalPrice.textContent = '₹0';
            
            bookingModal.style.display = 'block';
            bookingOverlay.style.display = 'block';
        }
    }
});

const closeBookingModal = () => {
    bookingModal.style.display = 'none';
    bookingOverlay.style.display = 'none';
    currentBookingBike = null;
};

document.getElementById('cancel-booking-btn').addEventListener('click', closeBookingModal);
bookingOverlay.addEventListener('click', closeBookingModal);

const calculatePrice = () => {
    if (!currentBookingBike || !bookingStartDate.value || !bookingEndDate.value) return;
    
    const start = new Date(bookingStartDate.value);
    const end = new Date(bookingEndDate.value);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 0) {
        const total = diffDays * currentBookingBike.price;
        bookingTotalPrice.textContent = `₹${total}`;
    } else {
        bookingTotalPrice.textContent = '₹0';
    }
};

bookingStartDate.addEventListener('change', calculatePrice);
bookingEndDate.addEventListener('change', calculatePrice);

document.getElementById('pay-booking-btn').addEventListener('click', async () => {
    if (!currentBookingBike || !bookingStartDate.value || !bookingEndDate.value) {
        alert("Please select valid dates.");
        return;
    }
    
    const start = new Date(bookingStartDate.value);
    const end = new Date(bookingEndDate.value);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays <= 0) {
        alert("End date must be after start date.");
        return;
    }
    
    const amountInRupees = diffDays * currentBookingBike.price;
    const btn = document.getElementById('pay-booking-btn');
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
    btn.disabled = true;

    try {
        // 1. Save booking to Firestore
        await addDoc(collection(db, 'bookings'), {
            bikeId: currentBookingBike.id,
            bikeTitle: currentBookingBike.title,
            ownerEmail: currentBookingBike.ownerEmail || '',
            renterId: auth.currentUser.uid,
            renterName: auth.currentUser.displayName,
            renterEmail: auth.currentUser.email,
            startDate: bookingStartDate.value,
            endDate: bookingEndDate.value,
            days: diffDays,
            totalPrice: amountInRupees,
            status: 'booked',
            createdAt: new Date().toISOString()
        });

        // 2. Send email to bike owner via GoGrab Python server
        if (currentBookingBike.ownerEmail) {
            fetch('http://localhost:5000/send-booking-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_email:  currentBookingBike.ownerEmail,
                    owner_name:   currentBookingBike.owner,
                    bike_name:    currentBookingBike.title,
                    renter_name:  auth.currentUser.displayName,
                    renter_email: auth.currentUser.email,
                    start_date:   bookingStartDate.value,
                    end_date:     bookingEndDate.value,
                    days:         diffDays,
                    total_price:  `₹${amountInRupees}`,
                    location:     currentBookingBike.location,
                })
            }).catch(err => console.warn('Email server not running:', err));
        }

        closeBookingModal();
        alert(`✅ Booking Confirmed!\n\n${currentBookingBike.owner} has been notified.\n\nYour trip: ${bookingStartDate.value} → ${bookingEndDate.value} (${diffDays} days)\nEstimated Cost: ₹${amountInRupees}`);
    } catch(err) {
        console.error("Failed to confirm booking", err);
        alert("Failed to confirm booking. Please try again.");
    } finally {
        btn.innerHTML = `Book Now <i class="fa-solid fa-arrow-right"></i>`;
        btn.disabled = false;
    }
});

