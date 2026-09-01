import { Mail, Phone, MapPin } from 'lucide-react';
import { SiFacebook, SiInstagram } from '@icons-pack/react-simple-icons';
import { Link } from 'react-router-dom';
import logo from '../assets/RKMS Logo.png';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0A6C87] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="RKS Logo" className="w-12 h-12 bg-white rounded-full p-1" />
              <h3 className="text-lg font-bold">{t('org.name')}</h3>
            </div>
            <p className="text-cyan-100 text-sm text-justify max-w-[315px]">
              {t('hero.desc')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-cyan-100 hover:text-[#f4a430] transition-colors">{t('nav.about')}</Link></li>
              <li><Link to="/services" className="text-cyan-100 hover:text-[#f4a430] transition-colors">{t('nav.services')}</Link></li>
              <li><Link to="/events" className="text-cyan-100 hover:text-[#f4a430] transition-colors">{t('nav.events')}</Link></li>
              <li><Link to="/membership" className="text-cyan-100 hover:text-[#f4a430] transition-colors">{t('nav.membership')}</Link></li>
              <li><Link to="/donate" className="text-cyan-100 hover:text-[#f4a430] transition-colors">{t('nav.donate')}</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-1 text-[#E5C100] flex-shrink-0" />
                <span className="text-cyan-100 text-justify max-w-[260px]">No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, 1st Block, Parallel to BDA Link Road, Rajarajeshwari Nagar Post, Bangalore-560 098.</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#E5C100] flex-shrink-0" />
                <span className="notranslate text-cyan-100">+91 9972648909</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#E5C100] flex-shrink-0" />
                <a
                  href="mailto:rajukshatriyamahilasangha2024@gmail.com"
                  className="notranslate text-cyan-100 hover:text-[#E5C100] transition-colors underline-offset-2 hover:underline"
                  translate="no"
                >
                  rajukshatriyamahilasangha2024@gmail.com
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className="flex gap-4 mt-4">
              <a href="https://www.facebook.com/share/18JqEQZKWJ/?mibextid=wwXIfr" className="w-8 h-8 bg-cyan-700 rounded-full flex items-center justify-center hover:bg-[#E5C100] transition-colors">
                <SiFacebook size={20}
                />
              </a>
              <a href="https://www.instagram.com/rajukshatriyamahilasangha_2024?igsh=MzhrbzRvYjRlZXE2&utm_source=qr" className="w-8 h-8 bg-cyan-700 rounded-full flex items-center justify-center hover:bg-[#E5C100] transition-colors">
                <SiInstagram size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-cyan-800 mt-8 pt-8 text-center text-sm text-cyan-100">
          <p>&copy; {new Date().getFullYear()} Raju Kshatriya Mahila Sangha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}