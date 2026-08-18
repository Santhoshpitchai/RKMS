import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'kn';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav & General
    'org.name': 'Raju Kshatriya Mahila Sangha',
    'nav.home': 'Home',
    'nav.about': 'About Us',
    'nav.services': 'Services',
    'nav.events': 'Events',
    'nav.membership': 'Membership',
    'nav.donate': 'Donate',
    'nav.portal': 'Member Portal',
    'nav.login': 'Member Login',
    'nav.signOut': 'Sign Out',
    
    // Hero
    'hero.badge': 'ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ • Estd 2022',
    'hero.title': 'Empowering Women, Preserving Culture & Community Welfare',
    'hero.desc': 'Raju Kshatriya Mahila Sangha is a non-profit community organization dedicated to the social, educational, and cultural advancement of women and families across Karnataka.',
    'hero.joinBtn': 'Become a Lifetime Member',
    'hero.donateBtn': 'Support Sangha Activities (Donate)',

    // Stats
    'stats.years': 'Years of Service',
    'stats.lives': 'Lives Impacted',
    'stats.members': 'Active Sangha Members',
    'stats.events': 'Events Organised',

    // User Auth Modal (Login / Signup)
    'auth.loginTitle': 'Member Login',
    'auth.signupTitle': 'Create Member Account',
    'auth.emailLabel': 'Email Address',
    'auth.passwordLabel': 'Password',
    'auth.nameLabel': 'Full Name',
    'auth.phoneLabel': 'Phone Number',
    'auth.otpLabel': 'Enter 6-Digit Verification OTP',
    'auth.sendOtpBtn': 'Send Verification OTP',
    'auth.verifyOtpBtn': 'Verify OTP & Complete Signup',
    'auth.loginBtn': 'Log In to Member Portal',
    'auth.noAccount': "Don't have an account? Sign Up",
    'auth.hasAccount': 'Already have an account? Log In',

    // Member Dashboard Tabs
    'dashboard.overview': 'Overview',
    'dashboard.memberCard': 'Membership Card & Buy',
    'dashboard.donations': 'Make Donation & History',
    'dashboard.events': 'RKS Events',
    'dashboard.settings': 'Account Settings',
    'dashboard.downloadCard': 'Download Official Card',
    'dashboard.activeMember': 'ACTIVE MEMBER',
    'dashboard.registeredUser': 'REGISTERED USER',
    'dashboard.noMembership': 'No Active Membership',
    'dashboard.buyMembershipBtn': 'Get Lifetime Membership Card (₹1,001)',

    // About Us Page
    'about.title': 'About Raju Kshatriya Mahila Sangha',
    'about.historyTitle': 'Organization History',
    'about.historyDesc': 'In the year 2022, the Raju Kshatriya Mahila Sangha marked its inception by ceremonially lighting its first auspicious Deepam, symbolizing hope, unity, and collective strength.',
    'about.missionTitle': 'Our Core Mission',
    'about.missionDesc': 'Empowering women through education, skill development, health programs, and cultural heritage preservation.',
    'about.visionTitle': 'Our Vision',
    'about.visionDesc': 'Building a self-reliant, educated, and culturally united community for future generations.',
    'about.leadership': 'Executive Leadership Committee',

    // Services Page
    'services.title': 'Our Community Services',
    'services.education': 'Educational Programs & Scholarships',
    'services.skill': 'Skill Development & Entrepreneurship',
    'services.support': 'Community & Counseling Support',
    'services.welfare': 'Women & Family Welfare Aid',
    'services.culture': 'Cultural Events & Celebrations',

    // Events Page
    'events.title': 'RKS Mahila Sangha Events',
    'events.subtitle': 'Browse upcoming meets, cultural gatherings, and health camps.',
    'events.payRegister': 'Pay & Register',
    'events.freeAttendance': 'Free Attendance',
    'events.upcomingTab': 'Upcoming Events',
    'events.pastTab': 'Past Events',

    // Membership Page
    'membership.title': 'Lifetime Sangha Membership',
    'membership.fee': '₹1,001 One-Time Lifetime Fee',
    'membership.benefit1': 'Official RKS Member ID Card with Verification QR',
    'membership.benefit2': 'Priority access to events and annual general meetings',
    'membership.benefit3': 'Educational aid & community support eligibility',
    'membership.formTitle': 'Member Registration Form',
    'membership.fullName': 'Full Name',
    'membership.guardian': 'Father / Husband Name',
    'membership.gotra': 'Gotra Name',
    'membership.dob': 'Date of Birth',
    'membership.profession': 'Profession',
    'membership.marital': 'Marital Status',
    'membership.submitBtn': 'Pay ₹1,001 & Activate Membership',

    // Donate Page
    'donate.title': 'Support Sangha Community Causes',
    'donate.subtitle': 'Your contributions empower women, educate children, and support families in need.',
    'donate.cause1': 'Girl Student Education & Scholarships',
    'donate.cause2': 'Health Checkup & Eye Camps',
    'donate.cause3': 'Social & Emergency Relief Aid',
    'donate.cause4': 'General RKS Sangha Support',
    'donate.payBtn': 'Donate via Razorpay',

    // Footer
    'footer.quickLinks': 'Quick Links',
    'footer.contact': 'Contact Sangha Office',
    'footer.address': 'No. 797, Lakshmi Nilayam, Rajarajeshwari Nagar Post, Bengaluru, Karnataka - 560098',
    'footer.rights': 'All rights reserved. Raju Kshatriya Mahila Sangha.',
  },
  kn: {
    // Nav & General
    'org.name': 'ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ',
    'nav.home': 'ಮುಖಪುಟ',
    'nav.about': 'ನಮ್ಮ ಬಗ್ಗೆ',
    'nav.services': 'ಸೇವೆಗಳು',
    'nav.events': 'ಕಾರ್ಯಕ್ರಮಗಳು',
    'nav.membership': 'ಸದಸ್ಯತ್ವ',
    'nav.donate': 'ದೇಣಿಗೆ',
    'nav.portal': 'ಸದಸ್ಯರ ಪೋರ್ಟಲ್',
    'nav.login': 'ಲಾಗಿನ್ / ಸೈನ್ ಅಪ್',
    'nav.signOut': 'ನಿರ್ಗಮಿಸಿ',

    // Hero
    'hero.badge': 'ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ • ಸ್ಥಾಪನೆ 2022',
    'hero.title': 'ಮಹಿಳಾ ಸಬಲೀಕರಣ, ಸಂಸ್ಕೃತಿ ರಕ್ಷಣೆ ಮತ್ತು ಸಮುದಾಯ ಕಲ್ಯಾಣ',
    'hero.desc': 'ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘವು ಕರ್ನಾಟಕದಾದ್ಯಂತ ಮಹಿಳೆಯರು ಮತ್ತು ಕುಟುಂಬಗಳ ಸಾಮಾಜಿಕ, ಶೈಕ್ಷಣಿಕ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಅಭಿವೃದ್ಧಿಗೆ ಶ್ರಮಿಸುವ ಸ್ವಯಂಸೇವಾ ಸಂಘಟನೆಯಾಗಿದೆ.',
    'hero.joinBtn': 'ಆಜೀವ ಸದಸ್ಯರಾಗಿ (₹1,001)',
    'hero.donateBtn': 'ಸಂಘದ ಚಟುವಟಿಕೆಗಳಿಗೆ ಬೆಂಬಲಿಸಿ (ದೇಣಿಗೆ)',

    // Stats
    'stats.years': 'ಸೇವೆಯ ವರ್ಷಗಳು',
    'stats.lives': 'ಸಹಾಯ ಪಡೆದ ಜೀವಗಳು',
    'stats.members': 'ಸಕ್ರಿಯ ಸದಸ್ಯರು',
    'stats.events': 'ಸಂಘಟಿತ ಕಾರ್ಯಕ್ರಮಗಳು',

    // User Auth Modal (Login / Signup)
    'auth.loginTitle': 'ಸದಸ್ಯರ ಲಾಗಿನ್',
    'auth.signupTitle': 'ಹೊಸ ಸದಸ್ಯರ ಖಾತೆ ರಚಿಸಿ',
    'auth.emailLabel': 'ಇಮೇಲ್ ವಿಳಾಸ',
    'auth.passwordLabel': 'ಪಾಸ್‌ವರ್ಡ್',
    'auth.nameLabel': 'ಪೂರ್ಣ ಹೆಸರು',
    'auth.phoneLabel': 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
    'auth.otpLabel': '6-ಅಂಕಿಯ OTP ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    'auth.sendOtpBtn': 'ಖಾತರಿ OTP ಕಳುಹಿಸಿ',
    'auth.verifyOtpBtn': 'OTP ಪರಿಶೀಲಿಸಿ ಮತ್ತು ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ',
    'auth.loginBtn': 'ಸದಸ್ಯರ ಪೋರ್ಟಲ್‌ಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
    'auth.noAccount': 'ಖಾತೆ ಇಲ್ಲವೇ? ಸೈನ್ ಅಪ್ ಮಾಡಿ',
    'auth.hasAccount': 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ? ಲಾಗಿನ್ ಮಾಡಿ',

    // Member Dashboard Tabs
    'dashboard.overview': 'ಅವಲೋಕನ',
    'dashboard.memberCard': 'ಸದಸ್ಯತ್ವ ಕಾರ್ಡ್ ಮತ್ತು ಖರೀದಿ',
    'dashboard.donations': 'ದೇಣಿಗೆ ನೀಡಿ ಮತ್ತು ಇತಿಹಾಸ',
    'dashboard.events': 'ಸಂಘದ ಕಾರ್ಯಕ್ರಮಗಳು',
    'dashboard.settings': 'ಖಾತೆ ಸಂಯೋಜನೆಗಳು',
    'dashboard.downloadCard': 'ಅಧಿಕೃತ ಕಾರ್ಡ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
    'dashboard.activeMember': 'ಸಕ್ರಿಯ ಆಜೀವ ಸದಸ್ಯರು',
    'dashboard.registeredUser': 'ನೋಂದಾಯಿತ ಬಳಕೆದಾರರು',
    'dashboard.noMembership': 'ಸಕ್ರಿಯ ಸದಸ್ಯತ್ವವಿಲ್ಲ',
    'dashboard.buyMembershipBtn': 'ಆಜೀವ ಸದಸ್ಯತ್ವ ಕಾರ್ಡ್ ಪಡೆಯಿರಿ (₹1,001)',

    // About Us Page
    'about.title': 'ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘದ ಬಗ್ಗೆ',
    'about.historyTitle': 'ಸಂಸ್ಥೆಯ ಇತಿಹಾಸ',
    'about.historyDesc': '2022 ರ ವರ್ಷದಲ್ಲಿ, ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘವು ಭರವಸೆ, ಏಕತೆ ಮತ್ತು ಸಾಂಘಿಕ ಶಕ್ತಿಯನ್ನು ಸಂಕೇತಿಸುವ ಮೊದಲ ಮಂಗಲ ದೀಪವನ್ನು ಬೆಳಗಿಸುವ ಮೂಲಕ ಪ್ರಾರಂಭವಾಯಿತು.',
    'about.missionTitle': 'ನಮ್ಮ ಪ್ರಮುಖ ಧ್ಯೇಯ (Mission)',
    'about.missionDesc': 'ಶಿಕ್ಷಣ, ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ, ಆರೋಗ್ಯ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಪರಂಪರೆಯ ರಕ್ಷಣೆಯ ಮೂಲಕ ಮಹಿಳೆಯರನ್ನು ಸಬಲೀಕರಣಗೊಳಿಸುವುದು.',
    'about.visionTitle': 'ನಮ್ಮ ದೃಷ್ಟಿಕೋನ (Vision)',
    'about.visionDesc': 'ಭವಿಷ್ಯದ ಪೀಳಿಗೆಗೆ ಸ್ವಾವಲಂಬಿ, ಸುಶಿಕ್ಷಿತ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕವಾಗಿ ಒಗ್ಗೂಡಿದ ಸಮುದಾಯವನ್ನು ನಿರ್ಮಿಸುವುದು.',
    'about.leadership': 'ಕಾರ್ಯಕಾರಿ ನಾಯಕತ್ವ ಸಮಿತಿ',

    // Services Page
    'services.title': 'ನಮ್ಮ ಸಮುದಾಯ ಸೇವೆಗಳು',
    'services.education': 'ಶೈಕ್ಷಣಿಕ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನ',
    'services.skill': 'ಕೌಶಲ್ಯ ಅಭಿವೃದ್ಧಿ ಮತ್ತು ಉದ್ಯಮಶೀಲತೆ',
    'services.support': 'ಸಮುದಾಯ ಮತ್ತು ಆಪ್ತಸಮಾಲೋಚನೆ ಬೆಂಬಲ',
    'services.welfare': 'ಮಹಿಳಾ ಮತ್ತು ಕೌಟುಂಬಿಕ ಕಲ್ಯಾಣ ನೆರವು',
    'services.culture': 'ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಆಚರಣೆಗಳು',

    // Events Page
    'events.title': 'ಸಂಘದ ಕಾರ್ಯಕ್ರಮಗಳು',
    'events.subtitle': 'ಮುಂಬರುವ ಸಮಾವೇಶಗಳು, ಸಾಂಸ್ಕೃತಿಕ ಸಮ್ಮೇಳನಗಳು ಮತ್ತು ಆರೋಗ್ಯ ಶಿಬಿರಗಳನ್ನು ವೀಕ್ಷಿಸಿ.',
    'events.payRegister': 'ನೋಂದಾಯಿಸಿ ಮತ್ತು ಪಾವತಿಸಿ',
    'events.freeAttendance': 'ಉಚಿತ ಪ್ರವೇಶ',
    'events.upcomingTab': 'ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು',
    'events.pastTab': 'ಕಳೆದ ಕಾರ್ಯಕ್ರಮಗಳು',

    // Membership Page
    'membership.title': 'ಆಜೀವ ಸಂಘದ ಸದಸ್ಯತ್ವ',
    'membership.fee': '₹1,001 ಒಂದು ಬಾರಿಯ ಆಜೀವ ಶುಲ್ಕ',
    'membership.benefit1': 'QR ಪರಿಶೀಲನೆಯೊಂದಿಗೆ ಅಧಿಕೃತ RKS ಸದಸ್ಯತ್ವ ಕಾರ್ಡ್',
    'membership.benefit2': 'ವಾರ್ಷಿಕ ಸಾಮಾನ್ಯ ಸಭೆಗಳು ಮತ್ತು ಕಾರ್ಯಕ್ರಮಗಳಿಗೆ ಆದ್ಯತೆ',
    'membership.benefit3': 'ಶೈಕ್ಷಣಿಕ ನೆರವು ಮತ್ತು ಸಮುದಾಯ ಬೆಂಬಲ ಅರ್ಹತೆ',
    'membership.formTitle': 'ಸದಸ್ಯತ್ವ ನೋಂದಣಿ ಫಾರ್ಮ್',
    'membership.fullName': 'ಪೂರ್ಣ ಹೆಸರು',
    'membership.guardian': 'ತಂದೆ / ಗಂಡನ ಹೆಸರು',
    'membership.gotra': 'ಗೋತ್ರದ ಹೆಸರು',
    'membership.dob': 'ಹುಟ್ಟಿದ ದಿನಾಂಕ',
    'membership.profession': 'ವೃತ್ತಿ',
    'membership.marital': 'ವೈವಾಹಿಕ ಸ್ಥಿತಿ',
    'membership.submitBtn': '₹1,001 ಪಾವತಿಸಿ ಮತ್ತು ಸದಸ್ಯತ್ವ ಸಕ್ರಿಯಗೊಳಿಸಿ',

    // Donate Page
    'donate.title': 'ಸಂಘದ ಸಮುದಾಯ ಕಾರ್ಯಗಳಿಗೆ ಬೆಂಬಲಿಸಿ',
    'donate.subtitle': 'ನಿಮ್ಮ ದೇಣಿಗೆಯು ಮಹಿಳೆಯರನ್ನು ಸಬಲಗೊಳಿಸಲು ಮತ್ತು ಕಷ್ಟದಲ್ಲಿರುವ ಕುಟುಂಬಗಳಿಗೆ ನೆರವಾಗಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
    'donate.cause1': 'ಬಾಲಕಿಯರ ಶಿಕ್ಷಣ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನ ಫಂಡ್',
    'donate.cause2': 'ಉಚಿತ ಆರೋಗ್ಯ ಮತ್ತು ಕಣ್ಣಿನ ತಪಾಸಣೆ ಶಿಬಿರಗಳು',
    'donate.cause3': 'ಸಾಮಾಜಿಕ ಮತ್ತು ತುರ್ತು ಪರಿಹಾರ ನೆರವು',
    'donate.cause4': 'ಸಾಮಾನ್ಯ ಸಂಘದ ಬೆಂಬಲ ಫಂಡ್',
    'donate.payBtn': 'Razorpay ಮೂಲಕ ದೇಣಿಗೆ ನೀಡಿ',

    // Footer
    'footer.quickLinks': 'ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು',
    'footer.contact': 'ಸಂಘದ ಕಚೇರಿ ಸಂಪರ್ಕಿಸಿ',
    'footer.address': 'ಸಂಖ್ಯೆ 797, ಲಕ್ಷ್ಮಿ ನಿಲಯ, ರಾಜರಾಜೇಶ್ವರಿ ನಗರ ಪೋಸ್ಟ್, ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ - 560098',
    'footer.rights': 'ಎಲ್ಲಾ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ. ರಾಜು ಕ್ಷತ್ರಿಯ ಮಹಿಳಾ ಸಂಘ.',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('rks_lang') as Language) || 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('rks_lang', newLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
