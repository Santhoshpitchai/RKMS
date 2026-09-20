import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';
import { Award, ChevronDown, ChevronUp, UserCheck, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { useSiteImage } from '../services/useSiteContent';
import smtIndira from '../assets/Smt. Indira.png';
import shanthaKondur from '../assets/Shantha Kondur.png';
import babhithaNadampalli from '../assets/Babitha Nadampalli Sreedhara Raju.png';
import padmar from '../assets/Ms. Padma R.png';
import padmaraju from '../assets/Smt. Padma Raju.png';
import leelakrishnamaraju from '../assets/Mrs. Leelakrishnamaraju.png';
import pushpavasu from '../assets/Pushpa Vasu.png';

export function AboutUs() {
  const [activeTab, setActiveTab] = useState("current");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [expandedBio, setExpandedBio] = useState<number | null>(null);

  // Dynamic image from admin panel (falls back to stock photo)
  const historyImage = useSiteImage(
    'about_us_hero',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1080'
  );

  const currentMembers = [
    {
      name: 'Smt. Indira R ',
      title: 'Founding Member & President',
      photo: smtIndira,
      bio: 'Smt. Indira Raju is the daughter of Late Sri V. Ramaraju, (former Secretary of R.K.S., Bangalore). Smt Indira is the Founding Member and President of the Sangha. With a vision to bring women of the community to the forefront, she is dedicated to their upliftment and empowerment.\n\nHaving served as a Secretary in a Credit Co-operative Society, she possesses valuable experience in office administration and accounts. She actively encourages collective participation to achieve the objectives of the Sangha.'
    },
    {
      name: 'Smt.Shantha Kondur',
      title: 'Founding Member & Vice President',
      photo: shanthaKondur,
      bio: 'A retired Deputy Controller of Accounts Officer at KPTCL (erstwhile KEB), Mrs. Shantha Kondur brings 34 years of experience in Revenue, Auditing, Finance & Accounts, and Service Regulations. Recognized for her dedication, she held key positions throughout her career and made history as the first woman officer to serve at the Corporate Office as Assistant General Manager -AGM (Services). Having retired 6 years ago, she still continues to be consulted on pay fixation matters across the State of Karnataka and has contributed to recruitment, pay revisions, labour issues, and policy updates.\n\nShe is passionate about travel and reading, and strongly believes in kindness and helping those in need. She is the Vice President and a founding member of the Raju Kshatriya Mahila Sangha.\n\nAs the First woman professional from her paternal side , she has broken glass ceilings. She is grateful for the support of her husband who served as the Secretary of the Raju Kshatriya Sangha, her 2 daughters and the love received from her grandchildren. She remains content with her fulfilling career and life.'
    },
    {
      name: 'Smt.Babitha Nadampalli Sreedhara Raju',
      title: 'Founding Member & General Secretary',
      photo: babhithaNadampalli,
      bio: 'She is a first-generation lawyer. After completion of her Master’s degree in Law, she is currently teaching law and has been writing articles extensively in national and international Journals.\n\nThroughout her journey, she has been guided by the unwavering support of her parents and husband, which has enabled her to pursue her work with integrity and dedication. She is ever grateful for the opportunity to be part of this meaningful and inspiring journey with Raju Kshatriya Mahila Sangha.'
    },
    {
      name: 'Smt. Padma R',
      title: 'Joint Secretary',
      photo: padmar,
      bio: 'Ms. Padma R is a Postgraduate Engineer specializing in VLSI System Design, with nearly two decades of experience in the semiconductor industry. She was a key Core Member of the almost 4K Embedded Systems Design team at Tata Consultancy Services (TCS), where she also led the Physical Design team and successfully managed multiple projects.\n\nShe played a significant role in building and strengthening teams by effectively handling diverse roles and responsibilities. Prior to her tenure at TCS, she worked with U & I Scotty Design Center, Nikkel Exports Corporation, Digipro Design Services, and Process Electronics.\n\nCurrently, she is engaged in her family business and actively participates in philanthropic initiatives focused on community welfare. In her retired life, she is dedicated to giving back to society unconditionally, reflecting her deep sense of social responsibility.'
    },
    {
      name: 'Smt. Padma Raju',
      title: 'Founding Member & Treasurer',
      photo: padmaraju,
      bio: 'Smt. Padma Raju is an Arts graduate with diverse professional experience and has retired from HSBC.\n\nDriven by a compassion for people’s causes, she introspected her strengths and chose to further her impact by becoming a certified counselor. Through this, she strives to support individuals, promote well-being, and contribute meaningfully to society.\n\nAs Treasurer, Smt. Padma Raju brings dedication, empathy, and a strong sense of responsibility.'
    },
    {
      name: 'Smt.Leelakrishnamaraju',
      title: 'Founding Member & Cultural Secretary',
      photo: leelakrishnamaraju,
      bio: 'Mrs. Leelakrishnamaraju has over 28 years of experience as an Art and Craft teacher and Event Manager, having served in reputed educational institutions. She possesses a keen interest in engaging people through fun and interactive activities, fostering creativity and community participation.\n\nShe is currently serving as the Cultural Secretary at Raju Kshatriya Mahila Sangha, where she contributes to organizing and promoting cultural initiatives with dedication and enthusiasm.'
    },
    {
      name: 'Smt.Pushpa Vasu',
      title: 'Committee Member',
      photo: pushpavasu,
      bio: 'Pushpa Vasu is a Committee Member serving as the Coordinator for Malleshwaram since 2022. She has actively participated in events as a coordinator, motivating people for good causes. Guided by a strong spirit of compassion and service, she focuses on women welfare and community cohesion.'
    }
  ];

  return (
    <div className="bg-white text-gray-800 font-sans">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="bg-white/10 text-yellow-300 text-xs px-3 py-1 rounded-full font-semibold border border-white/20 uppercase tracking-wider">
            About Our Organization
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">Raju Kshatriya Mahila Sangha</h1>
          <p className="text-base md:text-lg max-w-3xl mx-auto text-cyan-100 leading-relaxed">
            Empowering women
          </p>
        </div>
      </section>

      {/* Organization History */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full">
              Our Journey
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Organization History</h2>
            <div className="space-y-3 text-gray-700 text-sm leading-relaxed text-justify">
              <p>
                In the year 2022, the RKS Mahila Vedike marked its inception by ceremonially lighting its first auspicious Deepam, symbolizing hope, unity, and collective strength. What began as a modest initiative has since grown into a vibrant and dynamic platform. As of today, the Mahila Vedike has expanded to a strong membership of approximately 752 women, reflecting an impressive growth of nearly 300% since its inception. This growth signifies not merely numerical expansion, but a meaningful transformation in community engagement and empowerment.
              </p>
              <p>
                The Mahila Vedike was established in 2022 under the aegis of the Raju Kshatriya Sangha (R), Jayanagar, Bengaluru, Karnataka. With the guidance and leadership of the Hon’ble President, Sri Ganesh Raju, along with the esteemed Committee Members of the Sangha, the women’s wing was formally constituted. The inaugural function was held on 8th October 2022 at Chamaraju Kalyana Mandira, Jayanagar, Bengaluru, marking the official commencement of the RKS Mahila Vedike.
              </p>
              <p>
                In its initial phase, the committee members of the RKS Mahila Sangha actively conducted door-to-door outreach initiatives across select areas in and around Jayanagar to enrol women into the Mahila Vedike, with a nominal lifetime membership fee of ₹500. Over time, these efforts yielded substantial growth, and by 2024, the membership base had expanded to approximately 500 members, with registrations being facilitated through both online and offline channels.
              </p>
              <p>
                As our activities grew multifold, there was a need to register the Sangha into a formal entity, and therefore, the Sangha was registered before the Registrar of societies, Bangalore, on the 13th of December 2024 and was named ‘Raju Kshatriya Mahila Sangha’ (RKMS) bearing registration number DRB1/SOR/343/2024-2025.
              </p>
            </div>
          </div>
          <div>
            <ImageWithFallback
              src={historyImage}
              alt="Women empowerment gathering"
              className="rounded-2xl shadow-xl border border-gray-100"
            />
          </div>
        </div>
      </section>

      {/* Committee Section */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              Sangha Leadership
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Executive Committee Members
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${activeTab === 'current'
                ? 'bg-[#0A6C87] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              Current Committee Members ({currentMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('former')}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors ${activeTab === 'former'
                ? 'bg-[#0A6C87] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              Former Members
            </button>
          </div>

          {/* Current Committee Members */}
          {activeTab === 'current' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
              {currentMembers.map((member, index) => {
                const isBioOpen = expandedBio === index;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Uncropped Member Photo Container */}
                      <div className="h-64 bg-gray-50 p-4 flex items-center justify-center border-b border-gray-100">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="max-h-full max-w-full object-contain rounded-xl drop-shadow-sm"
                        />
                      </div>

                      <div className="p-6 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                            <span className="inline-block mt-1 bg-cyan-50 text-[#0A6C87] border border-cyan-100 text-xs font-bold px-2.5 py-0.5 rounded-full">
                              {member.title}
                            </span>
                          </div>
                          <ShieldCheck className="w-5 h-5 text-[#0A6C87] flex-shrink-0 mt-1" />
                        </div>

                        {/* Biography text */}
                        <p className={`text-gray-600 text-xs leading-relaxed ${isBioOpen ? '' : 'line-clamp-3'}`}>
                          {member.bio}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <button
                        onClick={() => setExpandedBio(isBioOpen ? null : index)}
                        className="w-full text-xs font-bold text-[#0A6C87] bg-cyan-50 hover:bg-cyan-100 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {isBioOpen ? (
                          <>Close Biography <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>Read Full Biography <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Former Members */}
          {activeTab === 'former' && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-cyan-100 text-[#0A6C87] flex items-center justify-center font-bold text-xl">
                    GL
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Smt. Geetha Lakshman</h3>
                    <p className="text-xs font-semibold text-[#0A6C87]">Founding Member & Former Secretary</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed text-justify">
                  Smt Geetha has been an active contributor to the Sangha’s growth and fundraising efforts. A certified interior designer and talented artist, she has consistently encouraged member participation and community welfare endeavors.
                </p>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold text-[#0A6C87] uppercase tracking-wider bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100">
            Help Center
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              question: "1. How can I become a member of Raju Kshatriya Mahila Sangha?",
              answer: "You can become a member by visiting our Membership page and completing the registration form. The membership fee is ₹1,001, and you'll receive a unique membership ID after successful payment. Membership is open to all women from the Raju Kshatriya community."
            },
            {
              question: "2. What programs and services does the organization offer?",
              answer: "We offer a wide range of programs including skill development workshops, cultural events, educational seminars, health awareness camps, counseling services, and community welfare programs. Our committee organizes various activities throughout the year to support women's empowerment and community development."
            },
            {
              question: "3. How are committee members selected?",
              answer: "Existing committee members, committee members and coordinators of various zones are eligible to nominate themselves and elected through a democratic process during our annual general meeting. Members can nominate themselves or be nominated by other members. Elections are conducted transparently, and committee members serve a tenure of 5 years."
            },
            {
              question: "4. Can I volunteer without being a member?",
              answer: "While we encourage membership for regular participation, we welcome volunteers for specific events and programs. You can contact us through our website or attend our events to learn more about volunteer opportunities. However, certain benefits and voting rights are reserved for registered members."
            },
            {
              question: "5. How are donations utilized by the organization?",
              answer: "All donations are used transparently for our community welfare programs, educational initiatives, health initiatives ,sports, event organization, and supporting women in need. We maintain detailed financial records, file income tax promptly and provide regular updates to our members about fund utilization. Donations are tax-deductible under applicable laws."
            },
            {
              question: "6. How often does the organization conduct events?",
              answer: "We organize events throughout the year, including monthly meetings, quarterly cultural programs, annual celebrations, and special workshops. Members receive regular updates about upcoming events through our social media channels."
            }
          ].map((faq, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors font-semibold text-sm text-gray-900"
              >
                <span>{faq.question}</span>
                <span className="text-lg text-[#0A6C87] font-bold">
                  {openFaq === index ? '−' : '+'}
                </span>
              </button>
              {openFaq === index && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-600 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}