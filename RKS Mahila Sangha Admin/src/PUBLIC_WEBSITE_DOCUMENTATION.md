# Raju Kshatriya Mahila Sangha - Public Website Documentation

## Overview
This document describes the public-facing website that was originally part of the Raju Kshatriya Mahila Sangha (Raju Kshatriya community women's organization) project. The public website components have been removed, but this documentation serves as a reference for the intended features.

## Organization Details
- **Name**: Raju Kshatriya Mahila Sangha
- **Purpose**: Raju Kshatriya community women's organization
- **Focus**: Women empowerment, cultural preservation, and community development

## Design System
The website follows a color scheme that complements the organization's logo:
- **Primary Color**: Navy Blue (#1E3A8A) - Used for headers and primary text
- **Accent Color**: Cyan/Teal (#06B6D4) - Used for accents and links
- **Call-to-Action**: Golden Amber (#F59E0B) - Used for buttons and important elements
- **Logo**: Custom logo with golden yellow, navy blue, and teal colors

## Public Website Pages

### 1. Landing Page
**Route**: `/`

**Features**:
- Hero section with welcome message and call-to-action
- Mission statement highlighting women empowerment
- Featured statistics (members, events, impact)
- Upcoming events preview
- Services overview cards
- Call-to-action for membership and donations

**Content Highlights**:
- "Empowering Women, Strengthening Communities"
- Organization's mission and vision
- Quick links to membership registration and donation pages

---

### 2. About Us Page
**Route**: `/about`

**Features**:
- Organization history and background
- Mission and vision statements
- Core values and principles
- Team/leadership information
- Community impact stories
- Cultural heritage preservation initiatives

**Content**:
- History of the Raju Kshatriya community
- Women's empowerment initiatives
- Cultural programs and activities
- Community development projects

---

### 3. Services Page
**Route**: `/services`

**Features**:
- Detailed list of services offered
- Educational programs
- Skill development workshops
- Cultural activities
- Welfare programs
- Community support services

**Service Categories**:
- **Education & Training**: Skill development, financial literacy, leadership training
- **Cultural Programs**: Traditional festivals, cultural events, heritage preservation
- **Community Support**: Welfare programs, counseling, networking opportunities
- **Health & Wellness**: Health camps, wellness workshops, awareness programs

---

### 4. Events Page
**Route**: `/events`

**Features**:
- Event listing (upcoming and past events)
- Event registration system
- Event details (date, time, location, description)
- Event images
- Registration fees (if applicable)
- Event registration modal with form

**Event Registration Form Fields**:
- Name (required)
- Email (required)
- Membership ID (optional)

**Event Types**:
- Free events (only "Submit" button)
- Paid events ("Submit" and "Pay Now" buttons)
- Workshop events
- Cultural festivals
- Community gatherings

**Sample Events**:
1. **Women Empowerment Workshop**
   - Date: February 15, 2026
   - Location: Community Hall, Bangalore
   - Fee: ₹500
   
2. **Traditional Cultural Festival**
   - Date: March 1, 2026
   - Location: RKS Community Center
   - Fee: Free

---

### 5. Membership Page
**Route**: `/membership`

**Features**:
- Membership benefits overview
- Registration form
- Unique membership ID generation
- Payment processing via Razorpay
- Membership fee: ₹1,001

**Membership Benefits**:
- Access to exclusive events and workshops
- Networking opportunities
- Cultural program participation
- Educational resources
- Community support
- Voting rights in organization decisions

**Registration Process**:
1. Fill out registration form (Name, Email, Phone, Address, Date of Birth)
2. Click "Proceed to Payment"
3. Unique Membership ID generated immediately (Format: RKSM + YYYYMMDD + sequence)
4. Payment processed through Razorpay
5. Membership confirmation sent via email

**Membership ID Format**: `RKSM20260204001`
- RKSM: Organization prefix
- 20260204: Date (YYYYMMDD)
- 001: Sequence number for that day

---

### 6. Donation Page
**Route**: `/donate`

**Features**:
- Donation form with predefined amounts
- Custom donation amount input
- Razorpay payment gateway integration
- Donor information collection
- Tax receipt generation
- Donation receipt with transaction details

**Predefined Donation Amounts**:
- ₹500 - Provides study materials for 5 women
- ₹1,000 - Sponsors skill training for 2 women
- ₹2,500 - Supports a complete workshop
- ₹5,000 - Funds a month-long training program
- ₹10,000 - Sponsors education for 10 women

**Donation Form Fields**:
- Full Name (required)
- Email Address (required)
- Phone Number (required)
- Donation Amount (predefined or custom)

**Payment Processing**:
- Integration with Razorpay payment gateway
- Demo mode with test credentials
- Payment confirmation with receipt
- Email notification to donor

**Donation Impact Breakdown**:
- 70% - Education & Training programs
- 20% - Community Support & Welfare
- 10% - Cultural Programs & Heritage

---

## Technical Features

### Payment Integration
- **Provider**: Razorpay
- **Mode**: Demo/Test mode
- **Key**: `rzp_test_XXXXXXXXXXXXX` (placeholder)
- **Currency**: INR (Indian Rupees)
- **Features**:
  - Secure payment processing
  - Payment confirmation
  - Transaction tracking
  - Receipt generation

### Navigation
- React Router for client-side routing
- Auto-scroll to top on page navigation
- Responsive navigation menu
- Mobile-friendly hamburger menu

### Design & Styling
- Tailwind CSS v4 for styling
- Responsive design (mobile, tablet, desktop)
- Lucide React icons
- Toast notifications (Sonner library)
- Gradient backgrounds
- Shadow effects
- Hover animations

### Form Validation
- Required field validation
- Email format validation
- Phone number validation
- Custom error messages
- Success notifications

### User Experience
- Loading states
- Success/error toast notifications
- Modal dialogs for event registration
- Smooth transitions and animations
- Accessible form controls
- Clear call-to-action buttons

---

## Common Components

### Header
- Logo and organization name
- Navigation menu (Home, About, Services, Events, Membership, Donate)
- Mobile responsive hamburger menu
- Sticky navigation on scroll

### Footer
- Organization information
- Quick links
- Contact information
- Social media links
- Copyright notice

### ScrollToTop
- Automatically scrolls to top of page on route change
- Smooth scroll behavior

---

## Data Flow

### Membership Registration Flow
1. User fills registration form
2. Clicks "Proceed to Payment"
3. Membership ID generated immediately
4. Razorpay payment modal opens
5. User completes payment
6. Confirmation page displays with membership details
7. Email confirmation sent (in production)

### Event Registration Flow
1. User browses events
2. Clicks "Register" on desired event
3. Registration modal opens
4. User fills form (Name, Email, Membership ID)
5. Submits registration
6. For paid events: Payment processing option
7. Confirmation toast notification
8. Modal closes

### Donation Flow
1. User selects or enters donation amount
2. Fills donor information
3. Clicks "Proceed to Payment"
4. Razorpay payment modal opens
5. User completes payment
6. Thank you page displays with receipt
7. Email receipt sent (in production)

---

## Future Enhancements (Suggested)

### Backend Integration
- Connect to Supabase or similar backend
- Store member data in database
- Track donations and payments
- Manage event registrations
- Send automated emails

### Additional Features
- Member portal for logged-in members
- Event photo galleries
- Blog/news section
- Newsletter subscription
- Success stories showcase
- Volunteer opportunities
- Resource library

### Payment Enhancements
- Multiple payment methods (UPI, Net Banking, Wallets)
- Recurring donations
- Donation campaigns
- Fundraising goals tracker

---

## Color Codes Reference

```css
/* Primary Colors */
--navy-blue: #1E3A8A;
--cyan: #06B6D4;
--amber: #F59E0B;

/* Shades */
--blue-900: #1E3A8A;
--cyan-600: #06B6D4;
--cyan-700: #0E7490;
--amber-500: #F59E0B;
--amber-600: #D97706;

/* Neutral Colors */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-600: #4B5563;
--gray-900: #111827;
```

---

## Notes

- All public website components have been removed from the codebase
- Only the admin panel remains functional
- This documentation serves as a reference for future development
- Demo credentials and test data were used throughout
- Production implementation would require:
  - Real Razorpay API keys
  - Backend database (e.g., Supabase)
  - Email service integration
  - SSL certificates
  - Domain setup
  - Hosting configuration

---

## Contact Information (Example)

- **Email**: info@rksmahavedike.org
- **Phone**: +91 XXXXX XXXXX
- **Address**: [Organization Address]
- **Website**: www.rksmahavedike.org (example)

---

*This documentation was created for reference purposes. The actual public website has been removed from the application.*
